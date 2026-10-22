import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login.page';

test.describe('Login visual checks', () => {
  test('login card renders correctly @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    await expect(loginPage.loginCard).toBeVisible();

    await expect(loginPage.loginCard).toHaveScreenshot('login-card.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
