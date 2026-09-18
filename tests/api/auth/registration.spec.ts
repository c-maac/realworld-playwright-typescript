import { test, expect } from '@playwright/test';
import { createRandomUser } from '../../../src/helpers/user-factory';
import { registerUser } from '../../../src/helpers/api-helpers';

test.describe('POST /api/users', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test('registers a new user', async ({ request }) => {
        const newUser = createRandomUser();

        const response = await request.post('/api/users', {
            data: { user: newUser },
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body).toHaveProperty('user');
        expect(typeof body.user.token).toBe('string');
        expect(body.user.token).not.toBe('');

        expect(body.user).toStrictEqual({
            username: newUser.username,
            email: newUser.email.toLowerCase(),
            bio: null,
            image: null,
            token: body.user.token,
        });
    });

    test.describe('Input Validation', () => {
        const invalidPayloads = [
            {
                name: 'missing username and password',
                payload: { email: `user_${Date.now()}@test.com` },
                expectedErrors: ['username', 'password'],
            },
            {
                name: 'empty string fields',
                payload: { username: '', email: '', password: '' },
                expectedErrors: ['username', 'email', 'password'],
            },
            {
                name: 'null value fields',
                payload: { username: null, email: null, password: null },
                expectedErrors: ['username', 'email', 'password'],
            },
        ];

        for (const { name, payload, expectedErrors } of invalidPayloads) {
            test(`returns 422 on ${name}`, async ({ request }) => {
                const response = await request.post('/api/users', {
                    data: { user: payload },
                });

                expect(response.status()).toBe(422);

                const body = await response.json();
                for (const field of expectedErrors) {
                    expect(body.errors).toHaveProperty(field);
                }
            });
        }
    });

    test('returns 422 when root user object is missing', async ({ request }) => {
        const response = await request.post('/api/users', {
            data: {},
        });

        expect(response.status()).toBe(422);
        const body = await response.json();
        expect(body).toHaveProperty('errors');
    });

    //TODO: This app acts weird on duplicate email resgistration!
    test.skip('returns 422 on duplicate email', async ({ request }) => {
        const existingSession = await registerUser(request);

        const response = await request.post('/api/users', {
            data: {
                user: {
                    username: `user_${Date.now()}`,
                    email: existingSession.user.email,
                    password: 'Password123!',
                },
            },
        });

        expect(response.status()).toBe(422);
        const body = await response.json();
        expect(body.errors).toHaveProperty('email');
    });



});