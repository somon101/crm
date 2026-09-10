import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@crm.local' },
    update: {},
    create: {
      email: 'admin@crm.local',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  const statuses = [
    { key: 'NEW', name: 'Новый', order: 1, color: '#94a3b8', isDefault: true },
    { key: 'CONTACTED', name: 'Контакт установлен', order: 2, color: '#60a5fa' },
    { key: 'INTERESTED', name: 'Заинтересован', order: 3, color: '#38bdf8' },
    { key: 'PLANS_PURCHASE', name: 'Планирует покупку', order: 4, color: '#818cf8' },
    { key: 'READY_TO_BUY', name: 'Готов купить', order: 5, color: '#fbbf24' },
    { key: 'BOUGHT_SERVICE', name: 'Купил услугу', order: 6, color: '#22c55e', isWon: true },
    { key: 'DID_NOT_BUY', name: 'Не купил', order: 7, color: '#f87171', isLost: true },
    { key: 'LOST', name: 'Потерян', order: 8, color: '#6b7280', isLost: true },
  ];
  for (const status of statuses) {
    await prisma.leadStatus.upsert({
      where: { key: status.key },
      update: {},
      create: status,
    });
  }

  const sources = ['Instagram', 'TikTok', 'Telegram', 'Сайт', 'Рекомендация', 'Другое'];
  for (const [i, name] of sources.entries()) {
    const existing = await prisma.leadSource.findFirst({ where: { name } });
    if (!existing) {
      await prisma.leadSource.create({ data: { name, order: i } });
    }
  }

  const lossReasons = [
    'Изменил решение',
    'Отложил покупку',
    'Дорого',
    'Не доверяет',
    'Выбрал конкурента',
    'Купил автомобиль без диагностики',
    'Не отвечает',
    'Другое',
  ];
  for (const [i, name] of lossReasons.entries()) {
    const existing = await prisma.lossReason.findFirst({ where: { name } });
    if (!existing) {
      await prisma.lossReason.create({ data: { name, order: i } });
    }
  }

  const tariffs = [
    { name: 'Базовая диагностика', description: 'Визуальный осмотр кузова и салона', price: 300 },
    {
      name: 'Стандартная диагностика',
      description: 'Осмотр + компьютерная диагностика двигателя',
      price: 600,
    },
    {
      name: 'Полная диагностика',
      description: 'Комплексная проверка кузова, двигателя, ходовой и электроники',
      price: 1000,
    },
  ];
  for (const tariff of tariffs) {
    const existing = await prisma.tariff.findFirst({ where: { name: tariff.name } });
    if (!existing) {
      await prisma.tariff.create({ data: tariff });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Admin login: admin@crm.local / Admin123!');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
