import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertCommentSchema,
    assertMultipleCommentsSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('Comments Domain (/api/articles/:slug/comments)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';
    let userToken: string;
    let authorUsername: string;

    test.beforeAll(async ({ request }) => {
        const session: AuthSession = await registerUser(request);
        userToken = session.token;
        authorUsername = session.user.username;
    });

    test.describe('Unauthenticated Operations', () => {
        test('fetches list of comments for an article', async ({ request }) => {
            const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`);
            expect(res.status()).toBe(200);
            assertMultipleCommentsSchema(await res.json());
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

                const body = assertCommentSchema(await res.json());
                createdCommentId = body.comment.id;

                expect(body.comment.body).toBe(commentText);
                expect(body.comment.author.username).toBe(authorUsername);
            });

            await test.step('retrieves comments list and finds newly created comment', async () => {
                const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                    headers: authHeader,
                });
                expect(res.status()).toBe(200);

                const body = assertMultipleCommentsSchema(await res.json());
                const foundComment = body.comments.find((c) => c.id === createdCommentId);

                expect(foundComment).toBeDefined();
                expect(foundComment?.body).toBe(commentText);
                expect(foundComment?.author.username).toBe(authorUsername);
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

                const body = assertMultipleCommentsSchema(await res.json());
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

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
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

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('not found');
        });

        test('returns 403 when user attempts to delete a comment owned by another user', async ({ request }) => {
            const PRESEEDED_COMMENT_ID = 1;

            const res = await request.delete(
                `/api/articles/${PRESEEDED_SLUG}/comments/${PRESEEDED_COMMENT_ID}`,
                {
                    headers: getAuthHeader(userToken),
                }
            );

            expect(res.status()).toBe(403);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('comment');
            expect(body.errors.comment).toContain('forbidden');
        });

        test('returns 422 when posting comment with empty body', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                headers: getAuthHeader(userToken),
                data: { comment: { body: '' } },
            });
            expect(res.status()).toBe(422);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('body');
            expect(body.errors.body).toContain("can't be blank");
        });

        test('returns 404 when attempting to delete a non-existent comment', async ({ request }) => {
            // Generate an arbitrarily large ID unlikely to exist in the database
            const nonExistentCommentId = 99999999;

            const res = await request.delete(
                `/api/articles/${PRESEEDED_SLUG}/comments/${nonExistentCommentId}`,
                {
                    headers: getAuthHeader(userToken),
                }
            );

            expect(res.status()).toBe(404);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('comment');
            expect(body.errors.comment).toContain('not found');
        });
    });
});