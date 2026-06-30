const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createVoteResultsRepository } = require("../server/voteResultsRepository");

async function createTempVoteFile(initialData) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-json-votes-"));
  const dataPath = path.join(tempDir, "vote-results.json");
  await fs.writeFile(dataPath, `${JSON.stringify(initialData, null, 2)}\n`);
  return dataPath;
}

test("JSON vote repository preserves concurrent votes from different users", async () => {
  const dataPath = await createTempVoteFile({
    pointScale: [100, 85, 70, 55, 40],
    status: "voting",
    results: [
      { id: "marketing", name: "营销", votes: 0 },
    ],
    voters: {},
  });
  const repository = createVoteResultsRepository(dataPath);
  const users = Array.from({ length: 20 }, (_, index) => `public-${index + 1}`);

  await Promise.all(users.map((userId) => repository.castVote({ teamId: "marketing", userId })));

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored.results.find((team) => team.id === "marketing").votes, users.length);
  assert.equal(Object.keys(stored.voters).length, users.length);
  users.forEach((userId) => {
    assert.equal(stored.voters[userId], "marketing");
  });
});

test("JSON vote repository reads wait for queued vote writes", async () => {
  const dataPath = await createTempVoteFile({
    pointScale: [100, 85, 70, 55, 40],
    status: "voting",
    results: [
      { id: "marketing", name: "营销", votes: 0 },
    ],
    voters: {},
  });
  const repository = createVoteResultsRepository(dataPath);

  const castPromise = repository.castVote({ teamId: "marketing", userId: "public-queued" });
  const listed = await repository.listVoteResults();
  await castPromise;

  assert.equal(listed.results.find((team) => team.id === "marketing").votes, 1);
  assert.equal(listed.voters["public-queued"], "marketing");
});
