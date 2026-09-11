import { test, expect } from '../../../src/fixtures/fixtures';

test.describe('Authenticated Navigation', () => {

  test('display authenticated header links and default feed layout on initial load', async ({ authenticatedHomePage }) => {

    // Persistent links (visible across all auth states)
    await expect(authenticatedHomePage.header.brandLink).toBeVisible();
    await expect(authenticatedHomePage.header.homeLink).toBeVisible();

    // Authenticated-only links
    await expect(authenticatedHomePage.header.newArticleLink).toBeVisible();
    await expect(authenticatedHomePage.header.settingsLink).toBeVisible();
    await expect(authenticatedHomePage.header.profileLink).toBeVisible();

    // Unauthenticated links 
    await expect(authenticatedHomePage.header.loginLink).not.toBeVisible();
    await expect(authenticatedHomePage.header.registerLink).not.toBeVisible();

    // Authenticated feed layout checks
    await expect(authenticatedHomePage.personalisedFeedTab).toBeVisible();
    await expect(authenticatedHomePage.globalFeedTab).toBeVisible();
    await expect(authenticatedHomePage.globalFeedTab).toHaveClass(/active/);
  });

  test('navigate to article editor page from header link', async ({ authenticatedHomePage, page }) => {
    await authenticatedHomePage.header.clickNewArticle();

    await expect(page).toHaveURL(/\/editor/);
    await expect(page.getByPlaceholder(/article title/i)).toBeVisible();
  });

  test('navigate to settings page from header link', async ({ authenticatedHomePage, page }) => {
    await authenticatedHomePage.header.clickSettings();

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: /your settings/i })).toBeVisible();
  });

  test('navigate to user profile page from header link', async ({ authenticatedHomePage, page }) => {
    await authenticatedHomePage.header.clickProfile();

    await expect(page).toHaveURL(/\/profile\//);
    await expect(page.getByRole('link', { name: /my posts/i })).toBeVisible();
  });

  test('highlight active navigation tab when switching views', async ({ authenticatedHomePage }) => {

    await expect(authenticatedHomePage.globalFeedTab).toHaveClass(/active/);

    await authenticatedHomePage.personalisedFeedTab.click();
    await expect(authenticatedHomePage.personalisedFeedTab).toHaveClass(/active/);
    await expect(authenticatedHomePage.globalFeedTab).not.toHaveClass(/active/);
  });

});