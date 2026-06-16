# Terminal Boot Welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual Terminal Boot welcome stage between the landing CTA and persona profile wall.

**Architecture:** Extend the existing view state system with a `welcome` view. The landing button resolves to `welcome`; the welcome CTA resolves to `wall`; the new stage uses its own code-rain renderer and CSS while reusing existing full-screen stage conventions.

**Tech Stack:** Static HTML/CSS/JS, Node test runner.

---

### Task 1: Lock Behavior With Tests

**Files:**
- Modify: `src/logic.js`
- Modify: `tests/logic.test.js`
- Read: `index.html`

- [ ] Add tests for `resolveLandingCtaTarget()`, `resolveWelcomeEntryTarget()`, and the required welcome stage HTML.
- [ ] Run `npm test` and confirm the new tests fail because the functions and markup do not exist.

### Task 2: Add Welcome View Structure

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/logic.js`

- [ ] Add the `welcome-stage` section after `landing-stage`.
- [ ] Add `welcomeRain` to `rainRenderers`.
- [ ] Add `welcome` to `viewStages`, `syncStages`, `syncRain`, and every view class removal list.
- [ ] Change `enterButton` click to `setView(window.AppLogic.resolveLandingCtaTarget())`.
- [ ] Add `welcomeEnterButton` click to `setView(window.AppLogic.resolveWelcomeEntryTarget())`.

### Task 3: Add Terminal Boot Styling

**Files:**
- Modify: `styles.css`

- [ ] Include `.welcome-stage` in the shared full-screen stage rules.
- [ ] Add responsive Terminal Boot panel styles.
- [ ] Add subtle enter animations and mobile constraints.

### Task 4: Verify

**Files:**
- Run only.

- [ ] Run `npm test`.
- [ ] Start `npm run dev`.
- [ ] Use browser verification: landing CTA opens welcome; welcome CTA opens persona wall; no console errors.
