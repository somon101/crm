import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, truncateAll } from './utils/test-app';
import { createUser, seedReferenceData } from './utils/fixtures';

describe('Leads (e2e) — ownership, IDOR, and concurrency', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await truncateAll(prisma);
  });

  async function loginAs(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    return res.body.accessToken as string;
  }

  it('scopes manager1 leads away from manager2 (IDOR returns 404, not the data)', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1@test.local' });
    const { user: manager2, password: pw2 } = await createUser(prisma, { email: 'm2@test.local' });
    const token1 = await loginAs(manager1.email, pw1);
    const token2 = await loginAs(manager2.email, pw2);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Ivan',
        lastName: 'Petrov',
        phone: '+992900000000',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);

    const leadId = createRes.body.id;
    // Server-forced ownership: managerId is always the caller, never client-supplied.
    expect(createRes.body.manager.id).toBe(manager1.id);

    // manager1 can see it.
    await request(app.getHttpServer())
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    // manager2 gets a 404 — not a 403 — so lead existence isn't confirmed either.
    await request(app.getHttpServer())
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);

    // manager2's list doesn't include it.
    const list2 = await request(app.getHttpServer())
      .get('/api/leads')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    expect(list2.body.items.find((l: { id: string }) => l.id === leadId)).toBeUndefined();

    // manager2 cannot patch it either.
    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ version: 1, temperature: 'HOT' })
      .expect(404);

    // A manager cannot smuggle in a different managerId query param to see others' leads.
    const listSpoofed = await request(app.getHttpServer())
      .get(`/api/leads?managerId=${manager1.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    expect(listSpoofed.body.items.find((l: { id: string }) => l.id === leadId)).toBeUndefined();
  });

  it('lets an admin see every manager\'s leads', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: admin, password: adminPw } = await createUser(prisma, {
      email: 'admin@test.local',
      role: Role.ADMIN,
    });
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1b@test.local' });
    const adminToken = await loginAs(admin.email, adminPw);
    const token1 = await loginAs(manager1.email, pw1);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Anna',
        lastName: 'Ivanova',
        phone: '+992900000001',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/leads/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rejects a concurrent update with a stale version (409), never silently overwriting', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1c@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Sergey',
        lastName: 'Orlov',
        phone: '+992900000002',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);
    const leadId = createRes.body.id;
    expect(createRes.body.version).toBe(1);

    // First update succeeds and bumps the version.
    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ version: 1, temperature: 'WARM' })
      .expect(200);

    // Second update still using the stale version 1 is rejected, not merged silently.
    const conflict = await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ version: 1, temperature: 'HOT' })
      .expect(409);
    expect(conflict.body.currentRecord.temperature).toBe('WARM');
  });

  it('requires purchasedTariffId/price/date before moving a lead into a "won" status', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1d@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Olga',
        lastName: 'Smirnova',
        phone: '+992900000003',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/leads/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ version: 1, statusId: ref.wonStatus.id })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/leads/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        version: 1,
        statusId: ref.wonStatus.id,
        purchasedTariffId: ref.tariff.id,
        purchasePrice: 500,
        purchaseDate: new Date().toISOString(),
      })
      .expect(200);
  });

  it('records lead creation, status change, and an interaction in the merged timeline', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1e@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Timur',
        lastName: 'Rashidov',
        phone: '+992900000004',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);
    const leadId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/leads/${leadId}/interactions`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ type: 'CALL', comment: 'Discussed pricing' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ version: 1, statusId: ref.newStatus.id, temperature: 'HOT' })
      .expect(200);

    const timeline = await request(app.getHttpServer())
      .get(`/api/leads/${leadId}/timeline`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    const kinds = timeline.body.map((entry: { kind: string }) => entry.kind);
    expect(kinds).toContain('INTERACTION');
    expect(kinds).toContain('AUDIT');
    expect(timeline.body.length).toBeGreaterThanOrEqual(3); // create + interaction + update
  });

  it('search and filters narrow the results correctly', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1f@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Farrukh',
        lastName: 'Uникальный',
        phone: '+992911222333',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
        temperature: 'HOT',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Other',
        lastName: 'Person',
        phone: '+992944555666',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
        temperature: 'COLD',
      })
      .expect(201);

    const byName = await request(app.getHttpServer())
      .get('/api/leads?search=Uникальный')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0].lastName).toBe('Uникальный');

    const byPhone = await request(app.getHttpServer())
      .get('/api/leads?search=911222333')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(byPhone.body.total).toBe(1);

    const byTemperature = await request(app.getHttpServer())
      .get('/api/leads?temperature=COLD')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(byTemperature.body.total).toBe(1);
    expect(byTemperature.body.items[0].firstName).toBe('Other');
  });

  it('rejects an out-of-range vehicle year (negative, and absurdly far in the future)', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'm1g@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    const basePayload = {
      firstName: 'Year',
      lastName: 'Test',
      phone: '+992900000005',
      firstContactDate: new Date().toISOString(),
      sourceId: ref.source.id,
    };

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({ ...basePayload, vehicleInterest: { interestType: 'SPECIFIC_MODEL', year: -2 } })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({ ...basePayload, vehicleInterest: { interestType: 'SPECIFIC_MODEL', year: 3000 } })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({ ...basePayload, vehicleInterest: { interestType: 'SPECIFIC_MODEL', year: 2020 } })
      .expect(201);
  });
});
