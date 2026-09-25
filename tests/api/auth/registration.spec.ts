import { test, expect } from '@playwright/test';
import { createRandomUser } from '../../../src/helpers/user-factory';
import { registerUser } from '../../../src/helpers/api-helpers';
import {
    assertUserSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('POST /api/users', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test('registers a new user', async ({ request }) => {
        const newUser = createRandomUser();

        const response = await request.post('/api/users', {
            data: { user: newUser },
        });

        expect(response.status()).toBe(201);

        const body = assertUserSchema(await response.json());

        expect(body.user.username).toBe(newUser.username);
        expect(body.user.email).toBe(newUser.email);
        expect(body.user.token.length).toBeGreaterThan(0);
        expect(body.user.bio).toBeNull();
        expect(body.user.image).toBeNull();
    });

    test.describe('Input Validation', () => {
        const invalidPayloads = [
            {
                name: 'missing username and password',
                payload: { email: `user_${Date.now()}@test.com` },
                expectedErrors: {
                    username: "can't be blank",
                    password: "can't be blank",
                },
            },
            {
                name: 'empty string fields',
                payload: { username: '', email: '', password: '' },
                expectedErrors: {
                    username: "can't be blank",
                    email: "can't be blank",
                    password: "can't be blank",
                },
            },
            {
                name: 'null value fields',
                payload: { username: null, email: null, password: null },
                expectedErrors: {
                    username: "can't be blank",
                    email: "can't be blank",
                    password: "can't be blank",
                },
            },
        ];

        for (const { name, payload, expectedErrors } of invalidPayloads) {
            test(`returns 422 on ${name}`, async ({ request }) => {
                const response = await request.post('/api/users', {
                    data: { user: payload },
                });

                expect(response.status()).toBe(422);

                const body = assertErrorSchema(await response.json());

                for (const [field, expectedMessage] of Object.entries(expectedErrors)) {
                    expect(body.errors).toHaveProperty(field);
                    expect(body.errors[field]).toContain(expectedMessage);
                }
            });
        }
    });

    test('returns 422 when root user object is missing', async ({ request }) => {
        const response = await request.post('/api/users', {
            data: {},
        });

        expect(response.status()).toBe(422);

        const body = assertErrorSchema(await response.json());

        const expectedErrors = {
            username: "can't be blank",
            email: "can't be blank",
            password: "can't be blank",
        };

        for (const [field, expectedMessage] of Object.entries(expectedErrors)) {
            expect(body.errors).toHaveProperty(field);
            expect(body.errors[field]).toContain(expectedMessage);
        }
    });

    // TODO: App acts weird on duplicate email registration!
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
        const body = assertErrorSchema(await response.json());

        expect(body.errors).toHaveProperty('email');
    });
});