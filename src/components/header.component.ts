import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly navigation: Locator;

  // Shared
  readonly brandLink: Locator;
  readonly homeLink: Locator;

  // Guest Links
  readonly loginLink: Locator;
  readonly registerLink: Locator;

  // Authenticated Links
  readonly newArticleLink: Locator;
  readonly settingsLink: Locator;
  readonly profileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.getByRole('navigation');
    // Scoped strictly to navigation to avoid matching footer brand link.
    this.brandLink = this.navigation.getByRole('link', { name: 'conduit' });
    this.homeLink = page.getByRole('link', { name: 'Home' });
    this.loginLink = page.getByRole('link', { name: 'Sign in' });
    this.registerLink = page.getByRole('link', { name: 'Sign up' });
    this.newArticleLink = page.getByRole('link', { name: 'New Article' });
    this.settingsLink = page.getByRole('link', { name: 'Settings' });
    this.profileLink = page.locator('.nav-link', { has: page.locator('.user-pic') });
  }

  async clickBrand() {
    await this.brandLink.click();
  }

  async clickHome() {
    await this.homeLink.click();
  }

  async clickSignIn() {
    await this.loginLink.click();
  }

  async clickSignUp() {
    await this.registerLink.click();
  }

  async clickNewArticle() {
    await this.newArticleLink.click();
  }

  async clickSettings() {
    await this.settingsLink.click();
  }

  async clickProfile() {
    await this.profileLink.click();
  }
}
