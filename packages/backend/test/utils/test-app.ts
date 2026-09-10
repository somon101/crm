import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Wipes all application tables between tests. UUID PKs make RESTART IDENTITY moot. */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.interaction.deleteMany(),
    prisma.task.deleteMany(),
    prisma.vehicleInterest.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tariff.deleteMany(),
    prisma.leadSource.deleteMany(),
    prisma.lossReason.deleteMany(),
    prisma.leadStatus.deleteMany(),
  ]);
}
