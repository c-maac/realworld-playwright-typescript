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

test.describe('Global Feed Tag Filtering', () => {
  test('filter global feed by a tag selected from Popular Tags', async ({
    page,
    publicHomePage,
  }) => {
    await publicHomePage.goto();
    await expect(publicHomePage.tagList).toBeVisible();

    await publicHomePage.tagList.getByRole('link', { name: 'javascript', exact: true }).click();

    await expect(page).toHaveURL(/\/tag\/javascript$/);
    await expect(
      page.locator('.feed-toggle').getByText('javascript', { exact: true }),
    ).toBeVisible();

    const articlePreviews = page
      .locator('.article-preview')
      .filter({ has: page.getByRole('heading') });
    await expect(articlePreviews.first()).toBeVisible();

    const previewCount = await articlePreviews.count();
    expect(previewCount).toBeGreaterThan(0);

    for (let index = 0; index < previewCount; index += 1) {
      await expect(
        articlePreviews.nth(index).locator('.tag-list').getByText('javascript', { exact: true }),
      ).toBeVisible();
    }
  });

  test('return to the unfiltered global feed from a tag filter', async ({ page }) => {
    await page.goto('/tag/javascript');
    await expect(
      page.locator('.feed-toggle').getByText('javascript', { exact: true }),
    ).toBeVisible();

    await expect(
      page
        .locator('.article-preview')
        .filter({ has: page.getByRole('heading') })
        .first(),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Global Feed' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('.feed-toggle')).not.toContainText('javascript');

    const nodeJsArticle = page.locator('.article-preview').filter({
      has: page.getByRole('heading', { name: 'Building Scalable APIs with Node.js', exact: true }),
    });
    await expect(nodeJsArticle).toBeVisible();
    await expect(
      nodeJsArticle.locator('.tag-list').getByText('nodejs', { exact: true }),
    ).toBeVisible();
    await expect(
      nodeJsArticle.locator('.tag-list').getByText('javascript', { exact: true }),
    ).toHaveCount(0);
  });
});
