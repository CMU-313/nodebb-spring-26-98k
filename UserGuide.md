# Topic Status Tracking - User Guide

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
- ✅ New topics get "unanswered" status automatically
- ✅ Status appears correctly in topic data retrieval

**Why sufficient:** Verifies the core requirement that all new topics start with a status.

---

#### 2. Status Update Functions (6 tests)
- ✅ Can update status to "answered"
- ✅ Can update status to "resolved"
- ✅ Can change from "answered" to "resolved"
- ✅ Rejects invalid status values
- ✅ Rejects empty status
- ✅ Rejects status with whitespace

**Why sufficient:** Tests all valid transitions and validates input thoroughly. Ensures data integrity.

---

#### 3. Bulk Status Retrieval (2 tests)
- ✅ Retrieves status for multiple topics at once
- ✅ Handles empty input arrays gracefully

**Why sufficient:** Tests the performance optimization feature and edge case handling.

---

#### 4. API Endpoint (5 tests)
- ✅ Successfully updates status via API
- ✅ Rejects requests without status field
- ✅ Rejects invalid status values via API
- ✅ Rejects updates from unauthorized users
- ✅ Allows topic owners to update their own topics

**Why sufficient:** Covers all API scenarios including success cases, validation, and permission checks. This is critical for security.

---

#### 5. Data Persistence (1 test)
- ✅ Status persists across multiple retrievals

**Why sufficient:** Confirms database operations work correctly and data doesn't get lost.

---

#### 6. Edge Cases (2 tests)
- ✅ Handles non-existent topics gracefully
- ✅ Handles concurrent status updates

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
- ✅ Create (default status) - 2 tests
- ✅ Read (get status) - 3 tests
- ✅ Update (change status) - 9 tests
- ✅ Delete (N/A for this feature)
- ✅ Validation - 6 tests
- ✅ Permissions - 3 tests
- ✅ Edge cases - 2 tests