import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertArticleSchema,
    assertMultipleArticlesSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('Article Domain (/api/articles)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    let token: string;
    let authorUsername: string;

    test.beforeAll(async ({ request }) => {
        const authorSession: AuthSession = await registerUser(request);
        token = authorSession.token;
        authorUsername = authorSession.user.username;
    });

    test.describe('Unauthenticated Operations', () => {
        test('fetches global articles feed', async ({ request }) => {
            const response = await request.get('/api/articles');
            expect(response.status()).toBe(200);

            const body = assertMultipleArticlesSchema(await response.json());
            // Default limit check is 20
            expect(body.articles.length).toBeLessThanOrEqual(20);
            // For paginated lists: total DB records >= items returned in this page
            expect(body.articlesCount).toBeGreaterThanOrEqual(body.articles.length);
        });

        test.describe('Query Parameters & Filtering (Unauthenticated)', () => {
            const TARGET_AUTHOR = 'johndoe'; // Known pre-seeded author
            const KNOWN_TAG = 'javascript';      // Known pre-seeded tag

            test('filters articles by author username', async ({ request }) => {
                const response = await request.get('/api/articles', {
                    params: { author: TARGET_AUTHOR },
                });
                expect(response.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await response.json());

                // If the database seed disappears or changes, 
                // the test fails immediately with an explicit error 
                // instead of passing silently without actually testing anything.
                // TODO: This needs to be the strategy (or some other strategy) for all similar tests that using preseeded data
                // and should be addressed in TEST_STRATEGY file.
                // But how to distinguish if it's api error or missing db data?
                expect(
                    body.articles.length,
                    'PRE-SEEDED DATA MISSING: Target author has no articles.'
                ).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    expect(article.author.username).toBe(TARGET_AUTHOR);
                });
            });

            test('filters articles by tag', async ({ request }) => {
                const response = await request.get('/api/articles', {
                    params: { tag: KNOWN_TAG },
                });
                expect(response.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await response.json());

                expect(body.articles.length,
                    'PRE-SEEDED DATA MISSING: Target tag has no articles.'
                ).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    expect(article.tagList).toContain(KNOWN_TAG);
                });

            });

            test('enforces pagination limit and offset', async ({ request }) => {
                const response = await request.get('/api/articles', {
                    params: { limit: 5, offset: 0 },
                });
                expect(response.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await response.json());
                expect(body.articles.length).toBeLessThanOrEqual(5);

                // Enforce pagination total count invariant
                // The total DB count reported must be greater than or equal to the page size returned
                expect(body.articlesCount).toBeGreaterThanOrEqual(body.articles.length);
            });

            test('filters articles favorited by a target user', async ({ request }) => {
                const res = await request.get('/api/articles', {
                    params: { favorited: TARGET_AUTHOR },
                });
                expect(res.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await res.json());

                // NOTE: Using body.articles.length over articlesCount because API endpoints apply 
                // default pagination (limit=20). articles.length guarantees array items exist 
                // to inspect in the forEach loop, preventing false positives if DB state is empty.
                expect(
                    body.articles.length,
                    `PRE-SEEDED DATA MISSING: Target user "${TARGET_AUTHOR}" has no favorited articles.`
                ).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    expect(article.favoritesCount).toBeGreaterThanOrEqual(1);
                    // For an unauthenticated caller, favorited state defaults to false
                    expect(article.favorited).toBe(false);
                });
            });
        });
    });

    test.describe('Authenticated Operations', () => {
        test('manages article lifecycle (create, read, update, delete)', async ({ request }) => {
            const authHeader = getAuthHeader(token);
            const timestamp = Date.now();

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
                expect(body.article.author.username).toBe(authorUsername);
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
                expect(body.article.author.username).toBe(authorUsername);
            });

            await test.step('updates article title, description, and body', async () => {
                const res = await request.put(`/api/articles/${articleSlug}`, {
                    headers: authHeader,
                    data: { article: updatedPayload },
                });
                expect(res.status()).toBe(200);

                const body = assertArticleSchema(await res.json());
                articleSlug = body.article.slug; // Title change regenerates the slug.

                expect(body.article.title).toBe(updatedPayload.title);
                expect(body.article.description).toBe(updatedPayload.description);
                expect(body.article.body).toBe(updatedPayload.body);
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

        test('filters own articles when authenticated', async ({ request }) => {
            const authHeader = getAuthHeader(token);

            // 1. Create article scoped to user
            await request.post('/api/articles', {
                headers: authHeader,
                data: {
                    article: {
                        title: `Scoped Article ${Date.now()}`,
                        description: 'Filter test',
                        body: 'Content',
                        tagList: ['automation'],
                    },
                },
            });

            const response = await request.get('/api/articles', {
                headers: authHeader,
                params: { author: authorUsername },
            });
            expect(response.status()).toBe(200);

            const body = assertMultipleArticlesSchema(await response.json());
            expect(body.articles.length).toBeGreaterThan(0);

            body.articles.forEach((article) => {
                expect(article.author.username).toBe(authorUsername);
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when creating article without authorization', async ({ request }) => {
            const response = await request.post('/api/articles', {
                data: {
                    article: {
                        title: 'Unauthorized Article',
                        description: 'No token provided',
                        body: 'Should fail',
                    },
                },
            });
            expect(response.status()).toBe(401);
            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 422 when creating article with missing required fields', async ({ request }) => {
            const response = await request.post('/api/articles', {
                headers: getAuthHeader(token),
                data: {
                    article: {
                        title: '',
                    },
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

        test('returns 404 for non-existent article slug', async ({ request }) => {
            const nonExistentSlug = `non-existent-article-${Date.now()}`;
            const response = await request.get(`/api/articles/${nonExistentSlug}`);
            expect(response.status()).toBe(404);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('not found');
        });

        test('returns 403 when non-author attempts to update or delete a pre-seeded article', async ({ request }) => {

            const preSeededSlug = 'how-to-learn-javascript-efficiently';

            const updateRes = await request.put(`/api/articles/${preSeededSlug}`, {
                headers: getAuthHeader(token),
                data: {
                    article: {
                        title: 'Attempted Unauthorized Update',
                    },
                },
            });

            expect(updateRes.status()).toBe(403);
            const body = assertErrorSchema(await updateRes.json());
            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('forbidden');

            const deleteRes = await request.delete(`/api/articles/${preSeededSlug}`, {
                headers: getAuthHeader(token),
            });

            expect(deleteRes.status()).toBe(403);
            const deleteError = assertErrorSchema(await deleteRes.json());
            expect(deleteError.errors).toHaveProperty('article');
            expect(deleteError.errors.article).toContain('forbidden');
        });
    });
});