import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Article Publishing and Editing', () => {

    test('create and publish a new article successfully', async ({ authenticatedEditorPage, page }) => {
        const timestamp = Date.now();
        const articleTitle = `Test Article ${timestamp}`;
        const articleDescription = 'E2E test description';
        const articleBody = 'Main body content written in markdown format.';
        const tags = ['playwright', 'typescript'];

        // Convert title to slug format (e.g., "test-article-1724597000")
        const expectedSlugPrefix = articleTitle.toLowerCase().replace(/\s+/g, '-');

        await authenticatedEditorPage.createArticle(
            articleTitle,
            articleDescription,
            articleBody,
            tags
        );

        await expect(page).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();
    });

    test('edit an existing article title successfully', async ({ authenticatedEditorPage, page }) => {
        const timestamp = Date.now();
        const initialTitle = `Original Article ${timestamp}`;
        const updatedTitle = `Updated Article ${timestamp}`;

        await authenticatedEditorPage.createArticle(
            initialTitle,
            'Original description',
            'Original body content'
        );

        await expect(page.getByRole('heading', { name: initialTitle })).toBeVisible();

        await page.getByRole('link', { name: 'Edit Article' }).first().click();

        // Wait for the edit form to be populated with existing data
        await expect(authenticatedEditorPage.titleInput).toHaveValue(initialTitle);

        await authenticatedEditorPage.titleInput.fill(updatedTitle);
        await authenticatedEditorPage.publishButton.click();

        const expectedSlugPrefix = updatedTitle.toLowerCase().replace(/\s+/g, '-');

        await expect(page).toHaveURL(new RegExp(`/article/${expectedSlugPrefix}`));
        await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
    });

    test('delete an existing article successfully', async ({ authenticatedEditorPage, page }) => {
        const timestamp = Date.now();
        const articleTitle = `Delete Article ${timestamp}`;

        await authenticatedEditorPage.createArticle(
            articleTitle,
            'Description for deletion test',
            'Body content for deletion test'
        );
        await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();

        await page.getByRole('button', { name: 'Delete Article' }).first().click();

        await expect(page).toHaveURL('/');
    });

    test('displays validation errors when submitting an empty form', async ({ authenticatedEditorPage }) => {
        // Attempt to publish without filling required fields
        await authenticatedEditorPage.publishButton.click();

        await expect(authenticatedEditorPage.errorMessages).toBeVisible();
        await expect(authenticatedEditorPage.errorMessages.locator('li')).toContainText([
            "title can't be blank",
            "description can't be blank",
            "body can't be blank"
        ]);
    });
});