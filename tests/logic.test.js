const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  positionJasperAtCenter,
  getDetailOrder,
  computeArcLayout,
  computeDockTransforms,
  computePhotoWallMetrics,
  getIntroTiming,
  nextIntroState,
  normalizeTrainee,
  pickKeywordPair,
  pickKeywordPairAB,
  createAdminStageSyncKey,
  resolveLandingCtaTarget,
  resolveAdjacentTraineeId,
  shouldApplyAdminStageChange,
  resolveDiscoverTarget,
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

test("landing CTA is wired for seamless Feishu auth", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.doesNotMatch(html, /landing-title-main/);
  assert.doesNotMatch(html, /AI黑客松/);
  assert.doesNotMatch(html, /feishuLoginButton/);
  assert.match(appJs, /飞书登录中/);
  assert.match(appJs, /site\.html#home/);
  assert.equal(resolveWelcomeEntryTarget(), "wall");
});

test("official site opens directly without the duplicate intro gate", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(html, /id="siteIntro"/);
  assert.doesNotMatch(html, /id="siteSkip"/);
  assert.doesNotMatch(html, /id="siteEnter"/);
  assert.match(siteCss, /overflow-y:\s*auto/);
});

test("terminal boot welcome stage is wired into the HTML", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(html, /<section class="welcome-stage" id="welcomeStage"/);
  assert.match(html, /id="welcomeRain"/);
  assert.match(html, /BOOTING HACKATHON_PROTOCOL_2026/);
  assert.match(html, /进入未来伙伴档案/);
});

