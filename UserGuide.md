# Topic Status Tracking - User Guide (Junkai Feng)

## Overview
This feature enables students and instructors to track the status of questions/topics as **unanswered**, **answered**, or **resolved**. This helps users quickly identify which questions need attention and which have been resolved.

## User Story
"As a student, I want to see if a question is unanswered, answered, or resolved, so I can figure out the more important questions to look at."

---

## Features Implemented

### Sprint 1
- Backend API for status management
- Automatic "unanswered" status on new topics
- Status display in topic titles

### Sprint 2
- Interactive "Mark as Resolved" button
- Data persistence in database


## How to Use the Feature

### 1. Viewing Topic Status

When viewing any topic, the status appears **in bold before the title**:

(unanswered) Topic2
(answered) Topic1
(resolved) Welcome to NodeBB

**Status Meanings:**
- **(unanswered)** - Question has not received any responses yet
- **(answered)** - Question has been answered but not yet marked as resolved
- **(resolved)** - Question is fully resolved and closed


### 2. Creating New Topics

All new topics automatically receive the **"unanswered"** status.

**Example:**
- You create: "How to configure email settings?"
- Displays as: **(unanswered) How to configure email settings?**


### 3. Changing Topic Status to Resolved

**Requirements:**
- Must be logged in
- Must have edit permissions on the topic (topic owner or moderator)

**Steps:**
1. Open the topic you want to mark as resolved
2. Look for the blue **"✓ Mark as Resolved"** button below the topic title
3. Click the button
4. You'll see a loading spinner: "Updating..."
5. Success message appears: "Topic marked as resolved!"
6. Page refreshes automatically
7. Status changes from **(unanswered)** or **(answered)** to **(resolved)**
8. Button disappears (already resolved)


## Manual Testing Guide

### Test Case 1: New Topic Gets Default Status

**Objective:** Verify new topics automatically get "unanswered" status

**Steps:**
1. Log in to NodeBB
2. Navigate to any category
3. Click "New Topic"
4. Enter title: "Test Topic for Status"
5. Enter content: "This is a test"
6. Click "Submit"
7. Note the topic ID from the URL

**Expected Result:**
- Topic displays as: **(unanswered) Test Topic for Status**

**Verification:**
```bash
# Check in Redis database
redis-cli HGET topic:X status
# Should return: "unanswered"
```

---

### Test Case 2: Button Changes Status to Resolved

**Objective:** Verify the "Mark as Resolved" button works

**Steps:**
1. Open a topic with status "unanswered" or "answered"
2. Verify you see the blue "✓ Mark as Resolved" button
3. Click the button
4. Observe the loading state

**Expected Result:**
- Button text changes to "⟳ Updating..."
- Button becomes disabled
- Success message appears: "Topic marked as resolved!"
- Page refreshes within 1 second
- Status changes to **(resolved)**
- Button disappears

**Verification:**
```bash
redis-cli HGET topic:X status
# Should return: "resolved"
```

---

### Test Case 3: All Three Status States

**Objective:** Verify all three statuses work

**Steps:**
1. Create or find a test topic
2. Note the topic ID
3. Use API to change status to each state:
```javascript
// Set to unanswered
fetch('/api/v3/topics/X/status', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json', 'x-csrf-token': config.csrf_token},
    body: JSON.stringify({status: 'unanswered'})
}).then(res => res.json()).then(console.log);

// Refresh and verify shows: (unanswered)

// Set to answered
fetch('/api/v3/topics/X/status', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json', 'x-csrf-token': config.csrf_token},
    body: JSON.stringify({status: 'answered'})
}).then(res => res.json()).then(console.log);

// Refresh and verify shows: (answered)

// Set to resolved
fetch('/api/v3/topics/X/status', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json', 'x-csrf-token': config.csrf_token},
    body: JSON.stringify({status: 'resolved'})
}).then(res => res.json()).then(console.log);

// Refresh and verify shows: (resolved)
```

