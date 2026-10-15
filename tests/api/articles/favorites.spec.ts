import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader, getUniqueStamp } from '../../../src/helpers/api-helpers';
import {
    assertArticleSchema,
    assertErrorSchema,
    assertMultipleArticlesSchema,
} from '../../../src/helpers/schema-helpers';

const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';

test.describe('/api/articles/:slug/favorite', () => {

    test.describe('Read & Validation Operations', () => {
        let sharedUser: AuthSession;

        test.beforeAll(async ({ request }) => {
            sharedUser = await registerUser(request);
        });

        test('returns 401 when favoriting without auth token @negative', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`);
            expect(res.status()).toBe(401);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 404 when favoriting non-existent article @negative', async ({ request }) => {
            const nonExistentSlug = `non-existent-${getUniqueStamp()}`;
            const res = await request.post(`/api/articles/${nonExistentSlug}/favorite`, {
                headers: getAuthHeader(sharedUser.token),
            });
            expect(res.status()).toBe(404);

            const body = assertErrorSchema(await res.json());

            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('not found');
        });
    });

    test.describe('State-Mutating Lifecycle Operations', () => {
        let user: AuthSession;

        test.beforeEach(async ({ request }) => {
            user = await registerUser(request);
        });

        test('manages favorite and unfavorite lifecycle @smoke', async ({ request }) => {
            const authHeader = getAuthHeader(user.token);
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

            await test.step('verifies favorited article appears in filtered articles list', async () => {
                const res = await request.get('/api/articles', {
                    headers: authHeader,
                    params: { favorited: user.user.username },
                });
                expect(res.status()).toBe(200);

                const body = assertMultipleArticlesSchema(await res.json());
                expect(body.articles.length).toBeGreaterThan(0);

                const match = body.articles.find((a) => a.slug === PRESEEDED_SLUG);
                expect(match).toBeDefined();
                expect(match?.favorited).toBe(true);
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

        test('handles duplicate favorite and unfavorite calls idempotently @regression', async ({ request }) => {
            const authHeader = getAuthHeader(user.token);

            // 1. Initial Favorite Call
            const firstFavRes = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                headers: authHeader,
            });
            expect(firstFavRes.status()).toBe(200);
            const firstBody = assertArticleSchema(await firstFavRes.json());
            const countAfterFirstFav = firstBody.article.favoritesCount;
            expect(firstBody.article.favorited).toBe(true);

            // 2. Duplicate Favorite Call (Second POST in a row)
            const secondFavRes = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                headers: authHeader,
            });
            expect(secondFavRes.status()).toBe(200);
            const secondBody = assertArticleSchema(await secondFavRes.json());

            // Assert state remains identical and count did NOT double increment
            expect(secondBody.article.favorited).toBe(true);
            expect(secondBody.article.favoritesCount).toBe(countAfterFirstFav);

            // 3. Initial Unfavorite Call
            const firstUnfavRes = await request.delete(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                headers: authHeader,
            });
            expect(firstUnfavRes.status()).toBe(200);
            const firstUnfavBody = assertArticleSchema(await firstUnfavRes.json());
            const countAfterFirstUnfav = firstUnfavBody.article.favoritesCount;
            expect(firstUnfavBody.article.favorited).toBe(false);

            // 4. Duplicate Unfavorite Call (Second DELETE in a row)
            const secondUnfavRes = await request.delete(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                headers: authHeader,
            });
            expect(secondUnfavRes.status()).toBe(200);
            const secondUnfavBody = assertArticleSchema(await secondUnfavRes.json());

            // Assert state remains unfavorited and count did NOT double decrement
            expect(secondUnfavBody.article.favorited).toBe(false);
            expect(secondUnfavBody.article.favoritesCount).toBe(countAfterFirstUnfav);
        });
    });
});