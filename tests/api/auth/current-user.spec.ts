import { test, expect } from '@playwright/test';
import { AuthSession, registerUser } from '../../../src/helpers/api-helpers';

test.describe('User Profile', () => {
    test.use({ baseURL: 'https://api.realworld.show' });
    test.describe.configure({ mode: 'serial' });

    let session: AuthSession;

    test.beforeAll(async ({ request }) => {
        session = await registerUser(request);
    });

    test.describe('GET /api/user', () => {
        test('retrieves current authenticated user', async ({ request }) => {
            const response = await request.get('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body).toHaveProperty('user');
            expect(typeof body.user.token).toBe('string');
            expect(body.user.token).not.toBe('');

            expect(body.user).toStrictEqual({
                username: session.user.username,
                email: session.user.email,
                bio: null,
                image: null,
                token: body.user.token,
            });
        });

        test('returns 401 when token is missing', async ({ request }) => {
            const response = await request.get('/api/user');

            expect(response.status()).toBe(401);

            const body = await response.json();
            expect(body.errors).toHaveProperty('token');
        });

        test('returns 401 on invalid token', async ({ request }) => {
            const response = await request.get('/api/user', {
                headers: { Authorization: 'Token invalid_token_12345' },
            });

            expect(response.status()).toBe(401);

            const body = await response.json();
            expect(body.errors).toHaveProperty('token');
        });
    });

    test.describe('PUT /api/user', () => {

        // TODO: Should we verify again by requesting current user and see bio update is persisted.
        test('updates user bio', async ({ request }) => {
            const updatedBio = `Updated Bio - ${Date.now()}`;

            const response = await request.put('/api/user', {
                headers: { Authorization: `Token ${session.token}` },
                data: { user: { bio: updatedBio } },
            });

            expect(response.status()).toBe(200);

            const body = await response.json();
            expect(body).toHaveProperty('user');
            expect(typeof body.user.token).toBe('string');

            expect(body.user).toStrictEqual({
                username: session.user.username,
                email: session.user.email,
                bio: updatedBio,
                image: null,
                token: body.user.token,
            });
        });
    });
});