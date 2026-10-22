import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login.page';
import { HomePage } from '../../src/pages/home.page';
import { HeaderComponent } from '../../src/components/header.component';
import { RegisterPage } from '../../src/pages/register.page';

test('login card renders correctly @smoke', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();

  await expect(loginPage.loginCard).toBeVisible();

  await expect(loginPage.loginCard).toHaveScreenshot('login-card.png', {
    animations: 'disabled',
  });
});

test('global feed layout renders correctly @smoke', async ({ page }) => {
  const homePage = new HomePage(page);
  const header = new HeaderComponent(page);

  await homePage.goto();

  await expect(header.navigation).toBeVisible();

  await expect(header.navigation).toHaveScreenshot('app-header.png', {
    animations: 'disabled',
  });
});

test('sign up form renders correctly', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await registerPage.goto();

  await expect(registerPage.signUpForm).toBeVisible();

  await expect(registerPage.signUpForm).toHaveScreenshot('sign-up-form.png', {
    animations: 'disabled',
  });
});
