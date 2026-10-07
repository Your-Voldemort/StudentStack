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

test.describe('Admin Login', () => {
  test('should render the login form', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('h1')).toContainText('Admin login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('should show an error for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('input[name="email"]').fill('not-an-admin@example.com');
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/.*admin\/login\?error=/);
    await expect(page.locator('main p')).toContainText(
      /Invalid email or password|Not an admin account/
    );
  });
});

test.describe('Admin Auth Guard', () => {
  const adminRoutes = ['/admin', '/admin/ingestion', '/admin/resources/new'];

  for (const route of adminRoutes) {
    test(`should redirect ${route} to login when not authenticated`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*admin\/login/);
    });
  }
});
