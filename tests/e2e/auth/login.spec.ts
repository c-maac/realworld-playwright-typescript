import { test, expect } from '../../../src/fixtures/fixtures';
import { getUniqueStamp, registerUser } from '../../../src/helpers/api-helpers';

test.describe('Login Flow', () => {
  test('log in with valid credentials and redirect to home feed @smoke', async ({
    page,
    request,
    loginPage,
  }) => {
    const { credentials, user } = await registerUser(request);

    await loginPage.goto();
    await loginPage.login(credentials.email, credentials.password);

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: user.username })).toBeVisible();
  });

  test('display error message on invalid credentials', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(`nonexistent_${getUniqueStamp()}@test.com`, 'WrongPassword123!');

    await expect(loginPage.errorMessages).toBeVisible();
    await expect(loginPage.errorMessages).toContainText('credentials invalid');

    await expect(page).toHaveURL('/login');
  });
});
