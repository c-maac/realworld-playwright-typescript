import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';

// TypeScript Contract Interfaces
interface Author {
    username: string;
    bio: string | null;
    image: string | null;
    following: boolean;
}

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
    author: Author;
}

interface SingleArticleResponseBody {
    article: Article;
}

interface MultipleArticlesResponseBody {
    articles: Article[];
    articlesCount: number;
}

// Asymmetric matchers for dynamic runtime contract validation
const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

const isoDateString = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' && !isNaN(Date.parse(actual)),
    toString: () => 'Valid ISO Date String',
};

// Schema validation helper for single article responses
const assertArticleSchema = (
    article: Article,
    expected: {
        slug?: string;
        title: string;
        description: string;
        body: string;
        tagList: string[];
        favorited?: boolean;
        favoritesCount?: number;
        authorUsername: string;
        followingAuthor?: boolean;
    }
) => {
    expect(article).toStrictEqual({
        slug: expected.slug ?? expect.any(String),
        title: expected.title,
        description: expected.description,
        body: expected.body,
        tagList: expect.arrayContaining(expected.tagList),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        favorited: expected.favorited ?? false,
        favoritesCount: expected.favoritesCount ?? 0,
        author: {
            username: expected.authorUsername,
            bio: stringOrNull,
            image: stringOrNull,
            following: expected.followingAuthor ?? false,
        },
    });
};

const assertArticleFeedItemSchema = (article: Article) => {
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
            following: expect.any(Boolean),
        },
    });
};

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

            const body = (await response.json()) as MultipleArticlesResponseBody;

            // Validate outer wrapper contract
            expect(body).toHaveProperty('articles');
            expect(body).toHaveProperty('articlesCount');
            expect(Array.isArray(body.articles)).toBe(true);
            expect(typeof body.articlesCount).toBe('number');

            // Validate schema structure for every item in the feed array
            body.articles.forEach((article) => assertArticleFeedItemSchema(article));
        });

        test('fetches articles with pagination and filtering query params', async ({ request }) => {
            const response = await request.get('/api/articles', {
                params: { limit: 5, offset: 0, tag: 'javascript' },
            });
            expect(response.status()).toBe(200);

            const body = (await response.json()) as MultipleArticlesResponseBody;
            expect(body.articles.length).toBeLessThanOrEqual(5);

            body.articles.forEach((article) => {
                assertArticleFeedItemSchema(article);
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

                const body = (await res.json()) as SingleArticleResponseBody;
                articleSlug = body.article.slug;

                assertArticleSchema(body.article, {
                    slug: articleSlug,
                    title: initialPayload.title,
                    description: initialPayload.description,
                    body: initialPayload.body,
                    tagList: initialPayload.tagList,
                    authorUsername,
                });
            });

            await test.step('fetches created article by slug', async () => {
                const res = await request.get(`/api/articles/${articleSlug}`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = (await res.json()) as SingleArticleResponseBody;
                assertArticleSchema(body.article, {
                    slug: articleSlug,
                    title: initialPayload.title,
                    description: initialPayload.description,
                    body: initialPayload.body,
                    tagList: initialPayload.tagList,
                    authorUsername,
                });
            });

            await test.step('updates article title, description, and body', async () => {
                const res = await request.put(`/api/articles/${articleSlug}`, {
                    headers: authHeader,
                    data: { article: updatedPayload },
                });
                expect(res.status()).toBe(200);

                const body = (await res.json()) as SingleArticleResponseBody;
                articleSlug = body.article.slug;

                assertArticleSchema(body.article, {
                    slug: articleSlug,
                    title: updatedPayload.title,
                    description: updatedPayload.description,
                    body: updatedPayload.body,
                    tagList: initialPayload.tagList,
                    authorUsername,
                });
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

            const body = await response.json();
            expect(body).toHaveProperty('errors');
        });

        test('returns 404 for non-existent article slug', async ({ request }) => {
            const nonExistentSlug = `non-existent-article-${Date.now()}`;
            const response = await request.get(`/api/articles/${nonExistentSlug}`);
            expect(response.status()).toBe(404);

            const body = await response.json();
            expect(body).toHaveProperty('errors');
        });
    });
});