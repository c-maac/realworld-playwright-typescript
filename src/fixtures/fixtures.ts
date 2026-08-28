import { test as base, expect } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { EditorPage } from '../pages/editor.page';
import { ArticlePage } from '../pages/article.page';

type AuthFixtures = {
    authenticatedEditorPage: EditorPage;
    authenticatedArticlePage: ArticlePage;
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
    authenticatedArticlePage: async ({ page }, use) => {
        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@test.com`;
        const password = 'Password123!';

        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.register(uniqueUsername, uniqueEmail, password);
        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();

        await page.goto('/');

        // Wait for feed to load by targeting a card with an actual article heading
        await page.locator('.article-preview').filter({ has: page.getByRole('heading') }).first().click();

        // Ensure route transition completes before yielding
        await expect(page).toHaveURL(/.*\/article\/.*/);

        // Yield article page object to test
        const articlePage = new ArticlePage(page);
        await use(articlePage);
    },
});

export { expect };