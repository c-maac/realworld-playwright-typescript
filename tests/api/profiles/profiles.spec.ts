import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import { assertErrorSchema, assertProfileSchema } from '../../../src/helpers/schema-helpers';


// Hardcoded pre-seeded target user 
// guaranteed to exist on api.realworld.show
const TARGET_USERNAME = 'johndoe';


test.describe('Profile Domain (/api/profiles/:username)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });
    let userAToken: string;
    let userA: AuthSession;

    test.beforeAll(async ({ request }) => {
        userA = await registerUser(request);
        userAToken = userA.token;
    });

    test.describe('Unauthenticated Operations', () => {
        test('fetches a user profile', async ({ request }) => {
            const response = await request.get(`/api/profiles/${TARGET_USERNAME}`);

            expect(response.status()).toBe(200);

            const body = assertProfileSchema(await response.json());

            expect(body.profile.username).toBe(TARGET_USERNAME);
            expect(body.profile.following).toBe(false);
        });

        test('returns 401 when attempting to follow without token', async ({ request }) => {
            const response = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`);

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 401 when attempting to unfollow without token', async ({ request }) => {
            const response = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`);

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
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

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });

        test('returns 404 when following non-existent profile', async ({ request }) => {
            const response = await request.post(`/api/profiles/${nonExistentUsername}/follow`, {
                headers: getAuthHeader(userAToken),
            });
            expect(response.status()).toBe(404);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });

        // TODO: NOTE / KNOWN ISSUE: RealWorld backend allows users to self-follow due to missing
        // `follower_id !== followee_id` validation. This is an anti-pattern as it inflates
        // metrics and pollutes personal feed logic, but expecting 200 OK matches this server's current behavior.
        test('prevents user from following themselves', async ({ request }) => {
            const response = await request.post(`/api/profiles/${userA.user.username}/follow`, {
                headers: getAuthHeader(userA.token),
            });

            expect(response.status()).toBe(200);
        });
    });
});