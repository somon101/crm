import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
    });
    await this.auditService.record({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.CREATE,
      changes: { email: { old: null, new: user.email }, role: { old: null, new: user.role } },
      changedByUserId: actorId,
    });
    return this.authService.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    if (dto.email && dto.email !== before.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    const changes = this.auditService.buildDiff(before, dto as Record<string, unknown>);
    await this.auditService.record({
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      changes,
      changedByUserId: actorId,
    });
    return this.authService.toSafeUser(user);
  }

  async block(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot block your own account');
    }
    const before = await this.findByIdOrThrow(id);
    const user = await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.authService.revokeAllTokensForUser(id);
    await this.auditService.record({
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive: false }),
      changedByUserId: actorId,
    });
    return this.authService.toSafeUser(user);
  }

  async activate(id: string, actorId: string) {
    const before = await this.findByIdOrThrow(id);
    const user = await this.prisma.user.update({ where: { id }, data: { isActive: true } });
    await this.auditService.record({
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: this.auditService.buildDiff(before, { isActive: true }),
      changedByUserId: actorId,
    });
    return this.authService.toSafeUser(user);
  }

  async resetPassword(id: string, newPassword: string, actorId: string) {
    await this.findByIdOrThrow(id);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.authService.revokeAllTokensForUser(id);
    await this.auditService.record({
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      changes: { password: { old: '***', new: '***' } },
      changedByUserId: actorId,
    });
    return { success: true };
  }
}
