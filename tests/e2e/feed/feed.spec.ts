import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Personalized Feed', () => {

    test('display followed author posts in personalized feed', async ({
        authenticatedPage,
        request,
    }) => {
        const targetAuthor = 'johndoe';

        const jwt = await authenticatedPage.evaluate(() => localStorage.getItem('jwtToken'));
        const followResponse = await request.post(`https://api.realworld.show/api/profiles/${targetAuthor}/follow`, {
            headers: {
                'Authorization': `Token ${jwt}`,
                'Content-Type': 'application/json',
            },
        });
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