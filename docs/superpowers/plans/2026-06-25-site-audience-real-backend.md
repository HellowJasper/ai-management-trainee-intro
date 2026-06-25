# Site Audience Real Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan step by step, and use `superpowers:verification-before-completion` before claiming completion. Do not spawn sub-agents unless Jasper explicitly asks for them in Codex. If sub-agents are explicitly requested, use model `gpt-5.4` and prefer names `ken` for implementation/debugging and `wen` for writing/review work.

## Goal

把 `site.html` 的整个观众侧从本地假数据和 `localStorage` 兜底逻辑，改成读取真实后端状态，并让投票等关键行为以服务器和 MySQL 为准。

核心原则：只改观众端需要的边界，不破坏已经做好的后台端、大屏端、评委端和数据库结构。

## Terms

- `site.html`：观众侧入口页面，实际业务脚本主要在 `src/site.js`。
- Bootstrap API：首屏聚合接口，一次性返回观众页需要的真实状态，避免前端同时请求很多零散接口。
- Repository：后端的数据访问层，意思是“把业务代码和数据库 SQL 隔开的一层”。本项目已有 `server/mysqlTeamRepository.js`、`server/mysqlVoteResultsRepository.js` 等。
- Authoritative state：权威状态，意思是以服务器和 MySQL 返回的数据为准，而不是浏览器本地自己猜。
- Boundary management：边界管理，意思是明确本次只动哪些模块，不把修改扩散到其他已经完成的功能。

## Files In Scope

- `server/siteStateService.js`：新增。负责把队伍、学员、作品、投票、发布结果、当前用户身份聚合成观众页状态。
- `server/index.js`：只新增 `GET /api/site/bootstrap` 路由和必要依赖注入，不改已有 API 行为。
- `src/data.js`：新增 `loadSiteBootstrap()`，作为前端统一读取观众页真实状态的入口。
- `src/site.js`：观众页状态接入真实后端；移除关键业务的假数据兜底。
- `tests/server.test.js`：新增后端聚合接口测试。
- `tests/logic.test.js`：新增前端边界/源码行为测试。
- `tests/mysqlUserRoleRepository.test.js`：仅用于修正当前已存在的测试基线不一致问题，避免后续无法判断新改动是否引入回归。

## Files Out Of Scope

- `admin.html`
- `src/admin.js`
- `screen.html`
- `src/screen.js`
- `src/screen-data.js`
- 数据库 schema/migration 文件
- 飞书 OAuth 主流程
- 评委打分、队伍报名、作品提交的后端写入语义

除非测试证明必须改，否则以上文件不动。

## Implementation Tasks

### Task 0: Establish A Clean Test Baseline

- [ ] Run `npm test` and record the current baseline.
- [ ] Fix the known stale test in `tests/mysqlUserRoleRepository.test.js`.
  - Current implementation resolves Feishu login by `user_id`.
  - The stale test still asserts `openId` login lookup.
  - Update the test expectation to match the existing implementation, without changing production login logic.
- [ ] Run `node --test tests/mysqlUserRoleRepository.test.js`.
- [ ] Run `npm test`.

Expected result: before audience-side work starts, the test suite should be green or any remaining failure should be clearly unrelated and documented.

### Task 1: Add Failing Tests For The Audience Bootstrap API

- [ ] In `tests/server.test.js`, add a test for `GET /api/site/bootstrap`.
- [ ] Use in-memory/fake repositories so this test does not depend on the real MySQL server.
- [ ] Assert response shape:
  - `me`
  - `stage`
  - `trainees`
  - `teams`
  - `works`
  - `vote`
  - `result`
- [ ] Assert unauthenticated users are treated as public audience users.
- [ ] Assert the existing `/api/teams` endpoint still works.

Expected first result: the new test fails with `404` because the route is not implemented yet.

### Task 2: Implement The Backend Site State Service

- [ ] Create `server/siteStateService.js`.
- [ ] Add a `createSiteStateService()` function that receives existing repositories:
  - `teamRepository`
  - `voteResultsRepository`
  - `worksRepository`
  - `judgeScoresRepository`
  - `traineeRepository`
  - optional user/session resolver from `server/index.js`
- [ ] Compose state from existing repository methods instead of writing new SQL where possible.
- [ ] Keep this service read-only.
- [ ] Normalize empty or missing data into stable arrays/objects so the frontend can render true empty states.

Expected result: service is isolated, testable, and does not modify admin/screen behavior.

### Task 3: Wire `GET /api/site/bootstrap`

- [ ] In `server/index.js`, import `createSiteStateService`.
- [ ] Instantiate it inside `createServer()` using existing repository dependencies.
- [ ] Add `GET /api/site/bootstrap` inside `routeApi()`.
- [ ] Reuse existing session/cookie logic to derive the current user when available.
- [ ] Return `sendJson(res, 200, state)`.
- [ ] Do not modify existing API paths or response contracts.

Expected result: `node --test tests/server.test.js` passes for the new API tests.

### Task 4: Add Logged-In Vote State Coverage