test("admin console keeps the event control cockpit structure wired", () => {
  const html = fs.readFileSync(path.join(__dirname, "../admin.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../admin.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(html, /<aside class="admin-sidebar"/);
  assert.match(html, /流程控制台/);
  assert.match(html, /大屏预览/);
  assert.match(html, /安全确认/);
  assert.match(html, /操作日志/);
  assert.match(css, /--neon:\s*#28ffc8/);
  assert.match(css, /\.admin-nav button\.is-active/);
  assert.match(js, /name:\s*"组队开启"/);
  assert.match(js, /data-stage-command/);
});

test("landing stage starts with its main CTA visible and clickable", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const landingOpenTag = html.match(/<section class="[^"]*" id="landingStage"/)?.[0] || "";

  assert.doesNotMatch(landingOpenTag, /backdrop-mode/);
});

test("landing logo keeps a static icon fallback when admin state skips the intro animation", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const fallbackBlock = css.match(/\.landing-logo-container::before\s*{[\s\S]*?\n}/)?.[0] || "";
  const revealBlock = css.match(/\/\* Homepage elements entrance animations \*\/[\s\S]*?\.app-shell\.view-intro-exit \.landing-logo-canvas/)?.[0] || "";

  assert.match(fallbackBlock, /joincare-full-clean\.png/);
  assert.match(fallbackBlock, /width:\s*47%/);
  assert.match(fallbackBlock, /background-size:\s*212\.77% 100%/);
  assert.match(revealBlock, /\.app-shell\.view-home \.landing-logo-container::before/);
  assert.match(revealBlock, /\.app-shell\.view-intro-exit \.landing-logo-container::before/);
  assert.match(css, /\.app-shell\.view-home \.landing-logo-container::before,[\s\S]*?opacity:\s*0\.98/);
  assert.match(css, /\.app-shell\.view-home \.landing-logo-text\s*{[\s\S]*?clip-path:\s*inset\(0 0 0 0\)/);
});

test("landing hero uses the merged two-line cinematic hierarchy", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const logoBlock = css.match(/\.landing-logo-container\s*{[\s\S]*?\n}/)?.[0] || "";
  const enterButtonBlock = css.match(/\.enter-button,\n\.discover-button,\n\.feishu-login-button\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.doesNotMatch(html, /landing-title-main/);
  assert.doesNotMatch(html, /AI黑客松<\/span>/);
  assert.match(html, /<span class="landing-title-cn">AI创新黑客松大赛2026<\/span>/);
  assert.match(html, /<span class="landing-title-en">AI Innovation Hackathon 2026<\/span>/);
  assert.match(html, /<button class="enter-button" type="button" id="enterButton">开始<\/button>/);
  assert.match(logoBlock, /top:\s*26%/);
  assert.match(logoBlock, /width:\s*min\(38vw,\s*600px\)/);
  assert.match(css, /\.landing-stage::before\s*{[\s\S]*?centered light field/);
  assert.match(css, /\.landing-content::before\s*{[\s\S]*?content:\s*none/);
  assert.match(css, /\.landing-content::after\s*{[\s\S]*?content:\s*none/);
  assert.match(css, /\.landing-title-cn\s*{[\s\S]*?font-size:\s*clamp\(40px,\s*4\.6vw,\s*82px\)/);
  assert.match(css, /\.landing-title-en\s*{[\s\S]*?font-size:\s*clamp\(28px,\s*3vw,\s*50px\)/);
  assert.match(css, /\.app-shell\.view-home \.landing-title\s*{[\s\S]*?animation:\s*none/);
  assert.match(css, /\.app-shell\.view-home \.landing-title\s*{[\s\S]*?opacity:\s*1/);
  assert.match(enterButtonBlock, /width:\s*clamp\(220px,\s*18vw,\s*292px\)/);
  assert.match(enterButtonBlock, /border-radius:\s*8px/);
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
  assert.equal(resolveStageScreenView("opening"), "welcome");
  assert.equal(resolveStageScreenView("icebreaker"), "wall");
  assert.equal(resolveStageScreenView("speech"), "home");
  assert.equal(resolveStageScreenView("tracks"), "discover");
  assert.equal(resolveStageScreenView("team"), "team");
  assert.equal(resolveStageScreenView("vote"), "home");
  assert.equal(resolveStageScreenView("result"), "home");
  assert.equal(resolveStageScreenView("unknown"), "");
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
  assert.match(dataJs, /loadAdminState,/);
  assert.match(dataJs, /updateAdminStage,/);
});

test("admin console publishes phase changes through the admin state API", () => {
  const js = fs.readFileSync(path.join(__dirname, "../src/admin.js"), "utf8");

  assert.match(js, /window\.AppData\.loadAdminState\(\)/);
  assert.match(js, /window\.AppData\.updateAdminStage\(stageId\)/);
  assert.match(js, /catch\s*\(error\)[\s\S]*同步失败/);
});

test("main screen polls admin state and switches views only on stage changes", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /window\.AppData\.loadAdminState\(\)/);
  assert.match(appJs, /window\.AppLogic\.createAdminStageSyncKey\(stageId,\s*state\.updatedAt\)/);
  assert.match(appJs, /window\.AppLogic\.shouldApplyAdminStageChange\(lastAdminStageSyncKey,\s*stageSyncKey\)/);
  assert.match(appJs, /if\s*\(!shouldSwitchStage\)\s*{[\s\S]*?return;/);
  assert.match(appJs, /window\.AppLogic\.resolveStageScreenView\(state\.currentStageId\)/);
  assert.match(appJs, /lastAdminStageSyncKey/);
  assert.match(appJs, /window\.setInterval\(pollAdminState/);
});

test("discover header links to talent profiles and the team formation screen", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const discoverSection = html.match(/<section class="discover-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";

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

test("team formation screen uses a restrained five-column command cabin layout", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const stageBlock = css.match(/\.team-stage\s*{[\s\S]*?\n}/)?.[0] || "";
  const wrapBlock = css.match(/\.team-hub-wrap\s*{[\s\S]*?\n}/)?.[0] || "";
  const gridBlock = css.match(/\.team-grid\s*{[\s\S]*?\n}/)?.[0] || "";
  const trackBlock = css.match(/\.team-track-card\s*{[\s\S]*?\n}/)?.[0] || "";
  const advisorBlock = css.match(/\.team-advisor-card\s*{[\s\S]*?\n}/)?.[0] || "";
  const memberListBlock = css.match(/\.team-member-list\s*{[\s\S]*?\n}/)?.[0] || "";
  const memberCardBlock = css.match(/\.team-member-card\s*{[\s\S]*?\n}/)?.[0] || "";
  const avatarBlock = css.match(/\.team-member-avatar\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(stageBlock, /grid-template-rows:\s*auto 1fr auto/);
  assert.match(css, /\.app-shell\[data-view="team"\]\s*>\s*\.team-stage/);
  assert.match(css, /\.app-shell\.view-team\s*>\s*\.team-stage/);
  assert.match(wrapBlock, /padding:\s*clamp\(70px,\s*7\.4vh,\s*96px\)\s+clamp\(28px,\s*3\.8vw,\s*56px\)\s+clamp\(56px,\s*6\.2vh,\s*76px\)/);
  assert.match(gridBlock, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(gridBlock, /height:\s*min\(640px,\s*calc\(100vh - 250px\)\)/);
  assert.match(trackBlock, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
  assert.match(trackBlock, /border-top:\s*1px solid rgba\(var\(--team-color-rgb\),\s*0\.58\)/);
  assert.match(trackBlock, /background:[\s\S]*rgba\(3,\s*14,\s*18,\s*0\.76\)/);
  assert.doesNotMatch(trackBlock, /0 20px 50px/);
  assert.match(css, /\.team-role-label\s*{[\s\S]*?color:\s*var\(--team-color\)/);
  assert.match(advisorBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(advisorBlock, /background:[\s\S]*rgba\(var\(--team-color-rgb\),\s*0\.08\)/);
  assert.match(advisorBlock, /min-height:\s*clamp\(92px,\s*10\.6vh,\s*120px\)/);
  assert.match(memberListBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(memberListBlock, /grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(memberCardBlock, /grid-template-columns:\s*1fr/);
  assert.match(memberCardBlock, /align-content:\s*space-between/);
  assert.match(avatarBlock, /background-image:\s*var\(--avatar-image\)/);
});

test("business scenario cards use the requested 02-03-04 accent rotation", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const medicineCard = html.match(/<a href="https:\/\/joincare\.feishu\.cn\/docx\/placeholder-medicine"[\s\S]*?<\/a>/)?.[0] || "";
  const marketingCard = html.match(/<a href="https:\/\/joincare\.feishu\.cn\/docx\/placeholder-marketing"[\s\S]*?<\/a>/)?.[0] || "";
  const functionsCard = html.match(/<a href="https:\/\/joincare\.feishu\.cn\/docx\/placeholder-functions"[\s\S]*?<\/a>/)?.[0] || "";

  assert.match(medicineCard, /--dept-color:\s*rgb\(205,\s*255,\s*92\)/);
  assert.match(medicineCard, /--dept-color-rgb:\s*205,\s*255,\s*92/);
  assert.match(marketingCard, /--dept-color:\s*rgb\(100,\s*232,\s*214\)/);
  assert.match(marketingCard, /--dept-color-rgb:\s*100,\s*232,\s*214/);
  assert.match(functionsCard, /--dept-color:\s*var\(--neon-2\)/);
  assert.match(functionsCard, /--dept-color-rgb:\s*167,\s*255,\s*79/);
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
  assert.match(css, /\.hackathon-nav button\s*{[\s\S]*font-family:\s*var\(--nav-pixel\)/);
});

test("profile arc cards do not use yaw perspective that breaks left-right symmetry", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const profileCardBlock = css.match(/\.profile-card\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.doesNotMatch(profileCardBlock, /rotateY/);
});

test("business scenario cards use five-column briefing layout", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
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
  assert.match(html, /class="dept-body"/);
  assert.match(html, /class="dept-info"/);
  assert.match(html, /class="dept-status" aria-hidden="true"/);
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
    { id: "jasper" },
    { id: "zhang-rui" }
  ];

  const ordered = getDetailOrder(trainees);
  assert.equal(ordered.length, 6);
  assert.equal(ordered[0].id, "jasper");
  assert.equal(ordered[1].id, "zhang-rui");
  assert.equal(ordered[2].id, "gu-lingqian");
  assert.equal(ordered[3].id, "li-beibei");
  assert.equal(ordered[4].id, "zhan-meiling");
  assert.equal(ordered[5].id, "chen-xulin");

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
