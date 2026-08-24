import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../src/pages/login.page';
import { RegisterPage } from '../../../src/pages/register.page';

test.describe('Login Flow', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
    });

    test('log in successfully with valid credentials and redirect to home feed', async ({ page }) => {

        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@etest.com`;
        const password = 'Password123!';

        // API pre-seeding is bypassed here due to backend constraints/headers.
        // We register a fresh user via the UI to establish valid credentials in the database before testing login.
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.register(uniqueUsername, uniqueEmail, password);
        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();


        // Programmatically clear session storage to log out.
        // This decouples the login test from the Settings/Logout UI, ensuring that an issue 
        // with the logout feature won't cause false failures in the login test suite.
        await page.evaluate(() => localStorage.clear());
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

        await loginPage.goto();
        await loginPage.login(uniqueEmail, password);

        await expect(page).toHaveURL('/');
        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();
    });

    test('display validation error when logging in with invalid credentials', async ({ page }) => {

        await loginPage.goto();
        await loginPage.login('nonexistent_user@test.com', 'WrongPassword123!');

        await expect(loginPage.errorMessages).toBeVisible();
        await expect(loginPage.errorMessages).toContainText('credentials invalid');

        await expect(page).toHaveURL('/login');
    });
});