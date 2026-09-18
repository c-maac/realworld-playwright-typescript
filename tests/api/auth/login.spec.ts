import { test, expect } from '@playwright/test';
import { AuthSession, registerUser } from '../../../src/helpers/api-helpers';

test.describe('POST /api/users/login', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    let session: AuthSession;

    test.beforeAll(async ({ request }) => {
        session = await registerUser(request);
    });

    test('authenticates existing user', async ({ request }) => {
        const response = await request.post('/api/users/login', {
            data: {
                user: {
                    email: session.user.email,
                    password: session.credentials.password,
                },
            },
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

    test('returns 401 on invalid password', async ({ request }) => {
        const response = await request.post('/api/users/login', {
            data: {
                user: {
                    email: session.user.email,
                    password: 'WrongPassword123!',
                },
            },
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body).toHaveProperty('errors');
    });
});