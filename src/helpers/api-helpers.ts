// helpers/api-helpers.ts
import { APIRequestContext } from '@playwright/test';
import { createRandomUser, TestUser } from './user-factory';

export interface UserResponsePayload {
    email: string;
    token: string;
    username: string;
    bio: string | null;
    image: string | null;
}

export interface AuthSession {
    // Original credentials used to create the account (useful if you need password for re-login)
    credentials: TestUser;
    // Actual user state returned directly from the API response
    user: UserResponsePayload;
    token: string;
}

/**
 * Registers a fresh user and returns the server user payload + JWT token.
 */
export const registerUser = async (request: APIRequestContext): Promise<AuthSession> => {
    const credentials = createRandomUser();

    const response = await request.post('https://api.realworld.show/api/users', {
        data: { user: credentials },
    });

    if (response.status() !== 201) {
        const errorText = await response.text();
        throw new Error(`Failed to seed user (${response.status()}): ${errorText}`);
    }

    const body = await response.json();

    return {
        credentials,
        user: body.user,          // Server-authoritative user object
        token: body.user.token,    // JWT Token
    };
};

export const getAuthHeader = (token: string) => ({
    Authorization: `Token ${token}`,
});

export const getUniqueStamp = (): string => {
    const timestamp = Date.now();
    const entropy = Math.floor(Math.random() * 1000000);
    return `${timestamp}_${entropy}`;
};