const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const {
  positionJasperAtCenter,
  getDetailOrder,
  computeArcLayout,
  computeDockTransforms,
  computePhotoWallMetrics,
  getIntroTiming,
  getFeishuLoginUiState,
  getMissionCountdownState,
  getRoadshowTimerState,
  getRolePermissions,
  getRoleWorkbenchModel,
  getRoleNavItems,
  getActualTeamPeople,
  countActualTeamPeople,
  computeVoteRanking,
  computeFinalResults,
  resolveDisplayFinalResults,
  nextIntroState,
  normalizeTrainee,
  pickKeywordPair,
  pickKeywordPairAB,
  createAdminStageSyncKey,
  resolveLandingCtaTarget,
  resolveAdjacentTraineeId,
  shouldApplyAdminStageChange,
  resolveDiscoverTarget,
  resolveScreenViewFromRouteStage,
  resolveStageScreenView,
  resolveWelcomeEntryTarget,
  toggleProfileMedia,
  updateSentence,
} = require("../src/logic.js");

test("computeArcLayout places every card on a continuous circular arc", () => {
  const layout = computeArcLayout(12, {
    maxLift: 84,
    maxRotation: 5.8,
    edgeScale: 0.74,
    centerScale: 1.1,
  });

  assert.equal(layout.length, 12);
  assert.ok(layout[0].x < layout[1].x);
  assert.ok(layout[5].x < layout[6].x);
  assert.ok(layout[10].x < layout[11].x);
  assert.ok(Math.abs(layout[0].x + layout[11].x) < 0.01);
  assert.equal(layout[0].lift, layout[11].lift);

  // Center card (index 5) properties
  assert.equal(layout[5].x, 0);
  assert.equal(layout[5].rotation, 0);
  assert.equal(layout[5].curveLift, -84);
  assert.equal(layout[5].lift, -90);
  assert.equal(layout[5].scale, 1.1);
  assert.ok(layout[5].lift < layout[4].lift);
  assert.ok(layout[5].lift < layout[6].lift);

  assert.ok(layout[6].x - layout[5].x > layout[1].x - layout[0].x);
  assert.ok(Math.abs(layout[0].rotation) <= 6);
  assert.ok(Math.abs(layout[11].rotation) <= 6);
  assert.ok(layout[1].lift < layout[0].lift);
  assert.ok(layout[2].lift < layout[1].lift);
  assert.ok(layout[3].lift < layout[2].lift);
  assert.ok(layout[4].lift < layout[3].lift);
  assert.ok(layout[5].lift < layout[0].lift);
  assert.ok(layout[6].lift < layout[11].lift);
  assert.ok(layout[7].lift > layout[6].lift);
  assert.ok(layout[8].lift > layout[7].lift);
  assert.ok(layout[9].lift > layout[8].lift);
  assert.ok(layout[10].lift > layout[9].lift);
  assert.ok(layout[5].zIndex > layout[0].zIndex);
  assert.ok(layout[5].scale > layout[2].scale);
  assert.ok(layout[6].scale > layout[9].scale);
  assert.ok(layout[0].scale < 0.82);
  assert.ok(layout[5].scale > 1);
});

test("computeDockTransforms enlarges hovered item and gently reduces distant items", () => {
  const transforms = computeDockTransforms({
    centers: [0, 100, 200, 300, 400],
    pointerX: 200,
    maxInfluence: 220,
  });

  assert.equal(transforms[2].isActive, true);
  assert.ok(transforms[2].scale > transforms[1].scale);
  assert.ok(transforms[1].scale > transforms[0].scale);
  assert.ok(transforms[3].translateX > 0);
  assert.ok(transforms[1].translateX < 0);
});

test("computePhotoWallMetrics keeps twelve tarot cards in one row", () => {
  const metrics = computePhotoWallMetrics({
    total: 12,
    viewportWidth: 652,
    viewportHeight: 817,
  });

  assert.ok(Math.abs(metrics.portraitHeight / metrics.cardWidth - 4 / 3) < 0.002);
  assert.ok(metrics.cardHeight > metrics.portraitHeight);
  assert.ok(metrics.visualWidth <= metrics.availableWidth);
  assert.ok(metrics.step > 0);
  assert.ok(metrics.step < metrics.cardWidth);
  assert.ok(metrics.maxLift >= metrics.cardHeight * 0.22);
  assert.ok(metrics.maxLift <= metrics.cardHeight * 0.3);
  assert.ok(metrics.maxRotation >= 5.2);
  assert.ok(metrics.maxRotation <= 8.0);
});

test("computePhotoWallMetrics keeps fourteen trainee cards inside the mobile viewport", () => {
  const metrics = computePhotoWallMetrics({
    total: 14,
    viewportWidth: 652,
    viewportHeight: 817,
  });

  assert.ok(metrics.visualWidth <= metrics.availableWidth);
  assert.ok(metrics.step > 0);
});

test("countActualTeamPeople only counts roster entries with real user identity", () => {
  assert.equal(countActualTeamPeople({
    advisor: { name: "静态队长兜底" },
    members: [
      { userId: "u1", name: "真实成员 A" },
      { id: "u2", name: "真实成员 B" },
      { name: "静态成员兜底" },
    ],
  }), 2);

  assert.equal(countActualTeamPeople({
    advisor: { userId: "leader", name: "真实队长" },
    members: [
      { userId: "leader", name: "真实队长", role: "队长" },
      { userId: "u1", name: "真实成员 A" },
      { userId: "u2", name: "真实成员 B" },
      { userId: "u3", name: "真实成员 C" },
      { userId: "u4", name: "真实成员 D" },
    ],
  }), 5);
});

test("getActualTeamPeople excludes static fallback people without real identity", () => {
  assert.deepEqual(getActualTeamPeople({
    advisor: { name: "静态队长兜底" },
    members: [
      { userId: "u1", name: "真实成员 A" },
      { id: "u2", name: "真实成员 B" },
      { name: "静态成员兜底" },
    ],
  }).map((person) => person.name), ["真实成员 A", "真实成员 B"]);

  assert.deepEqual(getActualTeamPeople({
    advisor: { userId: "leader", name: "真实队长" },
    members: [
      { userId: "leader", name: "真实队长", role: "队长" },
      { userId: "u1", name: "真实成员 A" },
    ],
  }).map((person) => person.name), ["真实队长", "真实成员 A"]);
});

test("twelve profile cards form one connected arc centered on the sixth card", () => {
  const metrics = computePhotoWallMetrics({
    total: 12,
    viewportWidth: 1024,
    viewportHeight: 768,
  });
  const layout = computeArcLayout(12, {
    step: metrics.step,
    maxLift: metrics.maxLift,
    maxRotation: metrics.maxRotation,
    splitGap: metrics.splitGap,
  });

  assert.equal(layout[5].x, 0);
  assert.ok(layout.slice(0, 5).every((item) => item.x < 0));
  assert.ok(layout.slice(6).every((item) => item.x > 0));
  assert.equal(layout[0].scale, layout[11].scale);
  assert.ok(layout[5].scale > 1.16);
  assert.ok(layout[0].scale < 0.68);
  assert.equal(layout[0].zIndex, layout[11].zIndex);
});

test("pickKeywordPair returns two different keywords and avoids previously used pairs", () => {
  const keywords = ["咖啡", "自动化", "提示词", "会议纪要"];
  const pair = pickKeywordPair(keywords, [["咖啡", "自动化"]], 2);

  assert.equal(pair.length, 2);
  assert.notEqual(pair[0], pair[1]);
  assert.notDeepEqual(pair, ["咖啡", "自动化"]);
});

test("pickKeywordPairAB returns a pair with one word from A and one from B, avoiding previously used pairs", () => {
  const libA = ["咖啡", "奶茶"];
  const libB = ["AI", "Agent"];
  const pair = pickKeywordPairAB(libA, libB, [["咖啡", "AI"]], 0);

  assert.equal(pair.length, 2);
  assert.ok(libA.includes(pair[0]));
  assert.ok(libB.includes(pair[1]));
  assert.notDeepEqual(pair, ["咖啡", "AI"]);
});

test("updateSentence stores host-entered sentence on the selected trainee", () => {
  const trainees = [
    { id: "a", name: "许然", sentence: "" },
    { id: "b", name: "陈一", sentence: "" },
  ];

  const result = updateSentence(trainees, "a", "我把咖啡变成自动化工作流的启动按钮。");

  assert.equal(result[0].sentence, "我把咖啡变成自动化工作流的启动按钮。");
  assert.equal(result[1].sentence, "");
  assert.notEqual(result, trainees);
});

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
    memeText: "ALIGN?",
  });

  assert.equal(trainee.tools, "Notion AI / ChatGPT / 飞书妙记");
  assert.equal(trainee.favoriteTool, "飞书妙记");
  assert.equal(trainee.problem, "候选人信息整理和面试纪要沉淀");
  assert.equal(trainee.photo, "./assets/trainees/song-lan/photo.png");
  assert.equal(trainee.idPhoto, "./assets/trainees/song-lan/photo.png"); // should fallback to photo
  assert.equal(trainee.memeImage, "./assets/trainees/song-lan/meme.png");
  assert.equal(trainee.meme, "ALIGN?");

  const traineeWithIdPhoto = normalizeTrainee({
    photo: "./assets/trainees/song-lan/photo.jpg",
    idPhoto: "./assets/trainees/song-lan/photo.png",
  });
  assert.equal(traineeWithIdPhoto.photo, "./assets/trainees/song-lan/photo.jpg");
  assert.equal(traineeWithIdPhoto.idPhoto, "./assets/trainees/song-lan/photo.png");
});

test("toggleProfileMedia switches between photo and meme", () => {
  assert.equal(toggleProfileMedia("photo"), "meme");
  assert.equal(toggleProfileMedia("meme"), "photo");
});

test("nextIntroState moves from intro to home", () => {
  assert.equal(nextIntroState({ skipped: false }), "home");
  assert.equal(nextIntroState({ skipped: true }), "home");
});

test("landing CTA opens the terminal boot welcome stage", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.doesNotMatch(html, /landing-title-main/);
  assert.doesNotMatch(html, /AI黑客松/);
  assert.doesNotMatch(html, /feishuLoginButton/);
  assert.doesNotMatch(html, /landingAuthStatus/);
  assert.doesNotMatch(html, /data-auth-target="feishu"/);
  assert.match(html, /<button class="enter-button" type="button" id="enterButton">解锁任务<\/button>/);
  assert.match(appJs, /function handleLandingEntry\(\)\s*{\s*setView\(window\.AppLogic\.resolveLandingCtaTarget\(\)\);\s*}/);
  assert.doesNotMatch(appJs, /loginWithFeishu/);
  assert.doesNotMatch(appJs, /site\.html#home/);
  assert.equal(resolveLandingCtaTarget(), "welcome");
  assert.equal(resolveWelcomeEntryTarget(), "wall");
});

test("data loader can target a separated API service through runtime config", async () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const calls = [];
  const context = {
    AppLogic: { normalizeTrainee: (trainee) => trainee },
    JOINCARE_API_BASE_URL: "http://localhost:63779/",
    console: { warn() {} },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      };
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  context.globalThis = context;

  vm.runInNewContext(dataJs, context);

  const payload = await context.AppData.fetchJson("/api/health");

  assert.deepEqual(payload, { status: "ok" });
  assert.equal(calls[0].url, "http://localhost:63779/api/health");
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(context.AppData.resolveApiUrl("./data/trainees.json"), "./data/trainees.json");
});

test("data loader exposes current admin session and logout APIs", async () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const calls = [];
  const context = {
    AppLogic: { normalizeTrainee: (trainee) => trainee },
    JOINCARE_API_BASE_URL: "http://localhost:63779",
    console: { warn() {} },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: true, role: "admin", user: { name: "管理员" } }),
      };
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
    sessionStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  context.globalThis = context;

  vm.runInNewContext(dataJs, context);

  await context.AppData.loadCurrentUser();
  await context.AppData.logoutCurrentUser();

  assert.equal(calls[0].url, "http://localhost:63779/api/me");
  assert.equal(calls[1].url, "http://localhost:63779/api/auth/logout");
  assert.equal(calls[1].options.method, "POST");
});

test("data loader loads trainee records when admin pages do not include AppLogic", async () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const calls = [];
  const context = {
    JOINCARE_API_BASE_URL: "http://localhost:63779",
    console: { warn() {} },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ([{ id: "jasper", name: "贾博深" }]),
      };
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  context.globalThis = context;

  vm.runInNewContext(dataJs, context);

  const trainees = await context.AppData.loadTrainees([]);

  assert.deepEqual(trainees, [{ id: "jasper", name: "贾博深" }]);
  assert.equal(calls[0].url, "http://localhost:63779/api/trainees");
});

test("data loader exposes the site bootstrap API without fake-data fallback", async () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const calls = [];
  const context = {
    JOINCARE_API_BASE_URL: "http://localhost:63779",
    console: { warn() {} },
    fetch: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          me: { role: "public" },
          teams: [],
          vote: { myVoteTeamId: null },
        }),
      };
    },
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  context.globalThis = context;

  vm.runInNewContext(dataJs, context);

  const bootstrap = await context.AppData.loadSiteBootstrap();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:63779/api/site/bootstrap");
  assert.equal(calls[0].options.credentials, "include");
  assert.deepEqual(bootstrap.vote, { myVoteTeamId: null });
});

test("data loader surfaces backend error messages", async () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const context = {
    JOINCARE_API_BASE_URL: "http://localhost:63779",
    console: { warn() {} },
    fetch: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "没有管理员权限" } }),
      text: async () => JSON.stringify({ error: { message: "没有管理员权限" } }),
    }),
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
  };
  context.globalThis = context;

  vm.runInNewContext(dataJs, context);

  await assert.rejects(
    () => context.AppData.fetchJson("/api/admin/users"),
    /没有管理员权限/,
  );
});

test("admin console renders API health for separated frontend deployments", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminConnectionChip"/);
  assert.match(html, /id="adminConnectionLabel"/);
  assert.match(html, /id="adminApiHealthMeta"/);
  assert.match(css, /\.connection-chip\.is-online/);
  assert.match(css, /\.connection-chip\.is-offline/);
  assert.match(dataJs, /function loadHealth/);
  assert.match(dataJs, /loadHealth,/);
  assert.match(adminJs, /function loadPlatformHealth/);
  assert.match(adminJs, /window\.AppData\.loadHealth/);
  assert.match(adminJs, /adminApiHealthMeta/);
  assert.match(adminJs, /function formatDataBackendLabel/);
  assert.match(adminJs, /payload\?\.runtime/);
  assert.match(adminJs, /platformHealthState\.runtime\?\.dataBackend/);
});

test("admin page manager is no longer retained as a sidebar view", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.doesNotMatch(html, /data-admin-nav="pages"/);
  assert.doesNotMatch(html, /data-admin-view-panel="pages"/);
  assert.doesNotMatch(html, /id="adminPageManager"/);
  assert.doesNotMatch(html, /PAGE_MANAGER|页面管理/);
  assert.doesNotMatch(adminJs, /const pageRoutes/);
  assert.doesNotMatch(adminJs, /adminPageManager/);
  assert.doesNotMatch(adminJs, /function renderPageManager/);
});

