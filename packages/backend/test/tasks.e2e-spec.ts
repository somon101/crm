import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, truncateAll } from './utils/test-app';
import { createUser, seedReferenceData } from './utils/fixtures';

describe('Tasks (e2e)', () => {
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

  async function createLead(token: string, sourceId: string) {
    const res = await request(app.getHttpServer())
      .post('/api/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Lead',
        lastName: 'ForTask',
        phone: '+992900000009',
        firstContactDate: new Date().toISOString(),
        sourceId,
      });
    return res.body.id as string;
  }

  it('creates a task on own lead, lists it, and completes it', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager, password } = await createUser(prisma, { email: 'taskmgr@test.local' });
    const token = await loginAs(manager.email, password);
    const leadId = await createLead(token, ref.source.id);

    const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createRes = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ leadId, dueAt, contactType: 'CALL', comment: 'Follow up' })
      .expect(201);

    expect(createRes.body.assignedTo.id).toBe(manager.id);

    const list = await request(app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.find((t: { id: string }) => t.id === createRes.body.id)).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/tasks/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 1, status: 'DONE' })
      .expect(200);
  });

  it('prevents a manager from creating a task on another manager\'s lead', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager1, password: pw1 } = await createUser(prisma, { email: 'tm1@test.local' });
    const { user: manager2, password: pw2 } = await createUser(prisma, { email: 'tm2@test.local' });
    const token1 = await loginAs(manager1.email, pw1);
    const token2 = await loginAs(manager2.email, pw2);
    const leadId = await createLead(token1, ref.source.id);

    await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        leadId,
        dueAt: new Date().toISOString(),
        contactType: 'CALL',
      })
      .expect(404);
  });

  it('surfaces today\'s and overdue tasks on the manager dashboard', async () => {
    const ref = await seedReferenceData(prisma);
    const { user: manager, password } = await createUser(prisma, { email: 'dashmgr@test.local' });
    const token = await loginAs(manager.email, password);
    const leadId = await createLead(token, ref.source.id);

    const overdueAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ leadId, dueAt: overdueAt, contactType: 'CALL' })
      .expect(201);

    const dashboard = await request(app.getHttpServer())
      .get('/api/dashboard/manager')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboard.body.tasks.overdueCount).toBeGreaterThanOrEqual(1);
  });
});
