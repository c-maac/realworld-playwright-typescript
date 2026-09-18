import { test, expect } from '@playwright/test';
import { AuthSession, registerUser, getAuthHeader } from '../../../src/helpers/api-helpers';

interface Profile {
    username: string;
    bio: string | null;
    image: string | null;
    following: boolean;
}

interface ProfileResponseBody {
    profile: Profile;
}

// Hardcoded pre-seeded target user guaranteed to exist on api.realworld.show
const TARGET_USERNAME = 'johndoe';

// Asymmetric matcher for nullable string fields
const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

// Schema assertion helper
const assertProfileSchema = (
    responseBody: ProfileResponseBody,
    expectedFollowing: boolean
) => {
    expect(responseBody).toHaveProperty('profile');
    expect(responseBody.profile).toStrictEqual({
        username: TARGET_USERNAME,
        bio: stringOrNull,
        image: stringOrNull,
        following: expectedFollowing,
    });
};

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
            assertProfileSchema(await response.json(), false);
        });
    });

    test.describe('Authenticated Lifecycle', () => {
        test('manages follow and unfollow lifecycle', async ({ request }) => {
            const authHeader = getAuthHeader(userAToken);

            await test.step('checks initial follow status', async () => {
                const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
                expect(res.status()).toBe(200);
                assertProfileSchema(await res.json() as ProfileResponseBody, false);
            });

            await test.step('follows target user', async () => {
                const res = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`, { headers: authHeader });
                expect(res.status()).toBe(200);
                assertProfileSchema(await res.json() as ProfileResponseBody, true);
            });

            await test.step('verifies follow status persisted', async () => {
                const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
                expect(res.status()).toBe(200);
                assertProfileSchema(await res.json() as ProfileResponseBody, true);
            });

            await test.step('unfollows target user', async () => {
                const res = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`, { headers: authHeader });
                expect(res.status()).toBe(200);
                assertProfileSchema(await res.json() as ProfileResponseBody, false);
            });
        });
    });

    test.describe('Error Handling', () => {
        const nonExistentUsername = `non_existent_user_${Date.now()}`;

        test('returns 404 for non-existent profile', async ({ request }) => {
            const response = await request.get(`/api/profiles/${nonExistentUsername}`);
            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.errors).toHaveProperty('profile');
        });

        test('returns 404 when following non-existent profile', async ({ request }) => {
            const response = await request.post(`/api/profiles/${nonExistentUsername}/follow`, {
                headers: getAuthHeader(userAToken),
            });
            expect(response.status()).toBe(404);
            const body = await response.json();
            expect(body.errors).toHaveProperty('profile');
        });
    });
});