**Expected Result:**
- Each status displays correctly in the title
- Database reflects the changes

---

### Test Case 4: Invalid Status Rejection

**Objective:** Verify invalid statuses are rejected

**Steps:**
1. Open DevTools Console
2. Try to set an invalid status:
```javascript
fetch('/api/v3/topics/1/status', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json', 'x-csrf-token': config.csrf_token},
    body: JSON.stringify({status: 'invalid'})
}).then(res => res.json()).then(console.log);
```

**Expected Result:**
- API returns error response
- Status does not change

---

### Test Case 5: Permission Check

**Objective:** Verify only authorized users can change status

**Steps:**
1. **As User A:** Create a topic
2. **Log out**
3. **Log in as User B** (different user, not admin)
4. Open User A's topic
5. Try to click "Mark as Resolved" button

**Expected Result:**
- Button should not appear (no edit permission)
- OR: Button appears but API returns 403 Forbidden error

**Verification:**
```javascript
// Try API call as unauthorized user
fetch('/api/v3/topics/X/status', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json', 'x-csrf-token': config.csrf_token},
    body: JSON.stringify({status: 'resolved'})
}).then(res => res.json()).then(console.log);
// Should return error
```

---

### Test Case 6: Data Persistence

**Objective:** Verify status persists across page loads

**Steps:**
1. Change a topic's status to "answered"
2. Refresh the page
3. Close browser
4. Reopen browser and navigate to topic
5. Check Redis database

**Expected Result:**
- Status remains "answered" after refresh
- Status remains "answered" after browser restart
- Database shows correct status

**Verification:**
```bash
redis-cli HGET topic:X status
# Should consistently return: "answered"
```

---

## Automated Tests

### Test Location

All automated tests are located in:
```
/test/topics-status.js
```

### Running Tests
```bash
# Run all tests
npm test

# Run only status tests
npm test -- test/topics-status.js

# Expected output: ✓ 17 passing
```

---

### Test Coverage

Our automated test suite includes **17 test cases** organized into 6 categories:

#### 1. Default Status on Topic Creation (2 tests)
- New topics get "unanswered" status automatically
- Status appears correctly in topic data retrieval

**Why sufficient:** Verifies the core requirement that all new topics start with a status.

---

#### 2. Status Update Functions (6 tests)
- Can update status to "answered"
- Can update status to "resolved"
- Can change from "answered" to "resolved"
- Rejects invalid status values
- Rejects empty status
- Rejects status with whitespace

**Why sufficient:** Tests all valid transitions and validates input thoroughly. Ensures data integrity.

---

#### 3. Bulk Status Retrieval (2 tests)
- Retrieves status for multiple topics at once
- Handles empty input arrays gracefully

**Why sufficient:** Tests the performance optimization feature and edge case handling.

---

#### 4. API Endpoint (5 tests)
- Successfully updates status via API
- Rejects requests without status field
- Rejects invalid status values via API
- Rejects updates from unauthorized users
- Allows topic owners to update their own topics

**Why sufficient:** Covers all API scenarios including success cases, validation, and permission checks. This is critical for security.

---

#### 5. Data Persistence (1 test)
- ✅ Status persists across multiple retrievals

**Why sufficient:** Confirms database operations work correctly and data doesn't get lost.

---

#### 6. Edge Cases (2 tests)
- Handles non-existent topics gracefully
- Handles concurrent status updates

**Why sufficient:** Tests unusual scenarios that could cause bugs in production.

---

### Why This Test Suite is Sufficient

Our 17 tests provide comprehensive coverage because they:

1. **Test all code paths** - Every function in the status feature is tested
2. **Test success and failure cases** - Not just happy paths
3. **Test permissions** - Security is verified
4. **Test data integrity** - Validation and persistence confirmed
5. **Test edge cases** - Unusual scenarios handled
6. **Test at multiple layers** - Database, business logic, and API all tested
7. **Follow acceptance criteria** - All user story requirements verified

