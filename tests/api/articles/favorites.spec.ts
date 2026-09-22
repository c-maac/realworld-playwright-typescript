import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertArticleSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('Favorites Domain (/api/articles/:slug/favorite)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';
    let userToken: string;

    test.beforeAll(async ({ request }) => {
        const session: AuthSession = await registerUser(request);
        userToken = session.token;
    });

    test.describe('Authenticated Operations', () => {
        test('manages favorite and unfavorite lifecycle', async ({ request }) => {
            const authHeader = getAuthHeader(userToken);
            let initialFavoritesCount: number;

            await test.step('fetches initial article state', async () => {
                const res = await request.get(`/api/articles/${PRESEEDED_SLUG}`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = assertArticleSchema(await res.json());
                initialFavoritesCount = body.article.favoritesCount;

                expect(body.article.favorited).toBe(false);
            });

            await test.step('favorites the article and increments favoritesCount', async () => {
                const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = assertArticleSchema(await res.json());

                expect(body.article.favorited).toBe(true);
                expect(body.article.favoritesCount).toBe(initialFavoritesCount + 1);
            });

            await test.step('unfavorites the article and decrements favoritesCount', async () => {
                const res = await request.delete(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = assertArticleSchema(await res.json());

                expect(body.article.favorited).toBe(false);
                expect(body.article.favoritesCount).toBe(initialFavoritesCount);
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when favoriting without auth token', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`);
            expect(res.status()).toBe(401);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 404 when favoriting non-existent article', async ({ request }) => {
            const nonExistentSlug = `non-existent-${Date.now()}`;
            const res = await request.post(`/api/articles/${nonExistentSlug}/favorite`, {
                headers: getAuthHeader(userToken),
            });
            expect(res.status()).toBe(404);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('not found');
        });
    });
});