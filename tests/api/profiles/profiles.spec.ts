import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';
import { assertErrorSchema, assertProfileSchema } from '../../../src/helpers/schema-helpers';

/**
 * Setup Isolation Strategy for /api/profiles:
 * 
 * 1. Read & Validation Operations (beforeAll):
 *    Uses a shared user session to execute GET requests, unauthenticated attempts, 
 *    and error checks against pre-seeded target data. These operations do not alter 
 *    database state, allowing maximum test execution speed.
 * 
 * 2. State-Mutating Lifecycle Operations (beforeEach):
 *    Provisions a fresh follower account for each lifecycle run against the pre-seeded target. 
 *    This guarantees that the test always starts with `following: false`, ensuring 
 *    idempotency even if a previous run crashed mid-execution.
 */

// Pre-seeded target user guaranteed to exist on target environment
const TARGET_USERNAME = 'johndoe';

test.describe('/api/profiles/:username', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    let sharedUser: AuthSession;

    test.beforeAll(async ({ request }) => {
        sharedUser = await registerUser(request);
    });

    test.describe('Read & Validation Operations', () => {
        test('fetches user profile unauthenticated @smoke', async ({ request }) => {
            const response = await request.get(`/api/profiles/${TARGET_USERNAME}`);

            expect(response.status()).toBe(200);

            const body = assertProfileSchema(await response.json());

            expect(body.profile.username).toBe(TARGET_USERNAME);
            expect(body.profile.following).toBe(false);
        });

        test('returns 401 on follow without auth token @negative', async ({ request }) => {
            const response = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`);

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 401 on unfollow without auth token @negative', async ({ request }) => {
            const response = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`);

            expect(response.status()).toBe(401);

            const body = assertErrorSchema(await response.json());
            expect(body.errors).toHaveProperty('token');
            expect(body.errors.token).toContain('is missing');
        });

        test('returns 404 on fetching non-existent profile @negative', async ({ request }) => {
            const nonExistentUsername = `non_existent_user_${Date.now()}`;
            const response = await request.get(`/api/profiles/${nonExistentUsername}`);

            expect(response.status()).toBe(404);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });

        test('returns 404 on following non-existent profile @negative', async ({ request }) => {
            const nonExistentUsername = `non_existent_user_${Date.now()}`;
            const response = await request.post(`/api/profiles/${nonExistentUsername}/follow`, {
                headers: getAuthHeader(sharedUser.token),
            });

            expect(response.status()).toBe(404);

            const body = assertErrorSchema(await response.json());

            expect(body.errors).toHaveProperty('profile');
            expect(body.errors.profile).toContain('not found');
        });

        // NOTE / KNOWN ISSUE: RealWorld backend allows users to self-follow due to missing
        // `follower_id !== followee_id` validation. This is an anti-pattern as it inflates
        // metrics and pollutes personal feed logic, but expecting 200 OK matches this server's current behavior.
        test('returns 422 on self-follow attempt @negative', async ({ request }) => {
            test.fixme(true, 'Backend bug: RealWorld API lacks follower_id !== followee_id constraint and returns 200 OK');

            const response = await request.post(`/api/profiles/${sharedUser.user.username}/follow`, {
                headers: getAuthHeader(sharedUser.token),
            });

            expect(response.status()).toBe(422);
        });
    });

    test.describe('State-Mutating Lifecycle Operations', () => {
        let follower: AuthSession;

        test.beforeEach(async ({ request }) => {
            follower = await registerUser(request);
        });

        test('manages follow and unfollow relationship lifecycle @smoke', async ({ request }) => {
            const authHeader = getAuthHeader(follower.token);

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

            await test.step('verifies follow status persistence', async () => {
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
});