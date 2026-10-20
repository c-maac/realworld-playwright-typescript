import { test, expect } from '../../../src/fixtures/fixtures';
import { getAuthHeader } from '../../../src/helpers/api-helpers';

test.describe('Personalized Feed', () => {
  test('display followed author posts in personalized feed @smoke', async ({
    authenticatedPage,
    request,
  }) => {
    const targetAuthor = 'johndoe';

    const token = await authenticatedPage.evaluate(() => localStorage.getItem('jwtToken'));

    if (!token) {
      throw new Error(`Failed to follow user ${targetAuthor} No JWT token found in localStorage.`);
    }
    const followResponse = await request.post(
      `https://api.realworld.show/api/profiles/${targetAuthor}/follow`,
      {
        headers: {
          ...getAuthHeader(token),
          'Content-Type': 'application/json',
        },
      },
    );
    expect(followResponse.ok()).toBeTruthy();

    await authenticatedPage.goto('/?feed=following');

    const firstArticlePreview = authenticatedPage
      .locator('.article-preview')
      .filter({ has: authenticatedPage.getByRole('heading') })
      .first();
    await expect(firstArticlePreview).toBeVisible();
    await expect(firstArticlePreview).toContainText(targetAuthor);
  });
});
