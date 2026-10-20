import { test, expect } from '@playwright/test';
import {
  AuthSession,
  registerUser,
  getAuthHeader,
  getUniqueStamp,
} from '../../../src/helpers/api-helpers';
import {
  assertArticleSchema,
  assertMultipleArticlesSchema,
  assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

const TARGET_AUTHOR = 'johndoe';
const KNOWN_TAG = 'javascript';
const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';

test.describe('/api/articles', () => {
  test.describe('Read & Validation Operations', () => {
    let sharedUser: AuthSession;

    test.beforeAll(async ({ request }) => {
      sharedUser = await registerUser(request);
    });

    test('fetches global articles feed (unauthenticated) @smoke', async ({ request }) => {
      const response = await request.get('/api/articles');
      expect(response.status()).toBe(200);

      const body = assertMultipleArticlesSchema(await response.json());
      expect(body.articles.length).toBeLessThanOrEqual(20);
      expect(body.articlesCount).toBeGreaterThanOrEqual(body.articles.length);
    });

    // We explicitly assert `articles.length > 0` before looping. An empty array on a filtered 200 OK
    // would cause `forEach` to pass silently without actually testing filter logic.
    // The custom error message explicitly flags missing DB seed data versus an actual API route crash.
    test('filters articles by author username (unauthenticated)', async ({ request }) => {
      const response = await request.get('/api/articles', {
        params: { author: TARGET_AUTHOR },
      });
      expect(response.status()).toBe(200);

      const body = assertMultipleArticlesSchema(await response.json());
      expect(
        body.articles.length,
        `PRE-SEEDED DATA MISSING: Target author "${TARGET_AUTHOR}" has no articles in database.`,
      ).toBeGreaterThan(0);

      body.articles.forEach((article) => {
        expect(article.author.username).toBe(TARGET_AUTHOR);
      });
    });

    test('filters articles by tag (unauthenticated)', async ({ request }) => {
      const response = await request.get('/api/articles', {
        params: { tag: KNOWN_TAG },
      });
      expect(response.status()).toBe(200);

      const body = assertMultipleArticlesSchema(await response.json());

      expect(
        body.articles.length,
        `PRE-SEEDED DATA MISSING: Target tag "${KNOWN_TAG}" has no associated articles.`,
      ).toBeGreaterThan(0);

      body.articles.forEach((article) => {
        expect(article.tagList).toContain(KNOWN_TAG);
      });
    });

    test('enforces pagination limit and offset (unauthenticated)', async ({ request }) => {
      const response = await request.get('/api/articles', {
        params: { limit: 5, offset: 0 },
      });
      expect(response.status()).toBe(200);

      const body = assertMultipleArticlesSchema(await response.json());
      expect(body.articles.length).toBeLessThanOrEqual(5);
      // Enforce pagination total count invariant
      // The total DB count reported must be greater than or equal to the page size returned.
      expect(body.articlesCount).toBeGreaterThanOrEqual(body.articles.length);
    });

    test('filters articles favorited by target user (unauthenticated)', async ({ request }) => {
      const response = await request.get('/api/articles', {
        params: { favorited: TARGET_AUTHOR },
      });
      expect(response.status()).toBe(200);

      const body = assertMultipleArticlesSchema(await response.json());

      expect(
        body.articles.length,
        `PRE-SEEDED DATA MISSING: Target user "${TARGET_AUTHOR}" has no favorited articles.`,
      ).toBeGreaterThan(0);
      // NOTE: Using body.articles.length over articlesCount because API endpoints apply
      // default pagination (limit=20). articles.length guarantees array items exist
      // to inspect in the forEach loop, preventing false positives if DB state is empty.
      body.articles.forEach((article) => {
        expect(article.favoritesCount).toBeGreaterThanOrEqual(1);
        // For an unauthenticated caller, favorited state defaults to false
        expect(article.favorited).toBe(false);
      });
    });

    test('returns 401 on article creation without auth token', async ({ request }) => {
      const response = await request.post('/api/articles', {
        data: {
          article: {
            title: 'Unauthorized Article',
            description: 'Missing token',
            body: 'Should fail',
          },
        },
      });
      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    test('returns 422 on article creation with missing required fields', async ({ request }) => {
      const response = await request.post('/api/articles', {
        headers: getAuthHeader(sharedUser.token),
        data: {
          article: { title: '' },
        },
      });
      expect(response.status()).toBe(422);

      const body = assertErrorSchema(await response.json());

      expect(body.errors).toHaveProperty('title');
      expect(body.errors).toHaveProperty('description');
      expect(body.errors).toHaveProperty('body');

      expect(body.errors.title).toContain("can't be blank");
      expect(body.errors.description).toContain("can't be blank");
      expect(body.errors.body).toContain("can't be blank");
    });

    test('returns 404 on non-existent article fetch', async ({ request }) => {
      const nonExistentSlug = `non-existent-article-${getUniqueStamp()}`;
      const response = await request.get(`/api/articles/${nonExistentSlug}`);
      expect(response.status()).toBe(404);

      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('article');
      expect(body.errors.article).toContain('not found');
    });

    test('returns 403 on article update by non-author', async ({ request }) => {
      const response = await request.put(`/api/articles/${PRESEEDED_SLUG}`, {
        headers: getAuthHeader(sharedUser.token),
        data: {
          article: { title: 'Attempted Unauthorized Update' },
        },
      });

      expect(response.status()).toBe(403);
      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('article');
      expect(body.errors.article).toContain('forbidden');
    });

    test('returns 403 on article deletion by non-author', async ({ request }) => {
      const response = await request.delete(`/api/articles/${PRESEEDED_SLUG}`, {
        headers: getAuthHeader(sharedUser.token),
      });

      expect(response.status()).toBe(403);
      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('article');
      expect(body.errors.article).toContain('forbidden');
    });
  });

  test.describe('State-Mutating Lifecycle Operations', () => {
    test('manages article lifecycle (create, read, update, delete) @smoke', async ({ request }) => {
      const author = await registerUser(request);
      const authHeader = getAuthHeader(author.token);
      const timestamp = getUniqueStamp();

      const initialPayload = {
        title: `Automation Article ${timestamp}`,
        description: `Description ${timestamp}`,
        body: `Body content for article ${timestamp}`,
        tagList: ['playwright', 'testing'],
      };

      const updatedPayload = {
        title: `Updated Article ${timestamp}`,
        description: `Updated description ${timestamp}`,
        body: `Updated body content ${timestamp}`,
      };

      let articleSlug: string;

      await test.step('creates a new article', async () => {
        const res = await request.post('/api/articles', {
          headers: authHeader,
          data: { article: initialPayload },
        });
        expect(res.status()).toBe(201);

        const body = assertArticleSchema(await res.json());
        articleSlug = body.article.slug;

        expect(body.article.title).toBe(initialPayload.title);
        expect(body.article.description).toBe(initialPayload.description);
        expect(body.article.body).toBe(initialPayload.body);
        expect(body.article.tagList).toEqual(expect.arrayContaining(initialPayload.tagList));
        expect(body.article.author.username).toBe(author.user.username);
        expect(body.article.favorited).toBe(false);
        expect(body.article.favoritesCount).toBe(0);
      });

      await test.step('fetches created article by slug', async () => {
        const res = await request.get(`/api/articles/${articleSlug}`, {
          headers: authHeader,
        });
        expect(res.status()).toBe(200);

        const body = assertArticleSchema(await res.json());

        expect(body.article.slug).toBe(articleSlug);
        expect(body.article.title).toBe(initialPayload.title);
        expect(body.article.author.username).toBe(author.user.username);
      });

      await test.step('updates article title, description, and body', async () => {
        const res = await request.put(`/api/articles/${articleSlug}`, {
          headers: authHeader,
          data: { article: updatedPayload },
        });
        expect(res.status()).toBe(200);

        const body = assertArticleSchema(await res.json());
        articleSlug = body.article.slug; // Title change regenerates slug

        expect(body.article.title).toBe(updatedPayload.title);
        expect(body.article.description).toBe(updatedPayload.description);
        expect(body.article.body).toBe(updatedPayload.body);
        expect(body.article.tagList).toEqual(expect.arrayContaining(initialPayload.tagList));
      });

      await test.step('verifies article update persistence', async () => {
        const res = await request.get(`/api/articles/${articleSlug}`, {
          headers: authHeader,
        });
        expect(res.status()).toBe(200);

        const body = assertArticleSchema(await res.json());

        expect(body.article.slug).toBe(articleSlug);
        expect(body.article.title).toBe(updatedPayload.title);
        expect(body.article.description).toBe(updatedPayload.description);
        expect(body.article.body).toBe(updatedPayload.body);
        expect(body.article.tagList).toEqual(expect.arrayContaining(initialPayload.tagList));
      });

      await test.step('deletes article by slug', async () => {
        const res = await request.delete(`/api/articles/${articleSlug}`, {
          headers: authHeader,
        });
        expect(res.status()).toBe(204);
      });

      await test.step('verifies article is no longer accessible', async () => {
        const res = await request.get(`/api/articles/${articleSlug}`, {
          headers: authHeader,
        });
        expect(res.status()).toBe(404);

        const body = assertErrorSchema(await res.json());
        expect(body.errors).toHaveProperty('article');
        expect(body.errors.article).toContain('not found');
      });
    });
  });
});
