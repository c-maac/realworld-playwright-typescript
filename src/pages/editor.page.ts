import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class EditorPage extends BasePage {
    readonly titleInput: Locator;
    readonly descriptionInput: Locator;
    readonly bodyInput: Locator;
    readonly tagsInput: Locator;
    readonly publishButton: Locator;
    readonly errorMessages: Locator;

    constructor(page: Page) {
        super(page);
        this.titleInput = page.getByRole('textbox', { name: 'Article Title' });
        this.descriptionInput = page.getByRole('textbox', { name: "What's this article about?" });
        this.bodyInput = page.getByRole('textbox', { name: 'Write your article (in markdown)' });
        this.tagsInput = page.getByRole('textbox', { name: 'Enter tags' });
        this.publishButton = page.getByRole('button', { name: 'Publish Article' });
        this.errorMessages = page.locator('.error-messages');

    }

    async goto() {
        await this.navigateTo('/editor');
    }

    async createArticle(
        title: string,
        description: string,
        body: string,
        tags: string[] = []
    ) {
        await this.titleInput.fill(title);
        await this.descriptionInput.fill(description);
        await this.bodyInput.fill(body);

        for (const tag of tags) {
            await this.tagsInput.fill(tag);
            await this.tagsInput.press('Enter');
        }

        await this.publishButton.click();
    }
}
