const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createTeamRepository } = require("../server/teamRepository");

async function createTempTeamFile(initialData) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-json-teams-"));
  const dataPath = path.join(tempDir, "teams.json");
  await fs.writeFile(dataPath, `${JSON.stringify(initialData, null, 2)}\n`);
  return dataPath;
}

test("JSON team repository preserves concurrent joins for different users", async () => {
  const dataPath = await createTempTeamFile([
    {
      id: "marketing",
      name: "营销",
      capacity: 4,
      status: "open",
      advisor: null,
      members: [],
    },
  ]);
  const repository = createTeamRepository(dataPath);
  const users = Array.from({ length: 3 }, (_, index) => ({
    teamId: "marketing",
    userId: `player-${index + 1}`,
    name: `选手 ${index + 1}`,
    role: "队友",
  }));

  await Promise.all(users.map((payload) => repository.joinTeam(payload)));

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const team = stored.find((item) => item.id === "marketing");
  assert.equal(team.members.length, users.length);
  assert.deepEqual(
    team.members.map((member) => member.userId).sort(),
    users.map((user) => user.userId).sort(),
  );
});

test("JSON team repository defaults to one leader plus three members", async () => {
  const dataPath = await createTempTeamFile([
    {
      id: "marketing",
      name: "营销",
      status: "open",
      advisor: { userId: "leader-1", name: "队长", role: "队长" },
      members: [
        { userId: "player-1", name: "选手 1", role: "队友" },
        { userId: "player-2", name: "选手 2", role: "队友" },
        { userId: "player-3", name: "选手 3", role: "队友" },
      ],
    },
  ]);
  const repository = createTeamRepository(dataPath);

  await assert.rejects(
    () => repository.joinTeam({ teamId: "marketing", userId: "player-4", name: "选手 4" }),
    /Team marketing is already full/,
  );
});

test("JSON team repository blocks moving a player out of a locked source team", async () => {
  const dataPath = await createTempTeamFile([
    {
      id: "marketing",
      name: "营销",
      capacity: 4,
      status: "locked",
      advisor: null,
      members: [{ userId: "player-1", name: "选手 1", role: "队友" }],
    },
    {
      id: "functions",
      name: "职能",
      capacity: 4,
      status: "open",
      advisor: null,
      members: [],
    },
  ]);
  const repository = createTeamRepository(dataPath);

  await assert.rejects(
    () => repository.joinTeam({ teamId: "functions", userId: "player-1", name: "选手 1" }),
    /Team marketing is locked/,
  );

  const stored = JSON.parse(await fs.readFile(dataPath, "utf8"));
  assert.equal(stored.find((team) => team.id === "marketing").members.length, 1);
  assert.equal(stored.find((team) => team.id === "functions").members.length, 0);
});
