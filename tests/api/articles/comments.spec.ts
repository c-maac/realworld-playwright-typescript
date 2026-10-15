import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader, getUniqueStamp } from '../../../src/helpers/api-helpers';
import {
    assertCommentSchema,
    assertMultipleCommentsSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

const PRESEEDED_SLUG = 'how-to-learn-javascript-efficiently';

test.describe('/api/articles/:slug/comments', () => {

    test.describe('Read & Validation Operations', () => {

        let sharedUser: AuthSession;

        test.beforeAll(async ({ request }) => {
            sharedUser = await registerUser(request);
        });

        test('fetches list of comments for an article (unauthenticated) @smoke', async ({ request }) => {
            const res = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`);
            expect(res.status()).toBe(200);

            assertMultipleCommentsSchema(await res.json());
        });

        test('returns 401 on comment creation without auth token @negative', async ({ request }) => {
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

        test('returns 404 on commenting on non-existent article @negative', async ({ request }) => {
            const nonExistentSlug = `non-existent-${getUniqueStamp()}`;
            const res = await request.post(`/api/articles/${nonExistentSlug}/comments`, {
                headers: getAuthHeader(sharedUser.token),
                data: {
                    comment: { body: 'Test comment' },
                },
            });
            expect(res.status()).toBe(404);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('article');
            expect(body.errors.article).toContain('not found');
        });

        test('returns 403 on comment deletion owned by another user @negative', async ({ request }) => {
            // Fetch pre-seeded comments on the article
            const commentsRes = await request.get(`/api/articles/${PRESEEDED_SLUG}/comments`);
            expect(commentsRes.status()).toBe(200);
            const { comments } = assertMultipleCommentsSchema(await commentsRes.json());

            // Dynamically locate a comment not authored by sharedUser
            const foreignComment = comments.find(
                (c) => c.author.username !== sharedUser.user.username
            );

            expect(
                foreignComment,
                `PRE-SEEDED DATA MISSING: Expected at least one comment authored by another user on article "${PRESEEDED_SLUG}".`
            ).toBeDefined();

            // Attempt to delete that comment using sharedUser's session
            const deleteRes = await request.delete(
                `/api/articles/${PRESEEDED_SLUG}/comments/${foreignComment!.id}`,
                {
                    headers: getAuthHeader(sharedUser.token),
                }
            );

            expect(deleteRes.status()).toBe(403);

            const body = assertErrorSchema(await deleteRes.json());
            expect(body.errors).toHaveProperty('comment');
            expect(body.errors.comment).toContain('forbidden');
        });

        test('returns 422 on comment creation with empty body @negative', async ({ request }) => {
            const res = await request.post(`/api/articles/${PRESEEDED_SLUG}/comments`, {
                headers: getAuthHeader(sharedUser.token),
                data: { comment: { body: '' } },
            });
            expect(res.status()).toBe(422);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('body');
            expect(body.errors.body).toContain("can't be blank");
        });

        test('returns 404 on non-existent comment deletion @negative', async ({ request }) => {
            const nonExistentCommentId = 99999999;

            const res = await request.delete(
                `/api/articles/${PRESEEDED_SLUG}/comments/${nonExistentCommentId}`,
                {
                    headers: getAuthHeader(sharedUser.token),
                }
            );

            expect(res.status()).toBe(404);

            const body = assertErrorSchema(await res.json());
            expect(body.errors).toHaveProperty('comment');
            expect(body.errors.comment).toContain('not found');
        });
    });

    test.describe('State-Mutating Lifecycle Operations', () => {
        
        test('manages comment lifecycle (create, verify list, delete) @smoke', async ({ request }) => {
            const author = await registerUser(request);
            const authHeader = getAuthHeader(author.token);
            const commentText = `Automation comment ${getUniqueStamp()}`;
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
                expect(body.comment.author.username).toBe(author.user.username);
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
                expect(foundComment?.author.username).toBe(author.user.username);
            });

            await test.step('deletes the comment', async () => {
                const res = await request.delete(
                    `/api/articles/${PRESEEDED_SLUG}/comments/${createdCommentId}`,
                    {
                        headers: authHeader,
                    }
                );
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
});