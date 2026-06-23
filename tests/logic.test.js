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
  getFeishuLoginUiState,
  getMissionCountdownState,
  getRoadshowTimerState,
  getRolePermissions,
  getRoleWorkbenchModel,
  getRoleNavItems,
  computeVoteRanking,
  computeFinalResults,
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

test("computePhotoWallMetrics keeps fourteen trainee cards inside the mobile viewport", () => {
  const metrics = computePhotoWallMetrics({
    total: 14,
    viewportWidth: 652,
    viewportHeight: 817,
  });

  assert.ok(metrics.visualWidth <= metrics.availableWidth);
  assert.ok(metrics.step > 0);
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
  const dataJs = fs.readFileSync(path.join(__dirname, "../src/data.js"), "utf8");

  assert.doesNotMatch(html, /landing-title-main/);
  assert.doesNotMatch(html, /AI黑客松/);
  assert.doesNotMatch(html, /feishuLoginButton/);
  assert.doesNotMatch(html, /landingAuthStatus/);
  assert.match(html, /<button class="enter-button" type="button" id="enterButton"[^>]*>解锁任务<\/button>/);
  assert.match(appJs, /loginWithFeishu/);
  assert.match(dataJs, /JoincareFeishuAuth/);
  assert.match(appJs, /site\.html#home/);
  assert.equal(resolveWelcomeEntryTarget(), "wall");
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

test("official site lets users leave teams and cancel their vote", () => {
  const siteHtml = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteHtml, /site\.js\?v=20260623-cancel-actions-2/);
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
  assert.match(siteJs, /localVoteDeltaTeamId/);
  assert.match(siteCss, /\.team-join\.is-leave/);
  assert.match(siteCss, /\.gl2-vote\.is-cancel/);
  assert.match(siteCss, /\.btn-primary\.is-cancel/);
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
  assert.equal(getRolePermissions("judge").canScore, true);
  assert.equal(getRolePermissions("judge").canVote, false);
  assert.equal(getRolePermissions("public").canJoinTeam, false);
  assert.equal(getRolePermissions("public").canVote, true);
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
  assert.deepEqual(
    getRoleNavItems("player").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("judge").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "judge", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("public").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "vote", "result"],
  );
  assert.deepEqual(
    getRoleNavItems("admin").map((item) => item.key),
    ["home", "people", "schedule", "team", "gallery", "admin", "result"],
  );
});

test("team page treats tracks as fixed lanes and team names as editable", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /固定赛道，队伍自定义命名/);
  assert.match(siteJs, /自定义队伍名称/);
  assert.match(siteJs, /队长可编辑队名/);
  assert.match(siteJs, /team-name-draft/);
  assert.match(siteCss, /\.team-name-draft/);
});

test("team page explains that work submission belongs to the team workspace", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.match(siteJs, /队伍工作台 \/ 作品提交/);
  assert.match(siteJs, /作品展厅只展示/);
  assert.match(siteCss, /\.team-submit/);
});

