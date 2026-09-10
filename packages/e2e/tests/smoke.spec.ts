import { test, expect } from '@playwright/test';

test('admin can log in and see the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@crm.local');
  await page.getByLabel(/пароль/i).fill('Admin123!');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Дашборд администратора' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/smoke-admin-dashboard.png', fullPage: true });
});
