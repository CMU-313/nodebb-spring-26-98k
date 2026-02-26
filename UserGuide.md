# Anonymous Posting Feature — User Guide

## Overview
This project adds an **anonymous posting** capability to NodeBB for both topic posts and replies.

### What the feature does
- A post/reply can be submitted or edited with `isAnonymous=true`.
- For **regular viewers** (not owner, not admin), author identity is masked:
  - `username` hidden (shown as `Anonymous`)
  - `displayname` hidden
  - `userslug` hidden
  - avatar/picture hidden and replaced with anonymous icon fallback
- For **post owner** and **administrators**, identity is visible but labeled:
  - Name displays as `Name (Anonymous)`
  - Profile picture remains visible
- Editing can toggle anonymity **on/off**, and rendered identity updates accordingly.
- The anonymity flag is persisted in the database (`isAnonymous` field).

---

## Setup / Running Locally
Use the standard NodeBB dev workflow in the repo root.

### Prerequisites
- Node.js 20+
- Redis available locally (this repo’s test/dev setup uses Redis)

### Run locally
1. Install dependencies:
   - `npm install`
2. Build assets:
   - `./nodebb build`
3. Start server:
   - `./nodebb start`
4. Check status:
   - `./nodebb status`

### After code changes
- Rebuild/restart to ensure template/client/backend changes are loaded:
  - `./nodebb build && ./nodebb restart`

---

## How to Use the Anonymous Posting Feature (step-by-step)

### A) Full composer (new topic, reply via composer, edit)
UI location:
- Composer formatting bar includes an **Anonymous** toggle button (user-secret icon).
- Template source: [vendor/nodebb-plugin-composer-default/static/templates/partials/composer-formatting.tpl](vendor/nodebb-plugin-composer-default/static/templates/partials/composer-formatting.tpl)

Steps:
1. Open composer (new topic or reply via full composer).
2. Click the **Anonymous** button to enable anonymous mode.
3. Submit the post/reply.
4. To post publicly, leave Anonymous unselected.
5. To change later, edit the post and toggle Anonymous on/off.

### B) Quick Reply (Harmony theme)
UI location:
- Harmony quick-reply toolbar includes an anonymous icon button.
- Template source: [vendor/nodebb-theme-harmony-2.1.35/templates/partials/topic/quickreply.tpl](vendor/nodebb-theme-harmony-2.1.35/templates/partials/topic/quickreply.tpl)

Availability:
- Quick Reply is rendered only when:
  - user has reply privilege (`privileges.topics:reply`), and
  - Harmony quick reply is enabled (`config.theme.enableQuickReply`).

Steps:
1. Open a topic page.
2. In quick reply, click the anonymous icon button.
3. Submit using **Quick reply**.
4. Anonymous defaults to **off** when opening reply UI.

---

## How to User-Test the Feature

Use 3 accounts:
- **Owner**: creates anonymous and public posts
- **Regular user**: non-admin, non-owner viewer
- **Admin**: administrator account

### Checklist 1: Anonymous reply creation
1. As Owner, create an anonymous reply.
2. View as Regular user.
3. View as Owner.
4. View as Admin.

Expected:
- Regular user sees `Anonymous` identity and anonymous avatar fallback.
- Owner sees real identity with `(Anonymous)` suffix.
- Admin sees real identity with `(Anonymous)` suffix.

### Checklist 2: Public reply creation
1. As Owner, create a public reply (`Anonymous` off).
2. Refresh topic page.

Expected:
- All viewers see real identity without `(Anonymous)`.

### Checklist 3: Edit toggle behavior
1. As Owner, create public reply.
2. Edit and turn anonymous **on**.
3. Confirm role-based rendering as above.
4. Edit same post and turn anonymous **off**.

Expected:
- Rendering switches correctly each time for all viewer roles.

### Checklist 4: No identity bleed across adjacent posts
1. As same Owner, create one anonymous reply and one public reply in same topic.
2. Refresh topic page.

Expected:
- Anonymous reply remains anonymous.
- Public reply remains public.
- Public reply must not inherit anonymous identity.

### Checklist 5: Queue/approval path (if moderation queue is enabled)
1. Enable post queue.
2. Submit one anonymous queued reply and one public queued reply.
3. Approve both.
4. Refresh page.

Expected:
- Approved anonymous post remains anonymous.
- Approved public post remains public.

---

## Edge Cases and Expected Behavior

1. **False-like values** (`false`, `"false"`, `0`, `"0"`, `undefined`)
   - Expected stored value: `isAnonymous=0`
2. **True-like values** (`true`, `"true"`, `1`, `"1"`)
   - Expected stored value: `isAnonymous=1`
3. **Quick Reply default state**
   - Anonymous starts unselected.
4. **Edit response vs refresh consistency**
   - Immediate post view and refreshed view should match.
5. **Teaser/topic-list/user summary views**
   - Role-based masking behavior remains consistent across all render paths.

---

## Automated Tests

### Exact file path(s)
- New feature tests are in: [test/posts.js](test/posts.js)
- Test block name: `describe('Anonymous posting', ...)`

### What is being tested
Implemented automated cases include:
1. **Normalization false-like → `isAnonymous=0`**
2. **Normalization true-like → `isAnonymous=1`**
3. **Masking helper for regular viewer** (full anonymization)
4. **Masking helper for owner** (real identity + `(Anonymous)`)
5. **Masking helper for admin** (real identity + `(Anonymous)`)
6. **No identity bleed** between anonymous/public posts by same author
7. **API reply create anonymous** persistence + rendering checks
8. **API edit toggle** on/off + rendering follows state

The OpenAPI contract was also updated to reflect `isAnonymous` in relevant response shapes:
- [public/openapi/read/index.yaml](public/openapi/read/index.yaml)
- [public/openapi/read/categories.yaml](public/openapi/read/categories.yaml)
- [public/openapi/read/unread.yaml](public/openapi/read/unread.yaml)
- [public/openapi/components/schemas/PostObject.yaml](public/openapi/components/schemas/PostObject.yaml)
- [public/openapi/components/schemas/TopicObject.yaml](public/openapi/components/schemas/TopicObject.yaml)

### Why this coverage is sufficient
This coverage is sufficient for the implemented change set because it validates:
- **Data correctness for "truthy"/"falsy" values** (normalization of stored values)
- **Privacy enforcement across roles** (regular vs owner vs admin)
- **Correctly updating privacy** (create/edit toggle)
- **Commonly seen bug paths** already seen in development:
  - public post turning anonymous after refresh
  - identity bleed across posts sharing same author object
- **API-level behavior** instead of only helper-level behavior, ensuring end-to-end correctness for the feature’s most critical flows.
