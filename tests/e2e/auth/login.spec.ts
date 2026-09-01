import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Login Flow', () => {

    test('log in with valid credentials and redirect to home feed', async ({ page, request, loginPage }) => {

        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@test.com`;
        const password = 'Password123!';

        const response = await request.post('https://api.realworld.show/api/users', {
            data: {
                user: {
                    username: uniqueUsername,
                    email: uniqueEmail,
                    password: password,
                },
            },
        });
        expect(response.ok()).toBeTruthy();


        await loginPage.goto();
        await loginPage.login(uniqueEmail, password);

        await expect(page).toHaveURL('/');
        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();
    });

    test('display error message on invalid credentials', async ({ page, loginPage }) => {

        await loginPage.goto();
        await loginPage.login('nonexistent_user@test.com', 'WrongPassword123!');

        await expect(loginPage.errorMessages).toBeVisible();
        await expect(loginPage.errorMessages).toContainText('credentials invalid');

        await expect(page).toHaveURL('/login');
    });
});