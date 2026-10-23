import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login.page';
import { HomePage } from '../../src/pages/home.page';
import { HeaderComponent } from '../../src/components/header.component';

test('login form exposes accessible controls', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();

  await expect(loginPage.emailInput).toHaveAccessibleName('Email');
  await expect(loginPage.passwordInput).toHaveAccessibleName('Password');
  await expect(loginPage.submitButton).toHaveRole('button');
  await expect(loginPage.submitButton).toHaveAccessibleName('Sign in');
});

test('login form has expected accessible structure', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();

  await expect(page.locator('app-auth-page')).toMatchAriaSnapshot(`
    - heading "Sign in" [level=1]
    - paragraph:
      - link "Need an account?":
        - /url: /register
    - list
    - group:
      - group
      - group:
        - textbox "Email"
      - group:
        - textbox "Password"
      - button "Sign in"
  `);
});

test('home navigation has expected accessible structure', async ({ page }) => {
  const homePage = new HomePage(page);
  const header = new HeaderComponent(page);

  await homePage.goto();

  await expect(header.navigation).toMatchAriaSnapshot(`
  - link "Conduit":
    - /url: /
    - img "Conduit"
  - list:
    - listitem:
      - link "Home":
        - /url: /
    - listitem:
      - link "Sign in":
        - /url: /login
    - listitem:
      - link "Sign up":
        - /url: /register
  `);
});
