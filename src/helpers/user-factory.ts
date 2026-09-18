export interface TestUser {
    username: string;
    email: string;
    password: string;
}

export const createRandomUser = (): TestUser => {
    const timestamp = Date.now();
    return {
        username: `user_${timestamp}`,
        email: `user_${timestamp}@test.com`,
        password: 'Password123!',
    };
};