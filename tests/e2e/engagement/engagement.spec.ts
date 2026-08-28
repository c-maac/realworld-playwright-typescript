import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Article Page Engagement', () => {

    test('favorite and unfavorite an existing article', async ({
        page,
        authenticatedArticlePage,
    }) => {

        await authenticatedArticlePage.toggleFavorite();
        await expect(authenticatedArticlePage.favoriteArticleButton).toHaveText(/unfavorite/i);

        await authenticatedArticlePage.toggleFavorite();
        // Matches " Favorite..." or "Favorite...", but NOT " Unfavorite..."
        await expect(authenticatedArticlePage.favoriteArticleButton).toHaveText(/^\s*favorite/i);

    });

    test('follow and unfollow an author', async ({
        authenticatedArticlePage,
    }) => {

        await authenticatedArticlePage.toggleFollow();
        await expect(authenticatedArticlePage.followAuthorButton).toContainText('Unfollow');

        await authenticatedArticlePage.toggleFollow();
        await expect(authenticatedArticlePage.followAuthorButton).toHaveText(/\bfollow\b/i);
    });

    test('post and delete a new comment on an article', async ({
        authenticatedArticlePage,
        page,
    }) => {
        const commentText = `Automation Test Comment - ${Date.now()}`;

        // Ensure comment form finishes loading before taking initial count
        await expect(authenticatedArticlePage.commentInput).toBeVisible();
        const initialCount = await authenticatedArticlePage.commentCards.count();

        await authenticatedArticlePage.addComment(commentText);

        const userCommentCard = page.locator('.card', { hasText: commentText });
        await expect(userCommentCard).toBeVisible();
        await expect(authenticatedArticlePage.commentCards).toHaveCount(initialCount + 1);

        await authenticatedArticlePage.deleteComment(commentText);

        await expect(userCommentCard).toBeHidden();
        await expect(authenticatedArticlePage.commentCards).toHaveCount(initialCount);
    });
});