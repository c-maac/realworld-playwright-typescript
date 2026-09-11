import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class HomePage extends BasePage {
    readonly globalFeedTab: Locator;
    readonly personalisedFeedTab: Locator;
    readonly tagList: Locator;

    constructor(page: Page) {
        super(page);
        this.globalFeedTab = this.page.getByRole('link', { name: 'Global Feed' });
        this.personalisedFeedTab = this.page.getByRole('link', { name: 'Your Feed' });
        this.tagList = this.page.locator('.sidebar .tag-list');
    }

    async goto() {
        await this.navigateTo('/');
    }
}