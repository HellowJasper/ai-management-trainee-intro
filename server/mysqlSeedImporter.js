const fs = require("node:fs/promises");
const path = require("node:path");
const { createMysqlPool } = require("./mysqlClient");

const DEFAULT_DATA_DIR = path.join(__dirname, "../data");
const DEFAULT_WINDOW_ID = "main";

async function readJsonFile(dataDir, filename, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, filename), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function asArray(payload, key) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload[key])) {
    return payload[key];
  }
  return [];
}

function clean(value) {
  return String(value || "").trim();
}

function json(value, fallback) {
  return JSON.stringify(typeof value === "undefined" ? fallback : value);
}

function toMysqlDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function memberUserId(teamId, member, index, prefix = "member") {
  return clean(member.userId || member.id || member.openId || member.unionId || `${teamId}-${prefix}-${index + 1}`);
}

async function seedTrainees(pool, trainees) {
  let count = 0;
  for (const [index, trainee] of trainees.entries()) {
    const id = clean(trainee.id);
    if (!id) {
      continue;
    }
    await pool.execute(
      `INSERT INTO trainees
        (id, name, roman_name, department, department_en, sentence, sort_order, profile_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        roman_name = VALUES(roman_name),
        department = VALUES(department),
        department_en = VALUES(department_en),
        sentence = VALUES(sentence),
        sort_order = VALUES(sort_order),
        profile_json = VALUES(profile_json),
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        clean(trainee.name),
        clean(trainee.romanName),
        clean(trainee.department),
        clean(trainee.departmentEn),
        clean(trainee.sentence),
        index,
        json({ ...trainee, id }, {}),
      ],
    );
    count += 1;
  }
  return count;
}

async function seedTeams(pool, teams) {
  let teamCount = 0;
  let memberCount = 0;

  for (const [index, team] of teams.entries()) {
    const teamId = clean(team.id);
    if (!teamId) {
      continue;
    }
    await pool.execute(
      `INSERT INTO teams
        (id, name, track_code, track_name, project, status, capacity, sort_order, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        track_code = VALUES(track_code),
        track_name = VALUES(track_name),
        project = VALUES(project),
        status = VALUES(status),
        capacity = VALUES(capacity),
        sort_order = VALUES(sort_order),
        meta_json = VALUES(meta_json),
        updated_at = CURRENT_TIMESTAMP`,
      [
        teamId,
        clean(team.name),
        clean(team.index || team.trackCode),
        clean(team.nameEn || team.trackName),
        clean(team.project),
        clean(team.status || "open"),
        Number(team.capacity || 5),
        index,
        json(team, {}),
      ],
    );
    teamCount += 1;

    const advisor = team.advisor ? [{ ...team.advisor, isAdvisor: true }] : [];
    const members = [...advisor, ...asArray(team.members, "members")];
    for (const [memberIndex, member] of members.entries()) {
      const isAdvisor = Boolean(member.isAdvisor);
      await pool.execute(
        `INSERT INTO team_members
          (team_id, user_id, name, department, role_key, duty, photo_url, role, is_advisor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          department = VALUES(department),
          role_key = VALUES(role_key),
          duty = VALUES(duty),
          photo_url = VALUES(photo_url),
          role = VALUES(role),
          is_advisor = VALUES(is_advisor),
          updated_at = CURRENT_TIMESTAMP`,
        [
          teamId,
          memberUserId(teamId, member, memberIndex, isAdvisor ? "advisor" : "member"),
          clean(member.name),
          clean(member.department),
          clean(isAdvisor ? "advisor" : member.roleKey) || null,
          clean(member.duty || member.role),
          clean(member.photo || member.avatar || member.photoUrl),
          clean(member.role || (isAdvisor ? "赛道顾问" : "队友")),
          isAdvisor,
        ],
      );
      memberCount += 1;
    }
  }

  return { teams: teamCount, teamMembers: memberCount };
}

async function seedUsers(pool, users) {
  let userCount = 0;
  let roleCount = 0;

  for (const user of users) {
    const userId = clean(user.id || user.userId || user.openId || user.unionId);
    if (!userId) {
      continue;
    }
    await pool.execute(
      `INSERT INTO users
        (id, feishu_open_id, feishu_union_id, name, department, avatar_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        feishu_open_id = VALUES(feishu_open_id),
        feishu_union_id = VALUES(feishu_union_id),
        name = VALUES(name),
        department = VALUES(department),
        avatar_url = VALUES(avatar_url),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        clean(user.openId || user.feishuOpenId) || null,
        clean(user.unionId || user.feishuUnionId) || null,
        clean(user.name || user.displayName || "未命名用户"),
        clean(user.department),
        clean(user.avatar || user.avatarUrl || user.photo) || null,
        clean(user.status || "active"),
      ],
    );
    userCount += 1;

    const roles = Array.from(new Set(asArray(user.roles || user.role, "roles").map(clean).filter(Boolean)));
    for (const role of roles) {
      await pool.execute(
        `INSERT INTO role_assignments (user_id, role, source, status)
         VALUES (?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
          source = VALUES(source),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP`,
        [userId, role, clean(user.source || "seed")],
      );
      roleCount += 1;
    }
  }

  return { users: userCount, roleAssignments: roleCount };
}

async function seedEventStages(pool, state) {
  const stages = asArray(state?.stages, "stages");
  let count = 0;
  for (const [index, stage] of stages.entries()) {
    const stageId = clean(stage.id);
    if (!stageId) {
      continue;
    }
    await pool.execute(
      `INSERT INTO event_stages
        (id, name, subtitle, status, display_time, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        subtitle = VALUES(subtitle),
        status = VALUES(status),
        display_time = VALUES(display_time),
        sort_order = VALUES(sort_order),
        updated_at = CURRENT_TIMESTAMP`,
      [
        stageId,
        clean(stage.name),
        clean(stage.subtitle),
        clean(stage.status || (state.currentStageId === stageId ? "active" : "pending")),
        clean(stage.time || stage.displayTime),
        index,
      ],
    );
    count += 1;
  }
  return count;
}

async function seedMissionCountdown(pool, countdown) {
  if (!countdown || !Object.keys(countdown).length) {
    return 0;
  }
  await pool.execute(
    `INSERT INTO mission_countdowns (id, started_at, duration_ms)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
      started_at = VALUES(started_at),
      duration_ms = VALUES(duration_ms),
      updated_at = CURRENT_TIMESTAMP`,
    [
      DEFAULT_WINDOW_ID,
      toMysqlDate(countdown.startedAt),
      Number(countdown.durationMs || 86400000),
    ],
  );
  return 1;
}

async function seedRoadshow(pool, roadshow) {
  if (!roadshow || !Object.keys(roadshow).length) {
    return 0;
  }
  await pool.execute(
    `INSERT INTO roadshow_sessions
      (id, current_team_id, next_team_id, phase, started_at, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      current_team_id = VALUES(current_team_id),
      next_team_id = VALUES(next_team_id),
      phase = VALUES(phase),
      started_at = VALUES(started_at),
      duration_ms = VALUES(duration_ms),
      updated_at = CURRENT_TIMESTAMP`,
    [
      DEFAULT_WINDOW_ID,
      clean(roadshow.currentTeamId),
      clean(roadshow.nextTeamId),
      clean(roadshow.phase || "DEMO"),
      toMysqlDate(roadshow.startedAt),
      Number(roadshow.durationMs || 900000),
    ],
  );
  return 1;
}

async function seedVotes(pool, voteResults) {
  const results = asArray(voteResults?.results, "results");
  const pointScale = Array.isArray(voteResults?.pointScale) && voteResults.pointScale.length
    ? voteResults.pointScale
    : [100, 85, 70, 55, 40];

  await pool.execute(
    `INSERT INTO vote_windows
      (id, status, window_label, point_scale_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      window_label = VALUES(window_label),
      point_scale_json = VALUES(point_scale_json),
      updated_at = CURRENT_TIMESTAMP`,
    [
      DEFAULT_WINDOW_ID,
      clean(voteResults?.status || "voting"),
      clean(voteResults?.windowLabel || "投票窗口开启中"),
      json(pointScale, []),
    ],
  );

  let voteCount = 0;
  for (const result of results) {
    const teamId = clean(result.id || result.teamId);
    const votes = Number(result.votes || 0);
    if (!teamId || !Number.isFinite(votes) || votes <= 0) {
      continue;
    }
    for (let index = 0; index < votes; index += 1) {
      await pool.execute(
        `INSERT INTO votes (voter_id, team_id, status, source)
         VALUES (?, ?, 'active', 'seed')
         ON DUPLICATE KEY UPDATE
          team_id = VALUES(team_id),
          status = VALUES(status),
          source = VALUES(source),
          updated_at = CURRENT_TIMESTAMP`,
        [`seed-${teamId}-${index + 1}`, teamId],
      );
      voteCount += 1;
    }
  }

  return { voteWindows: 1, votes: voteCount };
}

async function seedWorks(pool, works) {
  let count = 0;
  for (const work of works) {
    const teamId = clean(work.teamId || work.team_id || work.id);
    const id = clean(work.id || teamId);
    if (!id || !teamId) {
      continue;
    }
    await pool.execute(
      `INSERT INTO works
        (id, team_id, team_name, project, pitch, stack_json, demo_url, code_url, doc_url,
         screenshots_json, status, submitted_by, submitted_at, reviewed_by, reviewed_at, review_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        team_id = VALUES(team_id),
        team_name = VALUES(team_name),
        project = VALUES(project),
        pitch = VALUES(pitch),
        stack_json = VALUES(stack_json),
        demo_url = VALUES(demo_url),
        code_url = VALUES(code_url),
        doc_url = VALUES(doc_url),
        screenshots_json = VALUES(screenshots_json),
        status = VALUES(status),
        submitted_by = VALUES(submitted_by),
        submitted_at = VALUES(submitted_at),
        reviewed_by = VALUES(reviewed_by),
        reviewed_at = VALUES(reviewed_at),
        review_note = VALUES(review_note),
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        teamId,
        clean(work.teamName || work.team_name || work.name),
        clean(work.project || work.title),
        clean(work.pitch || work.description),
        json(Array.isArray(work.stack) ? work.stack : [], []),
        clean(work.demoUrl || work.demo_url),
        clean(work.codeUrl || work.code_url),
        clean(work.docUrl || work.doc_url),
        json(Array.isArray(work.screenshots) ? work.screenshots : [], []),
        clean(work.status || "submitted"),
        clean(work.submittedBy || work.submitted_by),
        toMysqlDate(work.submittedAt || work.submitted_at),
        clean(work.reviewedBy || work.reviewed_by),
        toMysqlDate(work.reviewedAt || work.reviewed_at),
        clean(work.reviewNote || work.review_note),
      ],
    );
    count += 1;
  }
  return count;
}

async function seedMysqlFromJson({ dataDir = DEFAULT_DATA_DIR, pool = createMysqlPool() } = {}) {
  const [
    traineesPayload,
    teamsPayload,
    userRolesPayload,
    adminState,
    missionCountdown,
    roadshow,
    voteResults,
    worksPayload,
  ] = await Promise.all([
    readJsonFile(dataDir, "trainees.json", []),
    readJsonFile(dataDir, "teams.json", []),
    readJsonFile(dataDir, "user-roles.json", { users: [] }),
    readJsonFile(dataDir, "admin-state.json", { stages: [] }),
    readJsonFile(dataDir, "mission-countdown.json", {}),
    readJsonFile(dataDir, "roadshow.json", {}),
    readJsonFile(dataDir, "vote-results.json", { results: [] }),
    readJsonFile(dataDir, "works.json", { works: [] }),
  ]);

  const trainees = await seedTrainees(pool, asArray(traineesPayload, "trainees"));
  const teamResult = await seedTeams(pool, asArray(teamsPayload, "teams"));
  const userResult = await seedUsers(pool, asArray(userRolesPayload, "users"));
  const eventStages = await seedEventStages(pool, adminState);
  const missionCountdowns = await seedMissionCountdown(pool, missionCountdown);
  const roadshowSessions = await seedRoadshow(pool, roadshow);
  const voteResult = await seedVotes(pool, voteResults);
  const works = await seedWorks(pool, asArray(worksPayload, "works"));

  return {
    trainees,
    ...teamResult,
    ...userResult,
    eventStages,
    missionCountdowns,
    roadshowSessions,
    ...voteResult,
    works,
  };
}

if (require.main === module) {
  seedMysqlFromJson()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  seedMysqlFromJson,
};
