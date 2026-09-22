import { expect } from '@playwright/test';

// ==========================================
// 1. Shared Asymmetric Matchers
// ==========================================
export const stringOrNull = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' || actual === null,
    toString: () => 'String | null',
};

export const isoDateString = {
    asymmetricMatch: (actual: unknown) => typeof actual === 'string' && !isNaN(Date.parse(actual)),
    toString: () => 'Valid ISO Date String',
};

// ==========================================
// 2. Shared Interfaces
// ==========================================

export interface GenericErrorResponseBody {
    errors: Record<string, string[]>;
}

export interface Profile {
    username: string;
    bio: string | null;
    image: string | null;
    following: boolean;
}

export interface ProfileResponseBody {
    profile: Profile;
}

export interface TagsResponseBody {
    tags: string[];
}

export interface Article {
    slug: string;
    title: string;
    description: string;
    body: string;
    tagList: string[];
    createdAt: string;
    updatedAt: string;
    favorited: boolean;
    favoritesCount: number;
    author: Profile;
}

// article objects in list/feed responses (GET /api/articles and GET /api/articles/feed) 
// do NOT include the body field.
export type ArticleListItem = Omit<Article, 'body'>;

export interface SingleArticleResponseBody {
    article: Article;
}

export interface MultipleArticlesResponseBody {
    articles: ArticleListItem[];
    articlesCount: number;
}

export interface Comment {
    id: number;
    createdAt: string;
    updatedAt: string;
    body: string;
    author: Profile;
}

export interface SingleCommentResponseBody {
    comment: Comment;
}

export interface MultipleCommentsResponseBody {
    comments: Comment[];
}

export interface User {
    email: string;
    token: string;
    username: string;
    bio: string | null;
    image: string | null;
}

export interface UserResponseBody {
    user: User;
}

// ==========================================
// 3. Shared Assertions 
// The schema helper should only validate 
// payload structure, primitive types, 
// nullability, ISO date formats, and required keys. It verifies the contract is valid, 
// regardless of who are the users to or what state the data is in.
// ==========================================

export const assertErrorSchema = (data: unknown): GenericErrorResponseBody => {
    expect(data).toHaveProperty('errors');
    const body = data as GenericErrorResponseBody;

    expect(typeof body.errors).toBe('object');
    expect(body.errors).not.toBeNull();

    // Verifies every key maps to an array of strings
    Object.values(body.errors).forEach((messages) => {
        expect(Array.isArray(messages)).toBe(true);
        messages.forEach((msg) => expect(typeof msg).toBe('string'));
    });

    return body;
};

export const assertProfileSchema = (responseBody: unknown): ProfileResponseBody => {
    expect(responseBody).toHaveProperty('profile');
    const body = responseBody as ProfileResponseBody;

    expect(body.profile).toStrictEqual({
        username: expect.any(String),
        bio: stringOrNull,
        image: stringOrNull,
        following: expect.any(Boolean),
    });

    return body;
};

export const assertTagsSchema = (data: unknown): TagsResponseBody => {
    expect(data).toHaveProperty('tags');
    const body = data as TagsResponseBody;

    expect(body).toStrictEqual({
        tags: expect.arrayContaining([expect.any(String)]),
    });

    return body;
};

export const assertArticleSchema = (data: unknown): SingleArticleResponseBody => {
    expect(data).toHaveProperty('article');
    const body = data as SingleArticleResponseBody;

    expect(body.article).toStrictEqual({
        slug: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        body: expect.any(String),
        tagList: expect.arrayContaining([expect.any(String)]),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: {
            username: expect.any(String),
            bio: stringOrNull,
            image: stringOrNull,
            following: expect.any(Boolean),
        },
    });

    return body;
};

export const assertMultipleArticlesSchema = (data: unknown): MultipleArticlesResponseBody => {
    expect(data).toHaveProperty('articles');
    expect(data).toHaveProperty('articlesCount');
    const body = data as MultipleArticlesResponseBody;

    expect(typeof body.articlesCount).toBe('number');
    expect(Array.isArray(body.articles)).toBe(true);

    body.articles.forEach((article) => {
        expect(article).toStrictEqual({
            slug: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            tagList: expect.arrayContaining([expect.any(String)]),
            createdAt: isoDateString,
            updatedAt: isoDateString,
            favorited: expect.any(Boolean),
            favoritesCount: expect.any(Number),
            author: {
                username: expect.any(String),
                bio: stringOrNull,
                image: stringOrNull,
                following: expect.any(Boolean),
            },
        });
    });

    return body;
};

export const assertCommentSchema = (data: unknown): SingleCommentResponseBody => {
    expect(data).toHaveProperty('comment');
    const body = data as SingleCommentResponseBody;

    expect(body.comment).toStrictEqual({
        id: expect.any(Number),
        createdAt: isoDateString,
        updatedAt: isoDateString,
        body: expect.any(String),
        author: {
            username: expect.any(String),
            bio: stringOrNull,
            image: stringOrNull,
            following: expect.any(Boolean),
        },
    });

    return body;
};

export const assertMultipleCommentsSchema = (data: unknown): MultipleCommentsResponseBody => {
    expect(data).toHaveProperty('comments');
    const body = data as MultipleCommentsResponseBody;

    expect(Array.isArray(body.comments)).toBe(true);

    body.comments.forEach((comment) => {
        expect(comment).toStrictEqual({
            id: expect.any(Number),
            createdAt: isoDateString,
            updatedAt: isoDateString,
            body: expect.any(String),
            author: {
                username: expect.any(String),
                bio: stringOrNull,
                image: stringOrNull,
                following: expect.any(Boolean),
            },
        });
    });

    return body;
};

export const assertUserSchema = (data: unknown): UserResponseBody => {
    expect(data).toHaveProperty('user');
    const body = data as UserResponseBody;

    expect(body.user).toStrictEqual({
        email: expect.any(String),
        token: expect.any(String),
        username: expect.any(String),
        bio: stringOrNull,
        image: stringOrNull,
    });

    return body;
};