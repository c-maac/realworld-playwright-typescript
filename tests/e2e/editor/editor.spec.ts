import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Article Publishing and Editing', () => {

    test('create and publish a new article successfully', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = Date.now();
        const articleTitle = `Test Article ${timestamp}`;
        const articleDescription = 'E2E test description';
        const articleBody = 'Main body content written in markdown format.';
        const tags = ['playwright', 'typescript'];

        // Convert title to slug format (e.g., "test-article-1724597000")
        const expectedSlugPrefix = articleTitle.toLowerCase().replace(/\s+/g, '-');

        await editorPage.createArticle(
            articleTitle,
            articleDescription,
            articleBody,
            tags
        );

        await expect(page).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();
    });

    test('edit an existing article title successfully', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = Date.now();
        const initialTitle = `Original Article ${timestamp}`;
        const updatedTitle = `Updated Article ${timestamp}`;

        await editorPage.createArticle(
            initialTitle,
            'Original description',
            'Original body content'
        );

        await expect(page.getByRole('heading', { name: initialTitle })).toBeVisible();

        await page.getByRole('link', { name: 'Edit Article' }).first().click();

        // Wait for the edit form to be populated with existing data
        await expect(editorPage.titleInput).toHaveValue(initialTitle);

        await editorPage.titleInput.fill(updatedTitle);
        await editorPage.publishButton.click();

        const expectedSlugPrefix = updatedTitle.toLowerCase().replace(/\s+/g, '-');

        await expect(page).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
        await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
    });

    test('delete an existing article successfully', async ({ editorPage, page }) => {

        await editorPage.goto();

        const timestamp = Date.now();
        const articleTitle = `Delete Article ${timestamp}`;

        await editorPage.createArticle(
            articleTitle,
            'Description for deletion test',
            'Body content for deletion test'
        );
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();

        await page.getByRole('button', { name: 'Delete Article' }).first().click();

        await expect(page).toHaveURL('/');
    });

    test('displays validation errors when submitting an empty form', async ({ editorPage }) => {

        await editorPage.goto();

        // Attempt to publish without filling required fields
        await editorPage.publishButton.click();

        await expect(editorPage.errorMessages).toBeVisible();
        await expect(editorPage.errorMessages.locator('li')).toContainText([
            "title can't be blank",
            "description can't be blank",
            "body can't be blank"
        ]);
    });
});