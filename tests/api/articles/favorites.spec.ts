import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';

interface Article {
    slug: string;
    title: string;
    description: string;
    body: string;
    tagList: string[];
    createdAt: string;
    updatedAt: string;
    favorited: boolean;
    favoritesCount: number;
    author: {
        username: string;
        bio: string | null;
        image: string | null;
        following: boolean;
    };
}

interface SingleArticleResponseBody {
    article: Article;
}

const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

const isoDateString = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' && !isNaN(Date.parse(actual)),
    toString: () => 'Valid ISO Date String',
};

const assertArticleSchema = (article: Article, expectedFavorited?: boolean) => {
    expect(article).toStrictEqual({
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        body: expect.any(String),
        tagList: expect.any(Array),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        favorited: expectedFavorited !== undefined ? expectedFavorited : expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
            username: expect.any(String),
            bio: stringOrNull,
            image: stringOrNull,
            following: expect.any(Boolean),
        },
    });
};

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

                const body = (await res.json()) as SingleArticleResponseBody;
                initialFavoritesCount = body.article.favoritesCount;
                assertArticleSchema(body.article, false);
            });

            await test.step('favorites the article and increments favoritesCount', async () => {
                const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = (await res.json()) as SingleArticleResponseBody;
                assertArticleSchema(body.article, true);
                expect(body.article.favoritesCount).toBe(initialFavoritesCount + 1);
            });

            await test.step('unfavorites the article and decrements favoritesCount', async () => {
                const res = await request.delete(`/api/articles/${PRESEEDED_SLUG}/favorite`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = (await res.json()) as SingleArticleResponseBody;
                assertArticleSchema(body.article, false);
                expect(body.article.favoritesCount).toBe(initialFavoritesCount)
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when favoriting without auth token', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/favorite`);
            expect(res.status()).toBe(401);
            const body = await res.json();
            expect(body).toHaveProperty('errors');

        });

        test('returns 404 when favoriting non-existent article', async ({ request }) => {
            const nonExistentSlug = `non-existent-${Date.now()}`;
            const res = await request.post(`/api/articles/${nonExistentSlug}/favorite`, {
                headers: getAuthHeader(userToken),
            });
            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body).toHaveProperty('errors');
        });
    });
});