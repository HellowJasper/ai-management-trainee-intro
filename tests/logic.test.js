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
  resolveAdjacentTraineeId,
  resolveDiscoverTarget,
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

test("official site exposes all requested PC pages in the SPA router", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /const TEAM_KEY = "joincare_hackathon_team"/);
  assert.match(siteJs, /const JUDGE_KEY = "joincare_hackathon_judge_scores"/);
  assert.match(siteJs, /function renderMe\(/);
  assert.match(siteJs, /function renderTeam\(/);
  assert.match(siteJs, /function renderSchedule\(/);
  assert.match(siteJs, /function renderVote\(/);
  assert.match(siteJs, /function renderJudge\(/);

  assert.match(siteJs, /key:\s*"schedule", label:\s*"赛程"/);
  assert.match(siteJs, /key:\s*"team", label:\s*"组队"/);
  assert.match(siteJs, /key:\s*"vote", label:\s*"投票"/);
  assert.match(siteJs, /key:\s*"judge", label:\s*"评委评分"/);
});

test("official site wires my page, team join and judge score interactions", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");

  assert.match(siteJs, /if \(e\.target\.closest\("#navLogin"\)\) \{ go\("me"\); return; \}/);
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

test("team page uses a symmetric five-column desktop layout", () => {
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteCss, /\.team-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(siteCss, /\.team-card\s*{[\s\S]*min-height:\s*440px/);
  assert.match(siteCss, /\.team-roster\s*{[\s\S]*justify-content:\s*center/);
});

test("official site includes a mobile app shell with bottom tab navigation", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(html, /id="mobileTabbar"/);
  assert.match(siteJs, /const MOBILE_TABS = \[/);
  assert.match(siteJs, /mobileTabbar\.innerHTML/);
  assert.match(siteJs, /mobileTabbar\.querySelectorAll\("a"\)/);
  assert.match(siteCss, /\.mobile-tabbar/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.mobile-tabbar\s*{[\s\S]*position:\s*fixed/);
  assert.match(siteCss, /\.mobile-tabbar\s+a\s*{[\s\S]*min-width:\s*0/);
});

test("mobile site opens on event home and uses a natural swipe-card browser", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /function renderMobileHome\(/);
  assert.match(siteJs, /function renderMobilePeople\(/);
  assert.match(siteJs, /function renderMobileTraineeDetail\(/);
  assert.match(siteJs, /function setMobileTrainee\(/);
  assert.match(siteJs, /function bindMobileSwipeDeck\(/);
  assert.match(siteJs, /pointerdown/);
  assert.match(siteJs, /pointerup/);
  assert.match(siteJs, /data-mobile-swipe-deck/);
  assert.match(siteJs, /data-mobile-card-detail/);
  assert.match(siteJs, /data-mobile-detail-close/);
  assert.match(siteJs, /mobile-card-photo/);
  assert.match(siteJs, /traineeLifeImage/);
  assert.match(siteJs, /root\.matchMedia\("\(max-width: 680px\)"\)/);
  assert.match(siteCss, /\.mobile-home/);
  assert.match(siteCss, /\.mobile-people-stage/);
  assert.match(siteCss, /\.mobile-profile-detail/);
  assert.match(siteCss, /\.mobile-swipe-deck/);
  assert.match(siteCss, /\.mobile-card-photo\s*{[\s\S]*object-fit:\s*contain/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.site-body\[data-view="home"\] \.hero,[\s\S]*\.site-body\[data-view="home"\] \.sec\s*{[\s\S]*display:\s*none/);
  assert.match(siteCss, /@media \(max-width:\s*680px\)[\s\S]*\.mobile-people-stage\s*{[\s\S]*display:\s*flex/);
  assert.doesNotMatch(siteJs, /data-mobile-card-nav/);
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
  assert.match(siteJs, /function hydrateRole\(/);
  assert.match(siteJs, /function requireAuth\(/);
  assert.match(siteJs, /function showAuthGate\(/);
  assert.match(siteJs, /wantsAuthChooser\(\)/);
  assert.match(siteJs, /root\.localStorage\.setItem\(ROLE_KEY, "public"\)/);
  assert.match(siteJs, /data-auth-role/);
  assert.match(siteJs, /if \(!requireAuth\("vote"\)\) return/);
  assert.match(siteJs, /if \(!requireAuth\("team"\)\) return/);
  assert.match(siteJs, /if \(!requireAuth\("judge"\)\) return/);
  assert.doesNotMatch(siteJs, /if \(!currentRole\(\)\) showAuthGate\("entry"\)/);
});

test("official site cache keys are bumped after mobile shell expansion", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");

  assert.match(html, /src\/site\.css\?v=20260618-05/);
  assert.match(html, /src\/site\.js\?v=20260618-05/);
});

test("terminal boot welcome stage is wired into the HTML", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(html, /<section class="welcome-stage" id="welcomeStage"/);
  assert.match(html, /id="welcomeRain"/);
  assert.match(html, /BOOTING HACKATHON_PROTOCOL_2026/);
  assert.match(html, /进入未来伙伴档案/);
});

test("landing stage starts with its main CTA visible and clickable", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const landingOpenTag = html.match(/<section class="[^"]*" id="landingStage"/)?.[0] || "";

  assert.doesNotMatch(landingOpenTag, /backdrop-mode/);
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

test("discover header links to talent profiles and a pending next section", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const discoverSection = html.match(/<section class="discover-stage"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || "";

  assert.match(discoverSection, /<button class="brand-chip" type="button" data-view-target="wall">/);
  assert.match(discoverSection, /<button class="cohort-mark" type="button" data-discover-target="awards">5 CORE SECTORS<\/button>/);
});

test("general functions card uses the requested cyan accent", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const functionsCard = html.match(/<a href="https:\/\/joincare\.feishu\.cn\/docx\/placeholder-functions"[\s\S]*?<\/a>/)?.[0] || "";

  assert.match(functionsCard, /--dept-color:\s*rgb\(100,\s*232,\s*214\)/);
  assert.match(functionsCard, /--dept-color-rgb:\s*100,\s*232,\s*214/);
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

test("business scenario cards use original compact layout parameters", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const iconBlock = css.match(/\.dept-icon-glow\s*{[\s\S]*?\n}/)?.[0] || "";
  const badgeBlock = css.match(/\.dept-link-badge\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(iconBlock, /font-size:\s*36px/);
  assert.match(iconBlock, /opacity:\s*0\.65/);
  assert.match(badgeBlock, /align-self:\s*flex-start/);
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
