import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';

interface Comment {
    id: number;
    createdAt: string;
    updatedAt: string;
    body: string;
    author: {
        username: string;
        bio: string | null;
        image: string | null;
        following: boolean;
    };
}

interface SingleCommentResponseBody {
    comment: Comment;
}

interface MultipleCommentsResponseBody {
    comments: Comment[];
}

const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

const isoDateString = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' && !isNaN(Date.parse(actual)),
    toString: () => 'Valid ISO Date String',
};

const assertCommentSchema = (comment: Comment, expectedBody?: string) => {
    expect(comment).toStrictEqual({
        id: expect.any(Number),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        body: expectedBody ? expectedBody : expect.any(String),
        author: {
            username: expect.any(String),
            bio: stringOrNull,
            image: stringOrNull,
            following: expect.any(Boolean),
        },
    });
};

test.describe('Comments Domain (/api/articles/:slug/comments)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';
    let userToken: string;

    test.beforeAll(async ({ request }) => {
        const session: AuthSession = await registerUser(request);
        userToken = session.token;
    });

    test.describe('Unauthenticated Operations', () => {
        test('@smoke fetches list of comments for an article', async ({ request }) => {
            const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`);
            expect(res.status()).toBe(200);

            const body = (await res.json()) as MultipleCommentsResponseBody;
            expect(Array.isArray(body.comments)).toBe(true);
            body.comments.forEach((comment) => assertCommentSchema(comment));
        });
    });

    test.describe('Authenticated Operations', () => {
        test('manages comment lifecycle (create, verify list, delete)', async ({ request }) => {
            const authHeader = getAuthHeader(userToken);
            const commentText = `Automation comment ${Date.now()}`;
            let createdCommentId: number;

            await test.step('adds a comment to the article', async () => {
                const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                    headers: authHeader,
                    data: {
                        comment: {
                            body: commentText,
                        },
                    },
                });
                expect(res.status()).toBe(201);

                const body = (await res.json()) as SingleCommentResponseBody;
                createdCommentId = body.comment.id;
                assertCommentSchema(body.comment, commentText);
            });

            await test.step('retrieves comments list and finds newly created comment', async () => {
                const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = (await res.json()) as MultipleCommentsResponseBody;
                const foundComment = body.comments.find((c) => c.id === createdCommentId);
                expect(foundComment).toBeDefined();
                if (foundComment) {
                    assertCommentSchema(foundComment, commentText);
                }
            });

            await test.step('deletes the comment', async () => {
                const res = await request.delete(`/api/articles/${PRESEEDED_SLUG}/comments/${createdCommentId}`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(204);
            });

            await test.step('verifies comment is removed from list', async () => {
                const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`);
                expect(res.status()).toBe(200);

                const body = (await res.json()) as MultipleCommentsResponseBody;
                const foundComment = body.comments.find((c) => c.id === createdCommentId);
                expect(foundComment).toBeUndefined();
            });
        });
    });

    test.describe('Error Handling', () => {
        test('returns 401 when posting comment without auth token', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                data: {
                    comment: { body: 'Unauthorized comment' },
                },
            });
            expect(res.status()).toBe(401);
            const body = await res.json();
            expect(body).toHaveProperty('errors');
        });

        test('returns 404 when commenting on non-existent article', async ({ request }) => {
            const nonExistentSlug = `non-existent-${Date.now()}`;
            const res = await request.post(`/api/articles/${nonExistentSlug}/comments`, {
                headers: getAuthHeader(userToken),
                data: {
                    comment: { body: 'Test comment' },
                },
            });
            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body).toHaveProperty('errors');
        });
    });
});