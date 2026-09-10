import { expect, type Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  // Defensive against browser autofill re-populating a previously-used credential
  // on this shared page/form across logins within the same test: fill, then
  // assert the value actually stuck before submitting.
  const emailInput = page.getByLabel(/email/i);
  await emailInput.fill(email);
  await expect(emailInput).toHaveValue(email);
  const passwordInput = page.getByLabel(/пароль/i);
  await passwordInput.fill(password);
  await expect(passwordInput).toHaveValue(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL('**/dashboard');
}

export async function logout(page: Page) {
  // Desktop and mobile each render their own visible "Выйти" button (see
  // AppShell); pick whichever is actually visible in the current viewport.
  const buttons = page.getByRole('button', { name: 'Выйти' });
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    if (await buttons.nth(i).isVisible()) {
      await buttons.nth(i).click();
      break;
    }
  }
  await page.waitForURL('**/login');
}
