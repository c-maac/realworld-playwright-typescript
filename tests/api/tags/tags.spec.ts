import { test, expect } from '@playwright/test';
import { assertTagsSchema } from '../../../src/helpers/schema-helpers';

test.describe('Tags Domain (/api/tags)', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test('fetches popular tags list', async ({ request }) => {
        const res = await request.get('/api/tags');
        expect(res.status()).toBe(200);

        const body = assertTagsSchema(await res.json());
        expect(body.tags.length).toBeGreaterThan(0);

        // Ensure tags are unique and sanitized non-empty strings
        const uniqueTags = new Set(body.tags);
        expect(uniqueTags.size).toBe(body.tags.length);

        body.tags.forEach((tag) => {
            expect(tag.trim().length).toBeGreaterThan(0);
        });
    });

    test('supports unauthenticated access', async ({ request }) => {
        const res = await request.get('/api/tags', {
            headers: {},
        });
        expect(res.status()).toBe(200);
        assertTagsSchema(await res.json());
    });
});