**Coverage by Feature:**
- Create (default status) - 2 tests
- Read (get status) - 3 tests
- Update (change status) - 9 tests
- Delete (N/A for this feature)
- Validation - 6 tests
- Permissions - 3 tests
- Edge cases - 2 tests


# Anonymous Posting Feature — User Guide (Phillip)

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
- 

# Endorse Topic Feature - User Guide (Lilly Yang)

## Overview
This feature enables course instructors to mark topics as endorsed, helping students to identify which discussions are valuable to look at.

## How to use the endorse post feature?
1. Viewing the endorsed status:
Viewing the list of topics from the home page to know the topic’s endorse status: A topic is endorsed if there is a green box containing a star and labeled “endorsed” under the title, else it’s not endorsed.

2. Toggle the endorse status (Administrator/ moderator accounts only):
Click on the title of the topic to navigate to its content page. Find the “Topic Tools” button on the list of options on the right side of the topic description. Click on “Topic Tools” to open the drop down menu and find “Endorse Topic” or “”Unendorse Topic” (the 3rd button from the top). Click on the “Endorse/Unendorse Topic” button to toggle the endorse state of the post.

3. Viewing the new endorsed status:
If the endorse state of the topic is updated successfully, there is a notification message at the botton right corner indicating “Success Topic marked as endorsed/ unendorsed.” Then, the updated state is reflected by the “endorsed” star icon on the home page and persists upon refreshing the page.

## Setup / Running NodeBB Locally

Use the standard NodeBB dev workflow in the repo root.

1. Install dependencies:
    * npm install
2. Build assets:
    * ./nodebb build
3. Start server:
    * ./nodebb start
4. Check status:
    * ./nodebb status
  After code changes

Rebuild and restart NodeBB to ensure the template/client/backend changes are loaded: run in order: *./nodebb stop, *./nodebb build and *./nodebb start

## How to User-Test the Feature
To user-test the endorse topic feature, use an admin and a non-admin account.
1. From either account, create a topic to find the endorse state originally not set.
2. Then, using the admin account, go to the topic’s content page and click on the Endorse Topic button in the Topic Tools drop down menu.
3. From the admin’s account, view the “Success Topic marked as endorsed” message on the bottom right corner.
4. From either account, return to the home page to view the endorsed icon on the cover of the topic.
5. Using the admin account, go to the topic’s content page and click on the Unendorse Topic button in the Topic Tools drop down menu.
6. From the admin’s account, view the “Success Topic marked as unendorsed” message on the bottom right corner.
7. From either account, return to the home page to view that the endorsed icon has been removed from the cover of the topic.

##Expected Behavior and Edge Case

1. False-like value when the state is unendorsed:
    * Expected stored value: topicData.endorse == undefined
2. True-like value when the state is endorsed:
    * Expected stored value: topicData.endorse == ‘1’
3. Default state: the endorsed state starts as unendorsed when a new post is created

## Automated Testing
Exact file path:
- ```
/test/topics.js
```
- * Test block name: it('should endorse topic', async () => { … }} ;
```
## What is being tested:
When the topic state is endorsed,topics.getTopicField(newTopic.tid, 'endorsed') == ‘1’
Note: when the topic state is unendorsed, the topic field is deleted (as the endorse feature behaves like a presence flag), so topics.getTopicField(newTopic.tid, 'endorsed' has an undefined value and therefore no assertion can be written as a test for the unendorse case.

The OpenAPI contract was also updated to document the  new API route: /api/v3/topics/{tid}/endorse in the schema docs.
* public/openapi/write.yaml
* public/openapi/write/topics/tid/endorse.yaml

## Why this coverage is sufficient
The coverage is sufficient for the implementated change set because it validates the data correctness for the true-like values for the topic field when the Endorse Topic flag is asserted. The Endorse Topic flag cannot be checked with an assertion because the topic field is removed when the state is not asserted.