- [ ] In `tests/server.test.js`, add a test where a logged-in user already voted.
- [ ] Use `loginAs()` helper or equivalent cookie setup.
- [ ] Fake `voteResultsRepository.listVoteResults()` should return `voters: { "public-001": "team-a" }`.
- [ ] Assert `GET /api/site/bootstrap` returns `vote.myVoteTeamId === "team-a"`.

Expected result: the frontend can know “我是否已投票” from the server, not from `localStorage`。

### Task 5: Add Frontend Data Loader

- [ ] In `src/data.js`, add `loadSiteBootstrap()`.
- [ ] The function should call `/api/site/bootstrap`.
- [ ] Avoid JSON file fallback for this API.
  - Reason: this page must no longer silently fall back to fake audience business data.
- [ ] Export it through `root.AppData` with the existing module style.

Expected result: `src/site.js` has a clean data-loading entry instead of directly scattering fetch calls.

### Task 6: Hydrate `src/site.js` From Real Backend State

- [ ] Add a module-level `SITE_STATE`.
- [ ] Add `loadSiteState()` and `applySiteState(state)`.
- [ ] During page initialization, call `loadSiteState()` before first render.
- [ ] Map backend data into the shape existing render functions already expect:
  - `teams`
  - `members`
  - `votes`
  - `works`
  - `trainees`
  - `stage`
  - `result`
- [ ] Preserve existing visual structure and navigation.
- [ ] When the API fails, show a real error/empty state instead of loading fake data.

Expected result: the观众页 still looks familiar, but its data comes from the server.

### Task 7: Remove Critical Local Vote Fallbacks

- [ ] Update `votedTeam()` to read from `SITE_STATE.vote.myVoteTeamId`.
- [ ] Update `castVote()`:
  - call `/api/vote/cast`
  - if successful, reload bootstrap state
  - do not do `team.votes += 1`
  - do not persist authoritative vote state to `localStorage`
- [ ] Update `cancelVote()`:
  - call `/api/vote/cancel`
  - if successful, reload bootstrap state
  - do not decrement local votes manually
- [ ] Keep localStorage only for non-authoritative UI preferences, such as draft text or last tab.

Expected result: browser-side state can no longer fake successful votes.

### Task 8: Use Real Works And Published Results

- [ ] Update gallery/team/project displays to use `SITE_STATE.works`.
- [ ] If no submitted works exist, show a real empty state.
- [ ] Update result page to use `SITE_STATE.result`.
- [ ] If no published result exists, show “未发布” state instead of computing a fake public result.

Expected result:观众端看到的作品和结果都来自数据库/后端发布状态。

### Task 9: Add Frontend Boundary Tests

- [ ] In `tests/logic.test.js`, add source-level or function-level tests that assert:
  - `src/data.js` exports `loadSiteBootstrap`
  - `src/site.js` uses `loadSiteBootstrap` or `/api/site/bootstrap`
  - `src/site.js` no longer contains critical local vote mutation fallback such as `team.votes += 1`
- [ ] Keep the tests narrow so they protect this boundary without forcing a full browser test harness.

Expected result: future changes are less likely to reintroduce fake audience voting state.

### Task 10: Manual And Automated Verification

- [ ] Run `npm test`.
- [ ] Start local server with `npm run dev`.
- [ ] Verify:
  - `curl http://localhost:5173/api/health`
  - `curl http://localhost:5173/api/site/bootstrap`
  - `curl http://localhost:5173/api/teams`
  - `curl http://localhost:5173/api/trainees`
- [ ] Open and inspect:
  - `http://localhost:5173/site.html`
  - `http://localhost:5173/admin`
  - `http://localhost:5173/screen.html`
- [ ] Confirm no changes were made to out-of-scope files unless explicitly justified.

Expected result:观众端真实后端化完成，后台端和大屏端仍可访问。

## Data Shape Draft

`GET /api/site/bootstrap` should return this stable shape:

```json
{
  "me": {
    "id": "public-001",
    "name": "观众",
    "role": "public",
    "teamId": null
  },
  "stage": {
    "voteStatus": "open",
    "voteWindowLabel": "A 轮投票",
    "pointScale": 5
  },
  "trainees": [],
  "teams": [],
  "works": [],
  "vote": {
    "status": "open",
    "results": [],
    "myVoteTeamId": null,
    "votersCount": 0
  },
  "result": {
    "published": false,
    "snapshot": null
  }
}
```

This is a draft contract. Implementation can add fields, but should not remove these top-level keys.

## Boundary Rules

- Do not use `src/screen-data.js` as the source of truth for `site.html`.
- Do not add a new database table for this task.
- Do not change admin write APIs.
- Do not change screen display APIs.
- Do not silently swallow server write failures on voting.
- Do not persist authoritative vote, team, result, or score state to `localStorage`.
- If a route needs authentication context, use existing session logic from `server/index.js`.

## Completion Criteria

- `site.html` audience-facing data is loaded from `/api/site/bootstrap`.
- Public vote state is authoritative from server/MySQL.
- Works and result views no longer rely on hardcoded demo data.
- Existing admin and screen pages still load.
- Tests cover backend route shape and frontend fake-data regression boundaries.
- Verification commands are run and results are recorded in the final response.
