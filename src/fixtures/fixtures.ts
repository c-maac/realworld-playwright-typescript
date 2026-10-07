import { test as base, expect, Page } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { EditorPage } from '../pages/editor.page';
import { ArticlePage } from '../pages/article.page';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';
import { registerUser } from '../helpers/api-helpers';

type AppFixtures = {
    authenticatedPage: Page;
    registerPage: RegisterPage;
    loginPage: LoginPage;
    editorPage: EditorPage;
    articlePage: ArticlePage;
    publicHomePage: HomePage;
    authenticatedHomePage: HomePage;
};

export const test = base.extend<AppFixtures>({
    // Base authenticated page fixture: registers a fresh user and yields the authenticated page context
    authenticatedPage: async ({ page, request }, use) => {
       const { token } = await registerUser(request);

        await page.addInitScript((jwt) => {
            window.localStorage.setItem('jwtToken', jwt);
        }, token);

        await page.goto('/');
        await use(page);
    },

    registerPage: async ({ page }, use) => {
        await use(new RegisterPage(page));
    },

    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    editorPage: async ({ authenticatedPage }, use) => {
        await use(new EditorPage(authenticatedPage));
    },

    articlePage: async ({ authenticatedPage }, use) => {
        await use(new ArticlePage(authenticatedPage));
    },

    publicHomePage: async ({ page }, use) => {
        await use(new HomePage(page));
    },

    authenticatedHomePage: async ({ authenticatedPage }, use) => {
        await use(new HomePage(authenticatedPage));
    },
});

export { expect };