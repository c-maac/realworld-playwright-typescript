import { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/header.component';

export class BasePage {
    readonly header: HeaderComponent;
    readonly footer: Locator;

    constructor(readonly page: Page) {
        this.page = page;
        this.header = new HeaderComponent(page);
        this.footer = page.getByRole('contentinfo');
    }

    /**
     * Navigates to a path relative to the baseURL set in playwright.config.ts
     */
    async navigateTo(path: string = '/') {
        await this.page.goto(path);
    }
}