test("stage screen routing opens the vote progress and result screens", () => {
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
  assert.match(appJs, /computeFinalResults/);
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

test("final result screen reserves enough vertical room for the champion showcase", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");

  assert.match(css, /\.final-result-stage\s*\{[^}]*--final-result-footer-safe:\s*clamp\(92px,\s*9vh,\s*116px\)/s);
  assert.match(css, /\.final-result-stage\s*\{[^}]*--final-result-cockpit-height:\s*min\(760px,\s*calc\(100vh - clamp\(162px,\s*17vh,\s*204px\)\)\)/s);
  assert.match(css, /\.final-result-hub-wrap\s*\{[^}]*padding-top:\s*clamp\(72px,\s*7vh,\s*92px\)[^}]*padding-bottom:\s*var\(--final-result-footer-safe\)/s);
  assert.match(css, /\.final-result-cockpit\s*\{[^}]*height:\s*var\(--final-result-cockpit-height\)/s);
  assert.match(css, /\.final-result-cockpit\s*\{[^}]*max-height:\s*var\(--final-result-cockpit-height\)/s);
  assert.match(css, /\.final-result-champion\s*\{[^}]*gap:\s*clamp\(9px,\s*1\.15vh,\s*16px\)[^}]*padding:\s*clamp\(22px,\s*2\.6vw,\s*38px\)/s);
  assert.match(css, /\.final-result-score strong\s*\{[^}]*font-size:\s*clamp\(66px,\s*6vw,\s*116px\)/s);
  assert.match(css, /@media \(max-height:\s*780px\)\s*\{[\s\S]*?\.final-result-champion\s*\{[^}]*gap:\s*7px[^}]*padding:\s*clamp\(18px,\s*2vw,\s*28px\)/s);
  assert.match(css, /@media \(max-height:\s*780px\)\s*\{[\s\S]*?\.final-result-score strong\s*\{[^}]*font-size:\s*clamp\(58px,\s*5\.2vw,\s*96px\)/s);
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
  assert.match(siteJs, /36小时，把 AI 创意做成可运行系统/);
  assert.match(siteJs, /参赛伙伴图鉴/);
  assert.match(siteJs, /看懂比赛怎么进行/);
  assert.match(siteJs, /key: "people", label: "星锐"/);
  assert.match(siteJs, /class="mh-agenda"/);
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

test("mobile voting and judge scoring avoid heart cues and use draggable sliders", () => {
  const siteJs = fs.readFileSync(path.join(__dirname, "../src/site.js"), "utf8");
  const screenJs = fs.readFileSync(path.join(__dirname, "../src/screen.js"), "utf8");
  const siteCss = fs.readFileSync(path.join(__dirname, "../src/site.css"), "utf8");

  assert.doesNotMatch(`${siteJs}\n${screenJs}`, /♥/);
  assert.match(siteJs, /type="range"/);
  assert.match(siteJs, /function updateJudgeRange\(/);
  assert.match(siteCss, /\.judge-slider/);
  assert.match(siteCss, /\.team-live-strip/);
  assert.match(siteCss, /\.mobile-tabbar\s*{[\s\S]*bottom:\s*0/);
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
  assert.match(siteJs, /function requireRole\(/);
  assert.match(siteJs, /function showAuthGate\(/);
  assert.match(siteJs, /wantsAuthChooser\(\)/);
  assert.doesNotMatch(siteJs, /root\.localStorage\.setItem\(ROLE_KEY, "public"\)/);
  assert.match(siteJs, /\/api\/auth\/feishu\/login/);
  assert.match(siteJs, /\/api\/me/);
  assert.match(siteJs, /data-auth-role/);
  assert.match(siteJs, /if \(!requireRole\("vote", \(p\) => p\.canVote/);
  assert.match(siteJs, /if \(!requireRole\("team", \(p\) => p\.canJoinTeam/);
  assert.match(siteJs, /if \(!requireRole\("judge", \(p\) => p\.canScore/);
  assert.doesNotMatch(siteJs, /if \(!currentRole\(\)\) showAuthGate\("entry"\)/);
});

test("official site cache keys are bumped after home polish", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site.html"), "utf8");

  assert.match(html, /src\/site\.css\?v=20260623-cancel-actions/);
  assert.match(html, /src\/logic\.js\?v=20260623-cancel-actions/);
  assert.match(html, /src\/site\.js\?v=20260623-cancel-actions-2/);
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
  assert.match(html, /<button class="enter-button" type="button" id="enterButton"[^>]*>解锁任务<\/button>/);
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

test("home demo final nav opens the roadshow timer stage", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const navBlock = html.match(/<nav class="hackathon-nav"[\s\S]*?<\/nav>/)?.[0] || "";

  assert.match(navBlock, /<button type="button" data-view-target="roadshow">DEMO FINAL<\/button>/);
  assert.doesNotMatch(navBlock, /data-discover-target="awards">DEMO&amp;AWARDS/);
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
  assert.equal(resolveStageScreenView("vote"), "vote");
  assert.equal(resolveStageScreenView("result"), "vote-result");
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

test("team formation keeps static fallback content while backend teams sync", () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

  assert.match(appJs, /function getFallbackTeamState\(/);
  assert.match(appJs, /let teamState = getFallbackTeamState\(\)/);
  assert.match(appJs, /window\.AppData\.loadTeams\(getFallbackTeamState\(\)\)/);
  assert.doesNotMatch(appJs, /window\.AppData\.loadTeams\(\[\]\)/);
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
  assert.match(countdownSection, /START MISSION/);
  assert.match(countdownSection, /data-view-target="team"[\s\S]*?BACK TO TEAM FORMATION/);
  assert.match(appJs, /countdown:\s*document\.getElementById\("countdownStage"\)/);
  assert.match(appJs, /countdown:\s*createRain\("countdownRain"/);
  assert.match(appJs, /handleCountdownStart/);
  assert.match(appJs, /joincare_mission_countdown_started_at_manual_v2/);
  assert.match(appJs, /window\.AppData\.loadMissionCountdown/);
  assert.match(appJs, /window\.AppData\.startMissionCountdown/);
  assert.match(appJs, /startCountdownClock/);
  assert.match(appJs, /stopCountdownClock/);
  assert.match(appJs, /if\s*\(!readCountdownStartedAt\(\)\)\s*{[\s\S]*?stopCountdownClock\(\);/);
  assert.match(dataJs, /async function loadMissionCountdown/);
  assert.match(dataJs, /async function startMissionCountdown/);
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
  assert.match(appJs, /resolveNextRoadshowTeam/);
  assert.match(appJs, /syncRoadshowTimer/);
  assert.match(appJs, /handleRoadshowStart/);
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
  assert.match(css, /\.roadshow-member-seat/);
  assert.match(css, /\.roadshow-member-avatar/);
  assert.match(css, /\.roadshow-member-avatar\.is-placeholder/);
  assert.match(css, /\.roadshow-member-avatar\.has-photo/);
  assert.match(css, /\.roadshow-member-status/);
  assert.match(css, /\.roadshow-timer-digits/);
  assert.doesNotMatch(css, /\.app-shell\.view-roadshow\s+\.roadshow-stage\s*>\s*\.stage-header[\s\S]*?display:\s*none/);
});

test("mission countdown state formats a 24 hour window", () => {
  const countdown = getMissionCountdownState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-01T06:15:09.000Z"),
  });

  assert.deepEqual(countdown, {
    hours: "17",
    minutes: "44",
    seconds: "51",
    progress: 0.2605,
    remainingMs: 63891000,
    isComplete: false,
  });

  assert.deepEqual(getMissionCountdownState({
    startedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    now: Date.parse("2026-01-02T00:00:01.000Z"),
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
  assert.match(appJs, /抢顾问位/);
  assert.match(appJs, /我的顾问位/);
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
