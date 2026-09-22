import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertMultipleArticlesSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('Articles Feed Domain (/api/articles/feed)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    const TARGET_AUTHOR_1 = 'johndoe';
    const TARGET_AUTHOR_2 = 'janesmith';

    let userToken: string;

    test.beforeAll(async ({ request }) => {
        const session: AuthSession = await registerUser(request);
        userToken = session.token;
    });

    test.describe('Authenticated Operations', () => {
        test('manages feed lifecycle (empty check, follow users, verify feed, pagination)', async ({ request }) => {
            const authHeader = getAuthHeader(userToken);

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

                expect(body.articles.length).toBeGreaterThan(0);
                expect(body.articlesCount).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    // all items in user's personalized feed 
                    // must be from followed users
                    expect(article.author.following).toBe(true);
                    expect([TARGET_AUTHOR_1, TARGET_AUTHOR_2]).toContain(article.author.username);
                });
            });

            await test.step('verifies pagination using limit and offset parameters', async () => {
                const limit = 1;
                const res = await request.get('/api/articles/feed', {
                    headers: authHeader,
                    params: { limit, offset: 0 },
                });
                expect(res.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await res.json());

                expect(body.articles.length).toBeLessThanOrEqual(limit);
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when accessing feed without authorization', async ({ request }) => {
            const res = await request.get('/api/articles/feed');
            expect(res.status()).toBe(401);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });
    });
});