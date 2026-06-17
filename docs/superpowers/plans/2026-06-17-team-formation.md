# Team Formation Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated five-track team formation view with placeholder team data and an API boundary for future backend control.

**Architecture:** Add `data/teams.json` as the current data source, expose it through `GET /api/teams`, and render a new `team-stage` from `src/app.js`. The UI reuses the existing business scenario visual system while adding compact team roster cards.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node `http` server, `node:test`.

## Global Constraints

- Keep existing copy and five track names aligned with the business scenario page.
- Use a new `team` view instead of a popover.
- Use TDD for API and view wiring changes.
- Preserve current dark cyber glassmorphism style.
- Do not force-push or overwrite collaborative work.

---

### Task 1: Team Data And API

**Files:**
- Create: `data/teams.json`
- Create: `server/teamRepository.js`
- Modify: `server/index.js`
- Test: `tests/server.test.js`

**Interfaces:**
- Produces: `createTeamRepository(dataPath).listTeams(): Promise<Array<TeamTrack>>`
- Produces: `GET /api/teams`

- [ ] Write failing server test asserting `GET /api/teams` returns five tracks and each track has one advisor plus four members.
- [ ] Run `npm test -- --test-name-pattern="API lists team formation tracks"` and confirm it fails because `/api/teams` does not exist.
- [ ] Implement `server/teamRepository.js`, wire it into `createServer`, and add `data/teams.json`.
- [ ] Run the focused server test and then `npm test`.

### Task 2: Team View Routing And Markup

**Files:**
- Modify: `index.html`
- Modify: `src/logic.js`
- Modify: `src/data.js`
- Modify: `src/app.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Produces: `AppData.loadTeams(fallbackTeams = [])`
- Produces: `resolveStageScreenView("team") === "team"`
- Consumes: `/api/teams`

- [ ] Write failing tests asserting `5 CORE SECTORS` uses `data-view-target="team"`, `teamStage` exists, and admin `team` stage maps to `team`.
- [ ] Run focused tests and confirm failure.
- [ ] Add `team-stage` markup, `teamRain`, view stage registration, team data loading, and click routing.
- [ ] Run focused tests and then `npm test`.

### Task 3: Team Screen Styling

**Files:**
- Modify: `styles.css`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `.team-stage`, `.team-grid`, `.team-track-card`, `.team-advisor-card`, `.team-member-list`

- [ ] Write failing style tests asserting five-column `.team-grid`, advisor slot styling, member list styling, and active `view-team` visibility.
- [ ] Run focused tests and confirm failure.
- [ ] Add responsive CSS using the existing discover page palette and glass card treatment.
- [ ] Run focused tests and then `npm test`.

### Task 4: Browser Verification

**Files:**
- No source file changes expected unless visual verification finds a defect.

- [ ] Load `http://localhost:5180`.
- [ ] Navigate to business scenario, click `5 CORE SECTORS`, and confirm the team screen appears.
- [ ] Verify five tracks, each advisor row, four members per track, and return button.
- [ ] Run final `npm test`.
