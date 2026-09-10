import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('responsive layout', () => {
  test('leads list and dashboard render without horizontal scroll on mobile', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile-only: asserts the table->card breakpoint and no h-scroll');
    await login(page, 'admin@crm.local', 'Admin123!');

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);

    // Desktop-only table must be hidden on mobile; card list must be shown instead.
    await expect(page.locator('table')).toBeHidden();

    await page.screenshot({ path: 'screenshots/mobile-leads-list.png', fullPage: true });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const dashboardScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(dashboardScroll).toBe(false);
    await page.screenshot({ path: 'screenshots/mobile-dashboard.png', fullPage: true });
  });

  test('leads list shows the table (not cards) on desktop, with no horizontal scroll', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop-only: asserts the table branch of the breakpoint');
    await login(page, 'admin@crm.local', 'Admin123!');

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);
    await expect(page.locator('table')).toBeVisible();

    await page.screenshot({ path: 'screenshots/desktop-leads-list.png', fullPage: true });
  });
});
