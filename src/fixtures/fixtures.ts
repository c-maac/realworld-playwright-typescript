import { test as base, expect, Page } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { EditorPage } from '../pages/editor.page';
import { ArticlePage } from '../pages/article.page';

type AuthFixtures = {
    authenticatedPage: Page;
    authenticatedEditorPage: EditorPage;
    authenticatedArticlePage: ArticlePage;
};

export const test = base.extend<AuthFixtures>({
    // Base authenticated page fixture: registers a fresh user and yields the authenticated page context
    authenticatedPage: async ({ page }, use) => {
        const timestamp = Date.now();
        const uniqueUsername = `user_${timestamp}`;
        const uniqueEmail = `user_${timestamp}@test.com`;
        const password = 'Password123!';

        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.register(uniqueUsername, uniqueEmail, password);

        await expect(page.getByRole('link', { name: uniqueUsername })).toBeVisible();

        // Yield the authenticated page object directly
        await use(page);
    },

    authenticatedEditorPage: async ({ authenticatedPage }, use) => {
        const editorPage = new EditorPage(authenticatedPage);
        await editorPage.goto();

        await use(editorPage);
    },

    authenticatedArticlePage: async ({ authenticatedPage }, use) => {
        await authenticatedPage.goto('/');

        // Wait for feed to load by targeting a card with an actual article heading
        await authenticatedPage.locator('.article-preview').filter({ has: authenticatedPage.getByRole('heading') }).first().click();

        // Ensure route transition completes before yielding
        await expect(authenticatedPage).toHaveURL(/.*\/article\/.*/);

        // Yield article page object to test
        const articlePage = new ArticlePage(authenticatedPage);
        await use(articlePage);
    },
});

export { expect };