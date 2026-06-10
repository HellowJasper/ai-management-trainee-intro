# AI Hackathon Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the confirmed AI Hackathon onboarding redesign: intro code-rain animation, image-2 home page, redesigned persona wall, image-3 profile detail, photo/meme toggle, digital blind box styling, and JSON-based trainee content maintenance.

**Architecture:** Keep the project as a static frontend with no framework. Split responsibilities into focused files: `data/trainees.json` stores trainee content, `src/data.js` loads and normalizes data, `src/code-rain.js` owns canvas code-rain rendering, `src/logic.js` keeps pure testable logic, and `src/app.js` coordinates view state and DOM rendering. CSS will be reorganized by view sections inside the existing `styles.css` rather than introducing a build system.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node built-in test runner (`node --test`), local `python3 -m http.server 5173` for browser verification.

---

## File Structure

- Create: `data/trainees.json`
  - Central trainee data source for names, departments, AI fields, photo path, meme image path, and fallback meme text.
- Create: `src/data.js`
  - Fetches `data/trainees.json`, validates core fields, normalizes old/new field names, and falls back to built-in data if JSON cannot load.
- Create: `src/code-rain.js`
  - Canvas renderer for code-rain backgrounds. Exposes `createCodeRain(canvas, options)` with `start()`, `stop()`, and `resize()`.
- Modify: `src/logic.js`
  - Add pure helpers for trainee normalization, asset fallback selection, view-state transitions, and photo/meme toggle.
- Modify: `tests/logic.test.js`
  - Add tests for new pure helpers and keep existing arc/dock/keyword tests.
- Modify: `index.html`
  - Add view shells for intro, home, persona wall, redesigned detail, and blind box.
  - Keep existing script loading order but include `src/data.js` and `src/code-rain.js`.
- Modify: `src/app.js`
  - Replace hard-coded trainee array with data loader.
  - Add app view state: `intro`, `home`, `wall`, `detail`, `blindBox`.
  - Render home, persona wall, profile detail, photo/meme toggle, and blind box transitions.
- Modify: `styles.css`
  - Replace warm paper/orange theme with deep code-rain neon theme.
  - Add intro animation, home layout, pixel navigation, persona wall skin, image-3 detail layout, and blind box styling.
- Use existing assets:
  - `assets/图1.png`
  - `assets/图2.png`
  - `assets/图3.png`
- Create optional asset folders during implementation:
  - `assets/trainees/<id>/photo.png`
  - `assets/trainees/<id>/meme.png`

## Current Worktree Warning

The workspace already has uncommitted changes in:

- `index.html`
- `src/app.js`
- `styles.css`
- `assets/`

Do not revert these changes. Read them before editing, and integrate the redesign on top of the current state.

---

## Task 1: Data Model and Pure Logic

**Files:**
- Create: `data/trainees.json`
- Create: `src/data.js`
- Modify: `src/logic.js`
- Modify: `tests/logic.test.js`

- [ ] **Step 1: Add failing tests for trainee normalization**

Add tests to `tests/logic.test.js`:

