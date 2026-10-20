import { getUniqueStamp } from './api-helpers';

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

export const createRandomUser = (): TestUser => {
  return {
    username: `user_${getUniqueStamp()}`,
    email: `user_${getUniqueStamp()}@test.com`,
    password: 'Password123!',
  };
};
