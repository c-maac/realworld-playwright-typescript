import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import {
    assertUserSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('User Profile (/api/user)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });
    test.describe.configure({ mode: 'serial' });

    let session: AuthSession;

    test.beforeAll(async ({ request }) => {
        session = await registerUser(request);
    });

    test.describe('GET /api/user', () => {
        test('retrieves current authenticated user', async ({ request }) => {
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

        test('returns 401 when token is missing', async ({ request }) => {
            const response = await request.get('/api/user');

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 401 on invalid token', async ({ request }) => {
            const response = await request.get('/api/user', {
                headers: { Authorization: 'Token invalid_token_12345' },
            });

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

    });

    test.describe('PUT /api/user', () => {
        test('updates profile fields and persists changes', async ({ request }) => {
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

                // Verify updated fields
                expect(body.user.bio).toBe(updatedBio);
                expect(body.user.image).toBe(updatedImage);

                // Verify unprovided fields remain intact
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
        test('updates email and username and verifies persistence with updated token', async ({ request }) => {
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

                // Verify updated values and capture the newly issued JWT
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

        test('normalizes empty string bio and image to null', async ({ request }) => {
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

            // Asserts empty strings are converted/normalized to null
            expect(body.user.bio).toBeNull();
            expect(body.user.image).toBeNull();
        });

        test('returns 401 when updating without authentication', async ({ request }) => {
            const response = await request.put('/api/user', {
                data: { user: { bio: 'Unauthorized update attempt' } },
            });

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });
    });
    /**
         * NIST SP 800-63B Password Guidelines
         * - Minimum length of 8 characters
         * - Accepts passwords up to at least 64 characters
         * - No arbitrary composition rules (uppercase/symbols)
         */
    test.describe('NIST 800-63B Password Policy', () => {
        test('should reject updating password to empty string', async ({ request }) => {
            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: {
                    user: { password: '' },
                },
            });

            expect(response.status()).toBe(422);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('body');
            expect(body.errors.body).toContain('password must be a string between 8 and 128 chars');
        });

        test('should reject updating password to null', async ({ request }) => {
            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: {
                    user: { password: null },
                },
            });

            expect(response.status()).toBe(422);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('body');
            expect(body.errors.body).toContain('password must be a string between 8 and 128 chars');
        });

        test('should reject updating password shorter than 8 characters', async ({ request }) => {
            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: {
                    user: { password: 'short7c' },
                },
            });

            expect(response.status()).toBe(422);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('body');
            expect(body.errors.body).toContain('password must be a string between 8 and 128 chars');
        });

        test('should accept 8-character simple password', async ({ request }) => {
            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: {
                    user: { password: 'bonjour1' },
                },
            });

            expect(response.status()).toBe(200);
        });

        test('should accept 64-character long password', async ({ request }) => {
            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: {
                    user: { password: 'a'.repeat(64) },
                },
            });

            expect(response.status()).toBe(200);
        });
    });

    test.describe('Field Validation (Email & Username)', () => {
        const invalidFields = [
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
        ];

        for (const { name, payload, expectedError } of invalidFields) {
            test(`returns 422 on ${name}`, async ({ request }) => {
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
});