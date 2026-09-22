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
            // Default limit check
            expect(body.articles.length).toBeLessThanOrEqual(20);
            // For paginated lists: total DB records >= items returned in this page
            expect(body.articlesCount).toBeGreaterThanOrEqual(body.articles.length);
        });

        //TODO: There are other query params to test!
        test('fetches articles with pagination and filtering query params', async ({ request }) => {
            const response = await request.get('/api/articles', {
                params: { limit: 5, offset: 0, tag: 'javascript' },
            });
            expect(response.status()).toBe(200);

            const body = assertMultipleArticlesSchema(await response.json());

            expect(body.articles.length).toBeLessThanOrEqual(5);
            body.articles.forEach((article) => {
                expect(article.tagList).toContain('javascript');
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
    });
});