const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeArcLayout,
  computeDockTransforms,
  computePhotoWallMetrics,
  pickKeywordPair,
  updateSentence,
} = require("../src/logic.js");

test("computeArcLayout spreads cards in a shallow readable arc", () => {
  const layout = computeArcLayout(12);

  assert.equal(layout.length, 12);
  assert.ok(layout[0].x < layout[1].x);
  assert.ok(layout[5].x < layout[6].x);
  assert.ok(layout[10].x < layout[11].x);
  assert.ok(Math.abs(layout[0].rotation) <= 5);
  assert.ok(Math.abs(layout[11].rotation) <= 5);
  assert.ok(layout[5].lift < layout[0].lift);
  assert.ok(layout[6].lift < layout[11].lift);
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

test("computePhotoWallMetrics keeps twelve large cards inside a narrow viewport", () => {
  const metrics = computePhotoWallMetrics({
    total: 12,
    viewportWidth: 652,
    viewportHeight: 817,
  });

  assert.ok(metrics.cardWidth >= 66);
  assert.ok(metrics.portraitHeight >= 235);
  assert.ok(metrics.visualWidth <= metrics.availableWidth);
  assert.ok(metrics.cardWidth - metrics.step <= 20);
  assert.ok(metrics.maxRotation >= 3.2);
  assert.ok(metrics.maxRotation <= 4.8);
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
