import { test, expect } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('/');
  // TODO: MAKE SEED MEANINGFUL
  // Add only the setup the Planner needs, such as login:
  // await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  // await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  // await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
