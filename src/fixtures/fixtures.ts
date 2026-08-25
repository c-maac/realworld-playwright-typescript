import { test as base, expect } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { EditorPage } from '../pages/editor.page';

type AuthFixtures = {
    authenticatedEditorPage: EditorPage;
};

export const test = base.extend<AuthFixtures>({
    authenticatedEditorPage: async ({ page }, use) => {
        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@test.com`;
        const password = 'Password123!';

        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.register(uniqueUsername, uniqueEmail, password);

        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();
        await expect(page.getByRole('link', { name: 'New Article' })).toBeVisible();

        const editorPage = new EditorPage(page);
        await editorPage.goto();

        await use(editorPage);
    },
});

export { expect };