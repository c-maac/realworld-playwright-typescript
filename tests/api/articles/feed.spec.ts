import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertMultipleArticlesSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

const TARGET_AUTHOR_1 = 'johndoe';
const TARGET_AUTHOR_2 = 'janesmith';

test.describe('/api/articles/feed', () => {

    test.describe('Read & Validation Operations', () => {
        test('returns 401 when accessing feed without authorization @negative', async ({ request }) => {
            const res = await request.get('/api/articles/feed');
            expect(res.status()).toBe(401);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });
    });

    test.describe('State-Mutating Lifecycle Operations', () => {
        let user: AuthSession;

        test.beforeEach(async ({ request }) => {
            user = await registerUser(request);
        });

        test('manages feed lifecycle (empty check, follow users, verify feed, pagination) @smoke', async ({ request }) => {
            const authHeader = getAuthHeader(user.token);

            await test.step('verifies newly created user has an empty feed', async () => {
                const res = await request.get('/api/articles/feed', { headers: authHeader });
                expect(res.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await res.json());

                expect(body.articles).toEqual([]);
                expect(body.articlesCount).toBe(0);
            });

            await test.step('follows pre-seeded authors (johndoe and janesmith)', async () => {
                const followAuthor1 = await request.post(`/api/profiles/${TARGET_AUTHOR_1}/follow`, {
                    headers: authHeader,
                });
                expect(followAuthor1.status()).toBe(200);

                const followAuthor2 = await request.post(`/api/profiles/${TARGET_AUTHOR_2}/follow`, {
                    headers: authHeader,
                });
                expect(followAuthor2.status()).toBe(200);
            });

            await test.step('verifies feed includes articles from followed authors', async () => {
                const res = await request.get('/api/articles/feed', { headers: authHeader });
                expect(res.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await res.json());

                expect(
                    body.articles.length,
                    `PRE-SEEDED DATA MISSING: Followed authors "${TARGET_AUTHOR_1}" or "${TARGET_AUTHOR_2}" have no articles in database.`
                ).toBeGreaterThan(0);
                expect(body.articlesCount).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    // All items in user's personalized feed must be from followed users
                    expect(article.author.following).toBe(true);
                    expect([TARGET_AUTHOR_1, TARGET_AUTHOR_2]).toContain(article.author.username);
                });
            });

            await test.step('verifies pagination limit and offset behavior', async () => {
                // Fetch page 1
                const resPage1 = await request.get('/api/articles/feed', {
                    headers: authHeader,
                    params: { limit: 1, offset: 0 },
                });
                expect(resPage1.status()).toBe(200);
                const page1Body = assertMultipleArticlesSchema(await resPage1.json());
                expect(page1Body.articles.length).toBeLessThanOrEqual(1);

                // If total feed has at least 2 articles, verify offset moves to next article
                if (page1Body.articlesCount >= 2) {
                    const resPage2 = await request.get('/api/articles/feed', {
                        headers: authHeader,
                        params: { limit: 1, offset: 1 },
                    });
                    expect(resPage2.status()).toBe(200);
                    const page2Body = assertMultipleArticlesSchema(await resPage2.json());

                    expect(page2Body.articles[0].slug).not.toBe(page1Body.articles[0].slug);
                }
            });
        });
    });
});