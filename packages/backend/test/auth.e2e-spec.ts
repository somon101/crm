import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, truncateAll } from './utils/test-app';
import { createUser } from './utils/fixtures';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    jwt = app.get(JwtService);
    config = app.get(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await truncateAll(prisma);
  });

  it('logs in with correct credentials and returns an access token + user', async () => {
    const { user, password } = await createUser(prisma, { email: 'good@test.local' });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/);
  });

  it('rejects an incorrect password', async () => {
    const { user } = await createUser(prisma, { email: 'wrongpw@test.local' });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'not-the-password' })
      .expect(401);
  });

  it('rejects login for a blocked (inactive) user', async () => {
    const { user, password } = await createUser(prisma, {
      email: 'blocked@test.local',
      isActive: false,
    });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(401);
  });

  it('rejects requests with no token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects requests with an invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('returns the current user on /auth/me with a valid token', async () => {
    const { user, password } = await createUser(prisma, { email: 'me@test.local' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password });

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(user.id);
  });

  it('rejects a request made with a token belonging to a user blocked mid-session', async () => {
    const { user, password } = await createUser(prisma, { email: 'midblock@test.local' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password });

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
  });

  it('rotates the refresh token and issues a new access token', async () => {
    const { user, password } = await createUser(prisma, { email: 'refresh@test.local' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password });
    const cookie = login.headers['set-cookie'];

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);

    expect(refreshed.body.accessToken).toBeDefined();
    // The refresh token itself must always rotate (the actual security guarantee —
    // reuse detection below depends on it). The access token's *value* can
    // legitimately be byte-identical if issued within the same JWT `iat` second,
    // since it's a pure function of {payload, secret, iat}, so we don't assert on it.
    expect(refreshed.headers['set-cookie']?.[0]).toMatch(/refresh_token=/);
    expect(refreshed.headers['set-cookie']?.[0]).not.toBe(cookie[0]);
  });

  it('detects refresh token reuse and revokes the whole session family', async () => {
    const { user, password } = await createUser(prisma, { email: 'reuse@test.local' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password });
    const tokenACookie = login.headers['set-cookie'];

    // Legitimate rotation: A -> B.
    const rotated = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', tokenACookie)
      .expect(200);
    const tokenBCookie = rotated.headers['set-cookie'];

    // Reusing the now-revoked token A is rejected...
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', tokenACookie)
      .expect(401);

    // ...and the whole family is revoked, so the legitimately-rotated token B is
    // also no longer usable — not just the reused one.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', tokenBCookie)
      .expect(401);
  });

  it('clears the session on logout', async () => {
    const { user, password } = await createUser(prisma, { email: 'logout@test.local' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password });
    const cookie = login.headers['set-cookie'];

    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
  });

  it('rejects a validly-signed but expired access token (session expiry)', async () => {
    const { user } = await createUser(prisma, { email: 'expired@test.local' });
    const expiredToken = jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      { secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '-1s' },
    );

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});