test("admin console exposes backend sync status feedback for refresh actions", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminSyncStatus"/);
  assert.match(html, /id="adminSyncStatusLabel"/);
  assert.match(html, /id="adminSyncStatusMeta"/);
  assert.match(css, /\.admin-sync-status/);
  assert.match(css, /\.admin-sync-status\.is-syncing/);
  assert.match(css, /\.admin-sync-status\.is-error/);
  assert.match(adminJs, /const adminSyncStatus/);
  assert.match(adminJs, /let syncStatusState/);
  assert.match(adminJs, /function renderSyncStatus/);
  assert.match(adminJs, /function setSyncStatus/);
  assert.match(adminJs, /setSyncStatus\("syncing"/);
  assert.match(adminJs, /setSyncStatus\("success"/);
  assert.match(adminJs, /setSyncStatus\("error"/);
  assert.match(adminJs, /teamsResult\.status === "rejected"/);
  assert.match(adminJs, /voteResult\.status === "rejected"/);
  assert.match(adminJs, /worksResult\.status === "rejected"/);
  assert.match(adminJs, /judgeResult\.status === "rejected"/);
});

test("admin topbar status chips and action buttons share a balanced frame", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(css, /\.admin-topbar-actions\s*{[\s\S]*--topbar-action-height:\s*42px;/);
  assert.match(css, /\.admin-topbar-actions\s*{[\s\S]*--topbar-status-width:\s*clamp\(180px,\s*12vw,\s*220px\);/);
  assert.match(css, /\.admin-topbar-actions\s*{[\s\S]*--topbar-control-width:\s*clamp\(118px,\s*8vw,\s*150px\);/);
  assert.match(css, /\.admin-topbar-actions \.connection-chip,[\s\S]*\.admin-topbar-actions \.admin-user\s*{[\s\S]*min-height:\s*var\(--topbar-action-height\);[\s\S]*box-sizing:\s*border-box;/);
  assert.match(css, /\.admin-topbar-actions \.connection-chip,[\s\S]*\.admin-topbar-actions \.admin-sync-status\s*{[\s\S]*height:\s*var\(--topbar-action-height\);[\s\S]*min-width:\s*var\(--topbar-status-width\);[\s\S]*max-width:\s*var\(--topbar-status-width\);/);
  assert.match(css, /\.admin-topbar-actions \.connection-chip span,[\s\S]*\.admin-topbar-actions \.admin-sync-status span\s*{[\s\S]*line-height:\s*1\.1;/);
  assert.match(css, /\.admin-topbar-actions \.screen-select,[\s\S]*\.admin-topbar-actions \.admin-user\s*{[\s\S]*height:\s*var\(--topbar-action-height\);[\s\S]*min-width:\s*var\(--topbar-control-width\);/);
});

test("admin safe guard buttons update vote window through the backend", () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(dataJs, /function updateAdminVoteWindow/);
  assert.match(dataJs, /\/api\/admin\/vote-window/);
  assert.match(dataJs, /updateAdminVoteWindow,/);
  assert.match(adminJs, /function updateAdminVoteWindow/);
  assert.match(adminJs, /window\.AppData\.updateAdminVoteWindow\(status\)/);
  assert.match(adminJs, /closeVoteButton\?\.addEventListener\("click", \(\) => updateAdminVoteWindow\("closed"\)\)/);
  assert.match(adminJs, /publishResultButton\?\.addEventListener\("click", \(\) => updateAdminVoteWindow\("published"\)\)/);
});

test("admin vote window dangerous actions require confirmation", () => {
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /function isDangerousVoteWindowStatus/);
  assert.match(adminJs, /status === "closed" \|\| status === "published"/);
  assert.match(adminJs, /function buildVoteWindowConfirmMessage/);
  assert.match(adminJs, /getVoteTotal\(\)/);
  assert.match(adminJs, /scoreCoverage\(businessDataState\.judgeScores\)/);
  assert.match(adminJs, /window\.confirm/);
  assert.match(adminJs, /async function updateAdminVoteWindow\(status, \{ skipConfirm = false \} = \{\}\)/);
  assert.match(adminJs, /if \(!skipConfirm && !confirmVoteWindowAction\(status\)\)/);
  assert.match(adminJs, /try \{[\s\S]*await updateAdminVoteWindow\(status\);[\s\S]*finally \{[\s\S]*renderVoteWindowManager\(\);/);
});

test("admin data workspace exposes explicit vote window controls", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminVoteWindowManager"/);
  assert.match(html, /id="adminVoteWindowState"/);
  assert.match(html, /data-vote-window-status="voting"/);
  assert.match(html, /data-vote-window-status="closed"/);
  assert.match(html, /data-vote-window-status="published"/);
  assert.match(css, /\.admin-vote-window-manager/);
  assert.match(css, /\.admin-vote-window-actions/);
  assert.match(adminJs, /const adminVoteWindowState/);
  assert.match(adminJs, /function renderVoteWindowManager/);
  assert.match(adminJs, /document\.addEventListener\("click", async \(event\) => \{[\s\S]*?data-vote-window-status/);
  assert.match(adminJs, /window\.AppData\.updateAdminVoteWindow\(status/);
});

test("admin data workspace keeps vote and work panels in a dedicated responsive grid", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(html, /class="management-split admin-data-management-layout"/);
  assert.match(html, /class="panel admin-wide-panel admin-work-review-panel"/);
  assert.match(html, /class="admin-work-management-stack"/);
  const voteStackMatch = html.match(/<div class="admin-vote-management-stack">([\s\S]*?)<\/div>\s*<div class="admin-work-management-stack">/);
  const workStackMatch = html.match(/<div class="admin-work-management-stack">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>\s*<section class="admin-view-panel admin-management-view admin-result-management-view"/);
  assert.ok(voteStackMatch);
  assert.ok(workStackMatch);
  assert.doesNotMatch(voteStackMatch[1], /adminResultSnapshotPanel/);
  assert.doesNotMatch(workStackMatch[1], /adminResultSnapshotPanel|FINAL SNAPSHOT|data-result-snapshot/);
  assert.match(css, /\.admin-management-view\[data-admin-view-panel="data"\]\s*{[\s\S]*grid-template-rows:\s*auto auto;[\s\S]*height:\s*auto;/);
  assert.match(css, /\.admin-data-management-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*0\.8fr\) minmax\(0,\s*1\.2fr\);[\s\S]*width:\s*100%;[\s\S]*align-items:\s*start;/);
  assert.match(css, /\.admin-data-management-layout \.admin-vote-management-stack\s*{[\s\S]*grid-column:\s*1;[\s\S]*gap:\s*18px;/);
  assert.match(css, /\.admin-data-management-layout \.admin-work-management-stack\s*{[\s\S]*grid-column:\s*2;[\s\S]*gap:\s*18px;/);
  assert.match(css, /\.admin-result-snapshot-card\s*{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(150px,\s*100%\),\s*1fr\)\)/);
  assert.match(css, /\.admin-data-management-layout \.admin-vote-window-body\s*{[\s\S]*min-height:\s*156px;/);
  assert.match(css, /@media \(min-width:\s*1101px\) and \(max-width:\s*1280px\)[\s\S]*\.admin-data-management-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*0\.8fr\) minmax\(0,\s*1\.2fr\);/);
  assert.match(css, /@media \(max-width:\s*1100px\)[\s\S]*\.admin-data-management-layout\s*{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.admin-data-management-layout \.admin-vote-window-body\s*{[\s\S]*grid-template-columns:\s*1fr;/);
});

test("admin publish result action creates a backend result snapshot", () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(dataJs, /function publishAdminResults/);
  assert.match(dataJs, /\/api\/admin\/results\/publish/);
  assert.match(dataJs, /publishAdminResults,/);
  assert.match(adminJs, /window\.AppData\.publishAdminResults/);
  assert.match(adminJs, /status === "published"/);
  assert.match(adminJs, /result\.published/);
  assert.match(adminJs, /发布最终结果快照/);
  assert.match(adminJs, /async function publishAdminResultSnapshot/);
  assert.match(adminJs, /const snapshot = await window\.AppData\.publishAdminResults\([\s\S]*?const voteResults = await window\.AppData\.updateAdminVoteWindow\("published"\)/);
  assert.match(adminJs, /setText\(adminResultPublishStatus,\s*formatErrorStatus\("发布失败", error\)\)/);
  assert.match(adminJs, /const publishAlreadyComplete = voteStatus === "published" && Boolean\(businessDataState\.resultSnapshot\?\.id\)/);
  assert.match(adminJs, /const publishReady = voteReady && !publishAlreadyComplete/);
  assert.doesNotMatch(adminJs, /const publishReady = voteReady && coverage\.locked && !publishAlreadyComplete/);
  assert.doesNotMatch(adminJs, /const voteResults = await window\.AppData\.updateAdminVoteWindow\(status\);\s*const resultAction[\s\S]*status === "published"/);
});

test("admin console exposes a dedicated leaderboard publish workspace", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /data-admin-nav="results"/);
  assert.match(html, /排行榜/);
  assert.match(html, /data-admin-view-panel="results"/);
  assert.match(html, /id="confirmResultPublishAction"/);
  assert.match(html, /class="admin-result-flow"/);
  assert.match(html, /data-result-flow-step="vote"/);
  assert.match(html, /data-result-flow-step="judge"/);
  assert.match(html, /data-result-flow-step="publish"/);
  assert.match(html, /id="adminResultFlowVoteState"/);
  assert.match(html, /id="adminResultFlowScoreState"/);
  assert.match(html, /id="adminResultFlowSnapshotState"/);
  assert.match(html, /可选：锁定已提交评分/);
  assert.match(html, /关闭投票后即可发布/);
  assert.match(html, /data-vote-window-status="closed"/);
  assert.match(html, /data-lock-judge-scores/);
  assert.match(html, /data-result-publish/);
  assert.match(html, /id="adminLeaderboardSnapshot"/);
  assert.match(html, /data-result-snapshot/);
  assert.match(html, /site\.html#result/);
  assert.match(html, /index\.html\?stage=result/);
  assert.match(css, /\.admin-result-management-layout/);
  assert.match(css, /\.admin-result-flow/);
  assert.match(css, /\.admin-result-flow-step/);
  assert.match(css, /\.admin-result-step-action/);
  assert.match(css, /\.admin-result-publish-panel/);
  assert.match(css, /\.admin-result-action-grid/);
  assert.match(adminJs, /const confirmResultPublishAction/);
  assert.match(adminJs, /const resultPublishButtons/);
  assert.match(adminJs, /const adminResultFlowVoteState/);
  assert.match(adminJs, /const adminResultFlowScoreState/);
  assert.match(adminJs, /const adminResultFlowSnapshotState/);
  assert.match(adminJs, /function renderResultPublishSummary/);
  assert.match(adminJs, /const publishReady = voteReady && !publishAlreadyComplete/);
  assert.match(adminJs, /管理员可直接发布排行/);
  assert.match(adminJs, /未锁定也不阻止发布/);
  assert.doesNotMatch(adminJs, /先锁定专家评分，再发布排行榜/);
  assert.match(adminJs, /targetView === "results"/);
  assert.match(adminJs, /event\.target\.closest\("\[data-result-publish\]"\)/);
  assert.match(adminJs, /await updateAdminVoteWindow\("published"\)/);
});

test("admin result workspace keeps publish flow and snapshot as separate rows", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(css, /\.admin-result-management-layout\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-result-management-layout \.admin-result-publish-panel,\n\.admin-result-management-layout \.admin-leaderboard-snapshot-panel\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.admin-result-publish-body\s*{[\s\S]*grid-template-columns:\s*minmax\(260px,\s*0\.28fr\) minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-result-flow\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*1280px\)[\s\S]*\.admin-result-publish-body\s*{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width:\s*1280px\)[\s\S]*\.admin-result-flow\s*{[\s\S]*grid-template-columns:\s*1fr/);
});

test("admin console renders the latest final result snapshot", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.doesNotMatch(html, /id="adminResultSnapshotPanel"/);
  assert.doesNotMatch(html, /id="adminResultSnapshotStatus"/);
  assert.doesNotMatch(html, /id="adminResultSnapshot"/);
  assert.match(html, /id="adminLeaderboardSnapshotStatus"/);
  assert.match(html, /id="adminLeaderboardSnapshot"/);
  assert.match(css, /\.admin-result-snapshot-panel/);
  assert.match(css, /\.admin-result-rank-list/);
  assert.match(dataJs, /function loadLatestResultSnapshot/);
  assert.match(dataJs, /\/api\/results\/latest/);
  assert.match(dataJs, /loadLatestResultSnapshot,/);
  assert.doesNotMatch(adminJs, /const adminResultSnapshotStatus/);
  assert.doesNotMatch(adminJs, /const adminResultSnapshot\s*=/);
  assert.match(adminJs, /function renderResultSnapshot/);
  assert.match(adminJs, /window\.AppData\.loadLatestResultSnapshot/);
  assert.match(adminJs, /resultSnapshot:\s*snapshot/);
  assert.match(adminJs, /最终结果快照/);
});

test("admin settings manage backend user role mappings", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /data-admin-view-panel="users"/);
  assert.match(html, /id="adminUserFilterBar"/);
  assert.match(html, /id="adminUserRoleForm"/);
  assert.match(html, /id="adminUserRoleList"/);
  assert.match(html, /name="adminUserRole"/);
  assert.match(html, /data-add-user/);
  assert.match(css, /\.admin-user-table/);
  assert.match(css, /\.admin-user-modal/);
  assert.match(dataJs, /function loadAdminUsers/);
  assert.match(dataJs, /function upsertAdminUser/);
  assert.match(dataJs, /\/api\/admin\/users/);
  assert.match(dataJs, /loadAdminUsers,/);
  assert.match(dataJs, /upsertAdminUser,/);
  assert.match(adminJs, /const adminUserRoleForm/);
  assert.match(adminJs, /function renderUserRoleManager/);
  assert.match(adminJs, /window\.AppData\.loadAdminUsers/);
  assert.match(adminJs, /window\.AppData\.upsertAdminUser/);
  assert.match(adminJs, /data-edit-user-role/);
  assert.match(adminJs, /loadUserRoles\(\)/);
});

test("admin console keeps dense management views inside narrow screens", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(css, /html,\nbody\s*{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /\.admin-workspace\s*{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /\.admin-result-snapshot-card\s*{[\s\S]*repeat\(auto-fit,\s*minmax\(min\(150px,\s*100%\),\s*1fr\)\)/);
  assert.match(css, /\.admin-user-table-wrap\s*{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.admin-user-table\s*{[\s\S]*min-width:\s*680px/);
  assert.match(css, /\.admin-user-col-op\s*{[\s\S]*min-width:\s*96px/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.management-heading\s*{[\s\S]*flex-direction:\s*column/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.admin-user-toolbar-right\s*{[\s\S]*flex-direction:\s*column/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*\.admin-user-search\s*{[\s\S]*min-width:\s*0/);
});

test("admin content manager edits trainee profiles through backend data APIs", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminTraineeProfileManager"/);
  assert.match(html, /id="adminTraineeProfileForm"/);
  assert.match(html, /id="adminTraineeProfileList"/);
  assert.match(html, /id="adminTraineeProfileSentence"/);
  assert.match(html, /id="createTraineeProfileButton"/);
  assert.match(html, /data-create-trainee-profile/);
  assert.match(html, /data-trainee-image-picker="photo"/);
  assert.match(html, /id="adminTraineeProfilePhotoFile"/);
  assert.match(html, /data-trainee-image-picker="memeImage"/);
  assert.match(html, /id="adminTraineeProfileMemeImageFile"/);
  assert.match(css, /\.admin-trainee-profile-manager/);
  assert.match(css, /\.admin-trainee-profile-manager\s*{[\s\S]*display:\s*grid/);
  assert.match(css, /\.admin-trainee-profile-manager\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(260px,\s*0\.42fr\)/);
  assert.match(css, /\.admin-trainee-profile-manager \.wide-panel-heading\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.admin-trainee-profile-form\s*{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.admin-trainee-image-picker/);
  assert.match(css, /\.admin-trainee-image-add/);
  assert.match(css, /\.admin-trainee-profile-list/);
  assert.match(css, /\.admin-trainee-profile-card menu\s*{[\s\S]*flex-wrap:\s*wrap/);
  assert.match(dataJs, /function normalizeTraineeRecord/);
  assert.match(dataJs, /async function uploadTraineeAsset/);
  assert.match(dataJs, /createTrainee,/);
  assert.match(dataJs, /updateTrainee,/);
  assert.match(dataJs, /deleteTrainee,/);
  assert.match(dataJs, /uploadTraineeAsset,/);
  assert.match(adminJs, /const adminTraineeProfileForm/);
  assert.match(adminJs, /function renderTraineeProfileManager/);
  assert.match(adminJs, /function loadTraineeProfiles/);
  assert.match(adminJs, /function startCreateTraineeProfile/);
  assert.match(adminJs, /function uploadTraineeProfileImage/);
  assert.match(adminJs, /FileReader/);
  assert.match(adminJs, /window\.AppData\.loadTrainees/);
  assert.match(adminJs, /window\.AppData\.createTrainee/);
  assert.match(adminJs, /window\.AppData\.updateTrainee/);
  assert.match(adminJs, /window\.AppData\.deleteTrainee/);
  assert.match(adminJs, /window\.AppData\.uploadTraineeAsset/);
  assert.match(adminJs, /data-edit-trainee-profile/);
  assert.match(adminJs, /data-delete-trainee-profile/);
  assert.match(adminJs, /档案 ID 已存在/);
});

test("admin trainee profile form keeps compact fields separate from media uploads", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(html, /class="admin-trainee-profile-department-en"/);
  assert.match(css, /\.admin-trainee-profile-form label\s*{[\s\S]*align-content:\s*start/);
  assert.match(css, /\.admin-trainee-profile-department-en\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.admin-trainee-image-field\s*{[\s\S]*min-width:\s*0/);
  assert.match(css, /\.admin-trainee-image-picker\s*{[\s\S]*min-height:\s*112px/);
});

test("main screen refreshes trainee profiles after admin content changes", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /const TRAINEE_PROFILE_POLL_MS/);
  assert.match(appJs, /let traineeProfilePollTimer/);
  assert.match(appJs, /function syncTraineeProfiles/);
  assert.match(appJs, /window\.setInterval\(syncTraineeProfiles,\s*TRAINEE_PROFILE_POLL_MS\)/);
  assert.match(appJs, /window\.clearInterval\(traineeProfilePollTimer\)/);
  assert.match(appJs, /renderPhotoWall\(\)/);
  assert.match(appJs, /renderDetail\(\)/);
});

test("official site refreshes bootstrap data so newly added trainees appear", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const SITE_STATE_POLL_MS/);
  assert.match(siteJs, /let siteStatePollTimer/);
  assert.match(siteJs, /function syncSiteState/);
  assert.match(siteJs, /root\.setInterval\(syncSiteState,\s*SITE_STATE_POLL_MS\)/);
  assert.match(siteJs, /root\.clearInterval\(siteStatePollTimer\)/);
  assert.match(siteJs, /refreshCurrentView\(\{ preserveScroll: true \}\)/);
});

test("official site polling preserves active work submission edits", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const WORK_DRAFT_KEY = "joincare_hackathon_work_field_drafts_v1"/);
  assert.match(siteJs, /function isEditingWorkSubmission\(\)/);
  assert.match(siteJs, /function persistWorkFieldDraft\(input\)/);
  assert.match(siteJs, /function clearWorkDraft\(teamId\)/);
  assert.match(siteJs, /if \(isEditingWorkSubmission\(\)\) \{[\s\S]*?return;[\s\S]*?\}/);
  assert.match(siteJs, /if \(workField\) \{[\s\S]*?persistWorkFieldDraft\(workField\);[\s\S]*?updateWorkPreview\(workField\);[\s\S]*?\}/);
  assert.match(siteJs, /const draft = getWorkDraft\(team\.id\);[\s\S]*?\.\.\.getWorkSubmission\(team\),[\s\S]*?\.\.\.draft,/);
  assert.match(siteJs, /clearWorkDraft\(team\.id\);[\s\S]*?await loadSiteState\(\);/);
});

test("official site bootstrap signature tracks all backend-owned mobile data", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const signatureStart = siteJs.indexOf("function createSiteStateSignature(state = SITE_STATE)");
  const signatureEnd = siteJs.indexOf("\n\n  async function syncSiteState", signatureStart);

  assert.notEqual(signatureStart, -1, "createSiteStateSignature should exist");
  assert.ok(signatureEnd > signatureStart, "createSiteStateSignature should end before syncSiteState");
  const signatureBody = siteJs.slice(signatureStart, signatureEnd);

  assert.match(signatureBody, /state\?\.trainees/);
  assert.match(signatureBody, /state\?\.teams/);
  assert.match(signatureBody, /state\?\.works/);
  assert.match(signatureBody, /state\?\.vote/);
  assert.match(signatureBody, /state\?\.result/);
  assert.match(signatureBody, /state\?\.me/);
  assert.match(signatureBody, /state\?\.stage/);
  assert.match(signatureBody, /state\?\.timers/);
});

test("official site result page polling only rerenders for visible leaderboard changes", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const resultSignatureStart = siteJs.indexOf("function createResultViewSignature");
  const resultSignatureEnd = siteJs.indexOf("\n\n  function createVisibleSiteStateSignature", resultSignatureStart);
  const visibleSignatureStart = siteJs.indexOf("function createVisibleSiteStateSignature");
  const visibleSignatureEnd = siteJs.indexOf("\n\n  async function syncSiteState", visibleSignatureStart);

  assert.notEqual(resultSignatureStart, -1, "createResultViewSignature should exist");
  assert.ok(resultSignatureEnd > resultSignatureStart, "result signature should end before visible signature");
  assert.notEqual(visibleSignatureStart, -1, "createVisibleSiteStateSignature should exist");
  assert.ok(visibleSignatureEnd > visibleSignatureStart, "visible signature should end before syncSiteState");

  const resultSignatureBody = siteJs.slice(resultSignatureStart, resultSignatureEnd);
  const visibleSignatureBody = siteJs.slice(visibleSignatureStart, visibleSignatureEnd);
  assert.match(visibleSignatureBody, /resolveCurrentViewKey\(\)/);
  assert.match(visibleSignatureBody, /currentViewKey === "result"/);
  assert.match(visibleSignatureBody, /createResultViewSignature\(state\)/);
  assert.match(resultSignatureBody, /normalizeList\(snapshot\?\.results\)\.map/);
  assert.match(resultSignatureBody, /item\.totalScore\s*\?\?\s*item\.total\s*\?\?\s*item\.score/);
  assert.match(resultSignatureBody, /item\.expertScore\s*\?\?\s*item\.expert\s*\?\?\s*item\.expertAverage/);
  assert.match(resultSignatureBody, /item\.votePoints\s*\?\?\s*item\.votePoint\s*\?\?\s*item\.voteScore/);
  assert.doesNotMatch(resultSignatureBody, /snapshot:\s*result\.snapshot/);
  assert.match(siteJs, /const nextSignature = createVisibleSiteStateSignature\(state \|\| SITE_STATE\)/);
});

test("official site result ranking reads published snapshot score field names", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const rankingStart = siteJs.indexOf("function computeSiteRanking()");
  const rankingEnd = siteJs.indexOf("\n  function applySiteState", rankingStart);

  assert.notEqual(rankingStart, -1, "computeSiteRanking should exist");
  assert.ok(rankingEnd > rankingStart, "computeSiteRanking should end before applySiteState");

  const rankingBody = siteJs.slice(rankingStart, rankingEnd);
  assert.match(rankingBody, /total:\s*toNumber\(result\.totalScore\s*\?\?\s*result\.total\s*\?\?\s*result\.score,\s*0\)/);
  assert.match(rankingBody, /expert:\s*toNumber\(result\.expertScore\s*\?\?\s*result\.expert\s*\?\?\s*result\.expertAverage,\s*team\.expert\s*\|\|\s*0\)/);
  assert.match(rankingBody, /votePoint:\s*toNumber\(result\.votePoints\s*\?\?\s*result\.votePoint\s*\?\?\s*result\.voteScore,\s*0\)/);
});

test("official site schedule status reads the synchronized backend stage timer", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderScheduleBody = siteJs.match(/function renderSchedule\(\) \{([\s\S]*?)\n  \}/);
  const applySiteStageStateBody = siteJs.match(/function applySiteStageState\(state = SITE_STATE\) \{([\s\S]*?)\n  \}/);
  const timerRemainingSecondsBody = siteJs.match(/function timerRemainingSeconds\(timerState, fallbackSeconds\) \{([\s\S]*?)\n  \}/);

  assert.ok(renderScheduleBody, "renderSchedule should exist");
  assert.ok(applySiteStageStateBody, "applySiteStageState should exist");
  assert.ok(timerRemainingSecondsBody, "timerRemainingSeconds should exist");
  assert.match(siteJs, /const PRESTART_COUNTDOWN_STAGE_ID = "prestart"/);
  assert.match(siteJs, /const MISSION_COUNTDOWN_STAGE_IDS = new Set\(\["opening", "icebreaker", "speech", "tracks", "team"\]\)/);
  assert.match(siteJs, /const DISPLAY_PARTICIPANT_COUNT = 20/);
  assert.match(siteJs, /members:\s*DISPLAY_PARTICIPANT_COUNT/);
  assert.match(siteJs, /s === "prestart"[\s\S]*phase:\s*"大赛筹备中"[\s\S]*label:\s*"正式比赛开始倒计时"/);
  assert.match(applySiteStageStateBody[1], /CURRENT_STAGE_ID === PRESTART_COUNTDOWN_STAGE_ID[\s\S]*timers\.prestartCountdown/);
  assert.match(applySiteStageStateBody[1], /MISSION_COUNTDOWN_STAGE_IDS\.has\(CURRENT_STAGE_ID\)[\s\S]*timers\.missionCountdown/);
  assert.match(timerRemainingSecondsBody[1], /return Math\.max\(0,\s*Math\.floor\(durationMs \/ 1000\)\)/);
  assert.doesNotMatch(siteJs, /apiRequest\("\/api\/admin\/state"\)/);
  assert.doesNotMatch(siteJs, /await syncHomeState\(\)/);
  assert.doesNotMatch(renderScheduleBody[1], />大众投票进行中</);
  assert.doesNotMatch(renderScheduleBody[1], /data-remain="6353"/);
});

test("official site countdown stays paused until the backend timer starts", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const tickBody = siteJs.match(/function tick\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const countdownAttrsBody = siteJs.match(/function countdownAttrs\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const countdownAttrUses = siteJs.match(/\$\{countdownAttrs\(\)\}/g) || [];

  assert.match(siteJs, /function isCountdownPaused\(\)/);
  assert.match(siteJs, /CURRENT_STAGE_ID === PRESTART_COUNTDOWN_STAGE_ID[\s\S]*?timers\.prestartCountdown\?\.startedAt/);
  assert.match(siteJs, /MISSION_COUNTDOWN_STAGE_IDS\.has\(CURRENT_STAGE_ID\)[\s\S]*?timers\.missionCountdown\?\.startedAt/);
  assert.match(countdownAttrsBody, /data-paused="\$\{isCountdownPaused\(\) \? "true" : "false"\}"/);
  assert.match(tickBody, /if \(el\.dataset\.paused === "true"\) return;/);
  assert.ok(countdownAttrUses.length >= 2, "home and mobile home countdowns should share paused countdown attributes");
});

test("admin topbar quick menus expose real links and session actions", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="screenQuickMenuButton"/);
  assert.match(html, /id="screenQuickMenu"/);
  assert.match(html, /id="adminUserMenuButton"/);
  assert.match(html, /id="adminUserMenu"/);
  assert.match(html, /id="adminUserName"/);
  assert.match(css, /\.topbar-menu-wrap/);
  assert.match(css, /\.topbar-menu\[hidden\]/);
  assert.match(adminJs, /function renderTopbarMenus/);
  assert.match(adminJs, /function toggleTopbarMenu/);
  assert.match(adminJs, /function loadCurrentAdminUser/);
  assert.match(adminJs, /window\.AppData\.loadCurrentUser/);
  assert.match(adminJs, /window\.AppData\.logoutCurrentUser/);
  assert.match(adminJs, /const TOPBAR_NAV = \[/);
  assert.match(adminJs, /route:\s*"\/site"/);
  assert.match(adminJs, /route:\s*"\/index"/);
  assert.match(adminJs, /route:\s*"\/screen"/);
});

test("Feishu login UI state keeps the unlock CTA and live login status copy", () => {
  assert.deepEqual(getFeishuLoginUiState("idle"), {
    buttonLabel: "解锁任务",
    statusText: "",
    sessionKey: "joincare_feishu_login",
  });

  assert.deepEqual(getFeishuLoginUiState("authenticating"), {
    buttonLabel: "正在登录飞书",
    statusText: "",
    sessionKey: "joincare_feishu_login",
  });
});

test("official site opens directly without the duplicate intro gate", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(html, /id="siteIntro"/);
  assert.doesNotMatch(html, /id="siteSkip"/);
  assert.doesNotMatch(html, /id="siteEnter"/);
  assert.match(siteCss, /overflow-y:\s*auto/);
});

test("hackathon overview cards lower the muted description copy", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteCss, /\.flow-step p\s*\{[\s\S]*?transform:\s*translateY\(6px\)/);
});

test("hackathon overview day badges keep a compact label gap", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const badgeBlock = siteCss.match(/\.fs-badge\s*\{[^}]*\}/)?.[0] || "";

  assert.match(badgeBlock, /display:\s*grid/);
  assert.match(badgeBlock, /grid-template-columns:\s*auto auto/);
  assert.match(badgeBlock, /column-gap:\s*clamp\(10px,\s*0\.65vw,\s*14px\)/);
  assert.match(badgeBlock, /width:\s*max-content/);
  assert.match(badgeBlock, /white-space:\s*nowrap/);
  assert.match(siteCss, /\.fs-badge span,\s*\.fs-badge i\s*\{[^}]*white-space:\s*nowrap/);
  assert.doesNotMatch(badgeBlock, /grid-template-columns:\s*auto 1fr/);
  assert.doesNotMatch(badgeBlock, /width:\s*clamp\(198px,\s*13vw,\s*220px\)/);
});

test("official site exposes all requested PC pages in the SPA router", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const JUDGE_KEY = "joincare_hackathon_judge_scores"/);
  assert.match(siteJs, /function renderMe\(/);
  assert.match(siteJs, /function renderTeam\(/);
  assert.match(siteJs, /function renderSchedule\(/);
  assert.match(siteJs, /function renderVote\(/);
  assert.match(siteJs, /function renderJudge\(/);

  assert.match(siteJs, /pageHead\("赛事指南",[\s\S]*"EVENT GUIDE"\)/);
  assert.match(siteJs, /const VIEWS = \[[\s\S]*key:\s*"schedule", label:\s*"赛事指南"/);
  assert.match(siteJs, /const VIEWS = \[[\s\S]*key:\s*"result", label:\s*"排行榜"/);
  assert.doesNotMatch(siteJs, /key:\s*"schedule", label:\s*"赛程"/);
  assert.doesNotMatch(siteJs, /key:\s*"result", label:\s*"最终排行"/);
  assert.match(siteJs, /key:\s*"team", label:\s*"组队"/);
  assert.match(siteJs, /key:\s*"vote", label:\s*"投票"/);
  assert.match(siteJs, /key:\s*"judge", label:\s*"评委评分"/);
});

test("official site normalizes team track order and uppercase English labels", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const TEAM_DISPLAY_ORDER = \["medicine", "pharma", "production", "marketing", "functions"\]/);
  assert.match(siteJs, /medicine:\s*\{ code:\s*"01", nameEn:\s*"MEDICAL AFFAIRS"[\s\S]*accent:\s*"rgb\(205,\s*255,\s*92\)"[\s\S]*rgb:\s*"205,\s*255,\s*92"/);
  assert.match(siteJs, /pharma:\s*\{ code:\s*"02", nameEn:\s*"PHARMACEUTICAL SCIENCE"[\s\S]*accent:\s*"var\(--neon\)"[\s\S]*rgb:\s*"40,\s*255,\s*200"/);
  assert.match(siteJs, /production:\s*\{ code:\s*"03", nameEn:\s*"MANUFACTURING"[\s\S]*accent:\s*"rgb\(110,\s*235,\s*150\)"[\s\S]*rgb:\s*"110,\s*235,\s*150"/);
  assert.match(siteJs, /marketing:\s*\{ code:\s*"04", nameEn:\s*"SALES & MARKETING"[\s\S]*accent:\s*"rgb\(100,\s*232,\s*214\)"[\s\S]*rgb:\s*"100,\s*232,\s*214"/);
  assert.match(siteJs, /functions:\s*\{ code:\s*"05", nameEn:\s*"CORPORATE FUNCTIONS"[\s\S]*accent:\s*"var\(--neon-2\)"[\s\S]*rgb:\s*"167,\s*255,\s*79"/);
  assert.match(siteJs, /function normalizeUpperText\(value, fallback = ""\)/);
  assert.match(siteJs, /const track = normalizeUpperText\(\s*team\.nameEn \|\| team\.trackName \|\| team\.track \|\| base\.nameEn \|\| base\.track,\s*displayMeta\.nameEn \|\| "业务赛道",\s*\)/);
  assert.match(siteJs, /nameEn:\s*track/);
  assert.doesNotMatch(siteJs, /nameEn:\s*displayMeta\.nameEn \|\| team\.nameEn/);
  assert.match(siteJs, /\.sort\(compareTeamDisplayOrder\)/);
});

test("official site keeps backend team cards when bootstrap is unavailable", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const loadSiteStateBody = siteJs.match(/async function loadSiteState\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  const fallbackTeamsBody = siteJs.match(/async function loadFallbackTeams\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";

  assert.match(fallbackTeamsBody, /try \{[\s\S]*return typeof AppData\.loadTeams === "function" \? await AppData\.loadTeams\(STATIC_TEAMS\) : \[\];/);
  assert.match(fallbackTeamsBody, /catch \(error\) \{[\s\S]*console\.warn\("Failed to load fallback teams\.", error\);[\s\S]*return \[\];/);
  assert.match(loadSiteStateBody, /const teams = await loadFallbackTeams\(\);/);
  assert.doesNotMatch(loadSiteStateBody, /applySiteState\(\{ trainees: \[\], teams: \[\], works: \[\]/);
});

test("official site header uses compact team nav and balanced hero/brand copy", () => {
  const logicJs = fs.readFileSync(path.join(__dirname, "../src/logic.js"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(logicJs, /key:\s*"team", label:\s*"组队"/);
  assert.doesNotMatch(logicJs, /key:\s*"team", label:\s*key === "player" \? "组队" : "组队进度"/);
  assert.match(siteJs, /<span class="hero-kicker-live"><span class="live-dot"><\/span>LIVE<\/span>/);
  assert.match(siteJs, /<span class="hero-kicker-name">AI_INNOVATION_HACKATHON_2026<\/span>/);
  assert.doesNotMatch(siteJs, /LIVE · AI_INNOVATION_HACKATHON_2026/);
  assert.match(siteCss, /\.hero-kicker\s*\{[\s\S]*justify-content:\s*space-between/);
  assert.match(siteCss, /\.hero-kicker\s*\{[\s\S]*padding:\s*8px clamp\(12px,\s*1\.2vw,\s*20px\) 8px 14px/);
  assert.doesNotMatch(siteCss, /\.hero-kicker\s*\{[^}]*transform:\s*translateX/);
  assert.match(siteCss, /\.hero-kicker-name\s*\{[\s\S]*margin-left:\s*auto[\s\S]*text-align:\s*right/);
  assert.match(siteCss, /@media \(min-width:\s*681px\)[\s\S]*\.hero-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1\.08fr\) minmax\(360px,\s*0\.82fr\);\s*gap:\s*clamp\(42px,\s*6vw,\s*80px\);\s*align-items:\s*start;/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.hero-kicker\s*\{[^}]*transform:\s*none/);
  assert.match(siteCss, /\.mh-hero\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*none[\s\S]*box-shadow:\s*none/);
  assert.match(siteCss, /\.mh-hero h1\s*\{[\s\S]*text-shadow:[\s\S]*rgba\(40,\s*255,\s*200,\s*0\.5\)/);
  assert.match(siteCss, /\.nav-brand strong\s*\{[\s\S]*font-size:\s*13\.5px/);
  assert.match(siteCss, /\.nav-brand small\s*\{[\s\S]*font-size:\s*9px/);
});

test("official site home stays a navigable site dashboard instead of the index landing", () => {
  const siteHtml = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderHomeBody = siteJs.match(/function renderHome\(\) \{([\s\S]*?)\n  function renderPeople\(\)/)?.[1] || "";

  assert.match(siteHtml, /src\/site\.css\?v=20260703-auth-role-selection/);
  assert.match(siteHtml, /src\/site\.js\?v=20260703-auth-role-selection/);
  assert.match(renderHomeBody, /<span class="hero-kicker"><span class="hero-kicker-live"><span class="live-dot"><\/span>LIVE<\/span><span class="hero-kicker-name">AI_INNOVATION_HACKATHON_2026<\/span><\/span>/);
  assert.match(renderHomeBody, /<h1 class="hero-title">AI创新黑客松<\/h1>/);
  assert.match(renderHomeBody, /<p class="hero-slogan">36小时 · 让想法落地，让创新发生<\/p>/);
  assert.match(renderHomeBody, /<a class="btn-primary" data-nav="gallery">进入作品展厅<\/a>/);
  assert.match(renderHomeBody, /<aside class="hero-panel glass">/);
  assert.match(renderHomeBody, /secondaryCta/);
  assert.doesNotMatch(renderHomeBody, /hero-brand-mark/);
  assert.doesNotMatch(renderHomeBody, /data-text="AI 创新黑客松"/);
  assert.doesNotMatch(renderHomeBody, /hero-title-text/);
  assert.doesNotMatch(renderHomeBody, /data-nav="schedule">解锁任务/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\]\s+\.site-nav\s*{\s*display:\s*none/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\]\s+\.hero-kicker\s*{[\s\S]*display:\s*none/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\]\s+\.hero-panel,\s*\n\s*\.site-body\[data-view="home"\]\s+\.hero-desc\s*{[\s\S]*display:\s*none/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\]\s+\.hero-title::before/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\]\s+\.hero-title::after/);
  assert.match(siteCss, /\.hero-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.08fr\) minmax\(360px,\s*0\.82fr\)/);
});

test("official site lets users leave teams and cancel their vote", () => {
  const siteHtml = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteHtml, /site\.js\?v=20260703-auth-role-selection/);
  assert.match(siteJs, /leaveTeam:\s*\(teamId\)\s*=>\s*apiRequest\("\/api\/team\/leave"/);
  assert.match(siteJs, /cancelVote:\s*\(teamId\)\s*=>\s*apiRequest\("\/api\/vote\/cancel"/);
  assert.match(siteJs, /function leaveTeam\(/);
  assert.match(siteJs, /function cancelVote\(/);
  assert.match(siteJs, /data-leave-team/);
  assert.match(siteJs, /data-cancel-vote/);
  assert.match(siteJs, /退出队伍/);
  assert.match(siteJs, /取消投票/);
  assert.match(siteJs, /function refreshCurrentView\(\{ preserveScroll = false \} = \{\}\)/);
  assert.match(siteJs, /refreshCurrentView\(\{ preserveScroll: true \}\)/);
  assert.doesNotMatch(siteJs, /localVoteDeltaTeamId/);
  assert.match(siteCss, /\.team-join\.is-leave/);
  assert.match(siteCss, /\.gl2-vote\.is-cancel/);
  assert.match(siteCss, /\.btn-primary\.is-cancel/);
});

test("official site write actions surface backend errors and refresh action state", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /async function refreshActionState\(\{ render = false \} = \{\}\)/);
  assert.match(siteJs, /await loadSiteState\(\);[\s\S]*?refreshRoleChrome\(\);/);
  assert.match(siteJs, /if \(render\) refreshCurrentView\(\{ preserveScroll: true \}\)/);
  assert.match(siteJs, /function getVoteActionErrorMessage\(error, actionLabel\)/);
  assert.match(siteJs, /Required permission: canVote/);
  assert.match(siteJs, /voted for/);
  assert.match(siteJs, /function getTeamActionErrorMessage\(error, actionLabel\)/);
  assert.match(siteJs, /Required permission: canJoinTeam/);
  assert.match(siteJs, /toast\(getVoteActionErrorMessage\(e, "投票"\)\)/);
  assert.match(siteJs, /toast\(getVoteActionErrorMessage\(e, "取消投票"\)\)/);
  assert.match(siteJs, /toast\(getTeamActionErrorMessage\(e, "加入队伍"\)\)/);
  assert.match(siteJs, /toast\(getTeamActionErrorMessage\(e, "退出队伍"\)\)/);
  assert.match(siteJs, /await refreshActionState\(\);[\s\S]*?await SiteRoleApi\.castVote\(id\);[\s\S]*?await refreshActionState\(\{ render: true \}\);/);
  assert.match(siteJs, /await refreshActionState\(\);[\s\S]*?await SiteRoleApi\.cancelVote\(team\.id\);[\s\S]*?await refreshActionState\(\{ render: true \}\);/);
  assert.match(siteJs, /await refreshActionState\(\);[\s\S]*?await SiteRoleApi\.joinTeam\(id\);[\s\S]*?await refreshActionState\(\{ render: true \}\);/);
  assert.match(siteJs, /await refreshActionState\(\);[\s\S]*?await SiteRoleApi\.leaveTeam\(team\.id\);[\s\S]*?await refreshActionState\(\{ render: true \}\);/);
});

test("official site disables vote actions while the vote window is closed", () => {
  const siteHtml = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteHtml, /site\.js\?v=20260703-auth-role-selection/);
  assert.match(siteJs, /const isVoteWindowOpen = \(\) => \(\(SITE_STATE && SITE_STATE\.vote && SITE_STATE\.vote\.status\) \|\| ""\) === "voting"/);
  assert.match(siteJs, /const voteWindowOpen = isVoteWindowOpen\(\);/);
  assert.match(siteJs, /投票窗口当前未开启，暂不能取消或重新选择/);
  assert.match(siteJs, /投票窗口当前未开启，请等待管理员开启投票/);
  assert.match(siteJs, /Vote window is not open/);
  assert.match(siteJs, /\/vote window\|voting window\/i/);
  assert.match(siteJs, /if \(!isVoteWindowOpen\(\)\) \{[\s\S]*?toast\("投票窗口当前未开启，无法完成投票操作"\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?await SiteRoleApi\.castVote\(id\);/);
  assert.match(siteJs, /if \(!isVoteWindowOpen\(\)\) \{[\s\S]*?toast\("投票窗口当前未开启，无法完成投票操作"\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?await SiteRoleApi\.cancelVote\(team\.id\);/);
  assert.match(siteJs, /voteWindowOpen\s*\?\s*`<button class="gl2-vote is-voted is-cancel"/);
  assert.match(siteJs, /voteWindowOpen\s*\?\s*`<button class="btn-primary is-cancel"/);
});

test("gallery page presents innovation showcase copy and non-redundant work card hierarchy", () => {
  const siteHtml = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteHtml, /site\.css\?v=20260703-auth-role-selection/);
  assert.match(siteHtml, /site\.js\?v=20260703-auth-role-selection/);
  assert.match(siteJs, /pageHead\("作品展厅", "从真实业务挑战出发，见证 AI 从想法走向实践", "INNOVATION SHOWCASE"\)/);
  assert.match(siteJs, /投票进行中 · 浏览五大战队作品，选出你最认可的解决方案，并投出关键一票/);
  assert.match(siteJs, /class="gl2-cover-label"><span class="gl2-cover-index">\$\{esc\(t\.trackCode\)\}<\/span><span class="gl2-cover-track">\$\{esc\(t\.track\)\}<\/span><\/span>/);
  assert.match(siteJs, /class="gl2-cover-name">\$\{esc\(t\.name\)\}<\/h3>/);
  assert.match(siteJs, /function workProjectTitle\(work = \{\}\)/);
  assert.match(siteJs, /function displayWorkProjectName\(team = \{\}\)/);
  assert.match(siteJs, /const projectName = displayWorkProjectName\(t\);/);
  assert.match(siteJs, /<b class="gl2-project-name">\$\{esc\(projectName\)\}<\/b>/);
  assert.match(siteJs, /permissions\.canScore\s*\?\s*`<button class="gl2-vote" type="button" data-gallery-judge-entry>去评分 ➔<\/button>`/);
  assert.match(siteJs, /`<button class="gl2-vote" data-vote="\$\{t\.id\}">为TA加油<\/button>`/);
  assert.match(siteJs, /const galleryJudgeEntry = e\.target\.closest\("\[data-gallery-judge-entry\]"\)/);
  assert.match(siteJs, /if \(galleryJudgeEntry\) \{ e\.preventDefault\(\); go\("judge"\); return; \}/);
  assert.doesNotMatch(siteJs, /class="gl2-track2"/);
  assert.doesNotMatch(siteJs, /\$\{esc\(t\.trackCode\)\} PROJECT/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="gallery"\] \.page-hero/);
  assert.match(siteCss, /\.gl2-h \.gl2-project-name\s*\{[\s\S]*font-size:\s*clamp\(24px,\s*2\.3vw,\s*36px\)/);
});

test("gallery only lists published works while privileged roles can open submitted work details", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const canViewStart = siteJs.indexOf("function canViewWorkTeam(team)");
  const canViewEnd = siteJs.indexOf("\n  function voteForTeam", canViewStart);
  const canViewBody = siteJs.slice(canViewStart, canViewEnd);

  assert.match(siteJs, /function isPublishedWorkTeam\(team\)/);
  assert.match(siteJs, /function canViewWorkTeam\(team\)/);
  assert.match(siteJs, /const publishedTeams = D\.teams\.filter\(isPublishedWorkTeam\)/);
  assert.match(siteJs, /const cards = publishedTeams\.map\(\(t\) =>/);
  assert.match(siteJs, /if \(!canViewWorkTeam\(t\)\) return renderGallery\(\);/);
  assert.match(canViewBody, /permissions\.canAdmin/);
  assert.match(canViewBody, /permissions\.canScore && Boolean\(team\?\.work\)/);
  assert.match(canViewBody, /permissions\.canSubmitWork && joinedTeam\(\) === team\?\.id && Boolean\(team\?\.work\)/);
  assert.doesNotMatch(canViewBody, /permissions\.canVote/);
});

test("published work cards do not backfill empty submitted tech stack from demo data", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const normalizeStart = siteJs.indexOf("function normalizeSiteTeam");
  const normalizeEnd = siteJs.indexOf("\n  function updateSiteStats", normalizeStart);
  const normalizeBody = siteJs.slice(normalizeStart, normalizeEnd);

  assert.match(normalizeBody, /const hasWork = Boolean\(work\)/);
  assert.match(normalizeBody, /hasWork\s*\?\s*\(\s*Array\.isArray\(work\?\.stack\)\s*\?\s*work\.stack\s*:\s*\[\]\s*\)/);
  assert.doesNotMatch(normalizeBody, /Array\.isArray\(work\?\.stack\) && work\.stack\.length[\s\S]*normalizeList\(base\.stack\)/);
});

test("official site regular page headers match the talent profile title scale", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const cssBlock = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return siteCss.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`))?.[0] || "";
  };

  assert.match(cssBlock(".ph-en"), /font-size:\s*11px/);
  assert.match(cssBlock(".people-head .ph-en"), /font-size:\s*11px/);
  assert.match(siteCss, /--site-heading-title-size:\s*clamp\(30px,\s*3\.6vw,\s*56px\)/);
  assert.match(siteCss, /--site-heading-title-size-mobile:\s*clamp\(27px,\s*8\.4vw,\s*34px\)/);
  assert.match(siteCss, /--site-heading-copy-size:\s*clamp\(13px,\s*1\.1vw,\s*17px\)/);
  assert.match(cssBlock(".page-hero h1"), /font-size:\s*var\(--site-heading-title-size\)/);
  assert.match(cssBlock(".people-head h1"), /font-size:\s*var\(--site-heading-title-size\)/);
  assert.match(cssBlock(".page-hero p"), /font-size:\s*var\(--site-heading-copy-size\)/);
  assert.match(cssBlock(".people-head p"), /font-size:\s*var\(--site-heading-copy-size\)/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.page-hero h1,\s*\.people-head h1,\s*\.mobile-people-head h1\s*\{[\s\S]*font-size:\s*var\(--site-heading-title-size-mobile\)/);
  assert.doesNotMatch(siteCss, /\.page-hero h1\s*\{[^}]*font-size:\s*38px/);
  assert.doesNotMatch(siteCss, /\.people-head h1\s*\{[^}]*font-size:\s*34px/);
  assert.doesNotMatch(siteCss, /\.mobile-people-head h1\s*\{[^}]*font-size:\s*2[78]px/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="gallery"\] \.page-hero/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="gallery"\] \.ph-en\s*\{/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="gallery"\] \.page-hero h1\s*\{/);
});

test("official site hydrates audience state from backend bootstrap without local vote mutation fallback", () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(dataJs, /function loadSiteBootstrap/);
  assert.match(dataJs, /\/api\/site\/bootstrap/);
  assert.match(dataJs, /loadSiteBootstrap,/);
  assert.match(siteJs, /SITE_STATE/);
  assert.match(siteJs, /loadSiteBootstrap/);
  assert.doesNotMatch(siteJs, /team\.votes\s*\+=\s*1/);
  assert.doesNotMatch(siteJs, /localStorage\.setItem\(VOTE_KEY/);
  assert.doesNotMatch(siteJs, /localStorage\.removeItem\(VOTE_KEY/);
  assert.doesNotMatch(siteJs, /后端未接入时使用本地演示投票状态/);
});

test("official site requires a backend authenticated session before enabling vote actions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /function hasBackendSession\(/);
  assert.match(siteJs, /function canUseVoteAction\(/);
  assert.match(siteJs, /function clearStoredRole\(/);
  assert.match(siteJs, /currentRole\(\) && !hasBackendSession\(\)/);
  assert.match(siteJs, /data-auth-vote/);
  assert.match(siteJs, /const authVote = e\.target\.closest\("\[data-auth-vote\]"\)/);
  assert.doesNotMatch(siteJs, /!currentRole\(\)\s*\?\s*`<button class="gl2-vote" data-vote=/);
  assert.doesNotMatch(siteJs, /!currentRole\(\)\s*\?\s*`<button class="btn-primary" data-vote=/);
});

test("official site scopes displayed vote state to audience voting permission", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /function canUseVoteAction\(\) \{/);
  assert.match(siteJs, /function renderGallery\(\) \{[\s\S]*?const canVote = canUseVoteAction\(\);\s*const voted = canVote \? votedTeam\(\) : "";/);
  assert.match(siteJs, /function renderWork\(id,\s*returnView\) \{[\s\S]*?const canVote = canUseVoteAction\(\);\s*const voted = canVote \? votedTeam\(\) : "";/);
  assert.match(siteJs, /function renderOverviewBanner\(\) \{[\s\S]*?const canVote = canUseVoteAction\(\);\s*const voted = canVote \? getTeam\(votedTeam\(\)\) : null;/);
});

test("official site work detail opens the submitted Feishu document URL", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderWorkStart = siteJs.indexOf("function renderWork(id");
  const renderWorkEnd = siteJs.indexOf("\n  function setupCarousel", renderWorkStart);
  const renderWorkBody = siteJs.slice(renderWorkStart, renderWorkEnd);

  assert.match(renderWorkBody, /const workDocUrl = String\(t\.work\?\.docUrl \|\| ""\)\.trim\(\);/);
  assert.match(renderWorkBody, /const docHref = workDocUrl \|\| L\.page;/);
  assert.match(renderWorkBody, /<a class="wk-doc" href="\$\{esc\(docHref\)\}" target="_blank" rel="noopener">/);
  assert.doesNotMatch(renderWorkBody, /<a class="wk-doc" href="\$\{L\.page\}"/);
});

test("judge work detail routes scoring action and respects locked scoring state", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderWorkStart = siteJs.indexOf("function renderWork(id");
  const renderWorkEnd = siteJs.indexOf("\n  function setupCarousel", renderWorkStart);
  const renderWorkBody = siteJs.slice(renderWorkStart, renderWorkEnd);

  assert.match(siteJs, /function isJudgeScoringLockedForTeam\(teamId\)/);
  assert.match(renderWorkBody, /const judgeScoringLocked = permissions\.canScore && isJudgeScoringLockedForTeam\(t\.id\);/);
  assert.match(renderWorkBody, /permissions\.canScore\s*\?\s*judgeScoringLocked\s*\?\s*`<button class="btn-primary dim" disabled>评分已关闭<\/button>`\s*:\s*`<button class="btn-primary" type="button" data-nav="judge">去评分<\/button>`/);
  assert.ok(renderWorkBody.indexOf("permissions.canScore") < renderWorkBody.indexOf("!permissions.canVote"));
});

test("work detail carousel omits the screenshot upload hint", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderWorkStart = siteJs.indexOf("function renderWork(id");
  const renderWorkEnd = siteJs.indexOf("\n  function setupCarousel", renderWorkStart);
  const renderWorkBody = siteJs.slice(renderWorkStart, renderWorkEnd);

  assert.match(renderWorkBody, /class="wkc-foot"><div class="wkc-dots">\$\{dotEls\}<\/div><\/div>/);
  assert.doesNotMatch(renderWorkBody, /wkc-hint|提交作品时可上传多张截图/);
});

test("role permissions reserve team joining, voting, judging, and admin control for the right roles", () => {
  assert.deepEqual(getRolePermissions("player"), {
    canJoinTeam: true,
    canSubmitWork: true,
    canVote: false,
    canScore: false,
    canAdmin: false,
    canControlBigscreen: false,
    canViewTeamProgress: true,
  });

  assert.equal(getRolePermissions("judge").canJoinTeam, false);
  assert.equal(getRolePermissions("judge").canSubmitWork, false);
  assert.equal(getRolePermissions("judge").canScore, true);
  assert.equal(getRolePermissions("judge").canVote, false);
  assert.equal(getRolePermissions("judge").canAdmin, false);
  assert.equal(getRolePermissions("judge").canViewTeamProgress, false);
  assert.equal(getRolePermissions("public").canJoinTeam, false);
  assert.equal(getRolePermissions("public").canSubmitWork, false);
  assert.equal(getRolePermissions("public").canVote, true);
  assert.equal(getRolePermissions("public").canScore, false);
  assert.equal(getRolePermissions("public").canAdmin, false);
  assert.equal(getRolePermissions("public").canViewTeamProgress, false);
  assert.equal(getRolePermissions("admin").canJoinTeam, false);
  assert.equal(getRolePermissions("admin").canAdmin, true);
  assert.equal(getRolePermissions("admin").canControlBigscreen, true);
});

test("role workbench model hides player-only team actions from public, judge, and admin roles", () => {
  const sharedState = {
    joinedTeamName: "",
    votedTeamName: "",
    scoredTeams: 0,
    totalTeams: 5,
  };

  for (const role of ["public", "judge", "admin"]) {
    const model = getRoleWorkbenchModel({ ...sharedState, role });
    const labels = model.statusCards.map((card) => card.label);
    const titles = model.quickEntries.map((entry) => entry.title);
    const text = JSON.stringify(model);

    assert.ok(!labels.includes("组队状态"));
    assert.ok(!titles.includes("报名组队"));
    assert.doesNotMatch(text, /未加入队伍|加入队伍|可选择一个赛道队伍加入/);
  }

  const player = getRoleWorkbenchModel({ ...sharedState, role: "player" });
  assert.ok(player.statusCards.some((card) => card.label === "组队状态" && card.value === "未加入队伍"));
  assert.ok(player.quickEntries.some((entry) => entry.title === "报名组队"));
});

test("judge role does not expose team progress entry points on PC", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const model = getRoleWorkbenchModel({
    role: "judge",
    scoredTeams: 1,
    totalTeams: 5,
  });
  const modelText = JSON.stringify(model);

  assert.ok(!getRoleNavItems("judge").some((item) => item.key === "team"));
  assert.ok(!model.statusCards.some((card) => card.nav === "team"));
  assert.ok(!model.quickEntries.some((entry) => entry.nav === "team"));
  assert.doesNotMatch(modelText, /组队只读|组队进度|查看各赛道名额/);
  assert.match(siteJs, /if \(v\.key === "team" && !rolePermissions\(currentRole\(\)\)\.canViewTeamProgress\)/);
});

test("judge my page has no quick entries on any endpoint", () => {
  const model = getRoleWorkbenchModel({
    role: "judge",
    scoredTeams: 1,
    totalTeams: 5,
  });
  const quickText = JSON.stringify(model.quickEntries);

  assert.deepEqual(model.quickEntries, []);
  assert.doesNotMatch(quickText, /待评作品|我的评分记录|进入五维评分|查看本地评分草稿|作品展厅|赛事指南|浏览作品详情|查看路演安排/);
  assert.ok(getRolePermissions("judge").canScore);
  assert.ok(model.statusCards.some((card) => card.nav === "judge" && card.label === "待评作品"));
});

test("my page hides the quick panel when there are no quick entries", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderMeBody = siteJs.match(/function renderMe\(\) \{([\s\S]*?)\n  function renderSchedule/)?.[1] || "";

  assert.match(renderMeBody, /const quickEntries = Array\.isArray\(safeModel\.quickEntries\) \? safeModel\.quickEntries : \[\];/);
  assert.match(renderMeBody, /const quickPanel = quickEntries\.length/);
  assert.match(renderMeBody, /<div class="dash-grid">\$\{cards\}<\/div>\s*\$\{quickPanel\}/);
  assert.doesNotMatch(renderMeBody, /<div class="dash-grid">\$\{cards\}<\/div>\s*<div class="quick-panel glass">/);
});

test("public role does not expose team progress entry points on PC", () => {
  const model = getRoleWorkbenchModel({
    role: "public",
    votedTeamName: "",
    totalTeams: 5,
  });
  const modelText = JSON.stringify(model);

  assert.ok(!getRoleNavItems("public").some((item) => item.key === "team"));
  assert.ok(getRoleNavItems("public").some((item) => item.key === "result" && item.label === "排行榜"));
  assert.ok(!getRoleNavItems("public").some((item) => item.key === "vote" || item.label === "投票"));
  assert.ok(!model.statusCards.some((card) => card.nav === "team"));
  assert.ok(!model.statusCards.some((card) => card.nav === "vote"));
  assert.ok(!model.quickEntries.some((entry) => entry.nav === "team"));
  assert.ok(!model.quickEntries.some((entry) => entry.nav === "result" || entry.title === "排行榜"));
  assert.ok(!model.quickEntries.some((entry) => entry.nav === "vote" || entry.title === "投票入口"));
  assert.doesNotMatch(modelText, /组队只读|组队进度|查看当前队伍形成情况|查看赛道满员状态|投票页|投票入口/);
});

test("player workbench routes work submission through the team workspace", () => {
  const player = getRoleWorkbenchModel({
    role: "player",
    joinedTeamName: "丹方智造队",
    joinedTeamMeta: "药学赛道 · 队伍名可编辑",
    joinedTeamProject: "智能药学资料助手",
    votedTeamName: "",
    scoredTeams: 0,
    totalTeams: 5,
  });
  const submitCard = player.statusCards.find((card) => card.label === "作品提交");

  assert.equal(submitCard.nav, "team");
  assert.match(submitCard.sub, /队伍工作台/);
  assert.ok(player.quickEntries.some((entry) => entry.title === "作品提交" && entry.nav === "team"));
});

test("role navigation exposes role-specific operational entries", () => {
  const publicNav = getRoleNavItems("public");

  assert.deepEqual(
    getRoleNavItems("player").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("judge").map((item) => item.key),
    ["home", "people", "schedule", "gallery", "judge", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("public").map((item) => item.key),
    ["home", "people", "schedule", "gallery", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("admin").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "admin", "result"],
  );
  assert.equal(publicNav.find((item) => item.key === "schedule").label, "赛事指南");
  assert.equal(publicNav.find((item) => item.key === "result").label, "排行榜");
  assert.ok(!publicNav.some((item) => item.label === "赛程" || item.label === "最终排行" || item.label === "投票"));
});

test("mobile bottom tabs hide the my entry for player, public, and judge roles", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const playerTabs = siteJs.slice(siteJs.indexOf("const MOBILE_TABS_PLAYER"), siteJs.indexOf("const MOBILE_TABS_PUBLIC"));
  const publicTabs = siteJs.slice(siteJs.indexOf("const MOBILE_TABS_PUBLIC"), siteJs.indexOf("const MOBILE_TABS_JUDGE"));
  const judgeTabs = siteJs.slice(siteJs.indexOf("const MOBILE_TABS_JUDGE"), siteJs.indexOf("const MOBILE_TABS_ADMIN"));

  assert.doesNotMatch(playerTabs, /key:\s*"me"/);
  assert.doesNotMatch(publicTabs, /key:\s*"me"/);
  assert.doesNotMatch(judgeTabs, /key:\s*"me"/);
  assert.match(siteJs, /if \(currentRole\(\) === "player"\) return MOBILE_TABS_PLAYER/);
  assert.match(siteJs, /if \(currentRole\(\) === "judge"\) return MOBILE_TABS_JUDGE/);
  assert.match(siteJs, /if \(currentRole\(\) === "public"\) return MOBILE_TABS_PUBLIC/);
});

test("team page keeps grouping focused on the team list and editable team names", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(siteJs, /固定赛道，队伍自定义命名/);
  assert.doesNotMatch(siteJs, /队长可编辑队名/);
  assert.doesNotMatch(siteJs, /只读进度|当前角色仅可查看组队进度|仅查看组队进度/);
  assert.match(siteJs, /team-name-draft/);
  assert.match(siteCss, /\.team-name-draft/);
});

test("team card roster uses the same real-identity list as the member count", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderTeamStart = siteJs.indexOf("function renderTeam()");
  const renderTeamEnd = siteJs.indexOf("\n  function getWorkSubmission", renderTeamStart);
  const renderTeamBody = siteJs.slice(renderTeamStart, renderTeamEnd);

  assert.match(renderTeamBody, /Logic\.getActualTeamPeople/);
  assert.doesNotMatch(renderTeamBody, /\[\{\s*\.\.\.t\.advisor,\s*role:\s*"队长"\s*\},\s*\.\.\.t\.members/);
});

test("team workspace roster excludes fallback people and avoids duplicate leader labels", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const teamPeopleStart = siteJs.indexOf("function teamPeople(team)");
  const teamPeopleEnd = siteJs.indexOf("\n  function getTeamLeaderId", teamPeopleStart);
  const teamPeopleBody = siteJs.slice(teamPeopleStart, teamPeopleEnd);
  const workspaceStart = siteJs.indexOf("function renderTeamWorkspace");
  const workspaceEnd = siteJs.indexOf("\n  /* ---- 投票状态", workspaceStart);
  const workspaceBody = siteJs.slice(workspaceStart, workspaceEnd);

  assert.match(teamPeopleBody, /const personId = realPersonId\(person\)/);
  assert.match(teamPeopleBody, /if \(!personId \|\| seenPersonIds\.has\(personId\)\) return/);
  assert.match(teamPeopleBody, /isAdvisorSlot: true/);
  assert.match(workspaceBody, /const leaderSuffix = isLeader && !isLeaderRoleText\(duty\) \? " · 队长" : ""/);
  assert.doesNotMatch(workspaceBody, /\$\{personId === leaderId \? " · 队长" : ""\}/);
});

test("gallery, work detail and ranking use filtered real team people", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const galleryStart = siteJs.indexOf("function renderGallery()");
  const galleryEnd = siteJs.indexOf("\n  /* ---- 作品详情", galleryStart);
  const galleryBody = siteJs.slice(galleryStart, galleryEnd);
  const workStart = siteJs.indexOf("function renderWork(id");
  const workEnd = siteJs.indexOf("\n  /* ---- 投票状态", workStart);
  const workBody = siteJs.slice(workStart, workEnd);
  const resultStart = siteJs.indexOf("function renderResult");
  const resultEnd = siteJs.indexOf("\n  function renderNoPermission", resultStart);
  const resultBody = siteJs.slice(resultStart, resultEnd);

  assert.match(galleryBody, /teamPeople\(t\)\.slice\(0, 5\)\.map\(\(p\) => avatar\(p, 34\)\)/);
  assert.match(workBody, /const workLeaderId = getTeamLeaderId\(t\)/);
  assert.match(workBody, /teamPeople\(t\)[\s\S]*p\.realUserId && p\.realUserId === workLeaderId \? "队长" : "组员"/);
  assert.match(resultBody, /teamPeople\(t\)\.slice\(0, 5\)\.map\(\(p\) => avatar\(p, 30\)\)/);
  assert.doesNotMatch(galleryBody, /\[t\.advisor,\s*...t\.members\]/);
  assert.doesNotMatch(workBody, /\[\{\s*...t\.advisor,\s*role:\s*"队长"\s*\},\s*...t\.members/);
  assert.doesNotMatch(resultBody, /\[t\.advisor,\s*...t\.members\]/);
});

test("team page removes the repeated formation explanation panel from the audience view", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /pageHead\("组队", "选择你感兴趣的挑战方向，与伙伴组建战队，开启共创之旅", "TEAM FORMATION"\)/);
  assert.match(siteJs, /<div class="sec-cap"><span><\/span>挑战赛道 · CHALLENGE TRACKS<\/div>/);
  assert.doesNotMatch(siteJs, /选择赛道队伍，查看队长、成员与作品方向/);
  assert.doesNotMatch(siteJs, />队伍列表<\/div>/);
  assert.doesNotMatch(siteJs, /const teamStatusLabel/);
  assert.doesNotMatch(siteJs, /const teamStatusHeadline/);
  assert.doesNotMatch(siteJs, /class="team-formation-panel/);
  assert.doesNotMatch(siteJs, /class="team-selection-summary"/);
  assert.doesNotMatch(siteJs, /class="team-countdown-box"/);
  assert.doesNotMatch(siteJs, /TEAM FORMATION HUB|任务倒计时|36H Demo preparation/);
  assert.doesNotMatch(siteJs, /class="team-status glass"/);
  assert.doesNotMatch(siteJs, /class="team-live-strip glass"/);
  assert.doesNotMatch(siteJs, /class="team-selection-summary glass"/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="team"\]\s+\.page-hero/);
  assert.doesNotMatch(siteCss, /\.team-formation-panel\b/);
  assert.doesNotMatch(siteCss, /\.team-live-strip\b/);
  assert.doesNotMatch(siteCss, /\.team-countdown-box\b/);
  assert.doesNotMatch(siteCss, /\.team-selection-summary\b/);
});

test("team cards route into a dedicated team workspace page", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /function renderTeamWorkspace\(/);
  assert.match(siteJs, /function showTeamWorkspace\(/);
  assert.match(siteJs, /team-workspace-/);
  assert.match(siteJs, /data-team-workspace/);
  assert.match(siteJs, /队伍工作台 \/ 作品提交/);
  assert.match(siteJs, /进入工作台/);
  assert.match(siteJs, /预览作品展示/);
  assert.match(siteJs, /<button class="btn-ghost" type="button" data-work="\$\{team\.id\}">预览作品展示<\/button>/);
  assert.match(siteJs, /if \(work\) \{ showWork\(work\.dataset\.work,\s*true,\s*work\.dataset\.workReturn \|\| ""\); return; \}/);
  assert.match(siteCss, /\.team-workspace/);
});

test("team workspace fields align with the public gallery work details", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");

  assert.match(siteJs, /作品展厅只展示/);
  assert.match(siteJs, /作品标题/);
  assert.match(siteJs, /一句话介绍/);
  assert.match(siteJs, /Demo 链接/);
  assert.match(siteJs, /代码地址/);
  assert.match(siteJs, /展示截图/);
  assert.match(siteJs, /data-work-screenshot-picker/);
  assert.match(siteJs, /data-work-screenshot-input/);
  assert.match(siteJs, /type="file"[^>]*accept="image\/\*"/);
  assert.match(siteJs, /class="workspace-shot-add"/);
  assert.match(siteJs, /class="workspace-preview-empty"/);
  assert.match(siteJs, /上传截图后将在这里预览/);
  assert.match(siteJs, /window\.AppData\.uploadWorkAsset/);
  assert.match(siteJs, /发布预览/);
  assert.match(siteJs, /data-work-field/);
  assert.match(dataJs, /async function uploadWorkAsset/);
  assert.match(dataJs, /\/api\/work-assets/);
  assert.match(dataJs, /uploadWorkAsset,/);
  assert.match(siteCss, /\.workspace-form/);
  assert.match(siteCss, /\.workspace-preview/);
  assert.match(siteCss, /\.workspace-shot-picker/);
  assert.match(siteCss, /\.workspace-shot-add/);
  assert.match(siteCss, /\.workspace-shot-thumb/);
  assert.match(siteCss, /\.workspace-preview-shots \.workspace-preview-shot/);
  assert.match(siteCss, /aspect-ratio: 16 \/ 9/);
  assert.match(siteCss, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\)/);
  assert.match(siteCss, /min-height:\s*clamp\(96px,\s*14vw,\s*172px\)/);
  assert.match(siteCss, /object-fit:\s*contain/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.workspace-preview-shots \.workspace-preview-shot\s*{[\s\S]*min-height:\s*clamp\(160px,\s*54vw,\s*260px\)/);
  assert.match(siteCss, /\.workspace-preview-shots \.workspace-preview-empty/);
});

test("team workspace submission heading stacks English above Chinese", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const headBlock = siteCss.match(/\.workspace-form-head\s*\{[\s\S]*?\n}/)?.[0] || "";
  const chineseTitleBlock = siteCss.match(/\.workspace-form-head b\s*\{[\s\S]*?\n}/)?.[0] || "";

  assert.match(headBlock, /display:\s*grid/);
  assert.match(headBlock, /grid-template-columns:\s*1fr/);
  assert.match(headBlock, /justify-items:\s*start/);
  assert.match(chineseTitleBlock, /white-space:\s*nowrap/);
});

test("team workspace screenshot upload accepts image files without browser MIME metadata", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const WORK_SCREENSHOT_MAX_BYTES = 8 \* 1024 \* 1024/);
  assert.match(siteJs, /function isImageFile\(file\)/);
  assert.match(siteJs, /file\?\.type/);
  assert.match(siteJs, /file\?\.name/);
  assert.match(siteJs, /png\|jpe\?g\|webp\|gif/);
  assert.match(siteJs, /filter\(isImageFile\)/);
  assert.match(siteJs, /function normalizeImageDataUrl\(dataUrl, file\)/);
  assert.match(siteJs, /normalizeImageDataUrl\(await readFileAsDataUrl\(file\), file\)/);
  assert.match(siteJs, /function getWorkScreenshotUploadErrorMessage\(error\)/);
  assert.match(siteJs, /Image file is too large\./);
  assert.match(siteJs, /Request body is too large\./);
  assert.match(siteJs, /图片过大，请压缩到 8MB 以内后再上传/);
  assert.match(siteJs, /file\.size > WORK_SCREENSHOT_MAX_BYTES/);
  assert.match(siteJs, /toast\(getWorkScreenshotUploadErrorMessage\(error\)\)/);
});

test("team workspace resolves uploaded screenshot URLs against the API origin", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /function resolveUploadedAssetUrl\(value\)/);
  assert.match(siteJs, /getRuntimeApiBaseUrl\(\)/);
  assert.match(siteJs, /assets\\\/uploads/);
  assert.match(siteJs, /return apiBaseUrl \? `\$\{apiBaseUrl\}\$\{assetPath\}` : original;/);
  assert.match(siteJs, /<img src="\$\{esc\(resolveUploadedAssetUrl\(value\)\)\}" alt="\$\{label\}"/);
  assert.match(siteJs, /<img src="\$\{esc\(resolveUploadedAssetUrl\(shot\)\)\}" alt="展示截图 \$\{index \+ 1\}"/);
  assert.match(siteJs, /src:\s*resolveUploadedAssetUrl\(src\)/);
});

test("team workspace is private to the joined player team", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /function canOpenTeamWorkspace\(teamId\)/);
  assert.match(siteJs, /permissions\.canSubmitWork && joinedTeam\(\) === teamId/);
  assert.match(siteJs, /if \(!canOpenTeamWorkspace\(team\.id\)\) return renderWork\(team\.id\)/);
  assert.match(siteJs, /只有当前队长可以提交作品/);
  assert.match(siteJs, /进入工作台/);
  assert.match(siteJs, /查看公开作品/);
});

test("player workflow uses backend state instead of local team fallback", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const joinedTeam = \(\) => \(SITE_STATE && SITE_STATE\.me && SITE_STATE\.me\.teamId\) \|\| ""/);
  assert.match(siteJs, /await SiteRoleApi\.joinTeam\(id\);\s*await refreshActionState\(\{ render: true \}\);/s);
  assert.match(siteJs, /await SiteRoleApi\.leaveTeam\(team\.id\);\s*await refreshActionState\(\{ render: true \}\);/s);
  assert.match(siteJs, /await SiteRoleApi\.submitWork\(\{[\s\S]*?teamId: team\.id,[\s\S]*?\}\);\s*clearWorkDraft\(team\.id\);\s*await refreshActionState\(\{ render: true \}\);/);
  assert.doesNotMatch(siteJs, /joincare_hackathon_team"/);
  assert.doesNotMatch(siteJs, /localStorage\.setItem\(TEAM_KEY/);
  assert.doesNotMatch(siteJs, /localStorage\.removeItem\(TEAM_KEY/);
  assert.doesNotMatch(siteJs, /local-player/);
  assert.doesNotMatch(siteJs, /作品草稿已保存在本地/);
});

test("player workspace uses submitted backend work instead of local draft metadata", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.doesNotMatch(siteJs, /TEAM_NAME_KEY|WORKSPACE_META_KEY/);
  assert.doesNotMatch(siteJs, /joincare_hackathon_work_drafts|joincare_hackathon_team_names|joincare_hackathon_workspace_meta/);
  assert.doesNotMatch(siteJs, /保存草稿|作品草稿/);
  assert.doesNotMatch(siteJs, /return meta\.leaderId/);
  assert.match(siteJs, /提交作品/);
  assert.match(siteJs, /await SiteRoleApi\.submitWork\(\{[\s\S]*?teamId: team\.id,[\s\S]*?\}\);\s*clearWorkDraft\(team\.id\);\s*await refreshActionState\(\{ render: true \}\);/);
});

test("team workspace validates required title and surfaces submit API errors", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /function validateWorkSubmission\(submission\)/);
  assert.match(siteJs, /请填写作品标题后再提交/);
  assert.match(siteJs, /const validation = validateWorkSubmission\(submission\);[\s\S]*?if \(!validation\.valid\) \{[\s\S]*?toast\(validation\.message\);[\s\S]*?return;[\s\S]*?\}/);
  assert.match(siteJs, /function getWorkSubmitErrorMessage\(error\)/);
  assert.match(siteJs, /project is required\./);
  assert.match(siteJs, /Required permission: canSubmitWork/);
  assert.match(siteJs, /toast\(getWorkSubmitErrorMessage\(error\)\)/);
});

test("team workspace supports updating and withdrawing work submissions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");

  assert.match(dataJs, /async function withdrawWork\(payload = \{\}\)/);
  assert.match(dataJs, /withdrawWork,/);
  assert.match(siteJs, /withdrawWork: \(payload\) => apiRequest\("\/api\/work\/withdraw"/);
  assert.match(siteJs, /data-withdraw-work="\$\{team\.id\}"/);
  assert.match(siteJs, /function getWorkSubmitActionLabel\(status\)/);
  assert.match(siteJs, /if \(status === "submitted"\) return "更新提交";/);
  assert.match(siteJs, /if \(status === "published"\) return "已发布";/);
  assert.match(siteJs, /const canWithdrawSubmission = canEdit && \["submitted", "reviewing"\]\.includes\(submissionStatus\);/);
  assert.doesNotMatch(siteJs, /\["submitted", "reviewing", "published"\]\.includes\(submissionStatus\)/);
  assert.match(siteJs, /async function withdrawTeamWork\(teamId\)/);
  assert.match(siteJs, /作品已发布，不能直接撤销/);
  assert.match(siteJs, /toast\(`「\$\{submission\.teamName \|\| team\.name\}」作品已撤销提交`\)/);
});

test("team workspace uses backend leader identity for submission editing", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /function getTeamLeaderId\(team\)/);
  assert.match(siteJs, /function currentWorkspaceMemberId\(team\)/);
  assert.match(siteJs, /function canEditTeamWorkspace\(teamId\)/);
  assert.match(siteJs, /realUserId/);
  assert.match(siteJs, /memberId && leaderId && memberId === leaderId/);
  assert.match(siteJs, /队长与职责/);
  assert.match(siteJs, /当前队长/);
  assert.match(siteJs, /仅队长可提交/);
  assert.match(siteJs, /data-submit-work/);
  assert.match(siteJs, /点击认领会写入后端队伍数据/);
  assert.doesNotMatch(siteJs, /data-team-leader/);
  assert.doesNotMatch(siteJs, /data-team-duty/);
  assert.match(siteJs, /readonly aria-readonly="true"/);
  assert.match(siteCss, /\.workspace-roles/);
  assert.match(siteCss, /\.workspace-person-role/);
});

test("player workspace lets joined players claim backend team roles", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /TEAM_ROLE_SLOTS/);
  assert.match(siteJs, /claimRole:\s*\(teamId,\s*roleKey,\s*duty\)/);
  assert.match(siteJs, /\/api\/team\/claim-role/);
  assert.match(siteJs, /data-role-claim/);
  assert.match(siteJs, /async function claimTeamRole\(teamId,\s*roleKey\)/);
  assert.match(siteJs, /await SiteRoleApi\.claimRole\(teamId,\s*roleKey,\s*slot\.duty\);\s*await loadSiteState\(\);/s);
  assert.doesNotMatch(siteJs, /joincare_hackathon_workspace_meta|WORKSPACE_META_KEY/);
});

test("team surfaces present the advisor slot as team leader copy", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const screenJs = fs.readFileSync(path.join(__dirname, "../src/screen.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(siteJs, /队长/);
  assert.match(screenJs, /队长/);
  assert.match(adminJs, /admin-team-member-badge">队长/);
  assert.match(siteJs, /function normalizeLeader/);
  assert.doesNotMatch(siteJs, /role:\s*"技术顾问"|查看技术顾问|技术顾问、业务洞察/);
  assert.doesNotMatch(screenJs, /技术顾问|赛道顾问|ADVISOR|MENTORS/);
  assert.doesNotMatch(adminJs, /顾问：/);
});

test("stage screen routing opens the vote progress and result screens", () => {
  assert.equal(resolveStageScreenView("prestart"), "home");
  assert.equal(resolveStageScreenView("vote"), "vote");
  assert.equal(resolveStageScreenView("result"), "vote-result");
  assert.equal(resolveStageScreenView("final"), "final-result");
});

test("computeVoteRanking sorts votes and applies the confirmed point scale", () => {
  const ranking = computeVoteRanking(
    [
      { id: "production", name: "生产", votes: 92 },
      { id: "pharma", name: "药学", votes: 148 },
      { id: "medicine", name: "医学", votes: 121 },
      { id: "functions", name: "职能", votes: 67 },
      { id: "marketing", name: "营销", votes: 180 },
    ],
    [100, 85, 70, 55, 40],
  );

  assert.deepEqual(
    ranking.map((team) => team.id),
    ["marketing", "pharma", "medicine", "production", "functions"],
  );
  assert.deepEqual(
    ranking.map((team) => team.votePoints),
    [100, 85, 70, 55, 40],
  );
  assert.equal(ranking[4].votePoints, 40);
  assert.equal(ranking[0].rank, 1);
  assert.equal(ranking[0].totalVotes, 608);
  assert.equal(ranking[0].voteShare, 0.2961);
});

test("computeFinalResults combines expert average and vote rank points into a unique champion", () => {
  const finalResults = computeFinalResults(
    [
      { id: "production", name: "生产", votes: 92, expert: 91.2 },
      { id: "pharma", name: "药学", votes: 148, expert: 94.6 },
      { id: "medicine", name: "医学", votes: 121, expert: 96.4 },
      { id: "functions", name: "职能", votes: 67, expert: 89.7 },
      { id: "marketing", name: "营销", votes: 180, expert: 93.1 },
    ],
    [100, 85, 70, 55, 40],
  );

  assert.equal(finalResults.length, 5);
  assert.deepEqual(
    finalResults.map((team) => team.id),
    ["marketing", "pharma", "medicine", "production", "functions"],
  );
  assert.equal(finalResults[0].rank, 1);
  assert.equal(finalResults[0].votePoints, 100);
  assert.equal(finalResults[0].expertScore, 93.1);
  assert.equal(finalResults[0].totalScore, 95.17);
  assert.equal(finalResults[1].totalScore, 91.72);
  assert.equal(finalResults[2].totalScore, 88.48);
  assert.ok(finalResults[0].totalScore > finalResults[1].totalScore);
  assert.equal(finalResults.filter((team) => team.isChampion).length, 1);
  assert.equal(finalResults[0].isChampion, true);
});

test("resolveDisplayFinalResults prefers the published backend snapshot over recomputing vote-only data", () => {
  const display = resolveDisplayFinalResults({
    voteResults: [
      { id: "medicine", name: "医学", votes: 1 },
      { id: "pharma", name: "药学", votes: 0 },
    ],
    pointScale: [100, 85],
    resultSnapshot: {
      id: "snapshot-001",
      pointScale: [100, 85],
      results: [
        { id: "pharma", name: "药学", votes: 0, votePoints: 85, expertScore: 96, totalScore: 92.7, rank: 1, isChampion: true },
        { id: "medicine", name: "医学", votes: 1, votePoints: 100, expertScore: 0, totalScore: 30, rank: 2, isChampion: false },
      ],
    },
  });

  assert.equal(display.source, "snapshot");
  assert.deepEqual(display.pointScale, [100, 85]);
  assert.equal(display.results[0].id, "pharma");
  assert.equal(display.results[0].expertScore, 96);
  assert.equal(display.results[0].totalScore, 92.7);
  assert.equal(display.results[1].id, "medicine");
  assert.equal(display.results[1].totalScore, 30);
});

test("main screen wires vote progress and vote result stages", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(html, /id="voteStage"/);
  assert.match(html, /id="voteResultStage"/);
  assert.match(html, /data-view-target="vote"/);
  assert.match(html, /data-view-target="vote-result"/);
  assert.match(html, /id="voteProgressList"/);
  assert.match(html, /id="voteResultTable"/);
  assert.match(appJs, /const voteStage = document\.getElementById\("voteStage"\)/);
  assert.match(appJs, /voteResult:\s*document\.getElementById\("voteResultStage"\)/);
  assert.match(appJs, /vote:\s*createRain\("voteRain"/);
  assert.match(appJs, /"view-vote-result"/);
  assert.match(appJs, /loadVoteResults/);
  assert.match(appJs, /computeVoteRanking/);
  assert.match(dataJs, /async function loadVoteResults/);
  assert.match(dataJs, /\/api\/vote-results/);
  assert.match(dataJs, /\.\/data\/vote-results\.json/);
  assert.match(css, /\.app-shell\[data-view="vote"\]\s*>\s*\.vote-stage/);
  assert.match(css, /\.app-shell\[data-view="vote-result"\]\s*>\s*\.vote-result-stage/);
});

test("final result stage wires the champion showcase after vote result", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(html, /id="finalResultStage"/);
  assert.match(html, /最终结果 · 冠军展示/);
  assert.match(html, /data-view-target="final-result">FINAL RESULT<\/button>/);
  assert.match(html, /id="finalResultChampion"/);
  assert.match(html, /id="finalResultLeaderboard"/);
  assert.match(appJs, /finalResult:\s*document\.getElementById\("finalResultStage"\)/);
  assert.match(appJs, /"view-final-result"/);
  assert.match(appJs, /let resultSnapshotState/);
  assert.match(appJs, /function applyResultSnapshotState/);
  assert.match(appJs, /loadLatestResultSnapshot/);
  assert.match(appJs, /resolveDisplayFinalResults\(\{[\s\S]*voteResults:\s*voteResultsState\.results[\s\S]*pointScale:\s*voteResultsState\.pointScale[\s\S]*resultSnapshot:\s*resultSnapshotState\.snapshot/);
  assert.doesNotMatch(appJs, /finalResultLeaderboard\.innerHTML\s*=\s*finalResults\.map/);
  assert.match(adminJs, /id:\s*"final"/);
  assert.match(adminJs, /name:\s*"冠军展示"/);
  assert.match(css, /\.app-shell\[data-view="final-result"\]\s*>\s*\.final-result-stage/);
});

test("final result styling exposes ceremony layout hooks", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.final-result-stage\s*\{/);
  assert.match(css, /\.final-result-champion\s*\{/);
  assert.match(css, /\.final-result-score strong\s*\{/);
  assert.match(css, /\.final-result-leaderboard\s*\{/);
  assert.match(css, /\.final-result-score-grid\s*\{/);
  assert.match(css, /\.final-result-context\s*\{/);
  assert.match(css, /\.final-result-row\.is-champion\s*\{/);
});

test("vote progress stage keeps all five ranking rows inside one screen", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.vote-progress-cockpit\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.vote-progress-cockpit\s*\{[^}]*max-height:\s*calc\(100vh - clamp\(142px,\s*15vh,\s*178px\)\)/s);
  assert.match(css, /\.vote-progress-layout\s*\{[^}]*height:\s*min\(690px,\s*100%\)/s);
  assert.match(css, /\.vote-progress-list\s*\{[^}]*grid-template-rows:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.vote-progress-row\s*\{[^}]*min-height:\s*0/s);
});

test("vote total orbit centers the numeric total independently from its label", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.vote-total-orbit strong\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.vote-total-orbit strong\s*\{[^}]*left:\s*50%/s);
  assert.match(css, /\.vote-total-orbit strong\s*\{[^}]*top:\s*50%/s);
  assert.match(css, /\.vote-total-orbit strong\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)/s);
  assert.match(css, /\.vote-total-orbit > span\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.vote-total-orbit > span\s*\{[^}]*bottom:\s*clamp\(26px,\s*3\.2vw,\s*42px\)/s);
});

test("vote command status reads as a lightweight HUD indicator", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.vote-command-bar strong\s*\{[^}]*justify-self:\s*center/s);
  assert.match(css, /\.vote-command-bar strong\s*\{[^}]*border:\s*0/s);
  assert.match(css, /\.vote-command-bar strong\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.vote-command-bar strong\s*\{[^}]*font-size:\s*clamp\(12px,\s*0\.78vw,\s*14px\)/s);
  assert.match(css, /\.vote-command-bar strong\s*\{[^}]*box-shadow:\s*none/s);
  assert.doesNotMatch(css, /\.vote-command-bar strong\s*\{[^}]*border-radius:\s*999px/s);
  assert.match(css, /\.vote-command-bar strong::before\s*\{[^}]*content:\s*""/s);
  assert.match(css, /\.vote-command-bar strong::after\s*\{[^}]*linear-gradient\(90deg,\s*transparent,\s*rgba\(40,\s*255,\s*200,\s*0\.72\),\s*transparent\)/s);
});

test("vote result screens reserve footer safe area", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.vote-result-stage\s*\{[^}]*--result-footer-safe:\s*clamp\(112px,\s*12vh,\s*146px\)/s);
  assert.match(css, /\.vote-result-stage\s*\{[^}]*--result-cockpit-height:\s*min\(742px,\s*calc\(100vh - clamp\(158px,\s*16vh,\s*190px\)\)\)/s);
  assert.match(css, /\.vote-result-hub-wrap\s*\{[^}]*padding-bottom:\s*var\(--result-footer-safe\)/s);
  assert.match(css, /\.vote-result-cockpit\s*\{[^}]*height:\s*var\(--result-cockpit-height\)/s);
  assert.match(css, /\.vote-result-cockpit\s*\{[^}]*max-height:\s*var\(--result-cockpit-height\)/s);
});

test("vote result ranking table keeps five rows readable in compressed viewports", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.vote-result-board\s*\{[^}]*gap:\s*clamp\(10px,\s*1vh,\s*16px\)/s);
  assert.match(css, /\.vote-result-table\s*\{[^}]*grid-template-rows:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.vote-result-table\s*\{[^}]*align-content:\s*stretch/s);
  assert.match(css, /\.vote-result-table\s*\{[^}]*gap:\s*clamp\(9px,\s*1vh,\s*12px\)/s);
  assert.match(css, /\.vote-result-row\s*\{[^}]*min-height:\s*0/s);
  assert.match(css, /\.vote-result-row\s*\{[^}]*padding:\s*clamp\(10px,\s*1\.1vh,\s*14px\) 16px/s);
  assert.match(css, /\.vote-result-row\s*\{[^}]*overflow:\s*hidden/s);
});

test("index big-screen mobile layout converts fixed stage compositions to scroll views", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.stage-header\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.photo-wall-wrap\s*\{[^}]*position:\s*relative[^}]*transform:\s*none/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.photo-wall\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.profile-card\s*\{[^}]*position:\s*relative[^}]*transform:\s*none !important/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.photo-wall-svg\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.discover-glow-orb\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.discover-hub-wrap\s*\{[^}]*position:\s*relative[^}]*min-height:\s*100dvh/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.department-grid\s*\{[^}]*height:\s*auto[^}]*transform:\s*none/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.dept-card\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow:\s*visible/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.vote-progress-cockpit,\n\s*\.vote-result-cockpit,\n\s*\.final-result-cockpit\s*\{[^}]*height:\s*auto[^}]*max-height:\s*none[^}]*overflow:\s*visible/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.vote-result-table,\n\s*\.final-result-leaderboard\s*\{[^}]*grid-template-rows:\s*none/s);
});

test("final result screen reserves enough vertical room for the champion showcase", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const stageBlock = css.match(/\.final-result-stage\s*\{[\s\S]*?\n}/)?.[0] || "";
  const hubBlock = css.match(/\.final-result-hub-wrap\s*\{[\s\S]*?\n}/)?.[0] || "";
  const detailLayerBlock = css.match(/\.detail-layer,\n\.challenge-layer\s*\{[\s\S]*?\n}/)?.[0] || "";
  const openLayerBlock = css.match(/\.detail-layer\.is-open,\n\.challenge-layer\.is-open\s*\{[\s\S]*?\n}/)?.[0] || "";

  assert.match(stageBlock, /overflow:\s*hidden/);
  assert.match(css, /\.final-result-stage\s*\{[^}]*--final-result-footer-safe:\s*clamp\(72px,\s*8vh,\s*98px\)/s);
  assert.match(css, /\.final-result-stage\s*\{[^}]*--final-result-chrome-space:\s*clamp\(150px,\s*15vh,\s*196px\)/s);
  assert.match(detailLayerBlock, /overflow:\s*hidden/);
  assert.match(detailLayerBlock, /visibility:\s*hidden/);
  assert.match(openLayerBlock, /visibility:\s*visible/);
  assert.match(hubBlock, /position:\s*absolute/);
  assert.match(hubBlock, /inset:\s*0/);
  assert.match(hubBlock, /min-height:\s*0/);
  assert.match(hubBlock, /overflow:\s*hidden/);
  assert.match(css, /\.final-result-cockpit\s*\{[^}]*width:\s*min\(1680px,\s*calc\(100vw - clamp\(64px,\s*8vw,\s*152px\)\)\)[^}]*max-width:\s*1680px[^}]*grid-template-columns:\s*minmax\(420px,\s*0\.94fr\) minmax\(520px,\s*1\.06fr\)[^}]*gap:\s*clamp\(18px,\s*2vw,\s*34px\)[^}]*padding:\s*clamp\(20px,\s*2vw,\s*34px\)/s);
  assert.match(css, /\.final-result-cockpit\s*\{[^}]*height:\s*min\(660px,\s*calc\(100dvh - var\(--final-result-chrome-space\)\)\)[^}]*max-height:\s*calc\(100dvh - var\(--final-result-chrome-space\)\)[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(css, /\.final-result-cockpit\s*\{[^}]*height:\s*var\(--final-result-cockpit-height\)/s);
  assert.match(css, /\.final-result-champion\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*gap:\s*clamp\(8px,\s*1\.25vh,\s*18px\)[^}]*padding:\s*clamp\(22px,\s*2\.4vw,\s*42px\)/s);
  assert.match(css, /\.final-result-score strong\s*\{[^}]*font-size:\s*clamp\(50px,\s*4\.4vw,\s*84px\)/s);
  assert.match(css, /\.final-result-sideboard\s*\{[^}]*gap:\s*clamp\(12px,\s*1\.2vw,\s*22px\)[^}]*padding:\s*clamp\(16px,\s*1\.7vw,\s*28px\)/s);
  assert.match(css, /\.final-result-leaderboard\s*\{[^}]*gap:\s*clamp\(10px,\s*1\.1vh,\s*14px\)/s);
  assert.match(css, /\.final-result-row\s*\{[^}]*grid-template-columns:\s*64px minmax\(0,\s*1fr\) 136px[^}]*gap:\s*clamp\(14px,\s*1\.25vw,\s*22px\)[^}]*min-height:\s*clamp\(86px,\s*8\.5vh,\s*112px\)[^}]*padding:\s*clamp\(14px,\s*1\.2vw,\s*20px\)/s);
});

test("final result screen adds a cyber award ceremony motion layer", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /@keyframes\s+awardSpotlightSweep/);
  assert.match(css, /@keyframes\s+awardPanelReveal/);
  assert.match(css, /@keyframes\s+awardChampionPulse/);
  assert.match(css, /@keyframes\s+awardScorePop/);
  assert.match(css, /@keyframes\s+awardGoldScan/);
  assert.doesNotMatch(css, /awardEnergyDrift/);
  assert.match(css, /\.app-shell\[data-view="final-result"\]\s+\.final-result-stage::before\s*\{[^}]*animation:\s*awardSpotlightSweep/s);
  assert.match(css, /\.app-shell\[data-view="final-result"\]\s+\.final-result-cockpit\s*\{[^}]*animation:\s*awardPanelReveal/s);
  assert.match(css, /\.app-shell\[data-view="final-result"\]\s+\.final-result-emblem\s*\{[^}]*animation:\s*awardChampionPulse/s);
  assert.match(css, /\.app-shell\[data-view="final-result"\]\s+\.final-result-score strong\s*\{[^}]*animation:\s*awardScorePop/s);
  assert.match(css, /\.final-result-champion::after\s*\{[^}]*animation:\s*awardGoldScan/s);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.app-shell\[data-view="final-result"\]\s+\.final-result-stage::before,[\s\S]*animation:\s*none/s);
});

test("official site wires my page, team join and judge score interactions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /e\.target\.closest\("#navLogin"\)/);
  assert.match(siteJs, /toggleUserMenu\(\)/);
  assert.match(siteJs, /data-switch-role/);
  assert.match(siteJs, /data-logout/);
  assert.match(siteJs, /data-join-team/);
  assert.match(siteJs, /function joinTeam\(/);
  assert.match(siteJs, /data-judge-save/);
  assert.match(siteJs, /function saveJudgeDraft\(/);
});

test("official site has desktop styling hooks for the added PC pages", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  [".me-dashboard", ".team-board", ".schedule-board", ".vote-board", ".judge-board", ".status-chip"].forEach((selector) => {
    assert.match(siteCss, new RegExp(selector.replace(".", "\\.")));
  });
});

test("official site aligns non-home desktop pages to the trainee board inset", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteCss, /--site-page-inset:\s*clamp\(22px,\s*4vw,\s*54px\)/);
  assert.match(siteCss, /\.people-head\s*\{[\s\S]*left:\s*var\(--site-page-inset\)/);
  assert.match(siteCss, /@media \(min-width:\s*681px\)[\s\S]*\.site-body:not\(\[data-view="home"\]\) \.page-hero \.container,[\s\S]*\.site-body:not\(\[data-view="home"\]\) \.sec\.container,[\s\S]*\.site-body:not\(\[data-view="home"\]\) \.vote-banner\s*\{[\s\S]*width:\s*calc\(100% - \(var\(--site-page-inset\) \* 2\)\)[\s\S]*margin-left:\s*var\(--site-page-inset\)[\s\S]*margin-right:\s*var\(--site-page-inset\)/);
  assert.doesNotMatch(siteCss, /\.site-body\[data-view="home"\] \.page-hero \.container/);
});

test("schedule page omits the key-node timeline section", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.doesNotMatch(siteJs, /关键节点/);
  assert.doesNotMatch(siteJs, /class="timeline-grid"/);
});

test("schedule page omits the current phase countdown card", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderSchedule = siteJs.match(/function renderSchedule\(\) \{[\s\S]*?function renderTeam\(\)/)?.[0] || "";

  assert.match(renderSchedule, /赛事旅程\s*·\s*EVENT JOURNEY/);
  assert.doesNotMatch(renderSchedule, /class="schedule-live glass"/);
  assert.doesNotMatch(renderSchedule, /当前阶段/);
  assert.doesNotMatch(renderSchedule, /countdownAttrs\(\)/);
});

test("schedule journey follows the snake arrow order", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /赛事旅程\s*·\s*EVENT JOURNEY/);
  assert.match(siteJs, /sub:\s*"认识组织·认识彼此"/);
  assert.doesNotMatch(siteJs, /总裁致辞/);
  assert.match(siteJs, /const snakeOrder = \[0, 1, 2, 3, 7, 6, 5, 4\]/);
  assert.match(siteJs, /const journeyOrder = isMobileView\(\) \? chronologicalOrder : snakeOrder/);
});

test("schedule journey uses chronological order on the mobile app view", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const chronologicalOrder = \[0, 1, 2, 3, 4, 5, 6, 7\]/);
  assert.match(siteJs, /const journeyOrder = isMobileView\(\) \? chronologicalOrder : snakeOrder/);
  assert.match(siteJs, /journeyOrder\.map\(\(sourceIndex, gridIndex\) => entryCard\(journeyCards\[sourceIndex\], gridIndex, \{ hideEnglish: true \}\)\)/);
});

test("mobile home focuses on the stage countdown without shortcut cards", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderMobileHomeBody = siteJs.match(/function renderMobileHome\(totalVotes\) \{([\s\S]*?)\n  \}/)?.[1] || "";

  assert.match(renderMobileHomeBody, /class="mh-slogan">36小时 · 让想法落地，让创新发生/);
  assert.match(renderMobileHomeBody, /五大业务挑战 · 五支战队，用AI重塑业务场景。认识参赛伙伴，探索创新方案，并为你支持的团队投出关键一票。/);
  assert.doesNotMatch(renderMobileHomeBody, /五大真实业务挑战，五支战队，从业务场景出发，用 AI 解决真实问题，认识参赛伙伴，探索创新方案，并为你支持的团队投出关键一票。/);
  assert.match(renderMobileHomeBody, /class="mh-chip"><span class="live-dot"><\/span>当前阶段/);
  assert.match(renderMobileHomeBody, /class="mh-chip">\$\{esc\(phaseInfo\.label\)\}/);
  assert.match(renderMobileHomeBody, /<b>\$\{esc\(phaseInfo\.phase\)\}<\/b>/);
  assert.match(renderMobileHomeBody, /<strong \$\{countdownAttrs\(\)\}>\$\{fmtHMS\(COUNTDOWN_REMAIN\)\}<\/strong>/);
  assert.match(siteCss, /\.mh-live\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(siteCss, /\.mh-live-status\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/);
  assert.match(siteCss, /\.mh-live-count\s*\{[\s\S]*border-top:\s*1px solid rgba\(103,\s*255,\s*213,\s*0\.16\)/);
  assert.match(siteCss, /\.mh-live strong\s*\{[\s\S]*text-align:\s*center/);
  assert.match(siteCss, /\.mh-chip\s*\{[\s\S]*justify-content:\s*center[\s\S]*min-height:\s*28px/);
  assert.match(renderMobileHomeBody, /const overview = D\.flowDays\.map\(\(day\) =>/);
  assert.match(renderMobileHomeBody, /class="mh-overview"/);
  assert.match(renderMobileHomeBody, />赛事全景</);
  assert.match(renderMobileHomeBody, /class="mh-overview-card"/);
  assert.match(renderMobileHomeBody, /\$\{esc\(day\.day\)\}/);
  assert.match(renderMobileHomeBody, /\$\{esc\(day\.title\)\}/);
  assert.match(siteCss, /\.mh-overview\s*\{/);
  assert.match(siteCss, /\.mh-overview-list\s*\{/);
  assert.match(siteCss, /\.mh-overview-card\s*\{/);
  assert.match(siteCss, /\.mh-overview-badge\s*\{/);
  assert.doesNotMatch(renderMobileHomeBody, /LIVE · HACKATHON 2026/);
  assert.doesNotMatch(renderMobileHomeBody, /参赛伙伴图鉴|活动议程|认识这一届 AI 星锐|看懂比赛怎么进行|查看现场作品|class="mh-agenda"|class="mh-card/);
});

test("desktop home hero uses the latest slogan and compact live badge", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderHomeBody = siteJs.match(/function renderHome\(\) \{([\s\S]*?)\n  function renderPeople\(\)/)?.[1] || "";

  assert.match(renderHomeBody, /class="hero-slogan">36小时 · 让想法落地，让创新发生<\/p>/);
  assert.match(renderHomeBody, /class="hero-desc">五大业务挑战 · 五支战队，用AI重塑业务场景。认识参赛伙伴，探索创新方案，并为你支持的团队投出关键一票。<\/p>/);
  assert.doesNotMatch(renderHomeBody, /data-text="36小时/);
  assert.doesNotMatch(renderHomeBody, /hero-title-text/);
  assert.doesNotMatch(renderHomeBody, /class="hero-slogan">36小时，用 AI 把创意照进现实<\/p>/);
  assert.doesNotMatch(renderHomeBody, /五大真实业务挑战，五支战队，从业务场景出发，用AI解决真实问题。认识参赛伙伴，探索创新方案，并为你支持的团队投出关键一票。/);
  assert.match(siteCss, /\.hero-kicker\s*\{[^}]*gap:\s*clamp\(10px,\s*1\.5vw,\s*24px\)/);
  assert.match(siteCss, /\.hero-kicker\s*\{[^}]*letter-spacing:\s*0\.1em/);
  assert.match(siteCss, /\.hero-kicker\s*\{[^}]*padding:\s*8px clamp\(12px,\s*1\.2vw,\s*20px\) 8px 14px/);
  assert.doesNotMatch(siteCss, /\.hero-kicker\s*\{[^}]*transform:\s*translateX/);
  assert.match(siteCss, /@media \(min-width:\s*681px\)[\s\S]*\.hero-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1\.08fr\) minmax\(360px,\s*0\.82fr\);\s*gap:\s*clamp\(42px,\s*6vw,\s*80px\);\s*align-items:\s*start;/);
});

test("official site result page uses leaderboard copy and final award labels", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderResultStart = siteJs.indexOf("function renderResult");
  const renderResultEnd = siteJs.indexOf("\n  function renderNoPermission", renderResultStart);
  const renderResultBody = siteJs.slice(renderResultStart, renderResultEnd);

  assert.match(siteJs, /resultHead\("排行榜"\)/);
  assert.match(siteJs, /const resultHead = \(title, subtitle = resultSubtitle, en = "RANKING"\)/);
  assert.match(siteJs, /<span class="ph-en">\$\{esc\(en\)\}<\/span><h1>\$\{esc\(title\)\}<\/h1>/);
  assert.match(siteJs, /创新与价值并重，共同见证最终荣誉的诞生/);
  assert.match(siteJs, /function shouldShowResultVoteOverview\(\)/);
  assert.match(siteJs, /return !rolePermissions\(currentRole\(\)\)\.canScore/);
  assert.match(renderResultBody, /shouldShowResultVoteOverview\(\) \? renderOverviewBanner\(\) : ""/);
  assert.doesNotMatch(renderResultBody, /const overviewHtml = renderOverviewBanner\(\)/);
  assert.match(siteJs, /const isAdminViewer = hasBackendSession\(\) && rolePermissions\(currentRole\(\)\)\.canAdmin/);
  assert.match(siteJs, /结果快照未生成/);
  assert.match(siteJs, /关闭投票后即可发布最终排行/);
  assert.match(siteJs, /专家评分会按当前已同步数据写入快照/);
  assert.doesNotMatch(siteJs, /专家评分锁定与作品审核后发布最终排行/);
  assert.match(siteJs, /\/admin\.html#results/);
  assert.match(siteJs, /去后台发布排行/);
  assert.doesNotMatch(siteJs, />最终排行</);
  assert.doesNotMatch(siteJs, /综合得分 = 专家评审 70% \+ 大众投票赋分 30%/);
  assert.doesNotMatch(siteJs, /result-bridge/);
  assert.match(siteJs, /champ \? "🏆" : pad\(t\.rank\)/);
  assert.match(renderResultBody, /<i class="rk-crown">冠军战队<\/i>/);
  assert.doesNotMatch(renderResultBody, /Grand Prize/);
  assert.match(siteJs, /const metaText = \[t\.track, t\.project\]\.filter\(Boolean\)\.map\(\(item\) => esc\(item\)\)\.join\(" · "\)/);
  assert.match(siteJs, /<span class="rk-meta">\$\{metaText\}<\/span>/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.rk-id \.rk-meta \{\s*display:\s*none;\s*\}/);
  assert.doesNotMatch(siteJs, /\$\{esc\(t\.track\)\} · \$\{esc\(t\.project\)\}/);
  assert.doesNotMatch(siteJs, /\$\{esc\(t\.project\)\} · \$\{esc\(t\.track\)\}/);
  assert.doesNotMatch(siteCss, /\.result-bridge/);
  assert.match(siteCss, /\.result-hero-en/);
});

test("schedule mechanism section uses briefing cards and separate evaluation criteria", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /class="sec-cap"><span><\/span>赛事机制 · EVENT FORMAT<\/div>\s*<div class="mech2-grid"/);
  assert.doesNotMatch(siteJs, /class="schedule-section-heading"/);
  assert.match(siteJs, /五大业务赛道开放命题/);
  assert.match(siteJs, /围绕真实业务场景，探索创新方案/);
  assert.match(siteJs, /真实可运行方案/);
  assert.match(siteJs, /提交作品与现场展示/);
  assert.match(siteJs, /专家评审 70% \+ 大众投票 30%/);
  assert.match(siteJs, /五维评审 \+ 全员投票/);
  assert.match(siteJs, /最终评选一支冠军团队/);
  assert.doesNotMatch(siteJs, /class="score-note/);
  assert.match(siteJs, /const scoreCriteria = isMobileView\(\)\s*\?\s*""\s*:\s*`<div class="score-criteria"/);
  assert.match(siteJs, /class="score-criteria"/);
  assert.match(siteJs, /class="sec-cap score-criteria-title"><span><\/span>评分维度 · EVALUATION CRITERIA/);
  assert.match(siteJs, /\$\{scoreCriteria\}/);
  assert.doesNotMatch(siteJs, /class="schedule-section-heading score-criteria-title"/);
  assert.match(siteJs, /class="score-dim-grid"/);
  assert.match(siteJs, /class="score-dim-card"/);
  assert.match(siteJs, /--score-width:\$\{d\.weight \* 4\}%/);
  assert.match(siteJs, /<i>\$\{pad\(index \+ 1\)\}<\/i><b>\$\{esc\(d\.label\)\}<\/b><span><em>\$\{d\.weight\}<\/em>%<\/span><small><ins><\/ins><\/small>/);
  assert.doesNotMatch(siteJs, /\$\{esc\(d\.en\)\}\s*·/);

  assert.match(siteCss, /\.site-body\[data-view="schedule"\] \.container\s*{[\s\S]*width:\s*min\(1360px,\s*calc\(100% - 48px\)\)/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.site-body\[data-view="schedule"\] \.score-criteria\s*\{\s*display:\s*none/);
  assert.match(siteCss, /\.score-dim-grid\s*{[\s\S]*width:\s*min\(100%,\s*1500px\)[\s\S]*margin:\s*0 auto[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)[\s\S]*gap:\s*clamp\(12px,\s*1vw,\s*16px\)/);
  assert.match(siteCss, /\.score-criteria\s*{[\s\S]*gap:\s*44px[\s\S]*margin-top:\s*26px/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*display:\s*flex/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*--dim-accent:\s*#64e8d6[\s\S]*--dim-rgb:\s*100,\s*232,\s*214/);
  assert.match(siteCss, /\.score-dim-card:nth-child\(1\)\s*{[\s\S]*--dim-accent:\s*#cdff5c[\s\S]*--dim-rgb:\s*205,\s*255,\s*92/);
  assert.match(siteCss, /\.score-dim-card:nth-child\(2\)\s*{[\s\S]*--dim-accent:\s*#28ffc8[\s\S]*--dim-rgb:\s*40,\s*255,\s*200/);
  assert.match(siteCss, /\.score-dim-card:nth-child\(3\)\s*{[\s\S]*--dim-accent:\s*#6eeb96[\s\S]*--dim-rgb:\s*110,\s*235,\s*150/);
  assert.match(siteCss, /\.score-dim-card:nth-child\(4\)\s*{[\s\S]*--dim-accent:\s*#64e8d6[\s\S]*--dim-rgb:\s*100,\s*232,\s*214/);
  assert.match(siteCss, /\.score-dim-card:nth-child\(5\)\s*{[\s\S]*--dim-accent:\s*#a7ff4f[\s\S]*--dim-rgb:\s*167,\s*255,\s*79/);
  const scoreCardPaletteBlock = siteCss.slice(siteCss.indexOf(".score-dim-card {"), siteCss.indexOf(".score-dim-card small ins"));
  assert.doesNotMatch(scoreCardPaletteBlock, /#c79bff|199,\s*155,\s*255|#f6ff81|246,\s*255,\s*129/i);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*align-items:\s*center/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*justify-content:\s*center/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*min-height:\s*clamp\(150px,\s*8\.8vw,\s*174px\)/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*aspect-ratio:\s*1\.4 \/ 1/);
  assert.match(siteCss, /\.score-dim-card\s*{[\s\S]*text-align:\s*center/);
  assert.match(siteCss, /\.score-dim-card b\s*{[\s\S]*font-size:\s*clamp\(28px,\s*2\.05vw,\s*34px\)/);
  assert.match(siteCss, /\.score-dim-card span\s*{[\s\S]*justify-content:\s*center/);
  assert.match(siteCss, /\.score-dim-card span em\s*{[\s\S]*font-size:\s*clamp\(24px,\s*1\.7vw,\s*30px\)/);
  assert.match(siteCss, /\.score-dim-card small\s*{\s*display:\s*none/);
});

test("team page uses a symmetric five-column desktop layout", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteCss, /\.team-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(siteCss, /\.team-card\s*{[\s\S]*min-height:\s*440px/);
  assert.match(siteCss, /\.team-roster\s*{[\s\S]*justify-content:\s*center/);
});

test("site team and judge views use the business scenario track palette", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const screenData = fs.readFileSync(path.join(__dirname, "../src/screen-data.js"), "utf8");
  const screenTracksBlock = screenData.slice(screenData.indexOf("const TRACKS = ["), screenData.indexOf("const TEAMS = ["));
  const screenTeamsBlock = screenData.slice(screenData.indexOf("const TEAMS = ["), screenData.indexOf("const DIMENSIONS = ["));

  assert.match(siteJs, /medicine:\s*\{[\s\S]*accent:\s*"rgb\(205,\s*255,\s*92\)"[\s\S]*rgb:\s*"205,\s*255,\s*92"/);
  assert.match(siteJs, /pharma:\s*\{[\s\S]*accent:\s*"var\(--neon\)"[\s\S]*rgb:\s*"40,\s*255,\s*200"/);
  assert.match(siteJs, /production:\s*\{[\s\S]*accent:\s*"rgb\(110,\s*235,\s*150\)"[\s\S]*rgb:\s*"110,\s*235,\s*150"/);
  assert.match(siteJs, /marketing:\s*\{[\s\S]*accent:\s*"rgb\(100,\s*232,\s*214\)"[\s\S]*rgb:\s*"100,\s*232,\s*214"/);
  assert.match(siteJs, /functions:\s*\{[\s\S]*accent:\s*"var\(--neon-2\)"[\s\S]*rgb:\s*"167,\s*255,\s*79"/);
  assert.match(siteJs, /accent:\s*team\.color \|\| displayMeta\.accent \|\| team\.accent \|\| base\.accent \|\| "var\(--neon\)"/);
  assert.match(siteJs, /rgb:\s*team\.colorRgb \|\| displayMeta\.rgb \|\| team\.rgb \|\| base\.rgb \|\| "40,\s*255,\s*200"/);
  assert.match(siteJs, /class="team-card glass[\s\S]*style="--accent:\$\{t\.accent\};--rgb:\$\{t\.rgb\}"/);
  assert.match(siteJs, /class="judge-row glass"[\s\S]*style="--accent:\$\{t\.accent\};--rgb:\$\{t\.rgb\}"/);

  assert.match(screenTracksBlock, /code:\s*"01"[\s\S]*accent:\s*"rgb\(205,\s*255,\s*92\)"[\s\S]*rgb:\s*"205,\s*255,\s*92"/);
  assert.match(screenTracksBlock, /code:\s*"02"[\s\S]*accent:\s*"var\(--neon\)"[\s\S]*rgb:\s*"40,\s*255,\s*200"/);
  assert.match(screenTracksBlock, /code:\s*"03"[\s\S]*accent:\s*"rgb\(110,\s*235,\s*150\)"[\s\S]*rgb:\s*"110,\s*235,\s*150"/);
  assert.match(screenTracksBlock, /code:\s*"04"[\s\S]*accent:\s*"rgb\(100,\s*232,\s*214\)"[\s\S]*rgb:\s*"100,\s*232,\s*214"/);
  assert.match(screenTracksBlock, /code:\s*"05"[\s\S]*accent:\s*"var\(--neon-2\)"[\s\S]*rgb:\s*"167,\s*255,\s*79"/);
  assert.doesNotMatch(`${screenTracksBlock}\n${screenTeamsBlock}`, /#c79bff|199,\s*155,\s*255|#6ad7ff|106,\s*215,\s*255|var\(--warning\)|246,\s*255,\s*129/i);
});

test("official site includes a mobile app shell with bottom tab navigation", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(html, /id="mobileTabbar"/);
  assert.match(siteJs, /const MOBILE_TABS = \[/);
  assert.match(siteJs, /const MOBILE_TABS_ADMIN = \[\s*\{ key: "home", label: "首页", icon: "target" \},\s*\{ key: "people", label: "新生看板", icon: "user" \}/);
  assert.match(siteJs, /const MOBILE_TABS = \[[\s\S]*\{ key: "me", label: "我的", icon: "team" \}/);
  const defaultTabsBlock = siteJs.match(/const MOBILE_TABS = \[[\s\S]*?\n  \];/)?.[0] || "";
  const playerTabsBlock = siteJs.match(/const MOBILE_TABS_PLAYER = \[[\s\S]*?\n  \];/)?.[0] || "";
  const publicTabsBlock = siteJs.match(/const MOBILE_TABS_PUBLIC = \[[\s\S]*?\n  \];/)?.[0] || "";
  const judgeTabsBlock = siteJs.match(/const MOBILE_TABS_JUDGE = \[[\s\S]*?\n  \];/)?.[0] || "";
  const adminTabsBlock = siteJs.match(/const MOBILE_TABS_ADMIN = \[[\s\S]*?\n  \];/)?.[0] || "";
  for (const block of [defaultTabsBlock, playerTabsBlock, publicTabsBlock, judgeTabsBlock, adminTabsBlock]) {
    assert.match(block, /key:\s*"gallery"[\s\S]*label:\s*"作品展厅"/);
    assert.doesNotMatch(block, /key:\s*"gallery"[\s\S]*label:\s*"作品"/);
  }
  assert.match(defaultTabsBlock, /key:\s*"result"[\s\S]*label:\s*"排行榜"/);
  assert.match(playerTabsBlock, /key:\s*"result"[\s\S]*label:\s*"排行榜"/);
  assert.match(publicTabsBlock, /key:\s*"result"[\s\S]*label:\s*"排行榜"/);
  assert.match(judgeTabsBlock, /key:\s*"result"[\s\S]*label:\s*"排行榜"/);
  assert.doesNotMatch(publicTabsBlock, /key:\s*"vote"|label:\s*"投票"/);
  assert.doesNotMatch(playerTabsBlock, /key:\s*"me"|label:\s*"我的"/);
  assert.doesNotMatch(publicTabsBlock, /key:\s*"me"|label:\s*"我的"/);
  assert.doesNotMatch(judgeTabsBlock, /key:\s*"me"|label:\s*"我的"/);
  assert.match(siteJs, /const MOBILE_TABS_JUDGE = \[[\s\S]*\{ key: "judge", label: "评分", icon: "scale" \},[\s\S]*\{ key: "result", label: "排行榜", icon: "trophy" \}/);
  assert.match(siteJs, /mobileTabbar\.style\.setProperty\("--mobile-tab-count", tabs\.length\)/);
  assert.match(siteJs, /mobileTabbar\.innerHTML/);
  assert.match(siteJs, /mobileTabbar\.querySelectorAll\("a"\)/);
  assert.match(siteCss, /\.mobile-tabbar/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.mobile-tabbar\s*{[\s\S]*position:\s*fixed/);
  assert.match(siteCss, /grid-template-columns:\s*repeat\(var\(--mobile-tab-count,\s*5\),\s*minmax\(0,\s*1fr\)\)/);
  assert.match(siteCss, /\.mobile-tabbar\s+a\s*{[\s\S]*min-width:\s*0/);
});

test("site trainee detail modal uses viewport-safe desktop sizing", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(html, /src\/site\.css\?v=20260703-auth-role-selection/);
  assert.match(siteCss, /--site-detail-console-width:\s*calc\(min\(80vw,\s*1260px\) - 24px\)/);
  assert.match(siteCss, /\.site-detail-layer \.draw-card\s*\{[\s\S]*?left:\s*max\(3vw,\s*calc\(100dvw - var\(--site-detail-console-width\) - var\(--site-detail-card-width\) - 40px\)\)/);
  assert.match(siteCss, /\.site-detail-layer \.profile-console\s*\{[\s\S]*?left:\s*auto/);
  assert.match(siteCss, /\.site-detail-layer \.profile-console\s*\{[\s\S]*?right:\s*0/);
  assert.match(siteCss, /\.site-detail-layer \.profile-console\s*\{[\s\S]*?width:\s*var\(--site-detail-console-width\)/);
  assert.match(siteCss, /\.site-detail-layer\.is-open \.profile-console\s*\{[\s\S]*?transform:\s*translateX\(0\)/);
  assert.match(siteCss, /\.site-detail-layer \.profile-console\s*\{[\s\S]*?bottom:\s*clamp\(18px,\s*3dvh,\s*34px\)/);
  assert.doesNotMatch(siteCss, /calc\(100vh - 210px\)/);
  assert.doesNotMatch(siteCss, /left:\s*var\(--site-detail-side-rail\)/);
  const wideDesktopStart = siteCss.indexOf("@media (max-width: 1679px)");
  const compactStart = siteCss.indexOf("@media (max-width: 1180px)", wideDesktopStart);
  const wideDesktopBlock = siteCss.slice(wideDesktopStart, compactStart);
  assert.match(wideDesktopBlock, /--site-detail-console-width:\s*calc\(min\(78vw,\s*1180px\) - 24px\)/);
  assert.doesNotMatch(wideDesktopBlock, /\.site-detail-layer \.draw-card\s*\{[\s\S]*?display:\s*none/);
  assert.match(siteCss, /@media \(max-width:\s*1180px\)[\s\S]*?\.site-detail-layer > \.draw-card\s*\{[\s\S]*?display:\s*none/);
  assert.match(siteCss, /@media \(max-width:\s*1180px\)[\s\S]*?grid-template-columns:\s*minmax\(480px,\s*1fr\) minmax\(240px,\s*min\(32vw,\s*320px\)\)/);
  assert.match(siteCss, /@media \(max-width:\s*1180px\)[\s\S]*?\.site-detail-layer\.is-open \.profile-console\s*\{[\s\S]*?transform:\s*none/);
  assert.match(siteCss, /@media \(max-width:\s*980px\)[\s\S]*?\.site-detail-layer \.profile-media-panel\s*\{[\s\S]*?height:\s*clamp\(240px,\s*42dvh,\s*360px\)/);
});

test("mobile site opens on event home and uses a natural swipe-card browser", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const mobileDetailBody = siteJs.match(/function renderMobileTraineeDetail\(p, list\) \{([\s\S]*?)\n  function renderMobilePeopleIntoMain/)?.[1] || "";

  assert.match(siteJs, /function renderMobileHome\(/);
  assert.match(siteJs, /36小时 · 让想法落地，让创新发生/);
  assert.match(siteJs, /class="mh-slogan"/);
  assert.match(siteJs, /class="mh-intro"/);
  assert.match(siteJs, /当前阶段/);
  assert.match(siteJs, /\$\{esc\(phaseInfo\.label\)\}/);
  assert.match(siteJs, /赛事全景/);
  assert.match(siteJs, /mh-overview-card/);
  assert.match(siteCss, /\.mh-overview\s*\{/);
  assert.match(siteCss, /\.mh-overview-list\s*\{/);
  assert.match(siteCss, /\.mh-overview-card\s*\{/);
  assert.match(siteCss, /\.mh-overview-badge\s*\{/);
  assert.doesNotMatch(siteJs, /LIVE · HACKATHON 2026/);
  assert.doesNotMatch(siteJs, /参赛伙伴图鉴|认识这一届 AI 星锐|看懂比赛怎么进行|查看现场作品|class="mh-agenda"|class="mh-card/);
  assert.match(siteJs, /key: "people", label: "新生看板"/);
  assert.match(siteJs, /const MOBILE_TABS_PLAYER = \[\s*\{ key: "home", label: "首页", icon: "target" \},\s*\{ key: "people", label: "新生看板", icon: "user" \},\s*\{ key: "schedule", label: "赛事指南", icon: "calendar" \},\s*\{ key: "team", label: "组队", icon: "team" \}/);
  assert.match(siteJs, /<span class="ph-en">TALENT PROFILES<\/span>/);
  assert.match(siteJs, /\$\{pad\(MOBILE_TRAINEE_INDEX \+ 1\)\}\/\$\{pad\(list\.length\)\}/);
  assert.doesNotMatch(siteJs, /ROSTER CARDS|星锐卡组|<button class="mobile-back-link"/);
  assert.match(siteCss, /\.mobile-people-head\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  const mobilePeopleLabelBlock = siteCss.match(/\.mobile-people-head \.ph-en\s*\{[^}]*\}/)?.[0] || "";
  const mobileCardIndexBlock = siteCss.match(/\.mobile-card-index\s*\{[^}]*\}/)?.[0] || "";
  assert.match(mobilePeopleLabelBlock, /font-family:\s*var\(--nav-pixel\)/);
  assert.match(mobilePeopleLabelBlock, /font-size:\s*clamp\(10px,\s*3\.05vw,\s*12px\)/);
  assert.match(mobilePeopleLabelBlock, /letter-spacing:\s*0\.2em/);
  assert.match(mobilePeopleLabelBlock, /text-transform:\s*uppercase/);
  assert.match(mobilePeopleLabelBlock, /text-shadow:\s*0 0 12px rgba\(40,\s*255,\s*200,\s*0\.3\)/);
  assert.doesNotMatch(mobilePeopleLabelBlock, /font-family:\s*var\(--display\)/);
  assert.match(mobileCardIndexBlock, /font-size:\s*17px/);
  assert.doesNotMatch(mobilePeopleLabelBlock, /border:/);
  assert.doesNotMatch(mobilePeopleLabelBlock, /padding:/);
  assert.doesNotMatch(mobilePeopleLabelBlock, /border-radius:/);
  assert.match(siteCss, /\.mobile-people-stage,\s*\.mobile-profile-detail\s*\{[\s\S]*padding:\s*2px 0 calc\(82px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(siteCss, /\.mobile-tabbar a b\s*\{[\s\S]*font-size:\s*10px/);
  assert.match(siteCss, /\.mobile-swipe-deck\s*\{[\s\S]*height:\s*clamp\(390px,\s*calc\(100svh - 208px\),\s*472px\)/);
  assert.match(siteCss, /\.mobile-card-photo-wrap\s*\{[\s\S]*flex:\s*0 0 clamp\(190px,\s*31svh,\s*246px\)/);
  assert.match(siteCss, /\.mobile-card-active \.mobile-card-photo\s*\{[\s\S]*width:\s*auto[\s\S]*max-width:\s*92%[\s\S]*object-position:\s*center bottom/);
  const mobilePersonLineBlock = siteCss.match(/\.mobile-person-line\s*\{[^}]*\}/)?.[0] || "";
  assert.match(mobilePersonLineBlock, /display:\s*block/);
  assert.match(mobilePersonLineBlock, /overflow:\s*hidden/);
  assert.match(mobilePersonLineBlock, /text-overflow:\s*ellipsis/);
  assert.match(mobilePersonLineBlock, /white-space:\s*nowrap/);
  assert.doesNotMatch(mobilePersonLineBlock, /-webkit-line-clamp/);
  assert.match(siteJs, /function renderMobilePeople\(/);
  assert.match(siteJs, /function renderMobileTraineeDetail\(/);
  assert.match(siteJs, /function setMobileTrainee\(/);
  assert.match(siteJs, /function bindMobileSwipeDeck\(/);
  assert.match(siteJs, /let MOBILE_TRAINEE_IS_TRANSITIONING = false/);
  assert.match(siteJs, /let MOBILE_TRAINEE_SHOULD_ENTER = false/);
  assert.match(siteJs, /pointerdown/);
  assert.match(siteJs, /pointerup/);
  assert.match(siteJs, /function renderMobilePeopleIntoMain\(\)\s*{[\s\S]*?main\.innerHTML = renderMobilePeople\(\);[\s\S]*?setActive\("people"\);[\s\S]*?setupMobilePeople\(\);[\s\S]*?}/);
  assert.match(siteJs, /deck\.classList\.add\("is-animating"\)/);
  assert.match(siteJs, /deck\.classList\.add\("is-entering"\)/);
  assert.match(siteJs, /MOBILE_TRAINEE_SHOULD_ENTER = true/);
  assert.match(siteJs, /deck\.style\.setProperty\("--swipe-x", "0px"\);\s*deck\.style\.setProperty\("--swipe-rot", "0deg"\);\s*deck\.classList\.add\("is-animating"\)/);
  assert.doesNotMatch(siteJs, /--swipe-fade-x/);
  assert.doesNotMatch(siteJs, /--swipe-exit-x/);
  assert.doesNotMatch(siteJs, /118vw/);
  assert.match(siteJs, /data-mobile-swipe-deck/);
  assert.match(siteJs, /data-mobile-card-detail/);
  assert.match(siteJs, /data-mobile-detail-close/);
  assert.match(siteJs, /mobile-card-photo/);
  assert.match(siteJs, /traineeLifeImage/);
  assert.match(mobileDetailBody, /class="mobile-profile-info"/);
  assert.match(mobileDetailBody, /class="mobile-info-chip">INFO<\/span>/);
  assert.match(mobileDetailBody, /class="mobile-info-list"/);
  assert.match(mobileDetailBody, /class="mobile-info-item"/);
  assert.match(mobileDetailBody, /#1 🎓 专业背景/);
  assert.match(mobileDetailBody, /#2 🤖 我的AI搭子们/);
  assert.match(mobileDetailBody, /#3 🌟 我的本命AI搭子/);
  assert.match(mobileDetailBody, /#4 💡 我最想让AI解决的问题/);
  assert.match(mobileDetailBody, /#5 ⚡️ 我的AI超能力/);
  assert.match(mobileDetailBody, /#6 🤣 一个有趣的事实/);
  assert.doesNotMatch(mobileDetailBody, /class="mobile-tool-tags"/);
  assert.doesNotMatch(mobileDetailBody, /shortText\(p\.favoriteAI \|\| p\.aiPartners \|\| p\.aiPower,\s*88\)/);
  assert.match(siteCss, /\.mobile-profile-info\s*\{/);
  assert.match(siteCss, /\.mobile-info-chip\s*\{/);
  assert.match(siteCss, /\.mobile-info-list\s*\{/);
  assert.match(siteCss, /\.mobile-info-item\s*\{/);
  assert.match(siteCss, /\.mobile-info-item p\s*\{[\s\S]*white-space:\s*pre-line/);
  assert.match(siteJs, /root\.matchMedia\("\(max-width: 680px\)"\)/);
  assert.match(siteCss, /\.mobile-home/);
  assert.match(siteCss, /\.mobile-people-stage/);
  assert.match(siteCss, /\.mobile-people-stage,\n\s*\.mobile-profile-detail\s*{[\s\S]*?width:\s*min\(calc\(100% - 24px\),\s*410px\)/);
  assert.match(siteCss, /\.mobile-profile-detail/);
  assert.match(siteCss, /\.mobile-swipe-deck/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-animating \.mobile-card-active/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-entering \.mobile-card-active/);
  assert.match(siteCss, /@keyframes mobileCardFadeIn/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-animating \.mobile-card-active\s*{[\s\S]*?opacity:\s*0/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-animating \.mobile-card-ghost[\s\S]*?opacity:\s*0/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-entering \.mobile-card-ghost[\s\S]*?opacity:\s*0/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-animating \.mobile-card-ghost[\s\S]*?visibility:\s*hidden/);
  assert.match(siteCss, /\.mobile-swipe-deck\.is-entering \.mobile-card-ghost[\s\S]*?visibility:\s*hidden/);
  assert.doesNotMatch(siteCss, /--swipe-fade-x/);
  assert.doesNotMatch(siteCss, /118vw/);
  assert.match(siteCss, /\.mobile-card-active\s*{[\s\S]*?inset:\s*0 clamp\(16px,\s*4vw,\s*22px\) 26px/);
  assert.match(siteCss, /\.mobile-card-ghost\.ghost-one/);
  assert.match(siteCss, /\.mobile-card-ghost\.ghost-one\s*{[\s\S]*?right:\s*auto/);
  assert.match(siteCss, /\.mobile-card-ghost\.ghost-two/);
  assert.match(siteCss, /\.mobile-card-ghost\.ghost-two\s*{[\s\S]*?right:\s*auto/);
  assert.match(siteCss, /\.mobile-card-ghost\.ghost-three/);
  assert.match(siteCss, /\.mobile-card-photo\s*{[\s\S]*object-fit:\s*contain/);
  const mobileFadeOutBlock = siteCss.match(/\.mobile-swipe-deck\.is-animating \.mobile-card-active\s*{[\s\S]*?\n  }/)?.[0] || "";
  const mobileFadeInBlock = siteCss.match(/@keyframes mobileCardFadeIn\s*{[\s\S]*?\n  }\n\n  \.mobile-person-main/)?.[0] || "";
  assert.doesNotMatch(mobileFadeOutBlock, /scale\(/);
  assert.doesNotMatch(mobileFadeInBlock, /scale\(/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.site-body\[data-view="home"\] \.hero,[\s\S]*\.site-body\[data-view="home"\] \.sec\s*{[\s\S]*display:\s*none/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.mobile-people-stage\s*{[\s\S]*display:\s*flex/);
  assert.doesNotMatch(siteJs, /class="mh-stats"/);
  assert.doesNotMatch(siteJs, /新人参赛选手/);
  assert.doesNotMatch(siteJs, /const topWork/);
  assert.doesNotMatch(siteJs, /data-mobile-card-nav/);
});

test("event copy consistently describes the hackathon as 36 hours", () => {
  const files = ["../src/site.js", "../src/screen.js", "../src/screen-data.js", "../src/screen.css", "../site.html"];
  const joined = files.map((file) => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");

  assert.match(joined, /36小时/);
  assert.doesNotMatch(joined, /三天|3天/);
  assert.doesNotMatch(joined, /DAY 1 下午|DAY 3 上午/);
});

test("mobile voting and judge scoring avoid heart cues and use manual score inputs", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const screenJs = fs.readFileSync(path.join(__dirname, "../src/screen.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(`${siteJs}\n${screenJs}`, /♥/);
  assert.doesNotMatch(siteJs, /type="range"/);
  assert.match(siteJs, /function updateJudgeScoreInput\(/);
  assert.match(siteCss, /\.judge-score-card/);
  assert.doesNotMatch(siteCss, /\.team-live-strip\b/);
  assert.match(siteCss, /\.mobile-tabbar\s*{[\s\S]*bottom:\s*0/);
});

test("judge scoring uses manual numeric input only", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const renderJudgeStart = siteJs.indexOf("function renderJudge()");
  const renderJudgeEnd = siteJs.indexOf("\n  function renderTracks", renderJudgeStart);
  const renderJudgeBody = renderJudgeStart >= 0 && renderJudgeEnd > renderJudgeStart
    ? siteJs.slice(renderJudgeStart, renderJudgeEnd)
    : "";

  assert.match(renderJudgeBody, /pageHead\("评委评分",[\s\S]*"EVALUATION"\)/);
  assert.doesNotMatch(renderJudgeBody, /pageHead\("评委评分",[\s\S]*"JUDGE"\)/);
  assert.match(siteJs, /function updateJudgeScoreInput\(/);
  assert.match(siteJs, /function persistJudgeScoreDraft\(/);
  assert.match(siteJs, /if \(markTouched\) persistJudgeScoreDraft\(input, value, touched && inRange\)/);
  assert.match(siteJs, /class="judge-score-control"/);
  assert.match(siteJs, /<em class="judge-score-title">\$\{esc\(d\.label\)\}<\/em><i class="judge-score-weight">占比 \$\{esc\(d\.weight\)\}%<\/i><b data-score-value/);
  assert.match(siteJs, /<em>\$\{esc\(projectName\)\}<\/em><small data-judge-row-status/);
  assert.doesNotMatch(siteJs, /type="range"/);
  assert.match(siteJs, /type="number"[^>]*data-score="\$\{t\.id\}:\$\{key\}"/);
  assert.doesNotMatch(siteJs, /data-score-input/);
  assert.match(siteJs, /inputmode="numeric"/);
  assert.doesNotMatch(siteJs, /<small><i><\/i><\/small>/);
  assert.match(siteJs, /querySelectorAll\("\[data-score\]"\)/);
  assert.match(siteJs, /const score = e\.target\.closest\("\[data-score\]"\)/);
  assert.match(siteCss, /\.judge-score-control\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(siteCss, /\.judge-score-top\s*\{[\s\S]*grid-template-columns:\s*max-content minmax\(54px,\s*1fr\) max-content/);
  assert.match(siteCss, /\.judge-score-title\s*\{[\s\S]*justify-self:\s*start[\s\S]*white-space:\s*nowrap/);
  assert.match(siteCss, /\.judge-score-top i\s*\{[\s\S]*font-size:\s*11px/);
  assert.match(siteCss, /\.judge-score-top i\s*\{[\s\S]*justify-self:\s*center/);
  assert.match(siteCss, /\.judge-score-top i\s*\{[\s\S]*white-space:\s*nowrap/);
  assert.match(siteCss, /\.judge-score-top b\s*\{[\s\S]*font-size:\s*12px/);
  assert.match(siteCss, /\.judge-score-number\s*\{/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.judge-input-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.judge-score-control\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(siteCss, /judge-score\[type="range"\]/);
});

test("judge scoring work summary keeps the browse action fixed and mobile-safe", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const judgeTeamCss = siteCss.slice(
    siteCss.indexOf(".judge-team {"),
    siteCss.indexOf(".judge-input-grid"),
  );
  const mobileCss = siteCss.slice(
    siteCss.indexOf("@media (max-width: 680px)"),
    siteCss.indexOf("@media (min-width: 560px) and (max-width: 680px)"),
  );

  assert.match(siteJs, /const canBrowseWork = canViewWorkTeam\(t\)/);
  assert.match(siteJs, /permissions\.canScore && Boolean\(team\?\.work\)/);
  assert.match(siteJs, /<button class="judge-team\$\{canBrowseWork \? "" : " is-unavailable"\}" type="button"/);
  assert.match(siteJs, /data-work="\$\{esc\(t\.id\)\}"/);
  assert.match(siteJs, /data-work-return="judge"/);
  assert.match(siteJs, /浏览\$\{esc\(t\.name\)\}作品展示页面/);
  assert.match(siteJs, /disabled aria-label="\$\{esc\(t\.name\)\}作品暂未发布"/);
  assert.match(siteJs, /'<span class="judge-team-browse" aria-hidden="true">浏览作品<\/span>'/);
  assert.doesNotMatch(siteJs, /judge-team-hover/);
  assert.match(siteJs, /function renderWork\(id,\s*returnView\)/);
  assert.match(siteJs, /const safeReturnView = returnView === "judge" \? "judge" : "gallery"/);
  assert.match(siteJs, /const backLabel = safeReturnView === "judge" \? "返回评委评分" : "返回作品展厅"/);
  assert.match(siteJs, /<a class="wk-back" data-nav="\$\{safeReturnView\}">‹ \$\{backLabel\}<\/a>/);
  assert.match(siteJs, /function showWork\(id,\s*push,\s*returnView\)/);
  assert.match(siteJs, /setActive\(safeReturnView \|\| "gallery"\)/);
  assert.match(siteJs, /showWork\(work\.dataset\.work,\s*true,\s*work\.dataset\.workReturn \|\| ""\)/);

  assert.match(siteCss, /\.judge-team\s*\{[\s\S]*cursor:\s*pointer/);
  assert.match(siteCss, /\.judge-team:not\(\.is-unavailable\):hover,[\s\S]*\.judge-team:not\(\.is-unavailable\):focus-visible\s*\{/);
  assert.match(siteCss, /\.judge-team-browse\s*\{[\s\S]*opacity:\s*1/);
  assert.match(siteCss, /\.judge-team-browse\s*\{[\s\S]*transform:\s*none/);
  assert.doesNotMatch(siteCss, /\.judge-team:not\(\.is-unavailable\):hover \.judge-team-browse/);
  assert.match(siteCss, /\.judge-team\.is-unavailable\s*\{[\s\S]*cursor:\s*default/);
  assert.match(judgeTeamCss, /\.judge-team\s*\{[\s\S]*padding:\s*10px 0/);
  assert.match(judgeTeamCss, /\.judge-team::before\s*\{[\s\S]*height:\s*1px/);
  assert.match(judgeTeamCss, /\.judge-team-browse\s*\{[\s\S]*min-height:\s*23px/);
  assert.match(judgeTeamCss, /\.judge-team-browse\s*\{[\s\S]*font-size:\s*11px/);
  assert.doesNotMatch(judgeTeamCss, /padding:\s*10px 74px 10px 0/);
  assert.doesNotMatch(judgeTeamCss, /box-shadow:\s*inset 0 0 0 1px/);
  assert.match(mobileCss, /\.judge-row\s*\{[\s\S]*gap:\s*14px[\s\S]*padding:\s*16px/);
  assert.match(mobileCss, /\.judge-team\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)[\s\S]*min-height:\s*0/);
  assert.match(mobileCss, /\.judge-team-browse\s*\{[\s\S]*position:\s*static[\s\S]*opacity:\s*1[\s\S]*transform:\s*none/);
});

test("judge work detail returns to the previous scoring scroll position", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const RETURN_SCROLL_PREFIX = "joincare_return_scroll_"/);
  assert.match(siteJs, /function rememberReturnScroll\(viewKey\)/);
  assert.match(siteJs, /function restoreReturnScroll\(viewKey\)/);
  assert.match(siteJs, /rememberReturnScroll\(safeReturnView\)/);
  assert.match(siteJs, /if \(v\.key === "judge"\) \{[\s\S]*?setupJudgePage\(\);[\s\S]*?restoreReturnScroll\("judge"\);[\s\S]*?\}/);
  assert.match(siteJs, /root\.sessionStorage\.removeItem\(key\)/);
});

test("judge polling signature ignores volatile vote timestamps", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const judgeSignature = siteJs.match(/function createJudgeViewSignature\(state = SITE_STATE\) \{([\s\S]*?)\n  function createVisibleSiteStateSignature/)?.[1] || "";

  assert.match(siteJs, /function createJudgeViewSignature\(state = SITE_STATE\)/);
  assert.match(siteJs, /if \(currentViewKey === "judge"\) \{\s*return createJudgeViewSignature\(state\);\s*\}/);
  assert.match(judgeSignature, /view:\s*"judge"/);
  assert.match(judgeSignature, /publishedTeams/);
  assert.doesNotMatch(judgeSignature, /updatedAt/);
});

test("judge formal submit uses the shared confirm dialog and preserves backend errors", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /async function submitJudgeScores\(confirmed = false\)/);
  assert.match(siteJs, /showConfirmDialog\(\{[\s\S]*title:\s*"正式提交评分"[\s\S]*onConfirm:\s*\(\) => submitJudgeScores\(true\)[\s\S]*\}\);/);
  assert.doesNotMatch(siteJs, /root\.confirm\(/);
  assert.match(siteJs, /const errorPayload = await response\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(siteJs, /error\.payload = errorPayload/);
  assert.match(siteJs, /function getJudgeSubmitErrorMessage\(error\)/);
  assert.match(siteJs, /already been submitted/);
  assert.match(siteJs, /is missing judge score dimensions/);
  assert.match(siteJs, /between 0 and 100/);
  assert.match(siteJs, /评分已提交，不能重复提交/);
  assert.match(siteJs, /评分必须在 0-100 之间/);
});

test("judge scoring keeps out-of-range values explicit instead of silently clamping them", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /hasOutOfRange/);
  assert.doesNotMatch(siteJs, /Math\.max\(0,\s*Math\.min\(100,\s*\+input\.value/);
  assert.doesNotMatch(siteJs, /Math\.max\(0,\s*Math\.min\(100,\s*Math\.round\(numericValue\)\)/);
});

test("judge scoring page only renders published work teams", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const renderJudgeStart = siteJs.indexOf("function renderJudge()");
  const renderJudgeEnd = siteJs.indexOf("\n  /* ---- 赛道", renderJudgeStart);
  const renderJudgeBody = siteJs.slice(renderJudgeStart, renderJudgeEnd);

  assert.match(renderJudgeBody, /const scoreTeams = D\.teams\.filter\(isPublishedWorkTeam\)/);
  assert.match(renderJudgeBody, /const rows = scoreTeams\.map\(\(t\) =>/);
  assert.doesNotMatch(renderJudgeBody, /const rows = D\.teams\.map/);
});

test("judge scoring desktop header and score cards share the same five-column grid", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /<div class="judge-head"><span class="judge-head-spacer" aria-hidden="true"><\/span><div class="judge-head-grid">\$\{head\}<\/div><\/div>/);
  assert.match(siteCss, /\.judge-board\s*{[\s\S]*--judge-team-col:\s*minmax\(240px,\s*310px\)/);
  assert.match(siteCss, /\.judge-head\s*{[\s\S]*grid-template-columns:\s*var\(--judge-team-col\) minmax\(0,\s*1fr\)/);
  assert.match(siteCss, /\.judge-row\s*{[\s\S]*grid-template-columns:\s*var\(--judge-team-col\) minmax\(0,\s*1fr\)/);
  assert.match(siteCss, /\.judge-head-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(siteCss, /\.judge-input-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.doesNotMatch(siteCss, /@media \(max-width:\s*1560px\) and \(min-width:\s*681px\)[\s\S]*?\.judge-input-grid\s*\{[\s\S]*?repeat\(3/);
  assert.doesNotMatch(siteCss, /@media \(max-width:\s*1180px\) and \(min-width:\s*681px\)[\s\S]*?\.judge-input-grid\s*\{[\s\S]*?repeat\(2/);
});

test("site removes low-value team capacity and work delivery buttons", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.doesNotMatch(siteJs, /赛道容量/);
  assert.doesNotMatch(siteJs, /track-mini-grid/);
  assert.doesNotMatch(siteJs, /GitLab 仓库/);
  assert.doesNotMatch(siteJs, /演示视频/);
  assert.doesNotMatch(siteJs, /wk-sublinks/);
});

test("role authorization is completed at entry and protects sensitive actions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const ROLE_KEY = "joincare_hackathon_role"/);
  assert.match(siteJs, /function currentRole\(/);
  assert.match(siteJs, /function isAuthenticatedSession\(/);
  assert.match(siteJs, /function enforceEntryAuth\(/);
  assert.match(siteJs, /function hydrateRole\(/);
  assert.match(siteJs, /function requireAuth\(/);
  assert.match(siteJs, /function requireRole\(/);
  assert.match(siteJs, /function showAuthGate\(/);
  assert.match(siteJs, /wantsAuthChooser\(\)/);
  assert.doesNotMatch(siteJs, /root\.localStorage\.setItem\(ROLE_KEY, "public"\)/);
  assert.match(siteJs, /\/api\/auth\/feishu\/login/);
  assert.match(siteJs, /\/api\/me/);
  assert.match(siteJs, /data-auth-feishu/);
  assert.doesNotMatch(siteJs, /data-auth-role/);
  assert.match(siteJs, /if \(!requireRole\("vote", \(p\) => p\.canVote/);
  assert.match(siteJs, /if \(!requireRole\("team", \(p\) => p\.canJoinTeam/);
  assert.match(siteJs, /if \(!requireRole\("judge", \(p\) => p\.canScore/);
  assert.match(siteJs, /enforceEntryAuth\(\)/);
  assert.doesNotMatch(siteJs, /if \(!currentRole\(\)\) showAuthGate\("entry"\)/);
});

test("official site forces Feishu login on desktop and mobile entry", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");

  assert.match(siteJs, /showAuthGate\(target,\s*\{\s*force:\s*true\s*\}\)/);
  assert.match(siteJs, /showAuthGate\(root\.location\.hash\.slice\(1\) \|\| "home",\s*\{\s*force:\s*true\s*\}\)/);
  assert.match(siteJs, /gate\.dataset\.forced = forced \? "true" : "false"/);
  assert.match(siteJs, /gate\.classList\.toggle\("is-forced", forced\)/);
  assert.match(siteJs, /if \(gate && gate\.dataset\.forced === "true" && !force\) return/);
  assert.match(siteJs, /const authClose = e\.target\.closest\("\[data-auth-close\]"\)/);
  assert.match(siteJs, /closeAuthGate\(\{ force: true \}\)/);
  assert.match(siteCss, /\.auth-gate\.is-forced/);
  assert.match(siteCss, /\.auth-required-note/);
  assert.match(html, /src\/site\.css\?v=20260703-auth-role-selection/);
  assert.match(html, /src\/site\.js\?v=20260703-auth-role-selection/);
});

test("official site refreshes backend session before leaving the Feishu login gate", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const finalizeStart = siteJs.indexOf("async function finalizeLogin(");
  const finalizeEnd = siteJs.indexOf("\n  // 发起飞书登录", finalizeStart);
  const finalizeBody = siteJs.slice(finalizeStart, finalizeEnd);

  assert.ok(finalizeStart > 0, "finalizeLogin should be async so callers can wait for backend session refresh");
  assert.match(finalizeBody, /await loadSiteState\(\);/);
  assert.match(finalizeBody, /await loadSiteState\(\);[\s\S]*closeAuthGate\(\{ force: true \}\);[\s\S]*go\(target\);/);
  assert.match(siteJs, /await finalizeLogin\(res\.role,\s*res,\s*res\.redirectPath\)/);
});

test("official site shows role picker instead of Feishu gate for pending role sessions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const enforceStart = siteJs.indexOf("function enforceEntryAuth()");
  const enforceEnd = siteJs.indexOf("\n  function requireAuth", enforceStart);
  const enforceBody = siteJs.slice(enforceStart, enforceEnd);

  assert.match(siteJs, /function needsBackendRoleSelection\(/);
  assert.match(enforceBody, /if \(needsBackendRoleSelection\(\)\) \{[\s\S]*showRolePicker\(SITE_STATE\.me\.roles \|\| \[\]\);[\s\S]*return false;[\s\S]*\}/);
  assert.doesNotMatch(enforceBody, /needsBackendRoleSelection\(\)[\s\S]*showAuthGate/);
});

test("mobile official site keeps a visible account entry for logout", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(siteCss, /\.nav-login,\s*\.nav-phase\s*\{\s*display:\s*none;\s*\}/);
  assert.doesNotMatch(siteCss, /\.nav-links,\s*\.nav-links\.open,\s*\.nav-actions,\s*\.nav-burger\s*\{\s*display:\s*none\s*!important;\s*\}/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.nav-actions\s*\{[\s\S]*display:\s*flex/s);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.nav-login\s*\{[\s\S]*display:\s*inline-flex/s);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.nav-user-menu\s*\{/s);
});

test("mobile result route does not fall back to the gallery tab highlight", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const setActiveStart = siteJs.indexOf("function setActive(key)");
  const setActiveEnd = siteJs.indexOf("\n  function go(key, push)", setActiveStart);
  const setActiveBody = siteJs.slice(setActiveStart, setActiveEnd);

  assert.match(setActiveBody, /key === "vote" \? "gallery" : ""/);
  assert.doesNotMatch(setActiveBody, /key === "vote" \|\| key === "result" \? "gallery"/);
});

test("official site cache keys are bumped after navigation and detail layout polish", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");

  assert.match(html, /styles\.css\?v=20260624-home-polish/);
  assert.match(html, /src\/site\.css\?v=20260703-auth-role-selection/);
  assert.match(html, /src\/logic\.js\?v=20260703-judge-no-quick/);
  assert.match(html, /src\/data\.js\?v=20260630-prestart-separate-timer/);
  assert.match(html, /src\/screen-data\.js\?v=20260703-slogan-copy/);
  assert.match(html, /src\/site\.js\?v=20260703-auth-role-selection/);
});

test("terminal boot welcome stage is wired into the HTML", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(html, /<section class="welcome-stage" id="welcomeStage"/);
  assert.match(html, /id="welcomeRain"/);
  assert.match(html, /class="welcome-ready-panel"/);
  assert.match(html, /class="welcome-ready-button" id="welcomeEnterButton"/);
  assert.match(html, /ARE YOU READY\?/);
  assert.match(html, /aria-label="进入任务"/);
  assert.doesNotMatch(html, /welcome-signal-field/);
  assert.doesNotMatch(html, /MISSION BRIEF/);
  assert.doesNotMatch(html, /AI_INNOVATION_HACKATHON_2026/);
  assert.doesNotMatch(html, /2026\/\/IN PROGRESS/);
  assert.doesNotMatch(html, /STATUS:\/\/KICKOFF/);
  assert.doesNotMatch(html, /欢迎来到AI创新黑客松 2026/);
  assert.doesNotMatch(html, /借助AI，让创意真正落地。/);
  assert.doesNotMatch(html, /MISSION START NOW/);
  assert.doesNotMatch(html, /BOOTING HACKATHON_PROTOCOL_2026/);
  assert.doesNotMatch(html, /Welcome to AI innovation hackathon/);
  assert.doesNotMatch(html, /任务现在开始 \/ 进入未来伙伴档案/);
});

test("terminal boot welcome stage uses the ready screen composition", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const stageBlock = css.match(/^\.welcome-stage\s*{[\s\S]*?\n}/m)?.[0] || "";
  const rainBlock = css.match(/\.welcome-rain\s*{[\s\S]*?\n}/)?.[0] || "";
  const panelBlock = css.match(/\.welcome-ready-panel\s*{[\s\S]*?\n}/)?.[0] || "";
  const buttonBlock = css.match(/\.welcome-ready-button\s*{[\s\S]*?\n}/)?.[0] || "";
  const buttonBeforeBlock = css.match(/\.welcome-ready-button::before\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(stageBlock, /place-items:\s*center/);
  assert.match(stageBlock, /linear-gradient\(180deg,\s*rgba\(2,\s*8,\s*14,\s*0\.08\),\s*rgba\(2,\s*8,\s*14,\s*0\.88\)\)/);
  assert.match(stageBlock, /var\(--void\)/);
  assert.match(rainBlock, /opacity:\s*0\.58/);
  assert.match(panelBlock, /display:\s*grid/);
  assert.match(panelBlock, /place-items:\s*center/);
  assert.match(panelBlock, /width:\s*min\(1080px,\s*calc\(100vw - clamp\(32px,\s*8vw,\s*180px\)\)\)/);
  assert.match(buttonBlock, /color:\s*var\(--text\)/);
  assert.match(buttonBlock, /font-family:\s*var\(--display\)/);
  assert.match(buttonBlock, /font-size:\s*clamp\(54px,\s*7\.4vw,\s*128px\)/);
  assert.match(buttonBlock, /font-style:\s*italic/);
  assert.match(buttonBlock, /letter-spacing:\s*0\.06em/);
  assert.match(buttonBlock, /border:\s*0/);
  assert.match(buttonBlock, /background:\s*transparent/);
  assert.match(buttonBlock, /transform:\s*skewX\(-8deg\)/);
  assert.match(buttonBeforeBlock, /content:\s*attr\(data-text\)/);
  assert.match(buttonBlock, /rgba\(40,\s*255,\s*200,\s*0\.5\)/);
  assert.match(buttonBeforeBlock, /color:\s*rgba\(40,\s*255,\s*200,\s*0\.24\)/);
  assert.match(buttonBeforeBlock, /rgba\(40,\s*255,\s*200,\s*0\.36\)/);
  assert.doesNotMatch(`${stageBlock}\n${rainBlock}\n${buttonBlock}\n${buttonBeforeBlock}`, /167,\s*255,\s*79|#a7ff4f/i);
  assert.doesNotMatch(css, /\.welcome-terminal\s*{/);
  assert.doesNotMatch(css, /\.welcome-terminal-body\s*{/);
  assert.doesNotMatch(css, /\.welcome-enter-button\s*{/);
  assert.doesNotMatch(css, /\.welcome-signal-field\s*{/);
});

test("admin console keeps the event control cockpit structure wired", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");
  const flowView = html.match(/<div class="admin-grid admin-view-panel is-active" data-admin-view-panel="flow"[\s\S]*?<section class="admin-view-panel admin-management-view" data-admin-view-panel="screen"/)?.[0] || "";

  assert.match(html, /<aside class="admin-sidebar"/);
  assert.match(flowView, /class="admin-flow-column admin-flow-column-primary"[\s\S]*class="panel flow-panel"[\s\S]*class="panel timing-panel"/);
  assert.match(flowView, /class="admin-flow-column admin-flow-column-secondary"[\s\S]*class="panel preview-panel"[\s\S]*class="panel guard-panel"/);
  assert.doesNotMatch(flowView, /id="adminDataPanel"/);
  assert.doesNotMatch(flowView, /class="panel log-panel"/);
  assert.match(flowView, /流程控制台/);
  assert.match(flowView, /大屏预览/);
  assert.match(flowView, /安全确认/);
  assert.match(css, /--neon:\s*#28ffc8/);
  assert.match(css, /\.admin-grid\s*{[\s\S]*grid-template-columns:\s*minmax\(460px,\s*0\.96fr\) minmax\(520px,\s*1\.04fr\)/);
  assert.match(css, /\.admin-flow-column\s*{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/);
  assert.match(css, /\.admin-flow-column-primary\s*{[\s\S]*grid-column:\s*1/);
  assert.match(css, /\.admin-flow-column-secondary\s*{[\s\S]*grid-column:\s*2/);
  assert.doesNotMatch(css, /\.flow-panel\s*{[\s\S]*grid-row:\s*1 \/ 4/);
  assert.match(css, /\.admin-nav button\.is-active/);
  assert.match(flowView, /id="resetFlowToStart"[^>]*>回到最开始<\/button>/);
  assert.match(html, /id="prestartFlowModal"/);
  assert.match(html, /id="prestartStartAt"[^>]*type="datetime-local"/);
  assert.match(html, /首页状态卡会显示“大赛筹备中”/);
  assert.match(flowView, />任务倒计时</);
  assert.match(flowView, /这里控制任务\/作品倒计时/);
  assert.match(css, /\.quick-switch\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(js, /id:\s*"prestart"/);
  assert.match(js, /name:\s*"组队开启"/);
  assert.match(js, /async function resetFlowToStart\(\)/);
  assert.match(js, /function openPrestartFlowModal\(\)/);
  assert.match(js, /function hoistPrestartFlowModal\(\)[\s\S]*document\.body\.appendChild\(prestartFlowModal\)/);
  assert.match(js, /async function initAdmin\(\) \{[\s\S]*hoistPrestartFlowModal\(\)/);
  const resetFlowStart = js.indexOf("async function resetFlowToStart()");
  const resetFlowEnd = js.indexOf("\nfunction durationMsToTotalMinutes", resetFlowStart);
  const resetFlowBody = js.slice(resetFlowStart, resetFlowEnd);
  assert.doesNotMatch(resetFlowBody, /openPrestartFlowModal/);
  assert.match(js, /async function publishPrestartFlowWithTarget\(targetDate\)/);
  const prestartPublishStart = js.indexOf("async function publishPrestartFlowWithTarget(targetDate)");
  const prestartPublishEnd = js.indexOf("\nasync function toggleScreenOverride", prestartPublishStart);
  const prestartPublishBody = js.slice(prestartPublishStart, prestartPublishEnd);
  assert.match(prestartPublishBody, /durationMs = targetDate\.getTime\(\) - startedAt\.getTime\(\)/);
  assert.match(prestartPublishBody, /updateAdminPrestartCountdown\(\{[\s\S]*durationMs,[\s\S]*startedAt:\s*startedAt\.toISOString\(\)/);
  assert.doesNotMatch(prestartPublishBody, /updateAdminMissionCountdown/);
  assert.match(js, /await publishScreenFlowStage\("prestart",\s*\{\s*throwOnError:\s*true\s*\}\)/);
  assert.match(js, /if \(cleanStageId === "prestart" && openPrestartFlowModal\(\)\) \{/);
  assert.match(js, /data-stage-command/);
});

test("admin console exposes backend data operations for teams, votes, works, and scores", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /data-admin-view-panel="data"/);
  assert.match(html, /id="adminVoteRankingFull"/);
  assert.match(html, /id="adminWorkReviewList"/);
  assert.match(html, /id="adminVoteWindowManager"/);
  assert.match(css, /\.data-panel/);
  assert.match(css, /\.admin-metric-grid/);
  assert.match(dataJs, /function loadWorks/);
  assert.match(dataJs, /function loadAdminWorks/);
  assert.match(dataJs, /function loadJudgeScores/);
  assert.match(dataJs, /function loadAuditLogs/);
  assert.match(adminJs, /function loadBusinessData/);
  assert.match(adminJs, /window\.AppData\.loadVoteResults/);
  assert.match(adminJs, /window\.AppData\.loadAdminWorks/);
  assert.match(adminJs, /window\.AppData\.loadJudgeScores/);
  assert.match(adminJs, /function updateWorkReviewStatus/);
  assert.match(adminJs, /data-work-status/);
  assert.match(adminJs, /window\.AppData\.updateAdminWorkStatus/);
  assert.match(adminJs, /async function updateWorkReviewStatus\(teamId, status, button\)/);
  assert.match(adminJs, /setText\(adminWorkWorkspaceStatus, `正在\$\{actionText\}作品/);
  assert.match(adminJs, /formatErrorStatus\("作品审核失败", error\)/);
  assert.match(adminJs, /finally\s*\{[\s\S]*button\.disabled = false/);
  assert.match(css, /\.admin-work-actions/);
});

test("admin work review cards expose full submitted work content", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /function renderWorkSubmissionLinks/);
  assert.match(adminJs, /function renderWorkScreenshots/);
  assert.match(adminJs, /work\.demoUrl/);
  assert.match(adminJs, /work\.codeUrl/);
  assert.match(adminJs, /work\.docUrl/);
  assert.match(adminJs, /work\.screenshots/);
  assert.match(adminJs, /class="admin-work-review-media"/);
  assert.match(adminJs, /class="admin-work-review-links"/);
  assert.match(adminJs, /class="admin-work-review-meta"/);
  assert.match(css, /\.admin-work-review-media/);
  assert.match(css, /\.admin-work-review-links/);
  assert.match(css, /\.admin-work-review-meta/);
});

test("admin work review uses a paged single-work carousel", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /let adminWorkReviewIndex = 0/);
  assert.match(adminJs, /function renderWorkReviewPager/);
  assert.match(adminJs, /class="admin-work-review-carousel"/);
  assert.match(adminJs, /data-work-review-prev/);
  assert.match(adminJs, /data-work-review-next/);
  assert.doesNotMatch(adminJs, /normalizedWorks\.map\(renderWorkReviewCard\)\.join\(""\)/);
  assert.match(css, /\.admin-work-review-carousel/);
  assert.match(css, /\.admin-work-review-nav/);
});

test("admin content manager links to runtime backend data APIs", () => {
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /apiRoute:\s*"\/api\/teams"/);
  assert.match(adminJs, /apiRoute:\s*"\/api\/vote-results"/);
  assert.match(adminJs, /apiRoute:\s*"\/api\/admin\/works"/);
  assert.match(adminJs, /apiRoute:\s*"\/api\/judge\/scores"/);
  assert.match(adminJs, /apiRoute:\s*"\/api\/admin\/audit-logs"/);
  assert.match(adminJs, /const href = resolveAdminRouteHref\(item\.apiRoute \|\| item\.route\)/);
  assert.match(adminJs, /href="\$\{escapeHtml\(href\)\}"/);
});

test("admin content data links use a compact operational list", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /class="[^"]*\bpanel\b[^"]*\badmin-wide-panel\b[^"]*\badmin-content-data-panel\b[^"]*"/);
  assert.match(css, /\.admin-content-route-grid\s*{[\s\S]*gap:\s*12px/);
  assert.match(css, /\.admin-content-route-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(280px,\s*100%\),\s*1fr\)\)/);
  assert.match(css, /\.admin-content-data-card\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto 64px/);
  assert.match(css, /\.admin-content-data-card\s*{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.admin-content-data-card\s*{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.admin-content-data-route/);
  assert.match(css, /\.admin-content-data-count/);
  assert.match(css, /\.admin-content-data-action\s*{[\s\S]*justify-self:\s*end/);
  assert.match(css, /\.admin-content-data-action\s*{[\s\S]*width:\s*64px/);
  assert.match(css, /\.admin-content-data-action\s*{[\s\S]*box-sizing:\s*border-box/);
  assert.match(adminJs, /class="admin-content-data-card"/);
  assert.match(adminJs, /class="admin-content-data-route"/);
  assert.match(adminJs, /class="admin-content-data-count"/);
  assert.match(adminJs, /class="admin-content-data-action"/);
});

test("admin content manager switches editing panels through an embedded subnav", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /class="admin-content-subnav"/);
  assert.match(html, /data-content-tab="scenario"[^>]*aria-pressed="true"[\s\S]*业务场景大屏内容/);
  assert.match(html, /data-content-tab="profiles"[\s\S]*星锐档案/);
  assert.match(html, /data-content-tab="links"[\s\S]*内容数据入口/);
  assert.match(html, /data-content-panel="scenario"/);
  assert.match(html, /data-content-panel="profiles"/);
  assert.match(html, /data-content-panel="links"/);
  assert.match(css, /\.admin-management-view\[data-admin-view-panel="content"\]\s*{[\s\S]*grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-content-subnav\s*{[\s\S]*display:\s*flex/);
  assert.match(css, /\.admin-content-subnav button\.is-active/);
  assert.match(css, /\.admin-content-layout\s*{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-content-layout\s*{[\s\S]*justify-items:\s*stretch/);
  assert.match(css, /\.admin-content-layout\s*{[\s\S]*width:\s*100%/);
  assert.match(css, /\.admin-content-section\s*{[\s\S]*display:\s*none/);
  assert.match(css, /\.admin-content-section\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.admin-content-section\s*{[\s\S]*grid-row:\s*1 \/ -1/);
  assert.match(css, /\.admin-content-section\s*{[\s\S]*width:\s*100%/);
  assert.match(css, /\.admin-content-section\.is-active\s*{[\s\S]*display:\s*flex/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*align-content:\s*start/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*gap:\s*12px/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*padding:\s*14px/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*scrollbar-gutter:\s*stable/);
  assert.match(css, /\.admin-business-scenario-form\s*{[\s\S]*overflow:\s*auto/);
  assert.doesNotMatch(css, /\.admin-business-scenario-form label:nth-child\(2\)\s*{[\s\S]*grid-column:\s*span 3/);
  assert.match(css, /\.admin-business-scenario-form label\s*{[\s\S]*line-height:\s*1\.35/);
  assert.match(css, /\.admin-business-scenario-field-wide\s*{[\s\S]*grid-column:\s*auto/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*min-height:\s*88px/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*line-height:\s*1\.45/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*height:\s*104px/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*max-height:\s*104px/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*resize:\s*none/);
  assert.match(css, /\.admin-business-scenario-form textarea\s*{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.admin-business-scenario-actions\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /@media \(max-width:\s*1280px\)[\s\S]*\.admin-business-scenario-field-wide\s*{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(css, /\.admin-trainee-profile-form,\n\.admin-trainee-profile-list\s*{[\s\S]*height:\s*100%/);
  assert.match(css, /\.admin-content-route-grid\s*{[\s\S]*overflow:\s*auto/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.admin-content-subnav\s*{[\s\S]*overflow-x:\s*auto/);
  assert.match(adminJs, /const adminContentTabs/);
  assert.match(adminJs, /const adminContentPanels/);
  assert.match(adminJs, /function switchAdminContentPanel/);
  assert.match(adminJs, /event\.target\.closest\("\[data-content-tab\]"\)/);
});

test("admin console uses a professional operations layout system", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /class="admin-main-scroll"/);
  assert.match(css, /--panel:\s*rgba\(5,\s*18,\s*22,\s*0\.82\)/);
  assert.match(css, /--panel-solid:\s*#061419/);
  assert.match(css, /--line:\s*rgba\(103,\s*255,\s*213,\s*0\.48\)/);
  assert.match(css, /\.admin-rain\s*{[\s\S]*opacity:\s*0\.22/);
  assert.match(css, /\.admin-workspace\s*{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-main-scroll\s*{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.admin-main-scroll\s*{[\s\S]*display:\s*grid/);
  assert.match(css, /\.admin-view-panel\.is-active\s*{[\s\S]*display:\s*grid/);
  assert.match(css, /\.admin-view-panel\s*{[\s\S]*min-height:\s*0/);
  assert.match(css, /\.management-split\s*{[\s\S]*grid-template-columns:\s*minmax\(320px,\s*0\.9fr\) minmax\(420px,\s*1\.1fr\)/);
  assert.match(css, /\.management-heading\s*{[\s\S]*border:\s*1px solid rgba\(103,\s*255,\s*213,\s*0\.16\)/);
  assert.match(css, /\.panel\s*{[\s\S]*box-shadow:[\s\S]*0 24px 70px rgba\(0,\s*0,\s*0,\s*0\.34\)/);
  assert.match(css, /\.panel\s*{[\s\S]*backdrop-filter:\s*blur\(24px\) saturate\(160%\)/);
  assert.match(adminJs, /class="admin-screen-route-table"/);
  assert.match(adminJs, /class="admin-work-review-table"/);
  assert.match(adminJs, /class="admin-audit-table"/);
});

test("admin console navigation switches dedicated management views", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /data-admin-nav="flow"/);
  assert.match(html, /data-admin-nav="data"/);
  assert.match(html, /data-admin-nav="teams"/);
  assert.match(html, /data-admin-nav="logs"/);
  assert.match(html, /data-admin-view-panel="flow"/);
  assert.match(html, /data-admin-view-panel="data"/);
  assert.match(html, /id="adminTeamRoster"/);
  assert.match(html, /id="adminAuditLogList"/);
  assert.match(css, /\.admin-view-panel/);
  assert.match(css, /\.admin-view-panel\.is-active/);
  assert.match(css, /\.admin-team-roster/);
  assert.match(css, /\.admin-audit-list/);
  assert.match(adminJs, /function switchAdminView/);
  assert.match(adminJs, /data-admin-nav/);
  assert.match(adminJs, /function getInitialAdminView\(\)/);
  assert.match(adminJs, /window\.location\.hash/);
  assert.match(adminJs, /switchAdminView\(getInitialAdminView\(\)\)/);
  assert.match(adminJs, /function renderTeamRoster/);
  assert.match(adminJs, /function renderAuditLogList/);
});

test("admin team roster surfaces capacity and role coverage for grouping decisions", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /const DEFAULT_TEAM_CAPACITY/);
  assert.match(adminJs, /function getTeamCapacity/);
  assert.match(adminJs, /function getTeamRoleCoverage/);
  assert.match(adminJs, /admin-team-capacity/);
  assert.match(adminJs, /admin-team-role-coverage/);
  assert.match(adminJs, /空位/);
  assert.match(adminJs, /roleKey/);
  assert.match(css, /\.admin-team-capacity/);
  assert.match(css, /\.admin-team-capacity-meter/);
  assert.match(css, /\.admin-team-role-coverage/);
});

test("admin team roster shows the leader inside the five-person team lineup", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(adminJs, /function getTeamRosterPeople\(team = \{\}, members = \[\]\)/);
  assert.match(adminJs, /function hasConfiguredTeamAdvisor\(advisor = \{\}\)/);
  assert.match(adminJs, /function isConfiguredTeamRosterPerson\(person = \{\}\)/);
  assert.match(adminJs, /const teamPeople = getTeamRosterPeople\(team, members\)/);
  assert.match(adminJs, /const configuredPeople = teamPeople\.filter\(isConfiguredTeamRosterPerson\)/);
  assert.match(adminJs, /const teamCapacity = getTeamCapacity\(team\)/);
  assert.match(adminJs, /队伍人数/);
  assert.match(adminJs, /configuredPeople\.length\}\/\$\{teamCapacity/);
  assert.match(adminJs, /admin-team-member \$\{person\.isLeader \? "is-leader" : ""\}\$\{person\.isPlaceholder \? " is-placeholder" : ""\}/);
  assert.match(adminJs, /admin-team-member-badge/);
  assert.match(adminJs, /person\.isPlaceholder\s*\?\s*""\s*:\s*`<button class="admin-team-member-remove"/);
  assert.match(adminJs, /data-member-role-key/);
  assert.doesNotMatch(adminJs, /<p class="admin-team-advisor">/);
  assert.doesNotMatch(adminJs, /admin-team-member-lock/);
  assert.match(css, /\.admin-team-member\.is-leader/);
  assert.match(css, /\.admin-team-member\.is-placeholder/);
  assert.match(css, /\.admin-team-member-badge/);
  assert.doesNotMatch(css, /\.admin-team-member-lock/);
  assert.match(css, /repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\)/);
});

test("admin team roster manages members through backend admin APIs", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminTeamMemberManager"/);
  assert.match(html, /id="adminTeamMemberForm"/);
  assert.match(html, /id="adminTeamMemberTeamId"/);
  assert.match(html, /id="adminTeamMemberUserId"/);
  assert.match(html, /id="adminTeamMemberName"/);
  assert.match(html, /id="adminTeamMemberDepartment"/);
  assert.match(html, /id="adminTeamMemberRoleKey"/);
  assert.match(html, /id="adminTeamMemberDuty"/);
  assert.match(css, /\.admin-team-member-manager/);
  assert.match(css, /\.admin-team-member-form/);
  assert.match(css, /\.admin-team-member-actions/);
  assert.match(dataJs, /function addAdminTeamMember/);
  assert.match(dataJs, /function removeAdminTeamMember/);
  assert.match(adminJs, /const adminTeamMemberForm/);
  assert.match(adminJs, /function saveAdminTeamMember/);
  assert.match(adminJs, /function removeAdminTeamMember/);
  assert.match(adminJs, /window\.AppData\.addAdminTeamMember/);
  assert.match(adminJs, /window\.AppData\.removeAdminTeamMember/);
  assert.match(adminJs, /data-add-team-member/);
  assert.match(adminJs, /data-remove-team-member/);
  assert.match(adminJs, /button\.isConnected/);
});

test("admin team member maintenance uses user and role selectors", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminTeamMemberUserSelect"/);
  assert.match(html, /data-team-member-user-select/);
  assert.match(html, /手动填写新成员/);
  assert.match(html, /placeholder="留空自动生成/);
  assert.match(html, /<select id="adminTeamMemberRoleKey"/);
  assert.match(html, /value="advisor">队长/);
  assert.match(css, /\.admin-team-member-select-row/);
  assert.match(adminJs, /const adminTeamMemberUserSelect/);
  assert.match(adminJs, /function renderTeamMemberUserOptions/);
  assert.match(adminJs, /function createManualTeamMemberUserId/);
  assert.match(adminJs, /function enterManualTeamMemberMode/);
  assert.match(adminJs, /function syncTeamMemberFieldsFromUser/);
  assert.match(adminJs, /enterManualTeamMemberMode\(\{ clearUserFields: true \}\)/);
  assert.match(adminJs, /if \(!payload\.userId && payload\.name\)/);
  assert.match(adminJs, /payload\.userId = createManualTeamMemberUserId\(payload\.name,\s*payload\.teamId\)/);
  assert.match(adminJs, /function syncTeamMemberDutyFromRole/);
  assert.match(adminJs, /roleKey === "advisor"/);
  assert.match(adminJs, /队长/);
});

test("admin team roster controls backend track lock state", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminTeamStatusManager"/);
  assert.match(html, /id="adminTeamStatusList"/);
  assert.match(css, /\.admin-team-status-manager/);
  assert.match(css, /\.admin-team-status-list/);
  assert.match(css, /\.admin-team-status-card/);
  assert.match(dataJs, /function updateAdminTeamStatus/);
  assert.match(dataJs, /\/api\/admin\/teams\/\$\{encodeURIComponent\(teamId\)\}\/status/);
  assert.match(adminJs, /const adminTeamStatusList/);
  assert.match(adminJs, /function renderTeamStatusManager/);
  assert.match(adminJs, /function updateAdminTeamStatus/);
  assert.match(adminJs, /window\.AppData\.updateAdminTeamStatus/);
  assert.match(adminJs, /data-team-status-command/);
  assert.match(adminJs, /document\.addEventListener\("click", async \(event\) => \{[\s\S]*?data-team-status-command[\s\S]*?const \[teamId, status\] = String\(button\.dataset\.teamStatusCommand \|\| ""\)\.split\(":"\);[\s\S]*?await updateAdminTeamStatus\(teamId, status, button\);[\s\S]*?\}\);/);
  assert.match(adminJs, /开放组队/);
  assert.match(adminJs, /锁定组队/);
});

test("player team UI treats locked teams as read-only roster state", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const isLocked = String\(t\.status \|\| "open"\)\.trim\(\)\.toLowerCase\(\) === "locked"/);
  assert.match(siteJs, /const lockedDisabled = isLocked \? "disabled" : ""/);
  assert.match(siteJs, /isLocked\s*\?\s*`<button class="team-join is-locked"[^`]*已锁定/);
  assert.match(siteJs, /if \(String\(team\.status \|\| "open"\)\.trim\(\)\.toLowerCase\(\) === "locked"\) \{[\s\S]*?toast\("队伍已锁定，不能再调整职责"\)/);
  assert.match(siteJs, /if \(String\(team\.status \|\| "open"\)\.trim\(\)\.toLowerCase\(\) === "locked"\) \{[\s\S]*?toast\("队伍已锁定，不能退出队伍"\)/);
  assert.match(siteJs, /if \(\/team \.\* is locked\|is locked\/i\.test\(message\)\) \{[\s\S]*?队伍已锁定，不能再进行组队变更/);
  assert.match(siteJs, /\/team \.\* is locked\|is locked\/i\.test\(message\)[\s\S]*?队伍已锁定，不能再调整职责/);
});

test("admin console exports key operation datasets", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  ["teams", "votes", "works", "scores", "results", "audit"].forEach((target) => {
    assert.match(html, new RegExp(`data-admin-export="${target}"`));
  });
  assert.match(css, /\.admin-export-actions/);
  assert.match(adminJs, /function escapeCsvValue/);
  assert.match(adminJs, /function downloadAdminCsv/);
  assert.match(adminJs, /function buildTeamExportRows/);
  assert.match(adminJs, /function buildVoteExportRows/);
  assert.match(adminJs, /function buildWorkExportRows/);
  assert.match(adminJs, /function buildJudgeScoreExportRows/);
  assert.match(adminJs, /function buildResultExportRows/);
  assert.match(adminJs, /function buildAuditExportRows/);
  assert.match(adminJs, /function handleAdminExport/);
  assert.match(adminJs, /data-admin-export/);
});

test("admin data workspace supports manual opt-in auto refresh", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminAutoRefreshToggle"/);
  assert.match(html, /id="adminAutoRefreshInterval"/);
  assert.match(html, /id="adminAutoRefreshState"/);
  assert.match(css, /\.admin-auto-refresh/);
  assert.match(adminJs, /let adminAutoRefreshTimer = null/);
  assert.match(adminJs, /function syncAdminAutoRefresh/);
  assert.match(adminJs, /setInterval\(\(\) => loadBusinessData\(\{ writeLog: false/);
  assert.match(adminJs, /function renderMissionCountdownScreenState\(state = \{\}\)/);
  assert.match(adminJs, /function renderRoadshowScreenState\(state = \{\}\)/);
  assert.match(adminJs, /renderMissionCountdownState\(state = \{\}\)[\s\S]*?renderMissionCountdownScreenState\(state\)/);
  assert.match(adminJs, /renderRoadshowState\(state = \{\}\)[\s\S]*?renderRoadshowScreenState\(state\)/);
  assert.match(adminJs, /window\.AppData\.loadMissionCountdown\(\)/);
  assert.match(adminJs, /window\.AppData\.loadRoadshow\(\)/);
  assert.match(adminJs, /if \(missionCountdownResult\.status === "fulfilled"\) renderMissionCountdownScreenState\(missionCountdownResult\.value\)/);
  assert.match(adminJs, /if \(roadshowResult\.status === "fulfilled"\) renderRoadshowScreenState\(roadshowResult\.value\)/);
  assert.match(adminJs, /if \(missionCountdownResult\.status === "rejected"\) failedSources\.push\("任务倒计时"\)/);
  assert.match(adminJs, /if \(roadshowResult\.status === "rejected"\) failedSources\.push\("路演计时"\)/);
  assert.match(adminJs, /clearInterval\(adminAutoRefreshTimer\)/);
  assert.match(adminJs, /adminAutoRefreshToggle\?\.addEventListener\("change", syncAdminAutoRefresh\)/);
});

test("admin screen timer status polls backend display timers", () => {
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");
  const syncTimerStart = adminJs.indexOf("async function syncDisplayTimerStates()");
  const syncTimerEnd = adminJs.indexOf("\n\nfunction collectStageDisplayTimes", syncTimerStart);
  const syncTimerBody = syncTimerStart >= 0 && syncTimerEnd > syncTimerStart
    ? adminJs.slice(syncTimerStart, syncTimerEnd)
    : "";
  const missionScreenStart = adminJs.indexOf("function renderMissionCountdownScreenState");
  const missionScreenEnd = adminJs.indexOf("\n\nfunction renderMissionCountdownState", missionScreenStart);
  const missionScreenBody = missionScreenStart >= 0 && missionScreenEnd > missionScreenStart
    ? adminJs.slice(missionScreenStart, missionScreenEnd)
    : "";

  assert.match(adminJs, /const ADMIN_DISPLAY_TIMER_POLL_MS\s*=\s*5000/);
  assert.match(adminJs, /const ADMIN_DISPLAY_TIMER_TICK_MS\s*=\s*1000/);
  assert.match(adminJs, /let adminDisplayTimerPollTimer\s*=\s*null/);
  assert.match(adminJs, /let adminDisplayTimerTickTimer\s*=\s*null/);
  assert.match(adminJs, /function formatDisplayTimerState\(state = \{\}, fallbackMinutes\)/);
  assert.match(adminJs, /function renderDisplayTimerScreenStates\(\)/);
  assert.match(adminJs, /async function syncDisplayTimerStates\(\)/);
  assert.match(syncTimerBody, /window\.AppData\.loadMissionCountdown\(\)/);
  assert.match(syncTimerBody, /window\.AppData\.loadRoadshow\(\)/);
  assert.match(syncTimerBody, /renderMissionCountdownScreenState\(missionCountdownResult\.value\)/);
  assert.match(syncTimerBody, /renderRoadshowScreenState\(roadshowResult\.value\)/);
  assert.doesNotMatch(syncTimerBody, /setDurationInputs/);
  assert.match(missionScreenBody, /missionCountdownScreenState = \{ \.\.\.missionCountdownScreenState, \.\.\.state \}/);
  assert.match(missionScreenBody, /const timer = formatDisplayTimerState\(missionCountdownScreenState,\s*1440\)/);
  assert.match(missionScreenBody, /剩余 \$\{timer\.clock\}/);
  assert.doesNotMatch(missionScreenBody, /formatStartedAt\(state\.startedAt\)/);
  assert.match(adminJs, /adminDisplayTimerPollTimer\s*=\s*setInterval\(\(\) => syncDisplayTimerStates\(\)\.catch/);
  assert.match(adminJs, /adminDisplayTimerTickTimer\s*=\s*setInterval\(renderDisplayTimerScreenStates,\s*ADMIN_DISPLAY_TIMER_TICK_MS\)/);
  assert.match(adminJs, /startDisplayTimerPolling\(\)/);
  assert.match(adminJs, /window\.addEventListener\("pagehide", \(\) => \{[\s\S]*?clearInterval\(adminDisplayTimerPollTimer\)[\s\S]*?clearInterval\(adminDisplayTimerTickTimer\)/);
});

test("admin audit log view supports filters and expandable details", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminAuditActionFilter"/);
  assert.match(html, /id="adminAuditActorFilter"/);
  assert.match(html, /id="adminAuditTargetFilter"/);
  assert.match(css, /\.admin-audit-filter-bar/);
  assert.match(css, /\.admin-audit-list details/);
  assert.match(dataJs, /function loadAuditLogs\(filters = \{\}, fallback = \{ logs: \[\] \}\)/);
  assert.match(dataJs, /new URLSearchParams/);
  assert.match(adminJs, /const adminAuditActionFilter/);
  assert.match(adminJs, /function getAuditLogFilters/);
  assert.match(adminJs, /function syncAuditLogFilters/);
  assert.match(adminJs, /loadAuditLogs\(getAuditLogFilters\(\)\)/);
  assert.match(adminJs, /<details/);
  assert.match(adminJs, /data-audit-filter/);
});

test("admin audit log view exposes visible sync states and reset filters", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="adminAuditStatus"/);
  assert.match(html, /id="resetAuditFiltersButton"/);
  assert.match(css, /\.admin-audit-status/);
  assert.match(css, /\.admin-audit-list \.admin-empty strong/);
  assert.match(css, /\.admin-audit-list \.admin-empty span/);
  assert.match(adminJs, /const adminAuditStatus/);
  assert.match(adminJs, /const resetAuditFiltersButton/);
  assert.match(adminJs, /function setAuditStatus/);
  assert.match(adminJs, /function resetAuditFilters/);
  assert.match(adminJs, /setAuditStatus\("syncing"/);
  assert.match(adminJs, /setAuditStatus\("empty"/);
  assert.match(adminJs, /setAuditStatus\("error"/);
});

test("admin flow cockpit removes low-value panels and enlarges the big screen preview", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const flowView = html.match(/<div class="admin-grid admin-view-panel is-active" data-admin-view-panel="flow"[\s\S]*?<section class="admin-view-panel admin-management-view" data-admin-view-panel="screen"/)?.[0] || "";
  const screenPreviewBlock = css.match(/\.screen-preview\s*{[\s\S]*?\n}/)?.[0] || "";
  const timerGridBlock = css.match(/\.timer-control-grid\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.doesNotMatch(flowView, /admin-ops-panel/);
  assert.doesNotMatch(flowView, /id="operationLog"/);
  assert.match(flowView, /class="panel timing-panel"/);
  assert.match(flowView, /class="panel preview-panel"/);
  assert.match(css, /\.flow-panel\s*{[\s\S]*?min-height:\s*clamp\(360px,\s*38vh,\s*500px\)/);
  assert.match(css, /\.preview-panel\s*{[\s\S]*?min-height:\s*clamp\(420px,\s*44vh,\s*560px\)/);
  assert.match(screenPreviewBlock, /height:\s*min\(520px,\s*calc\(100% - 58px\)\)/);
  assert.match(timerGridBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test("admin settings view is labeled as system status until editable settings exist", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /系统状态/);
  assert.match(html, /SYSTEM_STATUS/);
  assert.match(html, /id="adminSystemRuntimeStatus">只读运行状态/);
  assert.match(adminJs, /setText\(adminSystemRuntimeStatus, apiBaseUrl \? "前后端分离状态" : "同源运行状态"\)/);
});

test("admin console exposes all primary sidebar sections as real views", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  ["dashboard", "flow", "screen", "content", "data", "results", "teams", "settings", "logs"].forEach((view) => {
    assert.match(html, new RegExp(`data-admin-nav="${view}"`));
    assert.match(html, new RegExp(`data-admin-view-panel="${view}"`));
  });

  assert.match(html, /id="adminDashboardSummary"/);
  assert.match(html, /id="adminScreenControl"/);
  assert.match(html, /id="adminContentManager"/);
  assert.match(html, /id="adminSystemSettings"/);
  assert.match(css, /\.admin-dashboard-grid/);
  assert.match(css, /\.admin-control-list/);
  assert.match(css, /\.admin-route-grid/);
  assert.match(adminJs, /function renderDashboardSummary/);
  assert.match(adminJs, /function renderScreenControl/);
  assert.match(adminJs, /function renderSystemSettings/);
});

test("admin console allows natural document scrolling on mobile", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(html, /admin\.css\?v=20260703-admin-mobile-scroll/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*html,\s*\n\s*body\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*\.admin-shell\s*\{[\s\S]*height:\s*auto/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*\.admin-workspace\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*\.admin-main-scroll\s*\{[\s\S]*overflow:\s*visible/);
});

test("admin and big screen cache keys stay current", () => {
  const adminHtml = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const screenHtml = fs.readFileSync(path.join(__dirname, "../screen.html"), "utf8");

  assert.match(adminHtml, /admin\.css\?v=20260703-admin-mobile-scroll/);
  assert.match(adminHtml, /src\/data\.js\?v=20260630-prestart-separate-timer/);
  assert.match(adminHtml, /src\/admin\.js\?v=20260702-result-publish-api5173/);
  assert.match(indexHtml, /styles\.css\?v=20260703-index-previous-style/);
  assert.match(indexHtml, /src\/data\.js\?v=20260630-prestart-separate-timer/);
  assert.match(indexHtml, /src\/logic\.js\?v=20260702-final-snapshot-source/);
  assert.match(indexHtml, /src\/app\.js\?v=20260702-final-snapshot-source/);
  assert.match(screenHtml, /src\/screen-data\.js\?v=20260703-slogan-copy/);
});

test("landing stage starts with its main CTA visible and clickable", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const landingOpenTag = html.match(/<section class="[^"]*" id="landingStage"/)?.[0] || "";

  assert.doesNotMatch(landingOpenTag, /backdrop-mode/);
});

test("landing logo uses the original static full-brand artwork", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const logoBlock = css.match(/\.landing-logo-container\s*{[\s\S]*?\n}/)?.[0] || "";
  const mediaBlock = css.match(/\.landing-logo-canvas,\n\.landing-logo-text\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(logoBlock, /background:\s*url\("\.\/assets\/joincare-full-clean\.png"\) center \/ contain no-repeat/);
  assert.match(logoBlock, /opacity:\s*0\.82/);
  assert.match(mediaBlock, /display:\s*none/);
  assert.doesNotMatch(css, /\.landing-logo-container::before\s*{/);
  assert.doesNotMatch(css, /landingTextReveal/);
});

test("landing hero uses the merged two-line cinematic hierarchy", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const logoBlock = css.match(/\.landing-logo-container\s*{[\s\S]*?\n}/)?.[0] || "";
  const actionBlock = css.match(/\.landing-actions\s*{[\s\S]*?\n}/)?.[0] || "";
  const enterButtonBlock = css.match(/\.enter-button,\n\.discover-button,\n\.feishu-login-button\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.doesNotMatch(html, /landing-title-main/);
  assert.doesNotMatch(html, /AI黑客松<\/span>/);
  assert.doesNotMatch(html, /AI创新黑客松大赛2026/);
  assert.doesNotMatch(html, /AI Innovation Hackathon 2026<\/span>/);
  assert.match(html, /<span class="landing-title-cn">AI创新黑客松<\/span>/);
  assert.match(html, /<span class="landing-title-sub">36小时 · 让想法落地，让创新发生<\/span>/);
  assert.doesNotMatch(html, /data-text="AI创新黑客松"/);
  assert.match(html, /<button class="enter-button" type="button" id="enterButton"[^>]*>解锁任务<\/button>/);
  assert.match(logoBlock, /top:\s*23%/);
  assert.match(logoBlock, /width:\s*min\(28vw,\s*440px\)/);
  assert.match(css, /\.landing-stage::before\s*{[\s\S]*?centered light field/);
  assert.match(css, /\.landing-content::before\s*{[\s\S]*?content:\s*none/);
  assert.match(css, /\.landing-content::after\s*{[\s\S]*?content:\s*none/);
  assert.match(css, /\.landing-title\s*{[\s\S]*?top:\s*calc\(50% - 36px\)/);
  assert.match(actionBlock, /top:\s*calc\(74% - 96px\)/);
  assert.match(css, /\.landing-title\s*{[\s\S]*?gap:\s*clamp\(16px,\s*2vh,\s*24px\)/);
  assert.match(css, /\.landing-title-cn\s*{[\s\S]*?font-size:\s*clamp\(58px,\s*6\.8vw,\s*112px\)/);
  assert.match(css, /\.landing-title-sub\s*{[\s\S]*?color:\s*var\(--neon-2\)/);
  assert.match(css, /\.landing-title-sub\s*{[\s\S]*?font-size:\s*clamp\(22px,\s*2\.45vw,\s*38px\)/);
  assert.doesNotMatch(css, /\.landing-title-cn::before/);
  assert.doesNotMatch(css, /\.landing-title-cn::after/);
  assert.doesNotMatch(css, /\.landing-title-sub::before/);
  assert.doesNotMatch(css, /\.landing-title-sub::after/);
  assert.match(css, /\.app-shell\.view-home \.landing-title\s*{[\s\S]*?animation:\s*none/);
  assert.match(css, /\.app-shell\.view-home \.landing-title\s*{[\s\S]*?opacity:\s*1/);
  assert.match(enterButtonBlock, /width:\s*clamp\(220px,\s*18vw,\s*292px\)/);
  assert.match(enterButtonBlock, /border-radius:\s*8px/);
});

test("landing stage does not render the top navigation bar", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const landingStart = html.indexOf('<section class="landing-stage"');
  const landingEnd = html.indexOf('<section class="welcome-stage"', landingStart);
  const landingSection = html.slice(landingStart, landingEnd);

  assert.notEqual(landingStart, -1);
  assert.notEqual(landingEnd, -1);
  assert.doesNotMatch(landingSection, /<nav class="hackathon-nav"/);
  assert.doesNotMatch(landingSection, /data-view-target="home">HOME<\/button>/);
  assert.doesNotMatch(landingSection, /data-view-target="wall">PERSONA PROFILE<\/button>/);
  assert.doesNotMatch(landingSection, /data-view-target="discover">BUSINESS SCENARIO<\/button>/);
  assert.doesNotMatch(landingSection, /data-view-target="roadshow">DEMO FINAL<\/button>/);
  assert.match(landingSection, /<button class="enter-button" type="button" id="enterButton"[^>]*>解锁任务<\/button>/);
});

test("getIntroTiming keeps the loading hold and crossfade durations explicit", () => {
  assert.deepEqual(getIntroTiming(), {
    holdMs: 4000,
    exitMs: 1200,
  });
});

test("resolveDiscoverTarget accepts known discover menu targets", () => {
  assert.equal(resolveDiscoverTarget("awards"), "awards");
  assert.equal(resolveDiscoverTarget("unknown"), "home");
});

test("resolveStageScreenView maps admin stages to existing screen views", () => {
  assert.equal(resolveStageScreenView("prestart"), "home");
  assert.equal(resolveStageScreenView("opening"), "welcome");
  assert.equal(resolveStageScreenView("icebreaker"), "wall");
  assert.equal(resolveStageScreenView("speech"), "home");
  assert.equal(resolveStageScreenView("tracks"), "discover");
  assert.equal(resolveStageScreenView("team"), "team");
  assert.equal(resolveStageScreenView("vote"), "vote");
  assert.equal(resolveStageScreenView("result"), "vote-result");
  assert.equal(resolveStageScreenView("unknown"), "");
});

test("resolveScreenViewFromRouteStage keeps direct big-screen links on the requested view", () => {
  assert.equal(resolveScreenViewFromRouteStage("icebreaker"), "wall");
  assert.equal(resolveScreenViewFromRouteStage("opening"), "welcome");
  assert.equal(resolveScreenViewFromRouteStage("wall"), "wall");
  assert.equal(resolveScreenViewFromRouteStage("vote-progress"), "vote");
  assert.equal(resolveScreenViewFromRouteStage("vote-result"), "vote-result");
  assert.equal(resolveScreenViewFromRouteStage("unknown"), "");
});

test("admin stage polling treats the first fetched stage as baseline only", () => {
  const firstTeamPublish = createAdminStageSyncKey("team", "2026-05-22T06:00:00.000Z");
  const secondTeamPublish = createAdminStageSyncKey("team", "2026-06-17T03:12:47.953Z");
  const votePublish = createAdminStageSyncKey("vote", "2026-06-17T03:20:00.000Z");

  assert.equal(firstTeamPublish, "team@2026-05-22T06:00:00.000Z");
  assert.equal(createAdminStageSyncKey("", "2026-05-22T06:00:00.000Z"), "");
  assert.equal(shouldApplyAdminStageChange("", firstTeamPublish), false);
  assert.equal(shouldApplyAdminStageChange(firstTeamPublish, firstTeamPublish), false);
  assert.equal(shouldApplyAdminStageChange(firstTeamPublish, secondTeamPublish), true);
  assert.equal(shouldApplyAdminStageChange(secondTeamPublish, votePublish), true);
  assert.equal(shouldApplyAdminStageChange(firstTeamPublish, ""), false);
});

test("admin state API helpers are exposed without swallowing failures", () => {
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");

  assert.match(dataJs, /async function loadAdminState\(\)/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/state"\)/);
  assert.match(dataJs, /async function updateAdminStage\(stageId\)/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/stage",\s*{[\s\S]*method:\s*"PATCH"/);
  assert.match(dataJs, /body:\s*JSON\.stringify\(\{\s*stageId\s*\}\)/);
  assert.match(dataJs, /async function updateAdminScreenOverride\(stageId\)/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/screen-override",\s*{[\s\S]*method:\s*"PATCH"/);
  assert.match(dataJs, /async function updateAdminDisplayTimes\(payload/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/display-times"/);
  assert.match(dataJs, /async function updateAdminMissionCountdown\(payload/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/mission-countdown"/);
  assert.match(dataJs, /async function updateAdminPrestartCountdown\(payload/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/prestart-countdown"/);
  assert.match(dataJs, /async function updateAdminRoadshow\(payload/);
  assert.match(dataJs, /fetchJson\("\/api\/admin\/roadshow"/);
  assert.match(dataJs, /loadAdminState,/);
  assert.match(dataJs, /updateAdminStage,/);
  assert.match(dataJs, /updateAdminScreenOverride,/);
  assert.match(dataJs, /updateAdminDisplayTimes,/);
  assert.match(dataJs, /updateAdminMissionCountdown,/);
  assert.match(dataJs, /updateAdminPrestartCountdown,/);
  assert.match(dataJs, /updateAdminRoadshow,/);
});

test("admin console publishes phase changes through the admin state API", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(js, /window\.AppData\.loadAdminState\(\)/);
  assert.match(js, /window\.AppData\.updateAdminStage\(stageId\)/);
  assert.match(html, /id="saveDisplayTimesButton"/);
  assert.match(html, /id="missionCountdownHours"/);
  assert.match(html, /id="missionCountdownMinutes"/);
  assert.match(html, /id="roadshowHours"/);
  assert.match(html, /id="roadshowMinutes"/);
  assert.match(js, /window\.AppData\.updateAdminDisplayTimes/);
  assert.match(js, /window\.AppData\.updateAdminMissionCountdown/);
  assert.match(js, /window\.AppData\.updateAdminRoadshow/);
  assert.match(js, /catch\s*\(error\)[\s\S]*同步失败/);
});

test("admin timer controls edit durations as hours and minutes while preserving durationMs", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.doesNotMatch(html, /展示时长（分钟）/);
  assert.match(html, /展示时长/);
  assert.match(html, /id="missionCountdownHours"[^>]*value="36"/);
  assert.match(html, /id="missionCountdownMinutes"[^>]*value="0"/);
  assert.match(html, /id="roadshowHours"[^>]*value="0"/);
  assert.match(html, /id="roadshowMinutes"[^>]*value="15"/);
  assert.match(css, /\.timer-duration-fields/);
  assert.match(js, /const missionCountdownHours/);
  assert.match(js, /const missionCountdownMinutes/);
  assert.match(js, /const roadshowHours/);
  assert.match(js, /const roadshowMinutes/);
  assert.match(js, /function durationMsToHourMinuteParts/);
  assert.match(js, /function setDurationInputs/);
  assert.match(js, /function durationInputsToDurationMs/);
  assert.match(js, /durationMs:\s*durationInputsToDurationMs\(missionCountdownHours,\s*missionCountdownMinutes,\s*1440\)/);
  assert.match(js, /durationMs:\s*durationInputsToDurationMs\(roadshowHours,\s*roadshowMinutes,\s*15\)/);
  assert.doesNotMatch(js, /minutesInputToDurationMs/);
});

test("mission countdown defaults to the 36 hour hackathon window across clients and repositories", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const logicJs = fs.readFileSync(path.join(__dirname, "../src/logic.js"), "utf8");
  const jsonRepository = fs.readFileSync(path.join(__dirname, "../server/missionCountdownRepository.js"), "utf8");
  const mysqlRepository = fs.readFileSync(path.join(__dirname, "../server/mysqlMissionCountdownRepository.js"), "utf8");

  assert.match(appJs, /COUNTDOWN_DURATION_MS = 36 \* 60 \* 60 \* 1000/);
  assert.match(dataJs, /DEFAULT_COUNTDOWN_DURATION_MS = 36 \* 60 \* 60 \* 1000/);
  assert.match(logicJs, /missionCountdownDurationMs = 36 \* 60 \* 60 \* 1000/);
  assert.match(jsonRepository, /DEFAULT_DURATION_MS = 36 \* 60 \* 60 \* 1000/);
  assert.match(mysqlRepository, /DEFAULT_DURATION_MS = 36 \* 60 \* 60 \* 1000/);
});

test("admin time save synchronizes stage labels and timer durations without starting timers", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");
  const saveTimeConfigurationBlock = js.match(/async function saveTimeConfiguration\(\) \{[\s\S]*?\n}\n\nasync function loadTimerControls/)?.[0] || "";

  assert.match(html, /id="saveDisplayTimesButton"[^>]*>保存时间配置<\/button>/);
  assert.match(js, /async function saveTimeConfiguration\(\)/);
  assert.match(js, /saveDisplayTimesButton\?\.addEventListener\("click", saveTimeConfiguration\)/);
  assert.match(saveTimeConfigurationBlock, /window\.AppData\.updateAdminDisplayTimes\(\{[\s\S]*stages:\s*collectStageDisplayTimes\(\)/);
  assert.match(saveTimeConfigurationBlock, /window\.AppData\.updateAdminMissionCountdown\(\{[\s\S]*durationMs:\s*durationInputsToDurationMs\(missionCountdownHours,\s*missionCountdownMinutes,\s*1440\)/);
  assert.match(saveTimeConfigurationBlock, /window\.AppData\.updateAdminRoadshow\(\{[\s\S]*durationMs:\s*durationInputsToDurationMs\(roadshowHours,\s*roadshowMinutes,\s*15\)/);
  assert.match(saveTimeConfigurationBlock, /renderMissionCountdownState\(missionCountdownStatePayload\)/);
  assert.match(saveTimeConfigurationBlock, /renderRoadshowState\(roadshowStatePayload\)/);
  assert.doesNotMatch(saveTimeConfigurationBlock, /startedAt/);
});

test("admin screen control toggles a dedicated big screen override", () => {
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(js, /admin-control-actions/);
  assert.match(js, /let screenOverrideStageId\s*=/);
  assert.match(js, /data-screen-stage-flow-command/);
  assert.match(js, /data-screen-stage-lock-command/);
  assert.match(js, /event\.target\.closest\("\[data-screen-stage-flow-command\]"\)/);
  assert.match(js, /event\.target\.closest\("\[data-screen-stage-lock-command\]"\)/);
  assert.match(js, /function setScreenFlowStage\(stageId\)/);
  assert.match(js, /function toggleScreenOverride\(stageId\)/);
  assert.match(js, /await window\.AppData\.updateAdminStage\(cleanStageId\)/);
  assert.match(js, /await window\.AppData\.updateAdminScreenOverride\(""\)/);
  assert.match(js, /await toggleScreenOverride\(button\.dataset\.screenStageLockCommand\)/);
  assert.match(js, /await setScreenFlowStage\(button\.dataset\.screenStageFlowCommand\)/);
  assert.match(js, /锁定显示/);
  assert.match(js, /设为流程/);
  assert.match(js, /取消锁定/);
  assert.doesNotMatch(js, /\$\{escapeHtml\(item\.note\)\}\s*·\s*\$\{escapeHtml\(stageStatus\)\}/);
  assert.doesNotMatch(js, /大屏跟随中/);
  assert.match(js, /class="admin-screen-route-main"/);
  assert.match(css, /\.admin-control-actions/);
  assert.match(css, /\.admin-control-actions\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.admin-control-actions\s*{[\s\S]*width:\s*min\(360px,\s*100%\)/);
  assert.match(css, /\.admin-control-actions button/);
  assert.match(css, /\.admin-control-actions button\.is-cancel/);
});

test("admin roadshow timer selects current and next teams through the backend API", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /id="roadshowCurrentTeamSelect"/);
  assert.match(html, /id="roadshowNextTeamSelect"/);
  assert.match(css, /\.timer-team-selectors/);
  assert.match(js, /const roadshowCurrentTeamSelect/);
  assert.match(js, /const roadshowNextTeamSelect/);
  assert.match(js, /function renderRoadshowTeamOptions/);
  assert.match(js, /function getSelectedRoadshowTeam/);
  assert.match(js, /currentTeamId:\s*roadshowCurrentTeamSelect\?\.value/);
  assert.match(js, /currentTeam:\s*getSelectedRoadshowTeam\(roadshowCurrentTeamSelect\?\.value/);
  assert.match(js, /nextTeamId:\s*roadshowNextTeamSelect\?\.value/);
  assert.match(js, /nextTeam:\s*getSelectedRoadshowTeam\(roadshowNextTeamSelect\?\.value/);
  assert.match(js, /renderRoadshowTeamOptions\(\)/);
});

test("main screen polls admin state and switches views only on stage changes", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /const explicitScreenViewRoute = resolveExplicitScreenViewRoute\(\)/);
  assert.match(appJs, /if\s*\(explicitScreenViewRoute\)\s*{[\s\S]*?return;/);
  assert.match(appJs, /window\.AppData\.loadAdminState\(\)/);
  assert.match(appJs, /const stageId = state\?\.screenOverrideStageId \|\| state\?\.currentStageId \|\| ""/);
  assert.match(appJs, /window\.AppLogic\.createAdminStageSyncKey\(stageId,\s*state\.updatedAt\)/);
  assert.match(appJs, /window\.AppLogic\.shouldApplyAdminStageChange\(lastAdminStageSyncKey,\s*stageSyncKey\)/);
  assert.match(appJs, /if\s*\(!shouldSwitchStage\)\s*{[\s\S]*?return;/);
  assert.match(appJs, /window\.AppLogic\.resolveStageScreenView\(stageId\)/);
  assert.match(appJs, /lastAdminStageSyncKey/);
  assert.match(appJs, /window\.setInterval\(pollAdminState/);
});

test("discover header links to talent profiles and the team formation screen", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const discoverSection = html.match(/<section class="discover-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";

  assert.match(discoverSection, /<h2 class="discover-hub-title">BUSINESS SCENARIOS<\/h2>/);
  assert.doesNotMatch(discoverSection, /AI BUSINESS SCENARIOS/);
  assert.match(discoverSection, /<button class="brand-chip" type="button" data-view-target="wall">/);
  assert.match(discoverSection, /<button class="cohort-mark" type="button" data-view-target="team">5 CORE SECTORS<\/button>/);
});

test("team formation screen is wired as a dedicated five-sector stage", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");

  assert.match(html, /<section class="team-stage" id="teamStage" aria-label="五大赛道组队"/);
  assert.match(html, /<canvas class="code-rain-canvas team-rain" id="teamRain"/);
  assert.match(html, /<div class="team-grid" id="teamGrid"/);
  assert.match(appJs, /team:\s*document\.getElementById\("teamStage"\)/);
  assert.match(appJs, /team:\s*createRain\("teamRain"/);
  assert.match(appJs, /renderTeamFormation/);
  assert.match(dataJs, /async function loadTeams/);
  assert.match(dataJs, /fetchJson\("\/api\/teams"\)/);
  assert.match(dataJs, /fetchJson\("\.\/data\/teams\.json"\)/);
});

test("team formation keeps static fallback content while backend teams sync", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /function getFallbackTeamState\(/);
  assert.match(appJs, /let teamState = getFallbackTeamState\(\)/);
  assert.match(appJs, /window\.AppData\.loadTeams\(getFallbackTeamState\(\)\)/);
  assert.doesNotMatch(appJs, /window\.AppData\.loadTeams\(\[\]\)/);
});

test("central team formation screen polls backend teams without changing the stage UI", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /const TEAM_STATE_POLL_MS\s*=\s*5000/);
  assert.match(appJs, /let teamStatePollTimer\s*=\s*null/);
  assert.match(appJs, /function createTeamStateSignature\(/);
  assert.match(appJs, /async function syncTeamState\(/);
  assert.match(appJs, /teamStatePollTimer\s*=\s*window\.setInterval\(syncTeamState,\s*TEAM_STATE_POLL_MS\)/);
  assert.match(appJs, /window\.clearInterval\(teamStatePollTimer\)/);
  assert.match(appJs, /data-team-action="claim-track"/);
  assert.match(appJs, /data-team-action="claim-role"/);
});

test("team header opens the mission countdown stage", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const teamSection = html.match(/<section class="team-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";
  const countdownSection = html.match(/<section class="countdown-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";

  assert.match(teamSection, /<button class="cohort-mark" type="button" data-view-target="countdown">MISSION COUNTDOWN<\/button>/);
  assert.match(countdownSection, /id="countdownStage"/);
  assert.match(countdownSection, /id="countdownRain"/);
  assert.match(countdownSection, /id="countdownHours"/);
  assert.match(countdownSection, /id="countdownMinutes"/);
  assert.match(countdownSection, /id="countdownSeconds"/);
  assert.match(countdownSection, /id="countdownStartButton"/);
  assert.match(countdownSection, /ADMIN CONTROLLED/);
  const countdownStartButtonTag = countdownSection.match(/<button class="countdown-start-button"[^>]*id="countdownStartButton"[^>]*>/)?.[0] || "";
  assert.match(countdownStartButtonTag, /type="button"/);
  assert.doesNotMatch(countdownStartButtonTag, /\sdisabled(?:[\s=>]|$)/);
  assert.match(countdownSection, /data-view-target="team"[\s\S]*?BACK TO TEAM FORMATION/);
  assert.match(appJs, /countdown:\s*document\.getElementById\("countdownStage"\)/);
  assert.match(appJs, /countdown:\s*createRain\("countdownRain"/);
  assert.match(appJs, /let countdownStartRequestPending\s*=\s*false/);
  assert.match(appJs, /async function handleCountdownStart\(\)/);
  assert.match(appJs, /joincare_mission_countdown_started_at_manual_v2/);
  assert.match(appJs, /window\.AppData\.loadMissionCountdown/);
  assert.match(appJs, /window\.AppData\.startMissionCountdown\(\{[\s\S]*?storageKey:\s*COUNTDOWN_STORAGE_KEY[\s\S]*?durationMs:\s*countdownDurationMs[\s\S]*?requireBackend:\s*true/);
  assert.match(appJs, /countdownStartButton\?\.addEventListener\("click", handleCountdownStart\)/);
  assert.match(appJs, /countdownStartButton\.disabled\s*=\s*countdownStartRequestPending/);
  assert.match(appJs, /startCountdownClock/);
  assert.match(appJs, /stopCountdownClock/);
  assert.match(appJs, /if\s*\(!readCountdownStartedAt\(\)\)\s*{[\s\S]*?stopCountdownClock\(\);/);
  assert.match(dataJs, /async function loadMissionCountdown/);
  assert.match(dataJs, /async function startMissionCountdown/);
  assert.match(dataJs, /requireBackend\s*=\s*false/);
  assert.match(dataJs, /if\s*\(!requireBackend && root\.JoincareMissionCountdown && typeof root\.JoincareMissionCountdown\.start === "function"\)/);
  assert.match(dataJs, /if\s*\(requireBackend\)\s*{\s*throw error;\s*}/);
  assert.match(dataJs, /fetchJson\("\/api\/mission-countdown"\)/);
  assert.match(dataJs, /fetchJson\("\/api\/mission-countdown\/start"/);
  assert.match(dataJs, /JoincareMissionCountdown/);
  assert.match(css, /\.app-shell\[data-view="countdown"\]\s*>\s*\.countdown-stage/);
  assert.match(css, /\.mission-countdown-core/);
  assert.match(css, /\.countdown-start-button/);
});

test("countdown header opens a current roadshow team timer stage", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const countdownSection = html.match(/<section class="countdown-stage"[\s\S]*?<\/section>\s*<section class="roadshow-stage"/)?.[0] || "";
  const roadshowSection = html.match(/<section class="roadshow-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";

  assert.match(countdownSection, /<button class="cohort-mark" type="button" data-view-target="roadshow">ROADSHOW TIMER<\/button>/);
  assert.match(roadshowSection, /id="roadshowStage"/);
  assert.match(roadshowSection, /id="roadshowRain"/);
  assert.match(roadshowSection, /id="roadshowTeamName"/);
  assert.match(roadshowSection, /id="roadshowMinutes">15<\/span>/);
  assert.match(roadshowSection, /id="roadshowSeconds"/);
  assert.match(roadshowSection, /id="roadshowStartButton"/);
  assert.match(roadshowSection, /ADMIN CONTROLLED/);
  assert.match(roadshowSection, /class="roadshow-cockpit"/);
  assert.match(roadshowSection, /class="roadshow-command-bar"/);
  assert.match(roadshowSection, /id="roadshowCommandStatus"/);
  assert.match(roadshowSection, /class="roadshow-command-grid"/);
  assert.match(roadshowSection, /class="roadshow-control-stack"/);
  assert.match(roadshowSection, /class="roadshow-phase-panel"/);
  assert.match(roadshowSection, /class="roadshow-timer-diagnostics"/);
  assert.match(roadshowSection, /class="roadshow-phase-status"/);
  assert.match(roadshowSection, /class="roadshow-next-team"/);
  assert.match(roadshowSection, /id="roadshowNextTeamName"/);
  assert.match(roadshowSection, /CURRENT ROADSHOW TEAM/);
  assert.match(roadshowSection, /data-view-target="countdown"[\s\S]*?BACK TO MISSION TIMER/);
  assert.match(roadshowSection, /data-view-target="vote"[\s\S]*?VOTE PROGRESS/);
  assert.match(appJs, /roadshow:\s*document\.getElementById\("roadshowStage"\)/);
  assert.match(appJs, /roadshow:\s*createRain\("roadshowRain"/);
  assert.match(appJs, /renderRoadshowStage/);
  assert.match(appJs, /roadshow-member-seat/);
  assert.match(appJs, /roadshow-member-avatar/);
  assert.match(appJs, /is-placeholder/);
  assert.match(appJs, /has-photo/);
  assert.match(appJs, /roadshow-member-copy/);
  assert.match(appJs, /roadshow-member-status/);
  assert.match(appJs, /createRoadshowRosterSeat/);
  assert.match(appJs, /Array\.from\(\{ length: 5 \}, \(_, index\) => createRoadshowRosterSeat\(roster\[index\], index\)\)/);
  assert.match(appJs, /name:\s*"无名成员"/);
  assert.match(appJs, /roadshow-member is-empty/);
  assert.match(appJs, /resolveNextRoadshowTeam/);
  assert.match(appJs, /syncRoadshowTimer/);
  assert.doesNotMatch(appJs, /handleRoadshowStart/);
  assert.match(dataJs, /async function loadRoadshow/);
  assert.match(dataJs, /async function startRoadshowTimer/);
  assert.match(dataJs, /nextTeamId/);
  assert.match(dataJs, /nextTeam/);
  assert.match(dataJs, /fetchJson\("\/api\/roadshow"\)/);
  assert.match(dataJs, /fetchJson\("\/api\/roadshow\/start"/);
  assert.match(css, /\.app-shell\[data-view="roadshow"\]\s*>\s*\.roadshow-stage/);
  assert.match(css, /\.roadshow-cockpit/);
  assert.match(css, /\.roadshow-command-grid/);
  assert.match(css, /\.roadshow-control-stack/);
  assert.match(css, /\.roadshow-current-team/);
  assert.match(css, /grid-template-rows:\s*auto auto auto auto auto minmax\(0, 1fr\)/);
  assert.match(css, /\.roadshow-roster\s*{[\s\S]*?grid-template-rows:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.roadshow-member\.is-empty/);
  assert.match(css, /\.roadshow-member-seat/);
  assert.match(css, /\.roadshow-member-avatar/);
  assert.match(css, /\.roadshow-member-avatar\.is-placeholder/);
  assert.match(css, /\.roadshow-member-avatar\.has-photo/);
  assert.match(css, /\.roadshow-member-status/);
  assert.match(css, /\.roadshow-timer-digits/);
  assert.doesNotMatch(css, /\.app-shell\.view-roadshow\s+\.roadshow-stage\s*>\s*\.stage-header[\s\S]*?display:\s*none/);
});

test("mission countdown state formats a 36 hour window", () => {
  const countdown = getMissionCountdownState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-01T06:15:09.000Z"),
  });

  assert.deepEqual(countdown, {
    hours: "29",
    minutes: "44",
    seconds: "51",
    progress: 0.1737,
    remainingMs: 107091000,
    isComplete: false,
  });

  assert.deepEqual(getMissionCountdownState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-02T12:00:01.000Z"),
  }), {
    hours: "00",
    minutes: "00",
    seconds: "00",
    progress: 1,
    remainingMs: 0,
    isComplete: true,
  });
});

test("roadshow timer state formats a backend controlled fifteen minute presentation window", () => {
  const timer = getRoadshowTimerState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-01T00:01:14.000Z"),
    durationMs: 15 * 60 * 1000,
  });

  assert.deepEqual(timer, {
    minutes: "13",
    seconds: "46",
    progress: 0.082,
    remainingMs: 826000,
    isComplete: false,
  });

  assert.deepEqual(getRoadshowTimerState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-01T00:15:01.000Z"),
    durationMs: 15 * 60 * 1000,
  }), {
    minutes: "00",
    seconds: "00",
    progress: 1,
    remainingMs: 0,
    isComplete: true,
  });
});

test("team formation screen uses a squad-card role claiming layout", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const stageBlock = css.match(/\.team-stage\s*{[\s\S]*?\n}/)?.[0] || "";
  const wrapBlock = css.match(/\.team-hub-wrap\s*{[\s\S]*?\n}/)?.[0] || "";
  const gridBlock = css.match(/\.team-grid\s*{[\s\S]*?\n}/)?.[0] || "";
  const squadBlock = css.match(/\.team-squad-card\s*{[\s\S]*?\n}/)?.[0] || "";
  const advisorSlotBlock = css.match(/\.team-advisor-slot\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleGridBlock = css.match(/\.team-role-grid\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleSlotBlock = css.match(/\.team-role-slot\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleAvatarBlock = css.match(/\.team-role-avatar\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleCopyBlock = css.match(/\.team-role-copy\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleMainBlock = css.match(/\.team-role-main\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleChipBlock = css.match(/\.team-role-chip\s*{[\s\S]*?\n}/)?.[0] || "";
  const claimButtonBlock = css.match(/\.team-claim-button\s*{[\s\S]*?\n}/)?.[0] || "";
  const roleActionBlock = css.match(/\.team-role-action\s*{[\s\S]*?\n}/)?.[0] || "";
  const cardFooterBlock = css.match(/\.team-card-footer\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(stageBlock, /grid-template-rows:\s*auto 1fr auto/);
  assert.doesNotMatch(html, /team-hub-desc/);
  assert.doesNotMatch(html, /先抢赛道，再认领岗位职责/);
  assert.match(css, /\.app-shell\[data-view="team"\]\s*>\s*\.team-stage/);
  assert.match(css, /\.app-shell\.view-team\s*>\s*\.team-stage/);
  assert.match(wrapBlock, /padding:\s*clamp\(72px,\s*7\.8vh,\s*102px\)\s+clamp\(32px,\s*4vw,\s*64px\)\s+clamp\(58px,\s*6\.4vh,\s*78px\)/);
  assert.match(gridBlock, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(gridBlock, /height:\s*min\(660px,\s*calc\(100vh - 252px\)\)/);
  assert.match(squadBlock, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\) auto/);
  assert.match(squadBlock, /border-top:\s*1px solid rgba\(var\(--team-color-rgb\),\s*0\.62\)/);
  assert.match(squadBlock, /background:[\s\S]*rgba\(3,\s*14,\s*18,\s*0\.72\)/);
  assert.doesNotMatch(squadBlock, /0 20px 50px/);
  assert.doesNotMatch(appJs, /team-advisor-card/);
  assert.doesNotMatch(appJs, /TRACK ADVISOR/);
  assert.doesNotMatch(css, /\.team-advisor-card/);
  assert.doesNotMatch(css, /\.team-role-label/);
  assert.match(appJs, /advisorFilledCount/);
  assert.match(appJs, /TEAM_ROLE_BLUEPRINT\.length \+ 1/);
  assert.match(appJs, /team-advisor-slot/);
  assert.match(appJs, /LEAD/);
  assert.match(appJs, /isClaimedAdvisor/);
  assert.match(appJs, /data-role-key="advisor"/);
  assert.match(appJs, /抢队长位/);
  assert.match(appJs, /我的队长位/);
  assert.doesNotMatch(appJs, /已报名/);
  assert.match(advisorSlotBlock, /margin:\s*clamp\(7px,\s*0\.85vh,\s*10px\)\s+0/);
  assert.match(advisorSlotBlock, /border-color:\s*rgba\(var\(--team-color-rgb\),\s*0\.28\)/);
  assert.match(advisorSlotBlock, /background:[\s\S]*rgba\(var\(--team-color-rgb\),\s*0\.1\)/);
  assert.match(roleGridBlock, /grid-template-columns:\s*1fr/);
  assert.match(roleGridBlock, /grid-template-rows:\s*repeat\(4,\s*minmax\(58px,\s*1fr\)\)/);
  assert.match(roleGridBlock, /gap:\s*clamp\(8px,\s*0\.75vw,\s*12px\)/);
  assert.match(roleSlotBlock, /grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/);
  assert.match(roleSlotBlock, /align-items:\s*center/);
  assert.match(roleAvatarBlock, /background-image:\s*var\(--avatar-image\)/);
  assert.match(roleCopyBlock, /display:\s*grid/);
  assert.match(roleCopyBlock, /align-content:\s*center/);
  assert.match(roleMainBlock, /display:\s*flex/);
  assert.match(roleMainBlock, /align-items:\s*center/);
  assert.match(roleMainBlock, /gap:\s*8px/);
  assert.doesNotMatch(roleChipBlock, /margin-bottom/);
  assert.match(claimButtonBlock, /min-height:\s*clamp\(30px,\s*3\.6vh,\s*38px\)/);
  assert.match(roleActionBlock, /border:\s*1px solid rgba\(var\(--team-color-rgb\),\s*0\.24\)/);
  assert.doesNotMatch(roleActionBlock, /grid-column:\s*1\s*\/\s*-1/);
  assert.doesNotMatch(css, /\.team-role-status/);
  assert.match(cardFooterBlock, /margin-top:\s*clamp\(7px,\s*0\.8vh,\s*10px\)/);
  assert.doesNotMatch(appJs, /team-action-status/);
  assert.doesNotMatch(css, /\.team-action-status/);
  assert.match(appJs, /TEAM_ROLE_BLUEPRINT/);
  assert.match(appJs, /team-squad-card/);
  assert.match(appJs, /data-track-id="\$\{escapeAttribute\(team\.id \|\| ""\)\}"/);
  assert.match(appJs, /team-role-slot/);
  assert.match(appJs, /team-role-main/);
  assert.match(appJs, /team-claim-button/);
  assert.match(appJs, /data-team-action="claim-track"/);
  assert.match(appJs, /data-team-action="claim-role"/);
});

test("business scenario cards use the requested 02-03-04 accent rotation", () => {
  const teams = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/teams.json"), "utf8"));
  const medicine = teams.find((team) => team.id === "medicine") || {};
  const marketing = teams.find((team) => team.id === "marketing") || {};
  const functions = teams.find((team) => team.id === "functions") || {};

  assert.equal(medicine.color, "rgb(205, 255, 92)");
  assert.equal(medicine.colorRgb, "205, 255, 92");
  assert.equal(marketing.color, "rgb(100, 232, 214)");
  assert.equal(marketing.colorRgb, "100, 232, 214");
  assert.equal(functions.color, "var(--neon-2)");
  assert.equal(functions.colorRgb, "167, 255, 79");
});

test("business scenario cards are editable from admin and use dynamic document links", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");

  assert.match(indexHtml, /id="departmentGrid"/);
  assert.doesNotMatch(indexHtml, /placeholder-pharmaceuticals/);
  assert.match(appJs, /function renderBusinessScenarioCards/);
  assert.match(appJs, /team\.docUrl/);
  assert.match(appJs, /target="_blank"/);

  assert.match(adminHtml, /id="adminBusinessScenarioForm"/);
  assert.match(adminHtml, /id="adminBusinessScenarioTeam"/);
  assert.match(adminHtml, /id="adminBusinessScenarioDocUrl"/);
  assert.match(adminHtml, /name="hostDepartment"/);
  assert.match(adminHtml, /name="focus"/);
  assert.match(adminHtml, /name="deliverable"/);
  assert.match(adminHtml, /name="scenarios"/);
  assert.match(adminJs, /function translateBusinessScenarioText/);
  assert.match(adminJs, /function syncBusinessScenarioEnglish/);
  assert.match(adminJs, /function saveBusinessScenario/);
  assert.match(dataJs, /async function updateTeamScenario/);
  assert.match(dataJs, /\/api\/admin\/teams\/\$\{encodeURIComponent\(teamId\)\}\/scenario/);
  assert.match(css, /\.admin-business-scenario-form/);
});

test("resolveAdjacentTraineeId moves to neighboring profile with wraparound", () => {
  const trainees = [{ id: "a" }, { id: "b" }, { id: "c" }];

  assert.equal(resolveAdjacentTraineeId(trainees, "b", "previous"), "a");
  assert.equal(resolveAdjacentTraineeId(trainees, "b", "next"), "c");
  assert.equal(resolveAdjacentTraineeId(trainees, "a", "previous"), "c");
  assert.equal(resolveAdjacentTraineeId(trainees, "c", "next"), "a");
  assert.equal(resolveAdjacentTraineeId(trainees, "missing", "next"), "a");
});

test("navigation uses the bundled pixel display font", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /@font-face\s*{[\s\S]*font-family:\s*"Press Start 2P"/);
  assert.match(css, /src:\s*url\("\.\/assets\/fonts\/press-start-2p\.ttf"\)/);
  assert.match(css, /--nav-pixel:\s*"Press Start 2P"/);
  assert.match(css, /\.brand-chip,\n\.cohort-mark,\n\.stage-footer span,\n\.stage-footer button\s*{[\s\S]*font-family:\s*var\(--nav-pixel\)/);
  assert.doesNotMatch(css, /\.hackathon-nav/);
});

test("profile arc cards do not use yaw perspective that breaks left-right symmetry", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const profileCardBlock = css.match(/\.profile-card\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.doesNotMatch(profileCardBlock, /rotateY/);
});

test("business scenario cards use five-column briefing layout", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const gridBlock = css.match(/\.department-grid\s*{[\s\S]*?\n}/)?.[0] || "";
  const cardBlock = css.match(/\.dept-card\s*{[\s\S]*?\n}/)?.[0] || "";
  const hoverBlock = css.match(/\.dept-card:hover\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(gridBlock, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(gridBlock, /height:\s*clamp\(500px,\s*61vh,\s*620px\)/);
  assert.match(gridBlock, /transform:\s*translateY\(-8px\)/);
  assert.match(hoverBlock, /transform:\s*translateY\(-6px\)/);
  assert.match(cardBlock, /grid-template-rows:\s*auto auto auto minmax\(18px,\s*1fr\) auto/);
  assert.match(css, /\.dept-status\s*{[\s\S]*?align-self:\s*end/);
  assert.match(css, /\.dept-link-badge\s*{[\s\S]*?margin-top:\s*0/);
  assert.match(css, /\.dept-link-badge\s*{[\s\S]*?justify-content:\s*center/);
  assert.match(html, /id="departmentGrid"/);
  assert.match(appJs, /class="dept-body"/);
  assert.match(appJs, /class="dept-info"/);
  assert.match(appJs, /class="dept-status" aria-hidden="true"/);
  assert.doesNotMatch(html, /五列展示五个赛道/);
});

test("view transitions clear the discover view class before switching stages", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const removeCalls = appJs.match(/appShell\.classList\.remove\([\s\S]*?\);/g) || [];

  assert.ok(removeCalls.length > 0);
  removeCalls.forEach((removeCall) => {
    assert.match(removeCall, /"view-discover"/);
    assert.match(removeCall, /"view-welcome"/);
  });
});

test("positionJasperAtCenter puts Jasper exactly at the center index", () => {
  const trainees = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "jasper" },
    { id: "d" }
  ];

  // Odd length (5): should be at index 2
  const reorderedOdd = positionJasperAtCenter(trainees);
  assert.equal(reorderedOdd[2].id, "jasper");

  // Even length (6): should be at index 2
  const traineesEven = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
    { id: "jasper" },
    { id: "e" }
  ];
  const reorderedEven = positionJasperAtCenter(traineesEven);
  assert.equal(reorderedEven[2].id, "jasper");
});

test("getDetailOrder sorts trainees according to the predefined order from the latest data files", () => {
  const trainees = [
    { id: "li-beibei" },
    { id: "chen-xulin" },
    { id: "gu-lingqian" },
    { id: "zhan-meiling" },
    { id: "zhao-yiming" },
    { id: "jasper" },
    { id: "zhang-rui" },
    { id: "wu-shuo" }
  ];

  const ordered = getDetailOrder(trainees);
  assert.equal(ordered.length, 8);
  assert.equal(ordered[0].id, "jasper");
  assert.equal(ordered[1].id, "zhang-rui");
  assert.equal(ordered[2].id, "gu-lingqian");
  assert.equal(ordered[3].id, "li-beibei");
  assert.equal(ordered[4].id, "zhan-meiling");
  assert.equal(ordered[5].id, "chen-xulin");
  assert.equal(ordered[6].id, "wu-shuo");
  assert.equal(ordered[7].id, "zhao-yiming");

  // Fallback behavior for unknown IDs (should maintain relative order after predefined ones)
  const traineesFallback = [
    { id: "unknown-1" },
    { id: "jasper" },
    { id: "unknown-2" }
  ];
  const orderedFallback = getDetailOrder(traineesFallback);
  assert.equal(orderedFallback[0].id, "jasper");
  assert.equal(orderedFallback[1].id, "unknown-1");
  assert.equal(orderedFallback[2].id, "unknown-2");
});

test("latest trainee data imports all fourteen profile records with local media", () => {
  const dataPath = path.join(__dirname, "../data/trainees.json");
  const trainees = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const ids = trainees.map((trainee) => trainee.id);

  assert.equal(trainees.length, 14);
  assert.deepEqual(ids.slice(-2), ["wu-shuo", "zhao-yiming"]);

  for (const id of ["wu-shuo", "zhao-yiming"]) {
    const trainee = trainees.find((item) => item.id === id);
    assert.ok(trainee, `${id} should exist in trainees.json`);

    for (const field of ["photo", "idPhoto", "memeImage"]) {
      const relativePath = trainee[field].replace(/^\.\//, "");
      assert.ok(fs.existsSync(path.join(__dirname, "..", relativePath)), `${field} should exist for ${id}`);
    }
  }
});
