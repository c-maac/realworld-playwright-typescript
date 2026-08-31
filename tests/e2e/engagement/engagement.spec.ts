import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Article Page Engagement', () => {
    // Known static seed article on demo.realworld.show
    const publicArticleSlug = 'how-to-learn-javascript-efficiently';

    test('favorite and unfavorite an existing article', async ({
        authenticatedPage,
        articlePage,
    }) => {
        // Direct Entry Point
        await authenticatedPage.goto(`/article/${publicArticleSlug}`);

        await articlePage.toggleFavorite();
        await expect(articlePage.favoriteArticleButton).toHaveText(/unfavorite/i);

        await articlePage.toggleFavorite();
        // Matches " Favorite..." or "Favorite...", but NOT " Unfavorite..."
        await expect(articlePage.favoriteArticleButton).toHaveText(/^\s*favorite/i);
    });

    test('follow and unfollow an author', async ({
        authenticatedPage,
        articlePage,
    }) => {
        
        await authenticatedPage.goto(`/article/${publicArticleSlug}`);

        await articlePage.toggleFollow();
        await expect(articlePage.followAuthorButton).toContainText('Unfollow');

        await articlePage.toggleFollow();
        await expect(articlePage.followAuthorButton).toHaveText(/\bfollow\b/i);
    });

    test('post and delete a new comment on an article', async ({
        authenticatedPage,
        articlePage,
    }) => {
        
        await authenticatedPage.goto(`/article/${publicArticleSlug}`);

        const commentText = `Automation Test Comment - ${Date.now()}`;

        // Ensure comment form finishes loading before taking initial count
        await expect(articlePage.commentInput).toBeVisible();
        const initialCount = await articlePage.commentCards.count();

        await articlePage.addComment(commentText);

        const userCommentCard = authenticatedPage.locator('.card', { hasText: commentText });
        await expect(userCommentCard).toBeVisible();
        await expect(articlePage.commentCards).toHaveCount(initialCount + 1);

        await articlePage.deleteComment(commentText);

        await expect(userCommentCard).toBeHidden();
        await expect(articlePage.commentCards).toHaveCount(initialCount);
    });
});