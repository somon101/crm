import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, truncateAll } from './utils/test-app';
import { createUser } from './utils/fixtures';

describe('Users (e2e) — RBAC', () => {
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

  it('lets an admin create a user, block them, and reject their subsequent login', async () => {
    const { user: admin, password: adminPassword } = await createUser(prisma, {
      email: 'admin1@test.local',
      role: Role.ADMIN,
    });
    const adminToken = await loginAs(admin.email, adminPassword);

    const createRes = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newmanager@test.local',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'Manager',
        role: Role.MANAGER,
      })
      .expect(201);

    expect(createRes.body.email).toBe('newmanager@test.local');

    // The new manager can log in before being blocked.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'newmanager@test.local', password: 'Password123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/users/${createRes.body.id}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'newmanager@test.local', password: 'Password123!' })
      .expect(401);

    // Re-activation restores login.
    await request(app.getHttpServer())
      .post(`/api/users/${createRes.body.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'newmanager@test.local', password: 'Password123!' })
      .expect(200);
  });

  it('rejects a manager calling admin-only user-management endpoints', async () => {
    const { user: manager, password } = await createUser(prisma, {
      email: 'plainmanager@test.local',
      role: Role.MANAGER,
    });
    const managerToken = await loginAs(manager.email, password);

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        email: 'shouldnotexist@test.local',
        password: 'Password123!',
        firstName: 'X',
        lastName: 'Y',
        role: Role.MANAGER,
      })
      .expect(403);
  });

  it('lets an admin reset a password and the new password works while the old one does not', async () => {
    const { user: admin, password: adminPassword } = await createUser(prisma, {
      email: 'admin2@test.local',
      role: Role.ADMIN,
    });
    const { user: manager, password: oldPassword } = await createUser(prisma, {
      email: 'resetme@test.local',
    });
    const adminToken = await loginAs(admin.email, adminPassword);

    await request(app.getHttpServer())
      .post(`/api/users/${manager.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'BrandNewPassword1!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: manager.email, password: oldPassword })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: manager.email, password: 'BrandNewPassword1!' })
      .expect(200);
  });
});
