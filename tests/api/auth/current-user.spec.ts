import { test, expect } from '@playwright/test';
import {
  AuthSession,
  registerUser,
  getAuthHeader,
  getUniqueStamp,
} from '../../../src/helpers/api-helpers';
import { assertUserSchema, assertErrorSchema } from '../../../src/helpers/schema-helpers';

test.describe('/api/user', () => {
  test.describe('Read & Validation Operations', () => {
    let session: AuthSession;

    test.beforeAll(async ({ request }) => {
      session = await registerUser(request);
    });

    test('retrieves current authenticated user @smoke', async ({ request }) => {
      const response = await request.get('/api/user', {
        headers: getAuthHeader(session.token),
      });

      expect(response.status()).toBe(200);

      const body = assertUserSchema(await response.json());

      expect(body.user.username).toBe(session.user.username);
      expect(body.user.email).toBe(session.user.email);
      expect(body.user.token.length).toBeGreaterThan(0);
      expect(body.user.bio).toBeNull();
      expect(body.user.image).toBeNull();
    });

    test('returns 401 on missing auth token (GET)', async ({ request }) => {
      const response = await request.get('/api/user');

      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());

      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    test('returns 401 on invalid auth token (GET)', async ({ request }) => {
      const response = await request.get('/api/user', {
        headers: { Authorization: 'Token invalid_token_12345' },
      });

      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());

      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    test('returns 401 on missing auth token (PUT)', async ({ request }) => {
      const response = await request.put('/api/user', {
        data: { user: { bio: 'Unauthorized update attempt' } },
      });

      expect(response.status()).toBe(401);

      const body = assertErrorSchema(await response.json());

      expect(body.errors).toHaveProperty('token');
      expect(body.errors.token).toContain('is missing');
    });

    const invalidProfileFields = [
      {
        name: 'email as empty string',
        payload: { email: '' },
        expectedError: 'email is a string of less than 100 chars',
      },
      {
        name: 'username as empty string',
        payload: { username: '' },
        expectedError: 'username is a string of less than 60 chars',
      },
      {
        name: 'email as null',
        payload: { email: null },
        expectedError: 'email is a string of less than 100 chars',
      },
      {
        name: 'username as null',
        payload: { username: null },
        expectedError: 'username is a string of less than 60 chars',
      },
      {
        name: 'password as empty string',
        payload: { password: '' },
        expectedError: 'password must be a string between 8 and 128 chars',
      },
      {
        name: 'password as null',
        payload: { password: null },
        expectedError: 'password must be a string between 8 and 128 chars',
      },
      {
        name: 'password under 8 characters',
        payload: { password: 'short7c' },
        expectedError: 'password must be a string between 8 and 128 chars',
      },
    ];

    for (const { name, payload, expectedError } of invalidProfileFields) {
      test(`returns 422 on ${name}`, async ({ request }) => {
        const response = await request.put('/api/user', {
          headers: getAuthHeader(session.token),
          data: { user: payload },
        });

        expect(response.status()).toBe(422);

        const body = assertErrorSchema(await response.json());

        expect(body.errors).toHaveProperty('body');
        expect(body.errors.body).toContain(expectedError);
      });
    }
  });

  test.describe('State-Mutating Updates', () => {
    test('updates username and verifies public profile resolution @smoke', async ({ request }) => {
      const session = await registerUser(request);
      const authHeader = getAuthHeader(session.token);
      const oldUsername = session.user.username;
      const newUsername = `updated_user_${getUniqueStamp()}`;

      await test.step('updates username', async () => {
        const response = await request.put('/api/user', {
          headers: authHeader,
          data: {
            user: {
              username: newUsername,
            },
          },
        });

        expect(response.status()).toBe(200);

        const body = assertUserSchema(await response.json());
        expect(body.user.username).toBe(newUsername);
      });

      // Cross-Endpoint Verification:
      // Verifying against GET /api/profiles/:username proves that the username update
      // propagated through database lookup indices and public routing, while confirming
      // the old username handle was properly released.
      await test.step('verifies new username is publicly resolvable via GET /api/profiles', async () => {
        const response = await request.get(`/api/profiles/${newUsername}`, {
          headers: authHeader,
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.profile.username).toBe(newUsername);
      });

      await test.step('verifies old username handle is released (404)', async () => {
        const response = await request.get(`/api/profiles/${oldUsername}`, {
          headers: authHeader,
        });

        expect(response.status()).toBe(404);
      });
    });

    test('updates email and logins with new email @smoke', async ({ request }) => {
      const session = await registerUser(request);
      const authHeader = getAuthHeader(session.token);
      const newEmail = `updated_${getUniqueStamp()}@test.com`;

      await test.step('updates email via PUT /api/user', async () => {
        const response = await request.put('/api/user', {
          headers: authHeader,
          data: {
            user: { email: newEmail },
          },
        });

        expect(response.status()).toBe(200);

        const body = assertUserSchema(await response.json());
        expect(body.user.email).toBe(newEmail);
      });

      await test.step('verifies login succeeds with updated email via POST /api/users/login', async () => {
        const response = await request.post('/api/users/login', {
          data: {
            user: {
              email: newEmail,
              password: session.credentials.password,
            },
          },
        });

        expect(response.status()).toBe(200);

        const body = assertUserSchema(await response.json());
        expect(body.user.email).toBe(newEmail);
        expect(body.user.token.length).toBeGreaterThan(0);
      });
    });

    test('updates password and logins with new password @smoke', async ({ request }) => {
      const session = await registerUser(request);
      const newPassword = `NewPass_${getUniqueStamp()}`;

      await test.step('updates password via PUT /api/user', async () => {
        const response = await request.put('/api/user', {
          headers: getAuthHeader(session.token),
          data: {
            user: { password: newPassword },
          },
        });

        expect(response.status()).toBe(200);
      });

      await test.step('verifies old password no longer works via POST /api/users/login', async () => {
        const response = await request.post('/api/users/login', {
          data: {
            user: {
              email: session.user.email,
              password: session.credentials.password, // Old password
            },
          },
        });

        expect(response.status()).toBe(401);
      });

      await test.step('verifies login succeeds with new password via POST /api/users/login', async () => {
        const response = await request.post('/api/users/login', {
          data: {
            user: {
              email: session.user.email,
              password: newPassword,
            },
          },
        });

        expect(response.status()).toBe(200);

        const body = assertUserSchema(await response.json());
        expect(body.user.token.length).toBeGreaterThan(0);
      });
    });

    test('updates profile bio and image', async ({ request }) => {
      const session = await registerUser(request);
      const authHeader = getAuthHeader(session.token);
      const updatedBio = `Updated Bio - ${getUniqueStamp()}`;
      const updatedImage = 'https://api.realworld.show/images/demo-avatar.png';

      const response = await request.put('/api/user', {
        headers: authHeader,
        data: {
          user: {
            bio: updatedBio,
            image: updatedImage,
          },
        },
      });

      expect(response.status()).toBe(200);

      const body = assertUserSchema(await response.json());

      expect(body.user.bio).toBe(updatedBio);
      expect(body.user.image).toBe(updatedImage);
      expect(body.user.username).toBe(session.user.username);
      expect(body.user.email).toBe(session.user.email);
    });

    test('normalizes empty string bio and image to null', async ({ request }) => {
      const session = await registerUser(request);
      const authHeader = getAuthHeader(session.token);

      const response = await request.put('/api/user', {
        headers: authHeader,
        data: {
          user: {
            bio: '',
            image: '',
          },
        },
      });

      expect(response.status()).toBe(200);

      const body = assertUserSchema(await response.json());

      expect(body.user.bio).toBeNull();
      expect(body.user.image).toBeNull();
    });

    // NIST SP 800-63B Password Guidelines
    const validPasswords = [
      { name: '8-character password', password: 'bonjour1' },
      { name: '128-character password', password: 'a'.repeat(128) },
    ];

    for (const { name, password } of validPasswords) {
      test(`updates password with ${name}`, async ({ request }) => {
        const session = await registerUser(request);
        const response = await request.put('/api/user', {
          headers: getAuthHeader(session.token),
          data: { user: { password } },
        });

        expect(response.status()).toBe(200);
      });
    }
  });
});
