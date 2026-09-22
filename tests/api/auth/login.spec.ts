import { test, expect } from '@playwright/test';
import { AuthSession, registerUser } from '../../../src/helpers/api-helpers';
import {
    assertUserSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

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

        const body = assertUserSchema(await response.json());

        expect(body.user.username).toBe(session.user.username);
        expect(body.user.email).toBe(session.user.email);
        expect(body.user.token.length).toBeGreaterThan(0);
        expect(body.user.bio).toBeNull();
        expect(body.user.image).toBeNull();
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

        const body = assertErrorSchema(await response.json());

        expect(body.errors).toHaveProperty('credentials');
        expect(body.errors.credentials).toContain('invalid');
    });
});