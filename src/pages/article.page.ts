import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ArticlePage extends BasePage {
    readonly articleTitle: Locator;
    readonly followAuthorButton: Locator;
    readonly favoriteArticleButton: Locator;
    readonly commentInput: Locator;
    readonly postCommentButton: Locator;
    readonly commentCards: Locator;

    constructor(page: Page) {
        super(page);
        this.articleTitle = page.getByRole('heading', { level: 1 });
        this.followAuthorButton = page.getByRole('button', { name: /follow/i }).first();
        // Uses case-insensitive regex to capture the button whether it reads "Favorite" or "Unfavorite"
        this.favoriteArticleButton = page.getByRole('button', { name: /favorite/i }).first();
        this.commentInput = page.getByPlaceholder('Write a comment...');
        this.postCommentButton = page.getByRole('button', { name: 'Post Comment' });
        this.commentCards = page.locator('.card');
    }

    async addComment(commentText: string) {
        await this.commentInput.fill(commentText);
        await this.postCommentButton.click();
    }

    async deleteComment(commentText: string) {
        const commentCard = this.page.locator('.card', { hasText: commentText });
        // Target the trash bin delete button specifically inside that comment card
        await commentCard.locator('span.mod-options i.ion-trash-a').click();
    }

    async toggleFavorite() {
        await this.favoriteArticleButton.click();
    }

    async toggleFollow() {
        await this.followAuthorButton.click();
    }

    /**
     * Navigates directly to an article details page using its slug.
     * @param slug - The unique article identifier (e.g., 'how-to-train-your-dragon-12345')
     */
    async goto(slug: string) {
        await this.page.goto(`/#/article/${slug}`);
    }
}