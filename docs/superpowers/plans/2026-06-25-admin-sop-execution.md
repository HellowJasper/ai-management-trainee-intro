# Admin SOP Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin SOP optimization list into safer, more usable admin-console behavior without disturbing the audience/player flows.

**Architecture:** Keep the existing static admin architecture. `admin.html` owns form/control markup, `src/admin.js` owns admin UI behavior and rendering, `src/data.js` owns API requests and error messages, and `tests/logic.test.js` verifies wiring and front-end behavior contracts.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node built-in test runner, existing MySQL-backed API service.

---

### Task 1: Dangerous Vote/Result Confirmation

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `src/admin.js`

- [ ] **Step 1: Write the failing test**
  Add a test asserting that admin vote-window changes call a dedicated confirmation helper, that `closed` and `published` statuses are treated as dangerous, and that publish confirmation includes vote total and judge coverage.

- [ ] **Step 2: Run the focused test to verify it fails**
  Run: `node --test --test-name-pattern "admin vote window dangerous actions require confirmation" tests/logic.test.js`
  Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement minimal code**
  Add `isDangerousVoteWindowStatus`, `buildVoteWindowConfirmMessage`, and `confirmVoteWindowAction` in `src/admin.js`; call it from `updateAdminVoteWindow` unless explicitly skipped.

- [ ] **Step 4: Run focused and full admin logic tests**
  Run focused test, then `node --test tests/logic.test.js`.

### Task 2: Backend Error Message Surfacing

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `src/data.js`

- [ ] **Step 1: Write the failing test**
  Add a VM-based data-loader test where `fetch` returns a JSON error body and assert `fetchJson` throws that backend message.

- [ ] **Step 2: Run the focused test to verify it fails**
  Run: `node --test --test-name-pattern "data loader surfaces backend error messages" tests/logic.test.js`
  Expected: FAIL because `fetchJson` currently throws only `Request failed: ...`.

- [ ] **Step 3: Implement minimal code**
  Parse failed response JSON/text in `fetchJson` and throw `error.message` when present.

- [ ] **Step 4: Run focused and full admin logic tests**
  Run focused test, then `node --test tests/logic.test.js`.

### Task 3: Safer Team Member Maintenance

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `admin.html`
- Modify: `src/admin.js`
- Modify: `admin.css`

- [ ] **Step 1: Write the failing test**
  Add a test asserting the member form includes an existing-user selector, role key dropdown options, and logic that auto-fills user fields and maps leader to `advisor`.

- [ ] **Step 2: Run the focused test to verify it fails**
  Run: `node --test --test-name-pattern "admin team member maintenance uses user and role selectors" tests/logic.test.js`
  Expected: FAIL because the selector and role preset logic do not exist yet.

- [ ] **Step 3: Implement minimal code**
  Add an optional user selector and role preset dropdown while keeping manual fields editable. Populate it from `userRoleState.users`; auto-fill ID/name/department/photo when a known user is selected; fill duty as `队长` when `roleKey=advisor` if empty.

- [ ] **Step 4: Run focused and full admin logic tests**
  Run focused test, then `node --test tests/logic.test.js`.

### Task 4: CSV Export Buttons

**Files:**
- Modify: `tests/logic.test.js`
- Modify: `admin.html`
- Modify: `src/admin.js`
- Modify: `admin.css`

- [ ] **Step 1: Write the failing test**
  Add a test asserting export buttons exist for teams, votes, works, result snapshot, and audit logs; assert `downloadAdminCsv` and CSV builders exist.

- [ ] **Step 2: Run the focused test to verify it fails**
  Run: `node --test --test-name-pattern "admin console exports key operation datasets" tests/logic.test.js`
  Expected: FAIL because export controls do not exist yet.

- [ ] **Step 3: Implement minimal code**
  Add export buttons and client-side CSV generation from already loaded state. Keep this browser-only and avoid new backend routes.

- [ ] **Step 4: Run focused and full tests**
  Run focused test, `node --test tests/logic.test.js`, then `npm test`.

