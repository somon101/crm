import { test, expect } from '@playwright/test';
import { login } from './helpers';

const RUN_ID = Date.now();

test.describe.configure({ mode: 'serial' });

test('admin can manage users (create/block/activate/reset password/role) and reference data', async ({
  page,
}) => {
  await login(page, 'admin@crm.local', 'Admin123!');

  // --- Users: create, change role, block, verify blocked login rejected, activate, reset password ---
  const email = `mgmt-${RUN_ID}@test.local`;
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Новый пользователь' }).click();
  await page.getByLabel('Имя *').fill('Managed');
  await page.getByLabel('Фамилия *').fill('User');
  await page.getByLabel('Email *').fill(email);
  await page.getByLabel('Пароль *').fill('Password123!');
  await page.getByRole('button', { name: 'Создать' }).click();

  const row = page.getByTestId(`user-row-${email}`);
  await expect(row).toBeVisible();

  // Role change: MANAGER -> ADMIN -> MANAGER.
  const roleSelect = row.getByRole('combobox');
  await roleSelect.selectOption('ADMIN');
  await expect(roleSelect).toHaveValue('ADMIN');
  await roleSelect.selectOption('MANAGER');
  await expect(roleSelect).toHaveValue('MANAGER');

  // Block and confirm login now fails for this account.
  await row.getByRole('button', { name: 'Заблокировать' }).click();
  await expect(row.getByText('Заблокирован')).toBeVisible();

  const blockedContext = await page.context().browser()!.newContext();
  const blockedPage = await blockedContext.newPage();
  await blockedPage.goto('/login');
  await blockedPage.getByLabel(/email/i).fill(email);
  await blockedPage.getByLabel(/пароль/i).fill('Password123!');
  await blockedPage.getByRole('button', { name: 'Войти' }).click();
  await expect(blockedPage.getByText('Неверный email или пароль')).toBeVisible();
  await blockedContext.close();

  // Activate and confirm login now works again.
  await row.getByRole('button', { name: 'Активировать' }).click();
  await expect(row.getByText('Активен')).toBeVisible();

  const reactivatedContext = await page.context().browser()!.newContext();
  const reactivatedPage = await reactivatedContext.newPage();
  await login(reactivatedPage, email, 'Password123!');
  await reactivatedContext.close();

  // Reset password: old password stops working, new one works.
  await row.getByRole('button', { name: 'Сбросить пароль' }).click();
  await page.getByLabel('Новый пароль *').fill('BrandNewPassword1!');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByText('Пароль обновлён')).toBeVisible();
  await page.keyboard.press('Escape');

  const resetContext = await page.context().browser()!.newContext();
  const resetPage = await resetContext.newPage();
  await resetPage.goto('/login');
  await resetPage.getByLabel(/email/i).fill(email);
  await resetPage.getByLabel(/пароль/i).fill('Password123!'); // old password
  await resetPage.getByRole('button', { name: 'Войти' }).click();
  await expect(resetPage.getByText('Неверный email или пароль')).toBeVisible();
  await login(resetPage, email, 'BrandNewPassword1!'); // new password works
  await resetContext.close();

  // --- Reference data: tariffs, sources, loss reasons ---
  await page.goto('/admin/settings');

  const tariffName = `TestTariff${RUN_ID}`;
  await page.getByPlaceholder('Название').first().fill(tariffName);
  await page.getByPlaceholder('Цена').fill('777');
  await page.getByRole('button', { name: 'Добавить тариф' }).click();
  await expect(page.getByText(tariffName)).toBeVisible();

  await page.getByRole('button', { name: 'Источники' }).click();
  const sourceName = `TestSource${RUN_ID}`;
  await page.getByPlaceholder('Название').fill(sourceName);
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText(sourceName)).toBeVisible();

  await page.getByRole('button', { name: 'Причины отказа' }).click();
  const reasonName = `TestReason${RUN_ID}`;
  await page.getByPlaceholder('Название').fill(reasonName);
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByText(reasonName)).toBeVisible();

  // The newly created source must now appear as a filter option on the leads page.
  await page.goto('/leads');
  await expect(page.locator('option', { hasText: sourceName })).toHaveCount(1);
});
