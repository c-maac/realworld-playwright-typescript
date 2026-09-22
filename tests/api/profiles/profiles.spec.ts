import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import { assertErrorSchema, assertProfileSchema } from '../../../src/helpers/schema-helpers';


// Hardcoded pre-seeded target user 
// guaranteed to exist on api.realworld.show
const TARGET_USERNAME = 'johndoe';


test.describe('Profile Domain (/api/profiles/:username)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });
    let userAToken: string;

    test.beforeAll(async ({ request }) => {
        const userA: AuthSession = await registerUser(request);
        userAToken = userA.token;
    });

    test.describe('Unauthenticated Operations', () => {
        test('fetches a user profile', async ({ request }) => {
            const response = await request.get(`/api/profiles/${TARGET_USERNAME}`);

            expect(response.status()).toBe(200);

            // 1. Contract / Schema Check
            const body = assertProfileSchema(await response.json());

            // 2. Explicit Business Logic Assertions
            expect(body.profile.username).toBe(TARGET_USERNAME);
            expect(body.profile.following).toBe(false);
        });
    });

    test.describe('Authenticated Lifecycle', () => {
        test('manages follow and unfollow lifecycle', async ({ request }) => {
            const authHeader = getAuthHeader(userAToken);

            await test.step('checks initial follow status', async () => {
                const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
                expect(res.status()).toBe(200);
                const body = assertProfileSchema(await res.json());
                expect(body.profile.username).toBe(TARGET_USERNAME);
                expect(body.profile.following).toBe(false);
            });

            await test.step('follows target user', async () => {
                const res = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`, { headers: authHeader });
                expect(res.status()).toBe(200);
                const body = assertProfileSchema(await res.json());
                expect(body.profile.username).toBe(TARGET_USERNAME);
                expect(body.profile.following).toBe(true);

            });

            await test.step('verifies follow status persisted', async () => {
                const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
                expect(res.status()).toBe(200);
                const body = assertProfileSchema(await res.json());
                expect(body.profile.username).toBe(TARGET_USERNAME);
                expect(body.profile.following).toBe(true);
            });

            await test.step('unfollows target user', async () => {
                const res = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`, { headers: authHeader });
                expect(res.status()).toBe(200);
                const body = assertProfileSchema(await res.json());
                expect(body.profile.username).toBe(TARGET_USERNAME);
                expect(body.profile.following).toBe(false);
            });
        });
    });

    test.describe('Error Handling', () => {
        const nonExistentUsername = `non_existent_user_${Date.now()}`;

        test('returns 404 for non-existent profile', async ({ request }) => {
            const response = await request.get(`/api/profiles/${nonExistentUsername}`);
            expect(response.status()).toBe(404);
            // 1. Contract / Schema Integrity Check
            const body = assertErrorSchema(await response.json());

            // 2. Explicit Domain Key & Error Message Checks
            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });

        test('returns 404 when following non-existent profile', async ({ request }) => {
            const response = await request.post(`/api/profiles/${nonExistentUsername}/follow`, {
                headers: getAuthHeader(userAToken),
            });
            expect(response.status()).toBe(404);
            // 1. Contract / Schema Integrity Check
            const body = assertErrorSchema(await response.json());

            // 2. Explicit Domain Key & Error Message Checks
            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });
    });
});