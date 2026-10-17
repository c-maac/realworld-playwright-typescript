import { test, expect } from '../../../src/fixtures/fixtures';
import { createRandomUser } from '../../../src/helpers/user-factory';

test.describe('Registration Flow', () => {

    test('register a new user and redirect to home page @smoke', async ({ page, registerPage }) => {

        await registerPage.goto();

        const newUser = createRandomUser();
        await registerPage.register(newUser);

        await expect(page).toHaveURL('/');
        await expect(page.getByRole('link', { name: newUser.username })).toBeVisible();
    });

    test('display error message on duplicate registration', async ({ page, registerPage }) => {

        await registerPage.goto();

        // Mock a 422 API error response to test UI error handling gracefully.
        // Interception is necessary because the demo backend does not consistently enforce 
        // database uniqueness, making mock responses the most reliable way to verify UI error displays.
        await page.route('**/api/users', async (route) => {
            await route.fulfill({
                status: 422,
                contentType: 'application/json',
                body: JSON.stringify({
                    errors: {
                        email: ['is already taken']
                    },
                }),
            });
        });

        const existingUser = createRandomUser();
        await registerPage.register(existingUser);

        await expect(registerPage.errorMessages).toBeVisible();
        await expect(registerPage.errorMessages).toContainText('email is already taken');
        await expect(page).toHaveURL('/register');
    });
});