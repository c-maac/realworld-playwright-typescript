# Global Feed Tag Filtering

## Application Overview

Objective: verify the public global articles feed can be filtered by selecting a tag from the Popular Tags sidebar, and that the user can return to the unfiltered feed using the visible Global Feed breadcrumb. UI journeys only; do not create or mutate articles, favorites, follows, or accounts. Use a fresh unauthenticated browser context and existing public articles/tags; do not assume the remote database is blank or assert exact totals or ordering. Existing coverage reviewed: `tests/api/articles/articles.spec.ts` already validates unauthenticated API filtering by tag, `tests/api/tags/tags.spec.ts` validates the available tags list, and `tests/e2e/navigation/navigation.spec.ts` covers guest feed/navigation and preview-to-article/author navigation. `tests/e2e/feed/feed.spec.ts` covers the personalized feed but not UI tag filtering. Existing accessibility and visual coverage addresses home navigation/header, not tag selection or filtered article results. The planned browser scenarios cover the UI interaction gap without duplicating API validation. A populated existing `javascript` tag is available in the public sidebar; the UI presents the selected tag and matching article previews, and a Global Feed breadcrumb returns to `/`. No no-results scenario is included: the sidebar offers populated popular tags, and no-results behavior for arbitrary tags is not assumed or probed.

## Test Scenarios

### 1. Public global feed tag filtering

**Seed:** ``

#### 1.1. P1 — Filter global feed by a tag selected from Popular Tags

**File:** `tests/e2e/feed/feed.spec.ts`

**Steps:**

1. Precondition: open `/` in a fresh unauthenticated browser context with no JWT in local storage. Do not rely on an empty feed; use the existing populated `javascript` tag shown in Popular Tags. - expect: The public global feed and Popular Tags sidebar are visible. - expect: The `javascript` tag is available as a selectable sidebar link.
2. Select `javascript` from the Popular Tags sidebar. - expect: The application navigates to the tag-filtered feed (for the observed UI, `/tag/javascript`). - expect: The feed identifies the selected `javascript` tag alongside the Global Feed breadcrumb. - expect: Article previews are displayed for articles tagged `javascript`; each displayed preview's tag list contains the selected tag. - expect: Do not assert a fixed preview count or order; use visible list data and tag membership to verify filtering.

#### 1.2. P1 — Clear tag filtering with the Global Feed breadcrumb

**File:** `tests/e2e/feed/feed.spec.ts`

**Steps:**

1. Precondition: start directly on `/tag/javascript` as an unauthenticated visitor, with the filtered feed loaded and the Global Feed breadcrumb visible; this scenario is independent of the preceding test. - expect: The selected tag is visible and the feed contains matching tagged previews.
2. Click the Global Feed breadcrumb above the article list. - expect: The browser returns to `/` and the selected tag indicator is removed. - expect: The global feed is unfiltered again and includes the known public system article “Building Scalable APIs with Node.js” tagged `nodejs`, which is not tagged `javascript`. - expect: Do not assert exact feed size or ordering.
