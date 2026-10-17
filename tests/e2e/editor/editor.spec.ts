import { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/fixtures';
import { getAuthHeader, getUniqueStamp, toSlug } from '../../../src/helpers/api-helpers';

interface ArticleData {
    title: string;
    description: string;
    body: string;
    tagList: string[];
}

//Seeds an article directly via API using the active session's JWT token stored in localStorage.
async function seedArticleViaApi(request: APIRequestContext, page: Page, articleData: ArticleData) {
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));

    if (!token) {
        throw new Error('Cannot seed article: No JWT token found in localStorage.');
    }

    const response = await request.post('https://api.realworld.show/api/articles', {
        headers: {
            ...getAuthHeader(token),
            'Content-Type': 'application/json',
        },
        data: { article: articleData },
    });

    expect(response.ok()).toBeTruthy();
    const { article } = await response.json();
    return article;
}


test.describe('Article Lifecycle', () => {

    test('create and publish new article @smoke', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = getUniqueStamp();
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

        const timestamp = getUniqueStamp();
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

        const timestamp = getUniqueStamp();
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