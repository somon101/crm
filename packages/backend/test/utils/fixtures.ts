import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role } from '@prisma/client';

export async function seedReferenceData(prisma: PrismaService) {
  const [newStatus, wonStatus, lostStatus] = await Promise.all([
    prisma.leadStatus.create({
      data: { key: 'NEW', name: 'New', order: 1, isDefault: true },
    }),
    prisma.leadStatus.create({
      data: { key: 'BOUGHT', name: 'Bought', order: 2, isWon: true },
    }),
    prisma.leadStatus.create({
      data: { key: 'LOST', name: 'Lost', order: 3, isLost: true },
    }),
  ]);
  const source = await prisma.leadSource.create({ data: { name: 'Instagram', order: 1 } });
  const tariff = await prisma.tariff.create({
    data: { name: 'Standard', price: 500 },
  });
  const lossReason = await prisma.lossReason.create({ data: { name: 'Too expensive', order: 1 } });
  return { newStatus, wonStatus, lostStatus, source, tariff, lossReason };
}

export async function createUser(
  prisma: PrismaService,
  overrides: Partial<{
    email: string;
    password: string;
    role: Role;
    isActive: boolean;
    firstName: string;
    lastName: string;
  }> = {},
) {
  const password = overrides.password ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, 4); // low cost factor — tests only
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      role: overrides.role ?? Role.MANAGER,
      isActive: overrides.isActive ?? true,
    },
  });
  return { user, password };
}
