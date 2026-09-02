import { test, expect } from '../../../src/fixtures/fixtures';

// Keeping this local helper simple for edit/delete tests.
// TODO: Extract to custom fixture if additional specs need API article seeding.
async function seedArticleViaApi(request: any, page: any, articleData: { title: string; description: string; body: string; tagList: string[] }) {
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    const response = await request.post('https://api.realworld.show/api/articles', {
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        },
        data: { article: articleData },
    });
    expect(response.ok()).toBeTruthy();
    const { article } = await response.json();
    return article;
}

// Local helper for URL slug matching.
// TODO: Move to shared utility module if used across multiple spec files.
const toSlug = (title: string) => new RegExp(`/article/${title.toLowerCase().replace(/\s+/g, '-')}`);

test.describe('Article Lifecycle', () => {

    test('create and publish new article', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = Date.now();
        const articleTitle = `Test Article ${timestamp}`;
        const articleDescription = 'E2E test description';
        const articleBody = 'Main body content written in markdown format.';
        const tags = ['playwright', 'typescript'];

        await editorPage.createArticle(
            articleTitle,
            articleDescription,
            articleBody,
            tags
        );

        await expect(page).toHaveURL(toSlug(articleTitle));
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();
        await expect(page.getByText(articleBody)).toBeVisible();

        for (const tag of tags) {
            await expect(page.getByText(tag, { exact: true })).toBeVisible();
        }
    });

    test('edit existing article title', async ({ authenticatedPage, request, editorPage }) => {

        const timestamp = Date.now();
        const initialTitle = `Original Article ${timestamp}`;
        const updatedTitle = `Updated Article ${timestamp}`;

        const article = await seedArticleViaApi(request, authenticatedPage, {
            title: initialTitle,
            description: 'Original description for edit test.',
            body: 'Original body content for edit test.',
            tagList: ['editing'],
        });

        await authenticatedPage.goto(`/editor/${article.slug}`);

        await expect(editorPage.titleInput).toHaveValue(initialTitle);
        await editorPage.titleInput.fill(updatedTitle);
        await editorPage.publishButton.click();

        await expect(authenticatedPage).toHaveURL(toSlug(updatedTitle));
        await expect(authenticatedPage.getByRole('heading', { name: updatedTitle })).toBeVisible();
    });

    test('delete existing article', async ({ authenticatedPage, request }) => {

        const timestamp = Date.now();
        const articleTitle = `Delete Article ${timestamp}`;

        const article = await seedArticleViaApi(request, authenticatedPage, {
            title: articleTitle,
            description: 'Description for deletion test',
            body: 'Body content for deletion test',
            tagList: ['delete'],
        });

        await authenticatedPage.goto(`/article/${article.slug}`);
        await expect(authenticatedPage.getByRole('heading', { name: articleTitle })).toBeVisible();

        await authenticatedPage.getByRole('button', { name: 'Delete Article' }).first().click();
        await expect(authenticatedPage).toHaveURL('/');

        await authenticatedPage.goto(`/article/${article.slug}`);
        await expect(authenticatedPage.getByRole('heading', { name: articleTitle })).not.toBeVisible();
    });

    test('display validation errors on empty form submission', async ({ editorPage }) => {

        await editorPage.goto();

        await editorPage.publishButton.click();

        await expect(editorPage.errorMessages).toBeVisible();
        await expect(editorPage.errorMessages.locator('li')).toContainText([
            "title can't be blank",
            "description can't be blank",
            "body can't be blank"
        ]);
    });
});