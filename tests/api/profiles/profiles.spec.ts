import { test, expect } from '@playwright/test';
import {
  AuthSession,
  registerUser,
  getAuthHeader,
  getUniqueStamp,
} from '../../../src/helpers/api-helpers';
import { assertErrorSchema, assertProfileSchema } from '../../../src/helpers/schema-helpers';

// Pre-seeded target user guaranteed to exist on target environment
const TARGET_USERNAME = 'johndoe';

test.describe('/api/profiles/:username', () => {
  test.describe('Read & Validation Operations', () => {
    let sharedUser: AuthSession;

    test.beforeAll(async ({ request }) => {
      sharedUser = await registerUser(request);
    });

    test('fetches user profile (unauthenticated) @smoke', async ({ request }) => {
      const response = await request.get(`/api/profiles/${TARGET_USERNAME}`);

      expect(response.status()).toBe(200);

      const body = assertProfileSchema(await response.json());

      expect(body.profile.username).toBe(TARGET_USERNAME);
      expect(body.profile.following).toBe(false);
    });

    test('returns 401 on follow without auth token', async ({ request }) => {
      const response = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`);

      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    test('returns 401 on unfollow without auth token', async ({ request }) => {
      const response = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`);

      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());
      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    test('returns 404 on fetching non-existent profile', async ({ request }) => {
      const nonExistentUsername = `non_existent_user_${getUniqueStamp()}`;
      const response = await request.get(`/api/profiles/${nonExistentUsername}`);

      expect(response.status()).toBe(404);

      const body = assertErrorSchema(await response.json());

      expect(body.errors).toHaveProperty('profile');
      expect(body.errors.profile).toContain('not found');
    });

    test('returns 404 on following non-existent profile', async ({ request }) => {
      const nonExistentUsername = `non_existent_user_${getUniqueStamp()}`;
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
    test('returns 422 on self-follow attempt', async ({ request }) => {
      test.fixme(
        true,
        'Bug: RealWorld API lacks follower_id !== followee_id constraint and returns 200 OK',
      );

      const response = await request.post(`/api/profiles/${sharedUser.user.username}/follow`, {
        headers: getAuthHeader(sharedUser.token),
      });

      expect(response.status()).toBe(422);
    });
  });

  test.describe('State-Mutating Lifecycle Operations', () => {
    test('manages follow and unfollow relationship @smoke', async ({ request }) => {
      const follower = await registerUser(request);
      const authHeader = getAuthHeader(follower.token);

      await test.step('checks initial follow status', async () => {
        const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
        expect(res.status()).toBe(200);

        const body = assertProfileSchema(await res.json());
        expect(body.profile.username).toBe(TARGET_USERNAME);
        expect(body.profile.following).toBe(false);
      });

      await test.step('follows target user', async () => {
        const res = await request.post(`/api/profiles/${TARGET_USERNAME}/follow`, {
          headers: authHeader,
        });
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
        const res = await request.delete(`/api/profiles/${TARGET_USERNAME}/follow`, {
          headers: authHeader,
        });
        expect(res.status()).toBe(200);

        const body = assertProfileSchema(await res.json());
        expect(body.profile.username).toBe(TARGET_USERNAME);
        expect(body.profile.following).toBe(false);
      });

      await test.step('verifies unfollow status persistence', async () => {
        const res = await request.get(`/api/profiles/${TARGET_USERNAME}`, { headers: authHeader });
        expect(res.status()).toBe(200);

        const body = assertProfileSchema(await res.json());
        expect(body.profile.username).toBe(TARGET_USERNAME);
        expect(body.profile.following).toBe(false);
      });
    });
  });
});
