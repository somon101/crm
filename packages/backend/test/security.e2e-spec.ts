import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, truncateAll } from './utils/test-app';
import { createUser, seedReferenceData } from './utils/fixtures';

describe('Security (e2e) — admin-only endpoints and input validation', () => {
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

  it('rejects a manager calling admin-only lead endpoints (delete, reassign)', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'secm1@test.local' });
    const { user: manager2 } = await createUser(prisma, { email: 'secm2@test.local' });
    const token1 = await loginAs(manager1.email, pw1);

    const createRes = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        firstName: 'Sec',
        lastName: 'Test',
        phone: '+992900000099',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/leads/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/leads/${createRes.body.id}/reassign`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ managerId: manager2.id })
      .expect(403);
  });

  it('rejects lead creation missing required fields with 400', async () => {
    const { user, password } = await createUser(prisma, { email: 'validation@test.local' });
    const token = await loginAs(user.email, password);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'OnlyFirstName' })
      .expect(400);
  });

  it('rejects requests containing unknown fields (whitelist validation)', async () => {
    const ref = await seedReferenceData(prisma);
    const { user, password } = await createUser(prisma, { email: 'whitelist@test.local' });
    const token = await loginAs(user.email, password);

    await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'X',
        lastName: 'Y',
        phone: '+992900000098',
        firstContactDate: new Date().toISOString(),
        sourceId: ref.source.id,
        managerId: 'anything-a-manager-should-not-control', // silently accepted param, not the injection vector
        isAdmin: true, // unknown field — must be rejected outright
      })
      .expect(400);
  });

  it('prevents an admin from blocking their own account', async () => {
    const { user: admin, password } = await createUser(prisma, {
      email: 'selfblock@test.local',
      role: Role.ADMIN,
    });
    const token = await loginAs(admin.email, password);

    await request(app.getHttpServer())
      .post(`/api/users/${admin.id}/block`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('rejects a manager calling admin-only reference-data mutation endpoints', async () => {
    const { user, password } = await createUser(prisma, { email: 'refdata@test.local' });
    const token = await loginAs(user.email, password);

    await request(app.getHttpServer())
      .post('/api/tariffs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rogue tariff', price: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/lead-statuses')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'ROGUE', name: 'Rogue', order: 99 })
      .expect(403);
  });

  it('rejects a malformed/garbage bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/leads')
      .set('Authorization', 'Bearer not.a.valid.jwt')
      .expect(401);
  });
});
