import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Article Lifecycle', () => {

    test('create and publish new article', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = Date.now();
        const articleTitle = `Test Article ${timestamp}`;
        const articleDescription = 'E2E test description';
        const articleBody = 'Main body content written in markdown format.';
        const tags = ['playwright', 'typescript'];

        const expectedSlugPrefix = articleTitle.toLowerCase().replace(/\s+/g, '-');

        await editorPage.createArticle(
            articleTitle,
            articleDescription,
            articleBody,
            tags
        );

        await expect(page).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
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

        const token = await authenticatedPage.evaluate(() => localStorage.getItem('jwtToken'));

        const response = await request.post('https://api.realworld.show/api/articles', {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                article: {
                    title: initialTitle,
                    description: 'Original description for edit test.',
                    body: 'Original body content.',
                    tagList: ['editing'],
                },
            },
        });
        expect(response.ok()).toBeTruthy();
        const { article } = await response.json();

        await authenticatedPage.goto(`/editor/${article.slug}`);

        await expect(editorPage.titleInput).toHaveValue(initialTitle);
        await editorPage.titleInput.fill(updatedTitle);
        await editorPage.publishButton.click();

        const expectedSlugPrefix = updatedTitle.toLowerCase().replace(/\s+/g, '-');
        await expect(authenticatedPage).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
        await expect(authenticatedPage.getByRole('heading', { name: updatedTitle })).toBeVisible();
    });

    test('delete existing article', async ({ authenticatedPage, request }) => {

        const timestamp = Date.now();
        const articleTitle = `Delete Article ${timestamp}`;

        const token = await authenticatedPage.evaluate(() => localStorage.getItem('jwtToken'));

        const response = await request.post('https://api.realworld.show/api/articles', {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            data: {
                article: {
                    title: articleTitle,
                    description: 'Description for deletion test',
                    body: 'Body content for deletion test',
                    tagList: ['delete'],
                },
            },
        });
        expect(response.ok()).toBeTruthy();
        const { article } = await response.json();

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