```js
test("normalizeTrainee maps JSON fields into render fields", () => {
  const trainee = normalizeTrainee({
    id: "song-lan",
    name: "宋岚",
    department: "人力部",
    departmentEn: "HR",
    romanName: "Song Lan",
    background: "组织发展 / 招聘运营",
    aiPartners: "Notion AI / ChatGPT / 飞书妙记",
    favoriteAI: "飞书妙记",
    aiProblem: "候选人信息整理和面试纪要沉淀",
    aiPower: "把面试信息快速提炼成人才画像",
    funFact: "能从候选人的自我介绍里听出三个关键词。",
    photo: "./assets/trainees/song-lan/photo.png",
    memeImage: "./assets/trainees/song-lan/meme.png",
    memeText: "ALIGN?"
  });

  assert.equal(trainee.tools, "Notion AI / ChatGPT / 飞书妙记");
  assert.equal(trainee.favoriteTool, "飞书妙记");
  assert.equal(trainee.problem, "候选人信息整理和面试纪要沉淀");
  assert.equal(trainee.photo, "./assets/trainees/song-lan/photo.png");
  assert.equal(trainee.memeImage, "./assets/trainees/song-lan/meme.png");
});

test("toggleProfileMedia switches between photo and meme", () => {
  assert.equal(toggleProfileMedia("photo"), "meme");
  assert.equal(toggleProfileMedia("meme"), "photo");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: FAIL because `normalizeTrainee` and `toggleProfileMedia` are not exported yet.

- [ ] **Step 3: Implement pure helpers**

Add to `src/logic.js`:

```js
function normalizeTrainee(trainee) {
  return {
    ...trainee,
    tools: trainee.tools || trainee.aiPartners || "",
    favoriteTool: trainee.favoriteTool || trainee.favoriteAI || "",
    problem: trainee.problem || trainee.aiProblem || "",
    meme: trainee.meme || trainee.memeText || "MEME",
    photo: trainee.photo || "",
    memeImage: trainee.memeImage || "",
    portrait: trainee.portrait || "",
  };
}

