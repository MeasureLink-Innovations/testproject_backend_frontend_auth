import { test, expect } from '@playwright/test';

test('dashboard loads and requires authentication', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Measurement System/);
  await expect(page.getByText('Please sign in to access the dashboard')).toBeVisible();
});
