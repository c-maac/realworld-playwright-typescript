import { test, expect } from '@playwright/test';

interface TagsResponseBody {
    tags: string[];
}

const assertTagsSchema = (body: unknown): body is TagsResponseBody => {
    expect(body).toStrictEqual({
        tags: expect.arrayContaining([expect.any(String)]),
    });
    return true;
};

test.describe('Tags Domain (/api/tags)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test('fetches popular tags list', async ({ request }) => {
        const res = await request.get('/api/tags');
        expect(res.status()).toBe(200);

        const body = (await res.json()) as TagsResponseBody;

        assertTagsSchema(body);
        expect(Array.isArray(body.tags)).toBe(true);
        expect(body.tags.length).toBeGreaterThan(0);

        body.tags.forEach((tag) => {
            expect(typeof tag).toBe('string');
            expect(tag.trim().length).toBeGreaterThan(0);
        });
    });

    test('supports unauthenticated access', async ({ request }) => {
        const res = await request.get('/api/tags', {
            headers: {},
        });
        expect(res.status()).toBe(200);
    });
});