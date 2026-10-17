import { test, expect } from '@playwright/test';
import { AuthSession, getUniqueStamp, registerUser } from '../../../src/helpers/api-helpers';
import {
    assertUserSchema,
    assertErrorSchema,
} from '../../../src/helpers/schema-helpers';

test.describe('/api/users/login', () => {

    let session: AuthSession;

    test.beforeAll(async ({ request }) => {
        session = await registerUser(request);
    });

    test('authenticates existing user @smoke', async ({ request }) => {
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


    // Null-Safety: Confirms backend gracefully handles missing DB records (prevents 500s).
    // Security: Enforces identical generic error payload to prevent user enumeration attacks.
    test('returns 401 on non-existent email', async ({ request }) => {
        const response = await request.post('/api/users/login', {
            data: {
                user: {
                    email: `nonexistent_${getUniqueStamp()}@test.com`,
                    password: 'AnyPassword123!',
                },
            },
        });

        expect(response.status()).toBe(401);

        const body = assertErrorSchema(await response.json());
        expect(body.errors).toHaveProperty('credentials');
        expect(body.errors.credentials).toContain('invalid');
    });

    test('returns 422 on blank payload fields', async ({ request }) => {
        const response = await request.post('/api/users/login', {
            data: {
                user: {
                    email: '',
                    password: '',
                },
            },
        });

        expect(response.status()).toBe(422);

        const body = assertErrorSchema(await response.json());
        const expectedErrors = {
            email: "can't be blank",
            password: "can't be blank",
        };

        for (const [field, expectedMessage] of Object.entries(expectedErrors)) {
            expect(body.errors).toHaveProperty(field);
            expect(body.errors[field]).toContain(expectedMessage);
        }
    });
});