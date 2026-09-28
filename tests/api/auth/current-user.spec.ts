import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertUserSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

/**
 * Setup Isolation Strategy for /api/user:
 * 
 * 1. Read & Validation Operations (beforeAll):
 *    Uses a single shared user session across all tests. Read checks (GET) and rejected 
 *    validation attempts (401/422) do not alter database state, allowing maximum test 
 *    speed without risk of side effects.
 * 
 * 2. State-Mutating Updates (beforeEach):
 *    Provisions a fresh user account before every test. State changes like updating 
 *    credentials, bio, or passwords alter the account state; fresh isolation prevents 
 *    cross-test contamination and ensures deterministic runs.
 */

test.describe('/api/user', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test.describe('Read & Validation Operations', () => {
        let session: AuthSession;

        test.beforeAll(async ({ request }) => {
            session = await registerUser(request);
        });

        test('retrieves current authenticated user @smoke', async ({ request }) => {
            const response = await request.get('/api/user', {
                headers: getAuthHeader(session.token),
            });

            expect(response.status()).toBe(200);

            const body = assertUserSchema(await response.json());

            expect(body.user.username).toBe(session.user.username);
            expect(body.user.email).toBe(session.user.email);
            expect(body.user.token.length).toBeGreaterThan(0);
            expect(body.user.bio).toBeNull();
            expect(body.user.image).toBeNull();
        });

        test('returns 401 on GET with missing auth token @negative', async ({ request }) => {
            const response = await request.get('/api/user');

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 401 on GET with invalid auth token @negative', async ({ request }) => {
            const response = await request.get('/api/user', {
                headers: { Authorization: 'Token invalid_token_12345' },
            });

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 401 on PUT without auth token @negative', async ({ request }) => {
            const response = await request.put('/api/user', {
                data: { user: { bio: 'Unauthorized update attempt' } },
            });

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        const invalidProfileFields = [
            {
                name: 'email as empty string',
                payload: { email: '' },
                expectedError: 'email is a string of less than 100 chars',
            },
            {
                name: 'username as empty string',
                payload: { username: '' },
                expectedError: 'username is a string of less than 60 chars',
            },
            {
                name: 'email as null',
                payload: { email: null },
                expectedError: 'email is a string of less than 100 chars',
            },
            {
                name: 'username as null',
                payload: { username: null },
                expectedError: 'username is a string of less than 60 chars',
            },
            {
                name: 'password as empty string',
                payload: { password: '' },
                expectedError: 'password must be a string between 8 and 128 chars',
            },
            {
                name: 'password as null',
                payload: { password: null },
                expectedError: 'password must be a string between 8 and 128 chars',
            },
            {
                name: 'password under 8 characters',
                payload: { password: 'short7c' },
                expectedError: 'password must be a string between 8 and 128 chars',
            },
        ];

        for (const { name, payload, expectedError } of invalidProfileFields) {
            test(`returns 422 on ${name} @negative`, async ({ request }) => {
                const response = await request.put('/api/user', {
                    headers: getAuthHeader(session.token),
                    data: { user: payload },
                });

                expect(response.status()).toBe(422);

                const body = assertErrorSchema(await response.json());

                expect(body.errors).toHaveProperty('body');
                expect(body.errors.body).toContain(expectedError);
            });
        }
    });

    test.describe('State-Mutating Updates', () => {
        let session: AuthSession;

        test.beforeEach(async ({ request }) => {
            session = await registerUser(request);
        });

        test('updates profile bio and image and verifies persistence @smoke', async ({ request }) => {
            const authHeader = getAuthHeader(session.token);
            const updatedBio = `Updated Bio - ${Date.now()}`;
            const updatedImage = 'https://api.realworld.show/images/demo-avatar.png';

            await test.step('updates bio and image via PUT', async () => {
                const response = await request.put('/api/user', {
                    headers: authHeader,
                    data: {
                        user: {
                            bio: updatedBio,
                            image: updatedImage,
                        },
                    },
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.bio).toBe(updatedBio);
                expect(body.user.image).toBe(updatedImage);
                expect(body.user.username).toBe(session.user.username);
                expect(body.user.email).toBe(session.user.email);
            });

            await test.step('verifies updates are persisted via GET', async () => {
                const response = await request.get('/api/user', {
                    headers: authHeader,
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.bio).toBe(updatedBio);
                expect(body.user.image).toBe(updatedImage);
                expect(body.user.username).toBe(session.user.username);
                expect(body.user.email).toBe(session.user.email);
            });
        });

        // RealWorld API backend implementations may re-issue an identical JWT string 
        // after email/username updates. We capture the returned token directly from the response 
        // payload to maintain production client contract behavior.
        test('updates credentials and re-authenticates with updated token @regression', async ({ request }) => {
            const authHeader = getAuthHeader(session.token);
            const newUsername = `updated_user_${Date.now()}`;
            const newEmail = `updated_email_${Date.now()}@example.com`;

            let newToken: string;

            await test.step('updates username and email via PUT', async () => {
                const response = await request.put('/api/user', {
                    headers: authHeader,
                    data: {
                        user: {
                            username: newUsername,
                            email: newEmail,
                        },
                    },
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.username).toBe(newUsername);
                expect(body.user.email).toBe(newEmail);
                expect(body.user.token.length).toBeGreaterThan(0);

                newToken = body.user.token;
            });

            await test.step('verifies persistence using the new token via GET', async () => {
                const response = await request.get('/api/user', {
                    headers: getAuthHeader(newToken),
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.username).toBe(newUsername);
                expect(body.user.email).toBe(newEmail);
                expect(body.user.token).toBe(newToken);
            });
        });

        test('normalizes empty string bio and image to null @regression', async ({ request }) => {
            const authHeader = getAuthHeader(session.token);

            const response = await request.put('/api/user', {
                headers: authHeader,
                data: {
                    user: {
                        bio: '',
                        image: '',
                    },
                },
            });

            expect(response.status()).toBe(200);

            const body = assertUserSchema(await response.json());

            expect(body.user.bio).toBeNull();
            expect(body.user.image).toBeNull();
        });

        test('updates password and verifies login with new credentials @smoke', async ({ request }) => {
            const newPassword = `NewPass_${Date.now()}`;

            await test.step('updates password via PUT /api/user', async () => {
                const response = await request.put('/api/user', {
                    headers: getAuthHeader(session.token),
                    data: {
                        user: { password: newPassword },
                    },
                });

                expect(response.status()).toBe(200);
            });

            await test.step('verifies old password no longer works via POST /api/users/login', async () => {
                const response = await request.post('/api/users/login', {
                    data: {
                        user: {
                            email: session.user.email,
                            password: session.credentials.password, // Old password
                        },
                    },
                });

                expect(response.status()).toBe(401);
            });

            await test.step('verifies login succeeds with new password via POST /api/users/login', async () => {
                const response = await request.post('/api/users/login', {
                    data: {
                        user: {
                            email: session.user.email,
                            password: newPassword,
                        },
                    },
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());
                expect(body.user.token.length).toBeGreaterThan(0);
            });
        });

        // NIST SP 800-63B Password Guidelines
        const validPasswords = [
            { name: '8-character password', password: 'bonjour1' },
            { name: '128-character password', password: 'a'.repeat(128) },
        ];

        for (const { name, password } of validPasswords) {
            test(`updates password with ${name} @regression`, async ({ request }) => {
                const response = await request.put('/api/user', {
                    headers: getAuthHeader(session.token),
                    data: { user: { password } },
                });

                expect(response.status()).toBe(200);
            });
        }
    });
});