function toggleProfileMedia(currentMode) {
  return currentMode === "photo" ? "meme" : "photo";
}
```

Export both helpers from `src/logic.js`.

- [ ] **Step 4: Create JSON data file**

Create `data/trainees.json` by moving the existing 12 trainees out of `src/app.js`.

Use this field set for every trainee:

```json
{
  "id": "xu-ran",
  "department": "战略部",
  "departmentEn": "STRATEGY",
  "name": "许然",
  "romanName": "Xu Ran",
  "background": "AI 产品策略 / 用户研究",
  "aiPartners": "ChatGPT / Gamma / 飞书多维表格",
  "favoriteAI": "ChatGPT",
  "aiProblem": "会议纪要自动归纳与跨部门追踪",
  "aiPower": "把复杂讨论压缩成一页清晰决策图",
  "funFact": "为了让汇报页对齐，曾经手动微调到凌晨。",
  "photo": "./assets/trainees/xu-ran/photo.png",
  "memeImage": "./assets/trainees/xu-ran/meme.png",
  "memeText": "OK, SHIP",
  "portrait": "linear-gradient(145deg, #f7f6f2 0%, #fc5000 46%, #d8d3c7 100%)"
}
```

- [ ] **Step 5: Create data loader**

Create `src/data.js`:

```js
(function attachDataLoader(root, factory) {
  const api = factory(root);
  root.AppData = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createDataLoader(root) {
  async function loadTrainees(fallbackTrainees = []) {
    try {
      const response = await fetch("./data/trainees.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load trainee data: ${response.status}`);
      }
      const trainees = await response.json();
      return trainees.map(root.AppLogic.normalizeTrainee);
    } catch (error) {
      console.warn(error);
      return fallbackTrainees.map(root.AppLogic.normalizeTrainee);
    }
  }

  return { loadTrainees };
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: PASS, including existing 5 tests and the new logic tests.

- [ ] **Step 7: Commit**

```bash
git add data/trainees.json src/data.js src/logic.js tests/logic.test.js
git commit -m "Add trainee data model"
```

---

## Task 2: HTML View Shells and App State

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/logic.js`
- Modify: `tests/logic.test.js`

- [ ] **Step 1: Add failing tests for view transitions**

Add to `tests/logic.test.js`:

```js
test("nextIntroState moves from intro to home unless skipped", () => {
  assert.equal(nextIntroState({ skipped: false }), "home");
  assert.equal(nextIntroState({ skipped: true }), "home");
});

test("resolveDiscoverTarget accepts known discover menu targets", () => {
  assert.equal(resolveDiscoverTarget("business"), "business");
  assert.equal(resolveDiscoverTarget("awards"), "awards");
  assert.equal(resolveDiscoverTarget("unknown"), "home");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`

Expected: FAIL because helpers are missing.

- [ ] **Step 3: Add pure transition helpers**

Add to `src/logic.js`:

```js
function nextIntroState() {
  return "home";
}

function resolveDiscoverTarget(target) {
  return ["business", "awards"].includes(target) ? target : "home";
}
```

Export both helpers.

- [ ] **Step 4: Add HTML shells**

Update `index.html` so the structure is:

```html
<main class="app-shell" data-view="intro">
  <section class="intro-stage" id="introStage" aria-label="启动动画">
    <canvas class="code-rain-canvas" id="introRain"></canvas>
    <button class="skip-intro-button" id="skipIntroButton" type="button">Skip</button>
    <div class="intro-logo" id="introLogo"></div>
  </section>

  <section class="landing-stage" id="landingStage" aria-label="AI Innovation Hackathon 首页">
    <!-- navigation, logo, title, Enter, Discover More -->
  </section>

  <section class="home-stage" id="personaWallStage" aria-label="AI 管培生照片墙">
    <!-- existing photo wall content -->
  </section>

  <!-- existing detail/challenge layers, later restyled -->
</main>
```

Add scripts before `src/app.js`:

```html
<script src="./src/data.js?v=20260610-1"></script>
<script src="./src/code-rain.js?v=20260610-1"></script>
```

- [ ] **Step 5: Add app view state in JS**

In `src/app.js`, add:

```js
let appView = "intro";

function setView(view) {
  appView = view;
  document.querySelector(".app-shell").dataset.view = view;
}
```

Wire:

- `Skip` -> `setView("home")`
- intro timer after 2000ms -> `setView("home")`
- `Enter` -> `setView("wall")`
- `Persona Card` nav -> `setView("wall")`
- `Home` nav -> `setView("home")`

- [ ] **Step 6: Load trainees from JSON**

Change startup from synchronous `renderPhotoWall()` to:

```js
async function initApp() {
  traineeState = await window.AppData.loadTrainees(trainees);
  selectedId = traineeState[0]?.id || "";
  renderPhotoWall();
  resetDock();
}

initApp();
```

- [ ] **Step 7: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Browser smoke test**

Run server: `npm start`

Open: `http://localhost:5173/`

Expected:

- Page starts on intro view.
- `Skip` moves to home view.
- `Enter` moves to persona wall.
- 12 cards still render.

- [ ] **Step 9: Commit**

```bash
git add index.html src/app.js src/logic.js tests/logic.test.js
git commit -m "Add multi-view app shell"
```

---

## Task 3: Code Rain Renderer and Intro Animation

**Files:**
- Create: `src/code-rain.js`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Create code-rain renderer**

Create `src/code-rain.js`:

```js
(function attachCodeRain(root, factory) {
  root.CodeRain = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createCodeRainFactory() {
  function createCodeRain(canvas, options = {}) {
    const context = canvas.getContext("2d");
    let animationFrame = 0;
    let columns = [];
    let running = false;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const fontSize = options.fontSize || 18;
      columns = Array.from({ length: Math.ceil(canvas.clientWidth / fontSize) }, (_, index) => ({
        x: index * fontSize,
        y: Math.random() * -canvas.clientHeight,
        speed: 1.6 + Math.random() * 3.2,
      }));
    }

    function draw() {
      if (!running) return;
      context.fillStyle = "rgba(2, 8, 14, 0.18)";
      context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.font = `${options.fontSize || 18}px monospace`;

      columns.forEach((column) => {
        const glyph = options.glyphs?.[Math.floor(Math.random() * options.glyphs.length)] || "1";
        context.fillStyle = Math.random() > 0.9 ? "#a8fff0" : "#25f5c5";
        context.fillText(glyph, column.x, column.y);
        column.y += column.speed;
        if (column.y > canvas.clientHeight + 40) {
          column.y = Math.random() * -160;
        }
      });

      animationFrame = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      draw();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(animationFrame);
    }

    return { start, stop, resize };
  }

  return { createCodeRain };
});
```

- [ ] **Step 2: Wire intro and wall canvases**

In `src/app.js`, initialize rain renderers after DOM constants:

```js
const introRain = window.CodeRain.createCodeRain(document.getElementById("introRain"), {
  glyphs: "010101AIJOINCARE{}[]<>".split(""),
  fontSize: 18,
});
```

Start intro rain on load, stop or reduce when moving to home if needed.

- [ ] **Step 3: Add intro CSS**

In `styles.css`, add:

```css
.intro-stage {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  background: #02080e;
  transition: opacity 760ms ease, visibility 760ms ease;
}

.app-shell[data-view="home"] .intro-stage,
.app-shell[data-view="wall"] .intro-stage {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.code-rain-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.intro-logo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(42vw, 420px);
  aspect-ratio: 1.52;
  transform: translate(-50%, -50%);
  background: url("./assets/图1.png") center / contain no-repeat;
  filter: drop-shadow(0 0 24px rgba(74, 255, 190, 0.4));
  animation: introLogoPulse 2000ms ease both;
}
```

- [ ] **Step 4: Add skip and timer behavior**

In `src/app.js`:

```js
let introTimer = window.setTimeout(() => setView("home"), 2000);

document.getElementById("skipIntroButton").addEventListener("click", () => {
  window.clearTimeout(introTimer);
  setView("home");
});
```

- [ ] **Step 5: Browser verify intro**

Open `http://localhost:5173/`.

Expected:

- Code rain moves downward.
- Logo glows.
- After about 2 seconds, home view is visible.
- `Skip` moves immediately to home.

- [ ] **Step 6: Commit**

```bash
git add src/code-rain.js src/app.js styles.css index.html
git commit -m "Add intro code rain animation"
```

---

## Task 4: Image-2 Home Page and Discover Menu

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Build landing HTML**

Add inside `landing-stage`:

```html
<nav class="hackathon-nav" aria-label="Hackathon navigation">
  <button type="button" data-view-target="home">HOME</button>
  <button type="button" data-view-target="wall">PERSONA CARD</button>
  <button type="button" data-discover-target="business">BUSINESS SCENARIO</button>
  <button type="button" data-discover-target="awards">DEMO & AWARDS</button>
</nav>

<div class="landing-logo" aria-label="Joincare"></div>
<h1 class="landing-title">AI Innovation Hackathon 2026</h1>

<div class="landing-actions">
  <button class="enter-button" type="button" id="enterButton">Enter</button>
  <div class="discover-wrap">
    <button class="discover-button" type="button" id="discoverButton" aria-expanded="false">Discover More</button>
    <div class="discover-menu" id="discoverMenu">
      <button type="button" data-discover-target="business">Business Scenario</button>
      <button type="button" data-discover-target="awards">Demo & Awards</button>
    </div>
  </div>
</div>

<section class="discover-panel" id="discoverPanel" aria-live="polite"></section>
```

- [ ] **Step 2: Add home interactions**

In `src/app.js`:

```js
document.getElementById("enterButton").addEventListener("click", () => setView("wall"));
document.getElementById("discoverButton").addEventListener("click", () => {
  const menu = document.getElementById("discoverMenu");
  const isOpen = menu.classList.toggle("is-open");
  document.getElementById("discoverButton").setAttribute("aria-expanded", String(isOpen));
});
```

Handle discover target clicks:

```js
document.addEventListener("click", (event) => {
  const discoverTarget = event.target.dataset.discoverTarget;
  if (!discoverTarget) return;
  renderDiscoverPanel(window.AppLogic.resolveDiscoverTarget(discoverTarget));
});
```

- [ ] **Step 3: Add home CSS**

In `styles.css`, create `.landing-stage`, `.hackathon-nav`, `.landing-logo`, `.landing-title`, `.landing-actions`, `.enter-button`, `.discover-button`, `.discover-menu`, and `.discover-panel`.

Use:

- deep background based on `assets/图2.png`
- cyan/green glow
- pixel-style nav with local fallback
- high contrast for projector display

- [ ] **Step 4: Browser verify home**

Expected:

- Home resembles `assets/图2.png`.
- `Enter` enters card wall.
- `Discover More` opens and closes menu.
- `Business Scenario` and `Demo & Awards` produce visible panel content.
- Navigation buttons are keyboard focusable.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js styles.css src/logic.js tests/logic.test.js
git commit -m "Add hackathon landing page"
```

---

## Task 5: Persona Wall Neon Reskin

**Files:**
- Modify: `styles.css`
- Modify: `src/app.js`

- [ ] **Step 1: Preserve existing wall logic**

Before editing, verify existing functions remain:

- `renderPhotoWall()`
- `updateDock(pointerX)`
- `resetDock()`
- `computeArcLayout()`
- `computeDockTransforms()`

- [ ] **Step 2: Add wall code-rain background**

Add a canvas to the wall stage:

```html
<canvas class="code-rain-canvas wall-rain" id="wallRain"></canvas>
```

Initialize a second renderer in `src/app.js`.

- [ ] **Step 3: Restyle wall**

In `styles.css`, update:

- `.home-stage`
- `.profile-card`
- `.portrait-frame`
- `.profile-meta`
- `.profile-name`
- `.profile-department`

Target outcome:

- Dark background.
- Neon cyan/green borders.
- Subtle glass card surfaces.
- Text remains readable over code rain.
- Existing arc and hover scale still work.

- [ ] **Step 4: Browser verify**

Expected:

- 12 cards are visible and large enough.
- Cards are still arranged in a circular arc.
- Hover still enlarges current card and shifts neighbors.
- Name is above department.
- Background matches image-1 code-rain direction.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js styles.css
git commit -m "Restyle persona wall"
```

---

## Task 6: Image-3 Profile Detail and Photo Toggle

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`
- Modify: `src/logic.js`
- Modify: `tests/logic.test.js`

- [ ] **Step 1: Keep photo toggle tests passing**

Run: `npm test`

Expected: PASS from Task 1.

- [ ] **Step 2: Replace detail markup with image-3 structure**

Modify `index.html` detail layer:

```html
<article class="profile-console" role="dialog" aria-modal="true" aria-labelledby="detailName">
  <div class="console-chrome" aria-hidden="true">
    <span></span><span></span><span></span>
  </div>
  <section class="profile-info-panel">
    <span class="info-chip">info</span>
    <div class="profile-fact-list">...</div>
  </section>
  <section class="profile-media-panel">
    <h1 id="detailName"></h1>
    <button class="photo-toggle" id="photoToggleButton" type="button">PHOTO</button>
    <div class="profile-media-frame" id="profileMediaFrame"></div>
    <button class="blind-box-button" id="openBlindBoxButton" type="button">MY DIGITAL BLIND BOX</button>
  </section>
  <footer class="profile-console-footer">AI Innovation Hackathon &gt; JOINCARE</footer>
</article>
```

- [ ] **Step 3: Implement media mode**

In `src/app.js`:

```js
let profileMediaMode = "photo";

function renderProfileMedia(trainee) {
  const frame = document.getElementById("profileMediaFrame");
  frame.classList.toggle("is-meme", profileMediaMode === "meme");
  if (profileMediaMode === "photo") {
    setMediaBackground(frame, trainee.photo, trainee);
  } else {
    setMediaBackground(frame, trainee.memeImage, trainee);
    frame.dataset.fallbackText = trainee.meme;
  }
}
```

Use CSS fallback if image path is missing.

- [ ] **Step 4: Wire PHOTO button**

```js
document.getElementById("photoToggleButton").addEventListener("click", () => {
  profileMediaMode = window.AppLogic.toggleProfileMedia(profileMediaMode);
  renderDetail();
});
```

- [ ] **Step 5: Restyle detail**

In `styles.css`, replace old paper modal styling with:

- `.profile-console`
- `.console-chrome`
- `.profile-info-panel`
- `.profile-fact-list`
- `.profile-media-panel`
- `.photo-toggle`
- `.profile-media-frame`
- `.blind-box-button`

Target image-3 style:

- dark translucent glass window
- left info panel with green vertical accent
- right media card with `PHOTO` button
- bottom digital blind box button

- [ ] **Step 6: Browser verify**

Expected:

- Clicking each candidate opens image-3-style detail.
- Six info fields populate from JSON.
- `PHOTO` toggles photo/meme mode.
- Missing image paths show stable fallback, not broken image icons.
- `MY DIGITAL BLIND BOX` opens blind box flow.

- [ ] **Step 7: Commit**

```bash
git add index.html src/app.js styles.css src/logic.js tests/logic.test.js
git commit -m "Redesign profile detail"
```

---

## Task 7: Digital Blind Box Reskin

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Rename user-facing blind box labels**

Change:

- `WORD CLOUD DRAW` -> `DIGITAL BLIND BOX`
- `抽词云` -> `MY DIGITAL BLIND BOX` where appropriate
- Keep host sentence input Chinese if it is used by the host.

- [ ] **Step 2: Restyle challenge shell**

Update:

- `.challenge-layer`
- `.challenge-shell`
- `.jar-stage`
- `.jar-wrap`
- `.cloud-word`
- `.host-form`

Target:

- glass data capsule instead of cartoon jar
- 1 second shake/load effect preserved
- keywords appear with neon float effect

- [ ] **Step 3: Preserve sentence replacement**

Verify current behavior remains:

- no sentence -> blind box button
- saved sentence -> sentence card replaces button area in detail

- [ ] **Step 4: Browser verify**

Expected:

- Blind box opens from detail.
- Draw animation lasts about 1 second.
- Two words appear.
- Host can enter sentence.
- Saving returns to detail and shows sentence.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js styles.css
git commit -m "Restyle digital blind box"
```

---

## Task 8: Responsive and Presentation Verification

**Files:**
- Modify only if verification finds layout issues:
  - `styles.css`
  - `src/app.js`

- [ ] **Step 1: Run logic tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Start local server**

Run: `npm start`

Open: `http://localhost:5173/`

- [ ] **Step 3: Verify desktop projector viewport**

Check at 1440 × 900 or similar:

- Intro code rain visible and moving.
- `Skip` works.
- Home resembles `assets/图2.png`.
- `Enter` reaches card wall.
- Card wall has no overlapping labels.
- Detail resembles `assets/图3.png`.
- `PHOTO` toggle works.
- Blind box flow works.

- [ ] **Step 4: Verify narrow viewport**

Check around 599 × 817:

- No text overlap in home nav.
- Card wall remains usable.
- Detail scrolls cleanly if needed.
- Blind box buttons do not overflow.

- [ ] **Step 5: Verify console**

Browser console should have no uncaught errors.

- [ ] **Step 6: Final commit**

If fixes were needed:

```bash
git add styles.css src/app.js
git commit -m "Polish responsive presentation"
```

---

## Execution Notes

- Do not use destructive git commands.
- Do not revert user changes in `index.html`, `src/app.js`, `styles.css`, or `assets/`.
- Keep `.superpowers/` ignored.
- Avoid network-only dependencies. If a pixel font is used, either include a local font file or provide CSS fallback.
- Preserve existing tested logic for arc layout, Dock hover, keyword draw, and sentence persistence.
- Keep the implementation static and deployable through the existing `npm start` command.
