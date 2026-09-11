import { test, expect } from '@playwright/test';

test.describe('Route Guards & Access Control', () => {

  const protectedRoutes = [
    { name: 'editor page', path: '/editor' },
    { name: 'editor article slug page', path: '/editor/some-article-slug' },
    { name: 'settings page', path: '/settings' },
  ];

  for (const { name, path } of protectedRoutes) {
    test(`redirect unauthenticated user from ${name} to login page`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/#?\/login$/);
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    });
  }

});