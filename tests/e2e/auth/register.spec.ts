import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Registration Flow', () => {

    test('register a new user successfully and redirect to home page', async ({ page, registerPage }) => {

        await registerPage.goto();

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

    test('display validation errors when registration fails', async ({ page, registerPage }) => {

        await registerPage.goto();

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