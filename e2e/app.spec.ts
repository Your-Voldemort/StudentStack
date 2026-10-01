import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/StudentStack/);
  });

  test('should have proper heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate to directory', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/directory"]');
    await expect(page).toHaveURL(/.*directory/);
  });
});

test.describe('Directory Page', () => {
  test('should load directory page', async ({ page }) => {
    await page.goto('/directory');
    await expect(page.locator('h1')).toContainText('Directory');
  });

  test('should have filter panel', async ({ page }) => {
    await page.goto('/directory');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
  });
});

test.describe('Admin Pages', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*admin\/login/);
  });
});