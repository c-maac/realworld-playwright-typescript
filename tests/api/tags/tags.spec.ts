import { test, expect } from '@playwright/test';
import { assertTagsSchema } from '../../../src/helpers/schema-helpers';

test.describe('/api/tags', () => {
    test.use({ baseURL: 'https://api.realworld.show' });

    test('fetches tags list @smoke', async ({ request }) => {
        const res = await request.get('/api/tags');
        expect(res.status()).toBe(200);

        const body = assertTagsSchema(await res.json());
        // Enforce non-empty tag set to prevent false-positive pass on sanitization loop
        expect(
            body.tags.length,
            'PRE-SEEDED DATA MISSING: Expected GET /api/tags to return pre-populated tags.'
        ).toBeGreaterThan(0);

        // Ensure tags are unique and sanitized non-empty strings
        const uniqueTags = new Set(body.tags);
        expect(uniqueTags.size).toBe(body.tags.length);

        body.tags.forEach((tag) => {
            expect(tag.trim().length).toBeGreaterThan(0);
        });
    });
});