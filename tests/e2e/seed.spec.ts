import { test, expect } from '../../src/fixtures/fixtures';
import { createRandomUser } from '../../src/helpers/user-factory';

test('seed', async ({ page, registerPage }) => {
  await registerPage.goto();

  const newUser = createRandomUser();
  await registerPage.register(newUser);

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: newUser.username })).toBeVisible();

  const firstArticlePreview = page
    .locator('.article-preview')
    .filter({ has: page.getByRole('heading') })
    .first();
  await expect(firstArticlePreview).toBeVisible();
});
