import { test, expect } from '@playwright/test';
import { login, logout } from './helpers';

// Mirrors the end-to-end acceptance scenario from the spec (section 25):
// admin creates 2 managers -> manager1 creates a fully-detailed lead -> manager2
// must not see it -> manager1 changes status + logs an interaction -> admin
// verifies the lead/history/stats -> manager1 marks the result as "Bought" ->
// admin verifies the change and that the full history survived.

const RUN_ID = Date.now();
const MANAGER1_EMAIL = `manager1-${RUN_ID}@test.local`;
const MANAGER2_EMAIL = `manager2-${RUN_ID}@test.local`;
const MANAGER_PASSWORD = 'Password123!';
const LEAD_LAST_NAME = `Acceptance${RUN_ID}`;

test.describe.configure({ mode: 'serial' });

test('full lead lifecycle across two managers and an admin', async ({ page }) => {
  // 1-2. Admin creates two managers.
  await login(page, 'admin@crm.local', 'Admin123!');
  await page.goto('/admin/users');

  for (const [email, first] of [
    [MANAGER1_EMAIL, 'Manager1'],
    [MANAGER2_EMAIL, 'Manager2'],
  ] as const) {
    await page.getByRole('button', { name: 'Новый пользователь' }).click();
    await page.getByLabel('Имя *').fill(first);
    await page.getByLabel('Фамилия *').fill('Test');
    await page.getByLabel('Email *').fill(email);
    await page.getByLabel('Пароль *').fill(MANAGER_PASSWORD);
    await page.getByRole('button', { name: 'Создать' }).click();
    await expect(page.getByText(email)).toBeVisible();
  }

  await logout(page);

  // 3. Manager1 logs in and creates a fully-detailed lead.
  await login(page, MANAGER1_EMAIL, MANAGER_PASSWORD);
  await page.goto('/leads/new');

  await page.getByLabel('Имя *').fill('Client');
  await page.getByLabel('Фамилия *').fill(LEAD_LAST_NAME);
  await page.getByLabel('Телефон *').fill('+992900111222');
  await page.getByLabel(/дата первого обращения/i).fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel(/^источник/i).selectOption({ index: 1 });

  // Vehicle interest: "wants a Camry in ~2 months, doesn't know the year yet" case.
  await page.getByLabel(/тип интереса/i).selectOption('SPECIFIC_MODEL');
  await page.getByLabel(/^марка$/i).fill('Toyota');
  await page.getByLabel(/^модель$/i).fill('Camry');

  await page.getByLabel(/интересующий тариф/i).selectOption({ index: 1 });
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  await page.getByLabel(/период/i).fill('через 2 месяца');
  await page.getByLabel(/планируемая дата покупки/i).fill(twoMonthsFromNow.toISOString().slice(0, 10));

  await page.getByRole('button', { name: 'Создать лида' }).click();
  // Not '**/leads/*' — that glob also matches the /leads/new page we start on,
  // so it could resolve before the real post-create navigation ever happens.
  // Require an actual UUID segment, i.e. a genuine lead detail URL.
  await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: `Client ${LEAD_LAST_NAME}` })).toBeVisible();

  const leadUrl = page.url();

  // Set a next-contact task while we're here.
  const nextContact = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dueAtInput = page.getByLabel(/дата и время следующего контакта/i);
  await dueAtInput.fill(nextContact.toISOString().slice(0, 16));
  await page.getByRole('button', { name: 'Запланировать' }).click();
  // The form clears its own dueAt field on a successful submit.
  await expect(dueAtInput).toHaveValue('');

  await logout(page);

  // 4. Manager2 must NOT see manager1's lead.
  await login(page, MANAGER2_EMAIL, MANAGER_PASSWORD);
  await page.goto('/leads');
  await page.getByPlaceholder(/поиск/i).fill(LEAD_LAST_NAME);
  await expect(page.getByText(LEAD_LAST_NAME)).not.toBeVisible();

  // Direct navigation to the lead URL by ID must not leak data either (IDOR check).
  await page.goto(leadUrl);
  await expect(page.getByText(LEAD_LAST_NAME)).not.toBeVisible();

  await logout(page);

  // 5. Manager1 logs back in, changes status, logs an interaction.
  await login(page, MANAGER1_EMAIL, MANAGER_PASSWORD);
  await page.goto(leadUrl);

  const statusBadge = page.getByTestId('lead-status-badge');
  await page.getByTestId('lead-status-select').selectOption({ label: 'Контакт установлен' });
  await expect(statusBadge).toContainText('Контакт установлен');

  await page.getByPlaceholder('Результат общения с клиентом…').fill('Обсудили условия диагностики');
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText('Обсудили условия диагностики')).toBeVisible();

  await logout(page);

  // 6. Admin checks the lead, its history, and stats.
  await login(page, 'admin@crm.local', 'Admin123!');
  await page.goto(leadUrl);
  await expect(statusBadge).toContainText('Контакт установлен');
  await expect(page.getByText('Обсудили условия диагностики')).toBeVisible();
  // History must show both the status change and the interaction, never overwritten.
  const timeline = page.getByRole('list');
  await expect(timeline.getByText('Смена статуса')).toBeVisible();
  await expect(timeline.getByText('Звонок')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Дашборд администратора' })).toBeVisible();

  await logout(page);

  // 7. Manager1 marks the result as "Bought".
  await login(page, MANAGER1_EMAIL, MANAGER_PASSWORD);
  await page.goto(leadUrl);
  await page.getByRole('button', { name: 'Отметить: купил услугу' }).click();
  await page.getByLabel(/купленный тариф/i).selectOption({ index: 1 });
  await page.getByLabel(/^цена/i).fill('600');
  await page.getByLabel(/дата покупки/i).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Результат: куплено')).toBeVisible();

  await logout(page);

  // 8. Admin verifies the change and that the full history survived.
  await login(page, 'admin@crm.local', 'Admin123!');
  await page.goto(leadUrl);
  await expect(page.getByText('Результат: куплено')).toBeVisible();
  await expect(page.getByText('Обсудили условия диагностики')).toBeVisible();
  await expect(page.getByText('Смена статуса').first()).toBeVisible();
  await expect(page.getByText('Создание лида')).toBeVisible();

  await page.screenshot({ path: 'screenshots/acceptance-final-lead.png', fullPage: true });
});
