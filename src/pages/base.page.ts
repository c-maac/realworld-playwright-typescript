import { Page } from '@playwright/test';

export class BasePage {

    constructor(readonly page: Page) {
        this.page = page;
    }

    /**
     * Navigates to a path relative to the baseURL set in playwright.config.ts
     */
    async navigateTo(path: string = '/') {
        await this.page.goto(path);
    }
}