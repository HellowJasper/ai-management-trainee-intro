const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  computeArcLayout,
  computeDockTransforms,
  computePhotoWallMetrics,
  getIntroTiming,
  nextIntroState,
  normalizeTrainee,
  pickKeywordPair,
  resolveAdjacentTraineeId,
  resolveDiscoverTarget,
  toggleProfileMedia,
  updateSentence,
} = require("../src/logic.js");

test("computeArcLayout places every card on a continuous circular arc", () => {
  const layout = computeArcLayout(12, {
    maxLift: 84,
    maxRotation: 5.8,
  });

  assert.equal(layout.length, 12);
  assert.ok(layout[0].x < layout[1].x);
  assert.ok(layout[5].x < layout[6].x);
  assert.ok(layout[10].x < layout[11].x);
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

  assert.ok(Math.abs(metrics.cardHeight / metrics.cardWidth - 4 / 3) < 0.002);
  assert.ok(metrics.visualWidth <= metrics.availableWidth);
  assert.ok(metrics.step > 0);
  assert.ok(metrics.step < metrics.cardWidth);
  assert.ok(metrics.maxLift >= metrics.cardHeight * 0.16);
  assert.ok(metrics.maxRotation >= 3.2);
  assert.ok(metrics.maxRotation <= 6);
});

test("pickKeywordPair returns two different keywords and avoids previously used pairs", () => {
  const keywords = ["咖啡", "自动化", "提示词", "会议纪要"];
  const pair = pickKeywordPair(keywords, [["咖啡", "自动化"]], 2);

  assert.equal(pair.length, 2);
  assert.notEqual(pair[0], pair[1]);
  assert.notDeepEqual(pair, ["咖啡", "自动化"]);
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
  assert.equal(trainee.memeImage, "./assets/trainees/song-lan/meme.png");
  assert.equal(trainee.meme, "ALIGN?");
});

test("toggleProfileMedia switches between photo and meme", () => {
  assert.equal(toggleProfileMedia("photo"), "meme");
  assert.equal(toggleProfileMedia("meme"), "photo");
});

test("nextIntroState moves from intro to home", () => {
  assert.equal(nextIntroState({ skipped: false }), "home");
  assert.equal(nextIntroState({ skipped: true }), "home");
});

test("getIntroTiming keeps the loading hold and crossfade durations explicit", () => {
  assert.deepEqual(getIntroTiming(), {
    holdMs: 4000,
    exitMs: 1200,
  });
});

test("resolveDiscoverTarget accepts known discover menu targets", () => {
  assert.equal(resolveDiscoverTarget("business"), "business");
  assert.equal(resolveDiscoverTarget("awards"), "awards");
  assert.equal(resolveDiscoverTarget("unknown"), "home");
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
