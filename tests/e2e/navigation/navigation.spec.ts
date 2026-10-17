import { test, expect } from '../../../src/fixtures/fixtures';
import { toSlug } from '../../../src/helpers/api-helpers';

test.describe('Guest State Navigation', () => {
  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('display guest header links and default feed layout on initial load', async ({ publicHomePage }) => {

    await expect(publicHomePage.header.brandLink).toBeVisible();
    await expect(publicHomePage.header.homeLink).toBeVisible();
    await expect(publicHomePage.header.loginLink).toBeVisible();
    await expect(publicHomePage.header.registerLink).toBeVisible();

    await expect(publicHomePage.header.newArticleLink).not.toBeVisible();
    await expect(publicHomePage.header.settingsLink).not.toBeVisible();
    await expect(publicHomePage.header.profileLink).not.toBeVisible();

    await expect(publicHomePage.globalFeedTab).toBeVisible();
    await expect(publicHomePage.personalisedFeedTab).not.toBeVisible();
  });

  test('navigate to sign in page from header link @smoke', async ({ publicHomePage, page }) => {

    await publicHomePage.header.clickSignIn();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('navigate to sign up page from header link @smoke', async ({ publicHomePage, page }) => {

    await publicHomePage.header.clickSignUp();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  });

  test('redirect to home page when clicking banner brand logo', async ({ publicHomePage, page }) => {

    await publicHomePage.header.clickSignIn();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await publicHomePage.header.clickBrand();

    await expect(page).toHaveURL(/\/$/);
    await expect(publicHomePage.globalFeedTab).toBeVisible();
  });

  test('redirect to home page when clicking footer brand logo', async ({ publicHomePage, page }) => {

    await publicHomePage.header.clickSignIn();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await publicHomePage.footer.getByRole('link', { name: 'conduit' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(publicHomePage.globalFeedTab).toBeVisible();
  });

  test('redirect to home page when clicking home link', async ({ publicHomePage, page }) => {

    await publicHomePage.header.clickSignUp();
    await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
    await publicHomePage.header.clickHome();

    await expect(page).toHaveURL(/\/$/);
    await expect(publicHomePage.globalFeedTab).toBeVisible();
  });


  // Asserts external links via DOM attributes (href/target) rather than clicking them.
  // Avoids external network calls, prevents GitHub rate-limiting/flakiness, and keeps execution fast & offline-capable.

  test('display valid external repository links in banner and footer', async ({ publicHomePage, page }) => {
    // Banner Links
    const angularBannerLink = page.getByRole('link', { name: /angular/i });
    const realWorldBannerLink = page.getByRole('link', { name: 'Realworld', exact: true });

    await expect(angularBannerLink).toBeVisible();
    await expect(angularBannerLink).toHaveAttribute('href', 'https://github.com/realworld-apps/angular-realworld-example-app');

    await expect(realWorldBannerLink).toBeVisible();
    await expect(realWorldBannerLink).toHaveAttribute('href', 'https://github.com/realworld-apps/realworld');

    // Footer Links
    const realWorldFooterLink = publicHomePage.footer.getByRole('link', { name: /realworld/i });
    await expect(realWorldFooterLink).toBeVisible();
    await expect(realWorldFooterLink).toHaveAttribute('href', 'https://github.com/gothinkster/realworld');
  });

  test('navigate to article detail from article preview', async ({ page }) => {

    const firstArticleTitleLocator = page.locator('.article-preview h1').first();
    await expect(firstArticleTitleLocator).toBeVisible();

    const titleText = await firstArticleTitleLocator.innerText();
    await firstArticleTitleLocator.click();

    await expect(page).toHaveURL(toSlug(titleText));
  });

  test('navigate to author profile from article preview', async ({ page }) => {
    const firstAuthorLink = page.locator('.article-preview .author').first();
    await expect(firstAuthorLink).toBeVisible();

    const authorName = (await firstAuthorLink.innerText()).trim();
    await firstAuthorLink.click();

    await expect(page).toHaveURL(new RegExp(`/profile/${encodeURIComponent(authorName)}`));
    await expect(page.getByRole('heading', { name: authorName })).toBeVisible();
  });
});