import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './types';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_TTL = '15m';

export interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface TokenPairWithUser extends TokenPair {
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private signAccessToken(user: Pick<User, 'id' | 'role' | 'email'>): string {
    const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  private async issueRefreshToken(
    userId: string,
    meta: TokenMeta,
    replacesTokenId?: string,
  ): Promise<{ raw: string; expiresAt: Date }> {
    const raw = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const created = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(raw),
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    if (replacesTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacesTokenId },
        data: { revokedAt: new Date(), replacedByTokenId: created.id },
      });
    }
    return { raw, expiresAt };
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(user: User, meta: TokenMeta): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);
    const { raw, expiresAt } = await this.issueRefreshToken(user.id, meta);
    return { accessToken, refreshToken: raw, refreshExpiresAt: expiresAt };
  }

  /** Rotates a refresh token. Detects reuse of an already-revoked token (a signature
   * of theft) by revoking the whole token family and forcing re-login. */
  async refresh(rawToken: string, meta: TokenMeta): Promise<TokenPairWithUser> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid session');
    }

    if (existing.revokedAt) {
      await this.revokeAllTokensForUser(existing.userId);
      throw new UnauthorizedException('Session reuse detected, please log in again');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    if (!existing.user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const accessToken = this.signAccessToken(existing.user);
    const { raw, expiresAt } = await this.issueRefreshToken(existing.userId, meta, existing.id);
    return { accessToken, refreshToken: raw, refreshExpiresAt: expiresAt, user: existing.user };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Called on user block and on password reset — forces logout-everywhere. */
  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
    };
  }
}
