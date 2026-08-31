import { test as base, expect, Page } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { EditorPage } from '../pages/editor.page';
import { ArticlePage } from '../pages/article.page';

type AuthFixtures = {
    authenticatedPage: Page;
    editorPage: EditorPage;
    articlePage: ArticlePage;
};

export const test = base.extend<AuthFixtures>({
    // Base authenticated page fixture: registers a fresh user and yields the authenticated page context
    authenticatedPage: async ({ page, request }, use) => {
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
        const { user } = await response.json();

        await page.addInitScript((token) => {
            window.localStorage.setItem('jwtToken', token);
        }, user.token);

        await page.goto('/');
        await use(page);
    },

    editorPage: async ({ authenticatedPage }, use) => {
        await use(new EditorPage(authenticatedPage));
    },

    articlePage: async ({ authenticatedPage }, use) => {
        await use(new ArticlePage(authenticatedPage));
    },
});

export { expect };