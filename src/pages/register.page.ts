import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TestUser } from '../helpers/user-factory';

export class RegisterPage extends BasePage {
  readonly signUpForm: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessages: Locator;

  constructor(page: Page) {
    super(page);
    this.signUpForm = page.locator('form');
    this.usernameInput = page.getByPlaceholder('Username');
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign up' });
    this.errorMessages = page.locator('.error-messages');
  }

  async goto() {
    await this.navigateTo('/register');
  }

  async register(user: TestUser) {
    await this.usernameInput.fill(user.username);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.submitButton.click();
  }
}
