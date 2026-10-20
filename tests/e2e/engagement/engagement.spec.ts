import { test, expect } from '../../../src/fixtures/fixtures';
import { getUniqueStamp } from '../../../src/helpers/api-helpers';

test.describe('Engagement', () => {
  // Uses a known static article because backend session isolation prevents cross-user
  // content visibility. User-specific interactions (likes, follows, comments) are isolated
  // to the active test session, eliminating state pollution across test runs.
  const publicArticleSlug = 'how-to-learn-javascript-efficiently';

  test('toggle article favorite state @smoke', async ({ authenticatedPage, articlePage }) => {
    await authenticatedPage.goto(`/article/${publicArticleSlug}`);

    await articlePage.toggleFavorite();
    await expect(articlePage.favoriteArticleButton).toHaveText(/\bunfavorite\b/i);

    await articlePage.toggleFavorite();
    // Matches "Favorite", " Favorite", "Favorite (1)"
    // BLOCKS "Unfavorite"
    await expect(articlePage.favoriteArticleButton).toHaveText(/\bfavorite\b/i);
  });

  test('toggle author follow state @smoke', async ({ authenticatedPage, articlePage }) => {
    await authenticatedPage.goto(`/article/${publicArticleSlug}`);

    await articlePage.toggleFollow();
    await expect(articlePage.followAuthorButton).toContainText(/\bunfollow\b/i);

    await articlePage.toggleFollow();
    await expect(articlePage.followAuthorButton).toHaveText(/\bfollow\b/i);
  });

  test('post and delete comment on article @smoke', async ({ authenticatedPage, articlePage }) => {
    await authenticatedPage.goto(`/article/${publicArticleSlug}`);

    const commentText = `Automation Test Comment - ${getUniqueStamp()}`;

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
