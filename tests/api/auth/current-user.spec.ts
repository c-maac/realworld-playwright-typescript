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
        test('updates user bio and persists changes', async ({ request }) => {
            const authHeader = getAuthHeader(session.token);
            const updatedBio = `Updated Bio - ${Date.now()}`;

            await test.step('updates user bio via PUT', async () => {
                const response = await request.put('/api/user', {
                    headers: authHeader,
                    data: { user: { bio: updatedBio } },
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.username).toBe(session.user.username);
                expect(body.user.email).toBe(session.user.email);
                expect(body.user.bio).toBe(updatedBio);
            });

            await test.step('verifies bio update is persisted via GET', async () => {
                const response = await request.get('/api/user', {
                    headers: authHeader,
                });

                expect(response.status()).toBe(200);

                const body = assertUserSchema(await response.json());

                expect(body.user.bio).toBe(updatedBio);
            });
        });
    });
});