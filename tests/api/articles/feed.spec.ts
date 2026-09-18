import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';

interface Article {
    slug: string;
    title: string;
    description: string;
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

interface FeedResponseBody {
    articles: Article[];
    articlesCount: number;
}

const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

const isoDateString = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' && !isNaN(Date.parse(actual)),
    toString: () => 'Valid ISO Date String',
};

const assertFeedItemSchema = (article: Article) => {
    expect(article).toStrictEqual({
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        tagList: expect.arrayContaining([expect.any(String)]),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
            username: expect.any(String),
            bio: stringOrNull,
            image: stringOrNull,
            following: true, // Should always be true for items in user's personalized feed
        },
    });
};

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

                const body = (await res.json()) as FeedResponseBody;
                expect(body).toHaveProperty('articles');
                expect(body).toHaveProperty('articlesCount');
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

                const body = (await res.json()) as FeedResponseBody;
                expect(body.articles.length).toBeGreaterThan(0);
                expect(body.articlesCount).toBeGreaterThan(0);

                body.articles.forEach((article) => {
                    assertFeedItemSchema(article);
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

                const body = (await res.json()) as FeedResponseBody;
                expect(body.articles.length).toBeLessThanOrEqual(limit);
                if (body.articles.length > 0) {
                    assertFeedItemSchema(body.articles[0]);
                }
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when accessing feed without authorization', async ({ request }) => {
            const res = await request.get('/api/articles/feed');
            expect(res.status()).toBe(401);
        });
    });
});