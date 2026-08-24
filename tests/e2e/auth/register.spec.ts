import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../../src/pages/register.page';

test.describe('Registration Flow', () => {
    let registerPage: RegisterPage;

    test.beforeEach(async ({ page }) => {
        registerPage = new RegisterPage(page);
        await registerPage.goto();
    });

    test('register a new user successfully and redirect to home page', async ({ page }) => {
        // Generate unique credentials to avoid collisions on repeat runs
        // Clean-up/teardown will be omitted as the RealWorld Conduit backend does not expose a user deletion endpoint
        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@test.com`;
        const password = 'Password123!';

        await registerPage.register(uniqueUsername, uniqueEmail, password);

        await expect(page).toHaveURL('/');
        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();
    });

    test('display validation errors when registration fails', async ({ page }) => {

        // Intercept registration API call to mock a 409 Conflict response.
        // Network interception is used here because the demo backend lacks persistent 
        // uniqueness validation, preventing native 409 duplicate errors through the UI.
        await page.route('**/api/users', async (route) => {
            await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                    errors: {
                        email: ['is already taken']
                    },
                }),
            });
        });

        await registerPage.register('user_duplicate', 'user_duplicate@test.com', 'Password123!');

        await expect(registerPage.errorMessages).toBeVisible();
        await expect(registerPage.errorMessages).toContainText('email is already taken');
        await expect(page).toHaveURL('/register');
    });
});