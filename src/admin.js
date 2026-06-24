const stages = [
  {
    id: "opening",
    name: "启动仪式",
    subtitle: "活动开场，启动仪式",
    status: "done",
    time: "05-22 10:00\n05-22 10:30",
  },
  {
    id: "icebreaker",
    name: "新生破冰",
    subtitle: "数字盲盒，互动破冰",
    status: "done",
    time: "05-22 10:30\n05-22 11:15",
  },
  {
    id: "speech",
    name: "总裁讲话",
    subtitle: "集团领导致辞",
    status: "done",
    time: "05-22 11:15\n05-22 11:35",
  },
  {
    id: "tracks",
    name: "赛道发布",
    subtitle: "五条赛道发布与解读",
    status: "done",
    time: "05-22 11:35\n05-22 12:00",
  },
  {
    id: "team",
    name: "组队开启",
    subtitle: "实时组队，先到先得",
    status: "active",
    time: "05-22 14:00\n进行中",
  },
  {
    id: "vote",
    name: "投票开启",
    subtitle: "路演投票开启",
    status: "pending",
    time: "预计 05-24 10:00\n-",
  },
  {
    id: "result",
    name: "结果发布",
    subtitle: "投票排名与赋分结果",
    status: "pending",
    time: "预计 05-24 17:30\n-",
  },
  {
    id: "final",
    name: "冠军展示",
    subtitle: "综合得分与冠军队伍展示",
    status: "pending",
    time: "预计 05-24 18:00\n-",
  },
];

let logs = [
  ["14:00:05", "admin", "开启阶段【组队开启】"],
  ["11:35:12", "admin", "结束阶段【总裁讲话】"],
  ["11:35:10", "admin", "开启阶段【赛道发布】"],
  ["10:30:08", "admin", "开启阶段【新生破冰】"],
  ["10:00:06", "admin", "开启阶段【启动仪式】"],
  ["09:58:44", "admin", "登录管理后台"],
  ["09:30:15", "system", "大屏连接成功"],
];

const statusLabel = {
  done: "已完成",
  active: "进行中",
  pending: "未开始",
};

const stageRows = document.querySelector("#stageRows");
const currentStageName = document.querySelector("#currentStageName");
const currentStageTime = document.querySelector("#currentStageTime");
const currentStageStatus = document.querySelector("#currentStageStatus");
const previewStageName = document.querySelector("#previewStageName");
const previewTimeline = document.querySelector("#previewTimeline");
const operationLog = document.querySelector("#operationLog");
const confirmDangerAction = document.querySelector("#confirmDangerAction");
const closeVoteButton = document.querySelector("#closeVoteButton");
const publishResultButton = document.querySelector("#publishResultButton");
const saveDisplayTimesButton = document.querySelector("#saveDisplayTimesButton");
const missionCountdownDuration = document.querySelector("#missionCountdownDuration");
const missionCountdownState = document.querySelector("#missionCountdownState");
const startMissionCountdownButton = document.querySelector("#startMissionCountdownButton");
const resetMissionCountdownButton = document.querySelector("#resetMissionCountdownButton");
const roadshowDuration = document.querySelector("#roadshowDuration");
const roadshowCurrentTeamSelect = document.querySelector("#roadshowCurrentTeamSelect");
const roadshowNextTeamSelect = document.querySelector("#roadshowNextTeamSelect");
const roadshowStateLabel = document.querySelector("#roadshowState");
const startRoadshowButton = document.querySelector("#startRoadshowButton");
const resetRoadshowButton = document.querySelector("#resetRoadshowButton");
const refreshBusinessDataButton = document.querySelector("#refreshBusinessDataButton");
const adminConnectionChip = document.querySelector("#adminConnectionChip");
const adminConnectionLabel = document.querySelector("#adminConnectionLabel");
const adminApiHealthMeta = document.querySelector("#adminApiHealthMeta");
const adminSyncStatus = document.querySelector("#adminSyncStatus");
const adminSyncStatusLabel = document.querySelector("#adminSyncStatusLabel");
const adminSyncStatusMeta = document.querySelector("#adminSyncStatusMeta");
const screenQuickMenuButton = document.querySelector("#screenQuickMenuButton");
const screenQuickMenu = document.querySelector("#screenQuickMenu");
const adminUserMenuButton = document.querySelector("#adminUserMenuButton");
const adminUserMenu = document.querySelector("#adminUserMenu");
const adminUserName = document.querySelector("#adminUserName");
const adminTeamCount = document.querySelector("#adminTeamCount");
const adminPlayerCount = document.querySelector("#adminPlayerCount");
const adminVoteTotal = document.querySelector("#adminVoteTotal");
const adminJudgeCount = document.querySelector("#adminJudgeCount");
const adminVoteStatus = document.querySelector("#adminVoteStatus");
const adminVoteRanking = document.querySelector("#adminVoteRanking");
const adminWorkStatus = document.querySelector("#adminWorkStatus");
const adminWorkList = document.querySelector("#adminWorkList");
const adminJudgeSummary = document.querySelector("#adminJudgeSummary");
const adminResultSnapshotStatus = document.querySelector("#adminResultSnapshotStatus");
const adminResultSnapshot = document.querySelector("#adminResultSnapshot");
const adminNavButtons = [...document.querySelectorAll("[data-admin-nav]")];
const adminViewPanels = [...document.querySelectorAll("[data-admin-view-panel]")];
const adminDashboardState = document.querySelector("#adminDashboardState");
const adminDashboardSummary = document.querySelector("#adminDashboardSummary");
const adminScreenControl = document.querySelector("#adminScreenControl");
const adminScreenRouteStatus = document.querySelector("#adminScreenRouteStatus");
const adminScreenMissionState = document.querySelector("#adminScreenMissionState");
const adminScreenRoadshowState = document.querySelector("#adminScreenRoadshowState");
const adminPageManager = document.querySelector("#adminPageManager");
const adminContentManager = document.querySelector("#adminContentManager");
const refreshContentManagerButton = document.querySelector("#refreshContentManagerButton");
const refreshDataWorkspaceButton = document.querySelector("#refreshDataWorkspaceButton");
const refreshAuditLogButton = document.querySelector("#refreshAuditLogButton");
const adminVoteWorkspaceStatus = document.querySelector("#adminVoteWorkspaceStatus");
const adminWorkWorkspaceStatus = document.querySelector("#adminWorkWorkspaceStatus");
const adminVoteRankingFull = document.querySelector("#adminVoteRankingFull");
const adminWorkReviewList = document.querySelector("#adminWorkReviewList");
const adminTeamRoster = document.querySelector("#adminTeamRoster");
const adminTeamRosterStatus = document.querySelector("#adminTeamRosterStatus");
const adminAuditLogList = document.querySelector("#adminAuditLogList");
const adminSystemRuntimeStatus = document.querySelector("#adminSystemRuntimeStatus");
const adminSystemSettings = document.querySelector("#adminSystemSettings");
const adminUserRoleStatus = document.querySelector("#adminUserRoleStatus");
const adminUserRoleForm = document.querySelector("#adminUserRoleForm");
const adminUserRoleList = document.querySelector("#adminUserRoleList");
const adminUserRoleId = document.querySelector("#adminUserRoleId");
const adminUserRoleName = document.querySelector("#adminUserRoleName");
const adminUserRoleOpenId = document.querySelector("#adminUserRoleOpenId");
const adminUserRoleUnionId = document.querySelector("#adminUserRoleUnionId");
const adminUserRoleDepartment = document.querySelector("#adminUserRoleDepartment");

let businessDataState = {
  teams: [],
  voteResults: { results: [] },
  works: [],
  judgeScores: { scores: {} },
  auditLogs: [],
  resultSnapshot: null,
};

let platformHealthState = {
  online: false,
  status: "checking",
  checkedAt: "",
  runtime: {},
};

let syncStatusState = {
  status: "idle",
  label: "数据同步待命",
  meta: "业务数据 / 日志",
};

let roadshowTeamState = {
  currentTeamId: "",
  nextTeamId: "",
  currentTeam: null,
  nextTeam: null,
};

let currentAdminSessionState = {
  user: { name: "admin" },
  role: "admin",
  source: "local",
};

let userRoleState = {
  users: [],
  loading: false,
};

const adminRoleLabels = {
  admin: "管理员",
  judge: "专家评委",
  player: "参赛选手",
  public: "大众评委",
};

const screenRoutes = [
  { stageId: "opening", name: "启动仪式", route: "/?stage=welcome", note: "开场和入场引导" },
  { stageId: "icebreaker", name: "新生破冰", route: "/?stage=discover", note: "星锐档案与互动破冰" },
  { stageId: "tracks", name: "赛道发布", route: "/?stage=team", note: "五条赛道与组队大屏" },
  { stageId: "team", name: "组队开启", route: "/?stage=team", note: "实时组队展示" },
  { stageId: "vote", name: "投票开启", route: "/?stage=vote-progress", note: "大众投票进度" },
  { stageId: "result", name: "结果发布", route: "/?stage=vote-result", note: "票数与赋分结果" },
  { stageId: "final", name: "冠军展示", route: "/?stage=final-result", note: "冠军队伍展示" },
];

const pageRoutes = [
  { name: "主入口大屏", route: "/", note: "开场、组队、倒计时、投票与最终展示。" },
  { name: "移动端 / 公众端", route: "/site.html", note: "面向参赛选手、评委和观众的移动端入口。" },
  { name: "演示 Deck", route: "/screen.html", note: "独立赛事流程展示页面。" },
  { name: "管理后台", route: "/admin", note: "管理员控制台与数据管理入口。" },
  { name: "分离前端服务", route: "/runtime-config.js", note: "前端运行时 API Base 配置文件。" },
  { name: "API 健康检查", route: "/api/health", note: "后端 API 服务状态检查。" },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return number.toLocaleString("zh-CN");
}

function formatSyncTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function renderSyncStatus() {
  if (!adminSyncStatus) {
    return;
  }

  adminSyncStatus.classList.toggle("is-syncing", syncStatusState.status === "syncing");
  adminSyncStatus.classList.toggle("is-success", syncStatusState.status === "success");
  adminSyncStatus.classList.toggle("is-error", syncStatusState.status === "error");
  setText(adminSyncStatusLabel, syncStatusState.label);
  setText(adminSyncStatusMeta, syncStatusState.meta);
}

function setSyncStatus(status, label, meta) {
  syncStatusState = {
    status,
    label,
    meta,
  };
  renderSyncStatus();
}

function countTeamMembers(teams) {
  return teams.reduce((total, team) => total + (Array.isArray(team.members) ? team.members.length : 0), 0);
}

function scoreCoverage(scoresState = {}) {
  const scores = scoresState.scores && typeof scoresState.scores === "object" ? scoresState.scores : {};
  const judgeIds = Object.keys(scores);
  const teamIds = new Set();

  judgeIds.forEach((judgeId) => {
    Object.keys(scores[judgeId] || {}).forEach((teamId) => teamIds.add(teamId));
  });

  return {
    judgeCount: judgeIds.length,
    teamCount: teamIds.size,
  };
}

function normalizeWorks(works) {
  return Array.isArray(works) ? works : [];
}

const workStatusText = {
  draft: "草稿",
  submitted: "待审核",
  reviewing: "审核中",
  published: "已发布",
  rejected: "已退回",
};

const DEFAULT_TEAM_CAPACITY = 5;

function getWorkReviewId(work) {
  return work?.id || work?.teamId || "";
}

function getTeamCapacity(team = {}) {
  const capacity = Number(team.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : DEFAULT_TEAM_CAPACITY;
}

function getTeamMemberLimit(team = {}) {
  return Math.max(0, getTeamCapacity(team) - 1);
}

function getTeamRoleCoverage(team = {}, members = []) {
  const normalizedMembers = Array.isArray(members) ? members : [];
  const memberLimit = getTeamMemberLimit(team);
  const coveredCount = normalizedMembers.filter((member) => (
    String(member?.roleKey || member?.duty || member?.role || "").trim()
  )).length;

  return {
    coveredCount,
    expectedCount: Math.max(memberLimit, normalizedMembers.length),
  };
}

function getRoadshowTeamLabel(team = {}, fallbackId = "") {
  const index = team.index ? `${team.index} · ` : "";
  const name = team.name || team.teamName || fallbackId || "未命名队伍";
  const project = team.project ? ` / ${team.project}` : "";
  return `${index}${name}${project}`;
}

function renderRoadshowTeamOptions() {
  if (!roadshowCurrentTeamSelect || !roadshowNextTeamSelect) {
    return;
  }

  const teams = Array.isArray(businessDataState.teams) ? [...businessDataState.teams] : [];
  const knownIds = new Set(teams.map((team) => String(team.id || "").trim()).filter(Boolean));

  [
    [roadshowTeamState.currentTeamId, roadshowTeamState.currentTeam],
    [roadshowTeamState.nextTeamId, roadshowTeamState.nextTeam],
  ].forEach(([teamId, team]) => {
    const cleanTeamId = String(teamId || "").trim();
    if (cleanTeamId && !knownIds.has(cleanTeamId)) {
      teams.push({ ...(team || {}), id: cleanTeamId });
      knownIds.add(cleanTeamId);
    }
  });

  const optionHtml = teams.length
    ? teams.map((team) => {
        const teamId = String(team.id || "").trim();
        return `<option value="${escapeHtml(teamId)}">${escapeHtml(getRoadshowTeamLabel(team, teamId))}</option>`;
      }).join("")
    : '<option value="">等待队伍数据</option>';

  roadshowCurrentTeamSelect.innerHTML = optionHtml;
  roadshowNextTeamSelect.innerHTML = optionHtml;

  const currentValue = roadshowTeamState.currentTeamId || teams[0]?.id || "";
  const nextValue = roadshowTeamState.nextTeamId || teams[1]?.id || teams[0]?.id || "";
  roadshowCurrentTeamSelect.value = currentValue;
  roadshowNextTeamSelect.value = nextValue;
}

function getSelectedRoadshowTeam(teamId) {
  const cleanTeamId = String(teamId || "").trim();
  if (!cleanTeamId) {
    return null;
  }

  const teams = Array.isArray(businessDataState.teams) ? businessDataState.teams : [];
  const syncedTeam = teams.find((team) => String(team.id || "").trim() === cleanTeamId);
  if (syncedTeam) {
    return syncedTeam;
  }

  if (String(roadshowTeamState.currentTeamId || "").trim() === cleanTeamId) {
    return roadshowTeamState.currentTeam || null;
  }
  if (String(roadshowTeamState.nextTeamId || "").trim() === cleanTeamId) {
    return roadshowTeamState.nextTeam || null;
  }

  return { id: cleanTeamId };
}

function renderVoteRankingItems(container, sortedResults, limit) {
  if (!container) {
    return;
  }

  const visibleResults = typeof limit === "number" ? sortedResults.slice(0, limit) : sortedResults;
  container.innerHTML = visibleResults.length
    ? visibleResults.map((team) => `
        <li>
          <b>${escapeHtml(team.name || team.id || "未命名队伍")}</b>
          <span>${escapeHtml(team.project || team.track || "作品待补全")}</span>
          <strong>${formatNumber(team.votes)}</strong>
        </li>
      `).join("")
    : '<li class="admin-empty">暂无投票数据</li>';
}

function renderVoteRanking(voteResults = {}) {
  const results = Array.isArray(voteResults.results) ? [...voteResults.results] : [];
  const sorted = results.sort((left, right) => (Number(right.votes) || 0) - (Number(left.votes) || 0));

  renderVoteRankingItems(adminVoteRanking, sorted, 5);
  renderVoteRankingItems(adminVoteRankingFull, sorted);

  const voteTotal = sorted.reduce((total, team) => total + (Number(team.votes) || 0), 0);
  setText(adminVoteTotal, formatNumber(voteTotal));
  setText(adminVoteStatus, voteResults.windowLabel || voteResults.status || "等待同步");
  setText(adminVoteWorkspaceStatus, voteResults.windowLabel || voteResults.status || "等待同步");
  syncDangerActionButtons();
}

function formatSnapshotTime(value) {
  if (!value) {
    return "时间未记录";
  }
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) {
    return String(value);
  }
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function renderResultSnapshot(snapshot = businessDataState.resultSnapshot) {
  if (!adminResultSnapshot) {
    return;
  }

  const results = Array.isArray(snapshot?.results) ? snapshot.results : [];
  const champion = results.find((item) => item.isChampion) || results[0];

  if (!snapshot || !snapshot.id) {
    setText(adminResultSnapshotStatus, "尚未发布");
    adminResultSnapshot.innerHTML = `
      <article class="admin-result-snapshot-card is-empty">
        <b>最终结果快照</b>
        <p>发布结果后，这里会固定冠军、总分和最终排名，方便后台复核。</p>
      </article>
    `;
    return;
  }

  setText(adminResultSnapshotStatus, `已发布 · ${formatSnapshotTime(snapshot.publishedAt)}`);
  adminResultSnapshot.innerHTML = `
    <article class="admin-result-snapshot-card">
      <div class="admin-result-champion">
        <span>冠军</span>
        <strong>${escapeHtml(champion?.name || "未命名队伍")}</strong>
        <b>${escapeHtml(champion?.project || champion?.track || "作品信息待补全")}</b>
      </div>
      <dl>
        <div><dt>快照 ID</dt><dd>${escapeHtml(snapshot.id)}</dd></div>
        <div><dt>发布人</dt><dd>${escapeHtml(snapshot.publishedBy || "admin")}</dd></div>
        <div><dt>冠军总分</dt><dd>${formatNumber(champion?.totalScore || 0)}</dd></div>
      </dl>
      <ol class="admin-result-rank-list">
        ${results.slice(0, 5).map((item) => `
          <li>
            <span>${escapeHtml(item.name || item.id || "队伍")}</span>
            <b>${formatNumber(item.totalScore || 0)}</b>
            <em>${formatNumber(item.votes || 0)} 票</em>
          </li>
        `).join("")}
      </ol>
    </article>
  `;
}

function renderWorkList(works) {
  const normalizedWorks = normalizeWorks(works);

  if (adminWorkList) {
    adminWorkList.innerHTML = normalizedWorks.length
      ? normalizedWorks.slice(0, 4).map((work) => `
          <article class="admin-work-item">
            <b>${escapeHtml(work.project || work.teamName || work.id || "未命名作品")}</b>
            <span>${escapeHtml(work.teamName || work.teamId || "未绑定队伍")}</span>
            <em>${escapeHtml(workStatusText[work.status] || work.status || "未知")}</em>
            <div class="admin-work-actions">
              <button type="button" data-work-status="${escapeHtml(getWorkReviewId(work))}:published" ${work.status === "published" ? "disabled" : ""}>发布</button>
              <button type="button" data-work-status="${escapeHtml(getWorkReviewId(work))}:rejected" ${work.status === "rejected" ? "disabled" : ""}>退回</button>
            </div>
          </article>
        `).join("")
      : '<p class="admin-empty">暂无作品提交</p>';
  }

  if (adminWorkReviewList) {
    adminWorkReviewList.innerHTML = normalizedWorks.length
      ? normalizedWorks.map((work) => `
          <article class="admin-work-review-card">
            <div>
              <h3>${escapeHtml(work.project || work.title || work.teamName || work.id || "未命名作品")}</h3>
              <p>${escapeHtml(work.teamName || work.teamId || "未绑定队伍")} · ${escapeHtml(work.track || work.category || "赛道待补全")}</p>
              <p>${escapeHtml(work.summary || work.description || work.problem || "提交说明待补全")}</p>
            </div>
            <em>${escapeHtml(workStatusText[work.status] || work.status || "未知")}</em>
            <div class="admin-work-actions">
              <button type="button" data-work-status="${escapeHtml(getWorkReviewId(work))}:published" ${work.status === "published" ? "disabled" : ""}>发布作品</button>
              <button type="button" data-work-status="${escapeHtml(getWorkReviewId(work))}:rejected" ${work.status === "rejected" ? "disabled" : ""}>退回修改</button>
            </div>
          </article>
        `).join("")
      : '<p class="admin-empty">暂无作品提交</p>';
  }

  const publishedCount = normalizedWorks.filter((work) => work.status === "published").length;
  setText(adminWorkStatus, normalizedWorks.length ? `${publishedCount}/${normalizedWorks.length} 已发布` : "等待提交");
  setText(adminWorkWorkspaceStatus, normalizedWorks.length ? `${publishedCount}/${normalizedWorks.length} 已发布` : "等待提交");
}

function renderTeamRoster(teams = businessDataState.teams) {
  const normalizedTeams = Array.isArray(teams) ? teams : [];
  const openSlots = normalizedTeams.reduce((total, team) => {
    const members = Array.isArray(team.members) ? team.members : [];
    return total + Math.max(0, getTeamMemberLimit(team) - members.length);
  }, 0);
  setText(
    adminTeamRosterStatus,
    normalizedTeams.length
      ? `${normalizedTeams.length} 个赛道 / ${countTeamMembers(normalizedTeams)} 名成员 / ${openSlots} 个空位`
      : "暂无队伍数据",
  );

  if (!adminTeamRoster) {
    return;
  }

  adminTeamRoster.innerHTML = normalizedTeams.length
    ? normalizedTeams.map((team) => {
        const advisor = team.advisor || {};
        const members = Array.isArray(team.members) ? team.members : [];
        const memberLimit = getTeamMemberLimit(team);
        const remainingSlots = Math.max(0, memberLimit - members.length);
        const roleCoverage = getTeamRoleCoverage(team, members);
        const capacityPercent = memberLimit
          ? Math.min(100, Math.round((members.length / memberLimit) * 100))
          : 0;
        const rolePercent = roleCoverage.expectedCount
          ? Math.min(100, Math.round((roleCoverage.coveredCount / roleCoverage.expectedCount) * 100))
          : 0;
        return `
          <article class="admin-team-card">
            <header>
              <i class="admin-team-index">${escapeHtml(team.index || team.id || "--")}</i>
              <div>
                <h3>${escapeHtml(team.name || "未命名赛道")}</h3>
                <span>${escapeHtml(team.nameEn || team.hostDepartment || "TRACK")}</span>
              </div>
              <strong class="admin-team-count">${members.length}/${memberLimit} 人</strong>
            </header>
            <div class="admin-team-capacity">
              <div>
                <b>成员席位</b>
                <span>${members.length}/${memberLimit} 已占 · ${remainingSlots} 个空位</span>
              </div>
              <i class="admin-team-capacity-meter" style="--capacity-percent: ${capacityPercent}%"></i>
            </div>
            <div class="admin-team-role-coverage">
              <b>角色覆盖</b>
              <span>${roleCoverage.coveredCount}/${roleCoverage.expectedCount} 已配置职责</span>
              <i style="--role-percent: ${rolePercent}%"></i>
            </div>
            <p class="admin-team-advisor">
              顾问：${escapeHtml(advisor.name || "未配置")} · ${escapeHtml(advisor.department || team.hostDepartment || "部门待补全")}
            </p>
            <div class="admin-team-members">
              ${members.map((member) => `
                <div class="admin-team-member">
                  ${member.photo
                    ? `<img src="${escapeHtml(member.photo)}" alt="${escapeHtml(member.name || "成员")}" />`
                    : `<i>${escapeHtml(String(member.name || "?").slice(0, 1))}</i>`}
                  <div>
                    <strong>${escapeHtml(member.name || "未命名成员")}</strong>
                    <span>${escapeHtml(member.department || "部门待补全")} · ${escapeHtml(member.role || "成员")}</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </article>
        `;
      }).join("")
    : '<p class="admin-empty">暂无队伍数据</p>';
}

function normalizeAuditEntry(entry) {
  if (Array.isArray(entry)) {
    return {
      time: entry[0] || "--:--:--",
      actor: entry[1] || "system",
      message: entry[2] || "",
      meta: "本地日志",
    };
  }

  const rawTime = entry?.time || entry?.at || entry?.createdAt || entry?.updatedAt || "";
  const parsedTime = rawTime ? new Date(rawTime) : null;
  const displayTime = parsedTime && !Number.isNaN(parsedTime.getTime())
    ? parsedTime.toLocaleString("zh-CN", { hour12: false })
    : rawTime || "--:--:--";

  return {
    time: displayTime,
    actor: entry?.actor || "system",
    message: entry?.message || entry?.action || "后台事件",
    meta: [entry?.resourceType, entry?.resourceId].filter(Boolean).join(" / ") || entry?.ip || "后台操作",
  };
}

function renderAuditLogList(entries = businessDataState.auditLogs) {
  if (!adminAuditLogList) {
    return;
  }

  const normalizedEntries = Array.isArray(entries) ? entries.map(normalizeAuditEntry) : [];
  adminAuditLogList.innerHTML = normalizedEntries.length
    ? normalizedEntries.slice(0, 80).map((entry) => `
        <li>
          <span>${escapeHtml(entry.time)}</span>
          <strong>${escapeHtml(entry.actor)}</strong>
          <span>${escapeHtml(entry.message)}</span>
          <small>${escapeHtml(entry.meta)}</small>
        </li>
      `).join("")
    : '<li class="admin-empty">暂无审计日志</li>';
}

function renderBusinessData(payload = {}) {
  const { teams, voteResults, works, judgeScores, resultSnapshot } = payload;
  const hasSnapshotPayload = Object.prototype.hasOwnProperty.call(payload, "resultSnapshot");

  businessDataState = {
    ...businessDataState,
    ...(Array.isArray(teams) ? { teams } : {}),
    ...(voteResults && typeof voteResults === "object" ? { voteResults } : {}),
    ...(Array.isArray(works) ? { works } : {}),
    ...(judgeScores && typeof judgeScores === "object" ? { judgeScores } : {}),
    ...(hasSnapshotPayload ? { resultSnapshot } : {}),
  };

  const data = businessDataState;
  const coverage = scoreCoverage(data.judgeScores);

  setText(adminTeamCount, formatNumber(data.teams.length));
  setText(adminPlayerCount, formatNumber(countTeamMembers(data.teams)));
  setText(adminJudgeCount, data.teams.length ? `${coverage.teamCount}/${data.teams.length}` : formatNumber(coverage.teamCount));
  setText(
    adminJudgeSummary,
    coverage.judgeCount
      ? `已有 ${coverage.judgeCount} 位评委保存评分，覆盖 ${coverage.teamCount} 个赛道。`
      : "暂无评委评分草稿。",
  );

  renderVoteRanking(data.voteResults);
  renderResultSnapshot(data.resultSnapshot);
  renderWorkList(data.works);
  renderTeamRoster(data.teams);
  renderRoadshowTeamOptions();
  renderDashboardSummary();
  renderContentManager();
}

function syncDangerActionButtons() {
  const confirmed = Boolean(confirmDangerAction?.checked);
  const voteStatus = businessDataState.voteResults?.status || "voting";

  if (closeVoteButton) {
    closeVoteButton.disabled = !confirmed || voteStatus !== "voting";
  }
  if (publishResultButton) {
    publishResultButton.disabled = !confirmed || voteStatus === "published";
  }
}

function getVoteTotal(voteResults = businessDataState.voteResults) {
  const results = Array.isArray(voteResults.results) ? voteResults.results : [];
  return results.reduce((total, team) => total + (Number(team.votes) || 0), 0);
}

function renderDashboardSummary() {
  if (!adminDashboardSummary) {
    return;
  }

  const active = getActiveStage();
  const coverage = scoreCoverage(businessDataState.judgeScores);
  const works = normalizeWorks(businessDataState.works);
  const publishedWorks = works.filter((work) => work.status === "published").length;
  const snapshot = businessDataState.resultSnapshot;
  const cards = [
    {
      label: "当前阶段",
      value: active.name,
      note: active.time ? active.time.replace("\n", " / ") : "时间未配置",
    },
    {
      label: "赛道 / 成员",
      value: `${businessDataState.teams.length}/${countTeamMembers(businessDataState.teams)}`,
      note: "后台队伍数据已接入 API",
    },
    {
      label: "总票数",
      value: formatNumber(getVoteTotal()),
      note: businessDataState.voteResults.windowLabel || businessDataState.voteResults.status || "投票状态待同步",
    },
    {
      label: "作品审核",
      value: `${publishedWorks}/${works.length}`,
      note: works.length ? "已发布 / 已提交" : "暂无作品提交",
    },
    {
      label: "最终快照",
      value: snapshot?.id ? "已发布" : "未发布",
      note: snapshot?.id || "发布结果后生成最终结果快照",
    },
    {
      label: "评分覆盖",
      value: businessDataState.teams.length ? `${coverage.teamCount}/${businessDataState.teams.length}` : formatNumber(coverage.teamCount),
      note: `${coverage.judgeCount} 位评委保存评分草稿`,
      wide: true,
    },
    {
      label: "审计日志",
      value: formatNumber(businessDataState.auditLogs.length),
      note: "阶段、时间和作品写操作记录",
      wide: true,
    },
  ];

  setText(adminDashboardState, `${active.name} · ${statusLabel[active.status] || active.status}`);
  adminDashboardSummary.innerHTML = cards.map((card) => `
    <article class="admin-dashboard-card ${card.wide ? "is-wide" : ""}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <b>${escapeHtml(card.note)}</b>
    </article>
  `).join("");
}

function renderScreenControl() {
  if (!adminScreenControl) {
    return;
  }

  const active = getActiveStage();
  setText(adminScreenRouteStatus, `${active.name} · ${statusLabel[active.status] || active.status}`);
  adminScreenControl.innerHTML = screenRoutes.map((item) => {
    const stage = stages.find((entry) => entry.id === item.stageId);
    const isActive = active.id === item.stageId;
    return `
      <article>
        <div>
          <b>${escapeHtml(item.name)}${isActive ? " · 当前" : ""}</b>
          <span>${escapeHtml(item.note)} · ${escapeHtml(statusLabel[stage?.status] || stage?.status || "未配置")}</span>
        </div>
        <div class="admin-control-actions">
          <a href="${escapeHtml(item.route)}" target="_blank" rel="noreferrer">打开</a>
          <button type="button" data-screen-stage-command="${escapeHtml(item.stageId)}" ${isActive ? "disabled" : ""}>设为当前</button>
        </div>
      </article>
    `;
  }).join("");
}

function resolveAdminRouteHref(route) {
  const normalizedRoute = String(route || "");
  if (normalizedRoute.startsWith("/api") && window.AppData?.resolveApiUrl) {
    return window.AppData.resolveApiUrl(route);
  }

  return route;
}

function closeTopbarMenus() {
  [
    [screenQuickMenuButton, screenQuickMenu],
    [adminUserMenuButton, adminUserMenu],
  ].forEach(([button, menu]) => {
    if (!button || !menu) {
      return;
    }

    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleTopbarMenu(button, menu) {
  if (!button || !menu) {
    return;
  }

  const shouldOpen = menu.hidden;
  closeTopbarMenus();
  menu.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
}

function getAdminUserDisplayName() {
  const user = currentAdminSessionState.user || {};
  return user.name || user.id || currentAdminSessionState.role || "admin";
}

function renderAdminUserMenu() {
  if (!adminUserMenu) {
    return;
  }

  const role = currentAdminSessionState.role || "local-admin";
  const source = currentAdminSessionState.source || "local";
  const userName = getAdminUserDisplayName();

  setText(adminUserName, userName);
  adminUserMenuButton?.setAttribute("aria-label", `当前管理员：${userName}`);
  adminUserMenu.innerHTML = `
    <div class="topbar-menu-item">
      <b>${escapeHtml(userName)}</b>
      <small>${escapeHtml(role)} · ${escapeHtml(source)}</small>
    </div>
    <button type="button" class="is-danger" data-admin-logout>
      <b>退出当前会话</b>
      <small>清理后台登录 Cookie，并刷新当前身份状态。</small>
    </button>
  `;
}

function renderTopbarMenus() {
  if (screenQuickMenu) {
    screenQuickMenu.innerHTML = pageRoutes
      .filter((item) => ["/", "/site.html", "/screen.html", "/admin", "/api/health"].includes(item.route))
      .map((item) => {
        const href = resolveAdminRouteHref(item.route);
        return `
          <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
            <b>${escapeHtml(item.name)}</b>
            <small>${escapeHtml(item.route)} · ${escapeHtml(item.note)}</small>
          </a>
        `;
      }).join("");
  }

  renderAdminUserMenu();
}

function renderPageManager() {
  if (!adminPageManager) {
    return;
  }

  adminPageManager.innerHTML = pageRoutes.map((item) => {
    const href = resolveAdminRouteHref(item.route);
    return `
      <article class="admin-route-card">
        <span>${escapeHtml(item.route)}</span>
        <b>${escapeHtml(item.name)}</b>
        <p>${escapeHtml(item.note)}</p>
        <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">打开页面</a>
      </article>
    `;
  }).join("");
}

function renderContentManager() {
  if (!adminContentManager) {
    return;
  }

  const works = normalizeWorks(businessDataState.works);
  const coverage = scoreCoverage(businessDataState.judgeScores);
  const snapshot = businessDataState.resultSnapshot;
  const contentCards = [
    { name: "赛道与成员", route: "data/teams.json", apiRoute: "/api/teams", count: `${businessDataState.teams.length} 个赛道`, note: `${countTeamMembers(businessDataState.teams)} 名成员，供组队页和后台队伍页使用。` },
    { name: "投票排名", route: "data/vote-results.json", apiRoute: "/api/vote-results", count: `${formatNumber(getVoteTotal())} 票`, note: businessDataState.voteResults.windowLabel || "投票窗口状态待同步。" },
    { name: "最终结果快照", route: "data/result-snapshots.json", apiRoute: "/api/results/latest", count: snapshot?.id ? "已发布" : "未发布", note: snapshot?.id || "发布结果后生成不可变最终排名快照。" },
    { name: "作品提交", route: "data/works.json", apiRoute: "/api/works", count: `${works.length} 件作品`, note: "作品提交后可在数据与投票页审核发布或退回。" },
    { name: "评委评分", route: "data/judge-scores.json", apiRoute: "/api/judge/scores", count: `${coverage.teamCount} 个赛道`, note: `${coverage.judgeCount} 位评委保存评分草稿。` },
    { name: "审计日志", route: "data/audit-logs.json", apiRoute: "/api/admin/audit-logs", count: `${businessDataState.auditLogs.length} 条`, note: "记录后台关键写操作，便于排查与复盘。" },
    { name: "星锐档案", route: "data/trainees.json", apiRoute: "/api/trainees", count: "14 人", note: "新人档案和个人展示内容仍由现有数据文件提供。" },
  ];

  adminContentManager.innerHTML = contentCards.map((item) => {
    const href = resolveAdminRouteHref(item.apiRoute || item.route);
    return `
      <article class="admin-route-card">
        <span>${escapeHtml(item.apiRoute || item.route)}</span>
        <b>${escapeHtml(item.name)} · ${escapeHtml(item.count)}</b>
        <p>${escapeHtml(item.note)}</p>
        <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">查看数据</a>
      </article>
    `;
  }).join("");
}

function renderSystemSettings() {
  if (!adminSystemSettings) {
    return;
  }

  const runtimeConfig = window.JoincareRuntimeConfig || {};
  const apiBaseUrl = window.JOINCARE_API_BASE_URL || runtimeConfig.apiBaseUrl || "";
  const adminName = getAdminUserDisplayName();
  const dataBackendLabel = formatDataBackendLabel(platformHealthState.runtime?.dataBackend);
  const settings = [
    ["前端运行模式", apiBaseUrl ? "前后端分离" : "同源 API"],
    ["API Base", apiBaseUrl || "同源 /api"],
    ["API 健康状态", platformHealthState.online ? `在线 · ${platformHealthState.status}` : `异常 · ${platformHealthState.status}`],
    ["最近检查", platformHealthState.checkedAt || "等待同步"],
    ["当前身份", `${adminName} · ${currentAdminSessionState.role || "admin"}`],
    ["静态资源入口", "server/frontendServer.js / admin.html"],
    ["API 服务入口", "server/index.js"],
    ["本地后端端口", "63779（npm run dev:api）"],
    ["本地前端端口", "5174（npm run dev:web）"],
    ["会话策略", "HTTP-only Cookie，支持后续 Redis Session"],
    ["当前存储", dataBackendLabel],
  ];

  setText(adminSystemRuntimeStatus, apiBaseUrl ? "前后端分离" : "同源运行");
  adminSystemSettings.innerHTML = settings.map(([label, value]) => `
    <article>
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value)}</span>
    </article>
  `).join("");
}

function getAdminRoleLabel(role) {
  return adminRoleLabels[String(role || "").trim()] || String(role || "待鉴权");
}

function renderUserRoleManager(users = userRoleState.users) {
  if (!adminUserRoleList) {
    return;
  }

  const cleanUsers = Array.isArray(users) ? users : [];
  const status = userRoleState.loading
    ? "同步中"
    : cleanUsers.length
      ? `${cleanUsers.length} 个账号`
      : "暂无账号";
  setText(adminUserRoleStatus, status);

  if (!cleanUsers.length) {
    adminUserRoleList.innerHTML = `
      <article class="admin-user-role-empty">
        <b>还没有角色映射</b>
        <span>填写左侧表单后，飞书登录会按用户 ID / Open ID / Union ID 匹配角色。</span>
      </article>
    `;
    return;
  }

  adminUserRoleList.innerHTML = cleanUsers.map((user) => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const identityItems = [
      user.id ? `ID：${user.id}` : "",
      user.openId ? `Open：${user.openId}` : "",
      user.unionId ? `Union：${user.unionId}` : "",
      user.department ? `部门：${user.department}` : "",
    ].filter(Boolean);

    return `
      <article class="admin-user-role-card">
        <header>
          <div>
            <b>${escapeHtml(user.name || "未命名用户")}</b>
            <span>${escapeHtml(identityItems.join(" · ") || "未绑定身份标识")}</span>
          </div>
          <button type="button" data-edit-user-role="${escapeHtml(user.id || "")}">编辑</button>
        </header>
        <div class="admin-user-role-chips">
          ${roles.length
            ? roles.map((role) => `<span>${escapeHtml(getAdminRoleLabel(role))}</span>`).join("")
            : "<span>未分配角色</span>"}
        </div>
      </article>
    `;
  }).join("");
}

async function loadUserRoles() {
  if (!adminUserRoleList) {
    return;
  }

  userRoleState = {
    ...userRoleState,
    loading: true,
  };
  renderUserRoleManager();

  try {
    const payload = await window.AppData.loadAdminUsers({ users: [] });
    userRoleState = {
      users: Array.isArray(payload.users) ? payload.users : [],
      loading: false,
    };
    renderUserRoleManager();
  } catch (error) {
    console.warn("User role mappings load failed.", error);
    userRoleState = {
      ...userRoleState,
      loading: false,
    };
    setText(adminUserRoleStatus, "同步失败");
    renderUserRoleManager(userRoleState.users);
  }
}

function getCheckedAdminRoles() {
  return [...(adminUserRoleForm?.querySelectorAll('[name="adminUserRole"]:checked') || [])]
    .map((input) => input.value)
    .filter(Boolean);
}

function collectUserRolePayload() {
  const payload = {
    id: adminUserRoleId?.value.trim() || "",
    name: adminUserRoleName?.value.trim() || "",
    openId: adminUserRoleOpenId?.value.trim() || "",
    unionId: adminUserRoleUnionId?.value.trim() || "",
    department: adminUserRoleDepartment?.value.trim() || "",
    roles: getCheckedAdminRoles(),
    actor: getAdminUserDisplayName(),
  };

  if (!payload.id || !payload.name) {
    setText(adminUserRoleStatus, "请补全用户 ID 和姓名");
    return null;
  }

  if (!payload.roles.length) {
    setText(adminUserRoleStatus, "至少选择一个角色");
    return null;
  }

  return payload;
}

function fillUserRoleForm(user) {
  if (!adminUserRoleForm || !user) {
    return;
  }

  if (adminUserRoleId) adminUserRoleId.value = user.id || "";
  if (adminUserRoleName) adminUserRoleName.value = user.name || "";
  if (adminUserRoleOpenId) adminUserRoleOpenId.value = user.openId || "";
  if (adminUserRoleUnionId) adminUserRoleUnionId.value = user.unionId || "";
  if (adminUserRoleDepartment) adminUserRoleDepartment.value = user.department || "";

  const roles = new Set(Array.isArray(user.roles) ? user.roles : []);
  adminUserRoleForm.querySelectorAll('[name="adminUserRole"]').forEach((input) => {
    input.checked = roles.has(input.value);
  });

  setText(adminUserRoleStatus, `正在编辑 ${user.name || user.id}`);
}

async function upsertUserRole(event) {
  event.preventDefault();
  const payload = collectUserRolePayload();
  if (!payload) {
    return;
  }

  const submitButton = adminUserRoleForm?.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  setText(adminUserRoleStatus, "保存中");

  try {
    const user = await window.AppData.upsertAdminUser(payload);
    userRoleState = {
      users: [user, ...userRoleState.users.filter((item) => item.id !== user.id)],
      loading: false,
    };
    renderUserRoleManager();
    adminUserRoleForm?.reset();
    addLog("admin", `更新用户权限【${user.name || user.id}】`);
    await loadAuditTrail();
  } catch (error) {
    console.warn("User role mapping update failed.", error);
    setText(adminUserRoleStatus, "保存失败");
    addLog("system", "同步失败：用户权限未保存");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function formatDataBackendLabel(dataBackend) {
  const backend = String(dataBackend || "").trim().toLowerCase();
  if (backend === "mysql") {
    return "MySQL repository";
  }
  if (backend === "json") {
    return "JSON repository";
  }
  if (backend === "custom") {
    return "自定义 repository";
  }

  return backend ? `${backend} repository` : "等待后端同步";
}

function renderPlatformHealth() {
  const runtimeConfig = window.JoincareRuntimeConfig || {};
  const apiBaseUrl = window.JOINCARE_API_BASE_URL || runtimeConfig.apiBaseUrl || "";
  const mode = apiBaseUrl ? "独立 API" : "同源 API";

  adminConnectionChip?.classList.toggle("is-online", platformHealthState.online);
  adminConnectionChip?.classList.toggle("is-offline", !platformHealthState.online);
  setText(adminConnectionLabel, platformHealthState.online ? "API 连接正常" : "API 连接异常");
  setText(adminApiHealthMeta, `${mode}${platformHealthState.checkedAt ? ` · ${platformHealthState.checkedAt}` : ""}`);
  renderSystemSettings();
}

async function loadPlatformHealth() {
  try {
    const payload = await window.AppData.loadHealth();
    platformHealthState = {
      online: payload?.status === "ok",
      status: payload?.status || "unknown",
      checkedAt: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      runtime: payload?.runtime || {},
    };
  } catch (error) {
    console.warn("API health check failed.", error);
    platformHealthState = {
      online: false,
      status: "unreachable",
      checkedAt: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      runtime: {},
    };
  }

  renderPlatformHealth();
}

async function loadCurrentAdminUser() {
  try {
    const session = await window.AppData.loadCurrentUser();
    currentAdminSessionState = {
      user: session?.user || { name: "admin" },
      role: session?.role || "admin",
      source: session?.source || "local",
      permissions: session?.permissions || {},
    };
  } catch (error) {
    console.warn("Current admin user load failed.", error);
    currentAdminSessionState = {
      ...currentAdminSessionState,
      source: "offline",
    };
  }

  renderTopbarMenus();
  renderSystemSettings();
}

async function logoutCurrentAdminUser() {
  try {
    await window.AppData.logoutCurrentUser();
    currentAdminSessionState = {
      user: { name: "admin" },
      role: "admin",
      source: "logged-out",
      permissions: {},
    };
    renderTopbarMenus();
    renderSystemSettings();
    addLog("admin", "退出当前后台会话");
    closeTopbarMenus();
  } catch (error) {
    console.warn("Admin logout failed.", error);
    addLog("system", "同步失败：退出登录未完成");
  }
}

function getActiveStage() {
  return stages.find((stage) => stage.status === "active") || stages[0];
}

function addLog(actor, message) {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  logs.unshift([time, actor, message]);
  renderLogs();
}

function normalizeLogEntry(entry) {
  if (Array.isArray(entry)) {
    return entry;
  }

  const rawTime = entry?.time || entry?.at || entry?.createdAt || entry?.updatedAt || "";
  const parsedTime = rawTime ? new Date(rawTime) : null;
  const displayTime = parsedTime && !Number.isNaN(parsedTime.getTime())
    ? parsedTime.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : rawTime || "--:--:--";

  return [
    displayTime,
    entry?.actor || "system",
    entry?.message || String(entry || ""),
  ];
}

function syncStageStatuses(stageId) {
  const nextIndex = stages.findIndex((stage) => stage.id === stageId);

  if (nextIndex < 0) {
    return false;
  }

  stages.forEach((stage, index) => {
    if (index < nextIndex) {
      stage.status = "done";
    } else if (index === nextIndex) {
      stage.status = "active";
    } else {
      stage.status = "pending";
    }
  });

  return true;
}

function applyAdminState(state) {
  if (!state) {
    return;
  }

  if (Array.isArray(state.stages)) {
    state.stages.forEach((remoteStage) => {
      const stage = stages.find((item) => item.id === remoteStage?.id);
      if (!stage) {
        return;
      }

      stage.status = remoteStage.status || stage.status;
      stage.time = remoteStage.time || stage.time;
    });
  }

  if (state.currentStageId) {
    syncStageStatuses(state.currentStageId);
  }

  if (Array.isArray(state.logs)) {
    logs = state.logs.map(normalizeLogEntry);
  }

  render();
}

function setActiveStage(nextId, { writeLog = true } = {}) {
  const nextIndex = stages.findIndex((stage) => stage.id === nextId);

  if (nextIndex < 0) {
    return;
  }

  syncStageStatuses(nextId);

  if (writeLog) {
    addLog("admin", `开启阶段【${stages[nextIndex].name}】`);
  }
  render();
}

async function publishStage(stageId) {
  try {
    const state = await window.AppData.updateAdminStage(stageId);
    applyAdminState(state);
  } catch (error) {
    console.warn("Admin stage sync failed.", error);
    addLog("system", "同步失败：阶段发布未生效，请检查后端连接");
  }
}

async function finishCurrentStage() {
  const activeIndex = stages.findIndex((stage) => stage.status === "active");
  if (activeIndex < 0) {
    return;
  }

  if (stages[activeIndex + 1]) {
    await publishStage(stages[activeIndex + 1].id);
    return;
  }

  addLog("system", "同步失败：当前已是最后阶段，无法继续结束");
}

function durationMsToMinutes(durationMs, fallbackMinutes) {
  const minutes = Math.round((Number(durationMs) || 0) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : fallbackMinutes;
}

function minutesInputToDurationMs(input, fallbackMinutes) {
  const minutes = Number(input?.value);
  const cleanMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : fallbackMinutes;
  return Math.round(cleanMinutes * 60000);
}

function formatStartedAt(startedAt) {
  if (!startedAt) return "未启动";
  const parsed = new Date(startedAt);
  if (Number.isNaN(parsed.getTime())) return "未启动";
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function renderMissionCountdownState(state = {}) {
  if (missionCountdownDuration) {
    missionCountdownDuration.value = String(durationMsToMinutes(state.durationMs, 1440));
  }
  if (missionCountdownState) {
    missionCountdownState.textContent = `状态：${formatStartedAt(state.startedAt)}`;
  }
  setText(adminScreenMissionState, `状态：${formatStartedAt(state.startedAt)} / ${durationMsToMinutes(state.durationMs, 1440)} 分钟`);
}

function renderRoadshowState(state = {}) {
  roadshowTeamState = {
    ...roadshowTeamState,
    currentTeamId: state.currentTeamId || roadshowTeamState.currentTeamId,
    nextTeamId: state.nextTeamId || roadshowTeamState.nextTeamId,
    currentTeam: state.currentTeam || roadshowTeamState.currentTeam,
    nextTeam: state.nextTeam || roadshowTeamState.nextTeam,
  };
  renderRoadshowTeamOptions();

  if (roadshowDuration) {
    roadshowDuration.value = String(durationMsToMinutes(state.durationMs, 15));
  }
  if (roadshowStateLabel) {
    const currentTeamName = roadshowTeamState.currentTeam?.name || roadshowTeamState.currentTeamId || "未选择队伍";
    roadshowStateLabel.textContent = `状态：${formatStartedAt(state.startedAt)} · 当前：${currentTeamName}`;
  }
  setText(adminScreenRoadshowState, `状态：${formatStartedAt(state.startedAt)} / ${durationMsToMinutes(state.durationMs, 15)} 分钟 / ${roadshowTeamState.currentTeamId || "未选择队伍"}`);
}

function collectStageDisplayTimes() {
  return [...document.querySelectorAll("[data-stage-time-input]")]
    .map((input) => ({
      id: input.dataset.stageTimeInput,
      time: input.value.trim(),
    }))
    .filter((stage) => stage.id);
}

async function saveDisplayTimes() {
  try {
    const state = await window.AppData.updateAdminDisplayTimes({
      stages: collectStageDisplayTimes(),
    });
    applyAdminState(state);
  } catch (error) {
    console.warn("Display time sync failed.", error);
    addLog("system", "同步失败：时间显示配置未保存");
  }
}

async function loadTimerControls() {
  try {
    renderMissionCountdownState(await window.AppData.loadMissionCountdown());
  } catch (error) {
    console.warn("Mission countdown state load failed.", error);
    if (missionCountdownState) missionCountdownState.textContent = "状态：同步失败";
  }

  try {
    renderRoadshowState(await window.AppData.loadRoadshow());
  } catch (error) {
    console.warn("Roadshow state load failed.", error);
    if (roadshowStateLabel) roadshowStateLabel.textContent = "状态：同步失败";
  }
}

async function loadAuditTrail() {
  setSyncStatus("syncing", "同步审计日志", "正在读取后台操作记录");
  try {
    const payload = await window.AppData.loadAuditLogs();
    const auditLogs = Array.isArray(payload.logs) ? payload.logs : [];
    businessDataState = {
      ...businessDataState,
      auditLogs,
    };

    if (auditLogs.length) {
      logs = auditLogs.map(normalizeLogEntry);
      renderLogs();
    }
    renderAuditLogList(auditLogs);
    renderDashboardSummary();
    renderContentManager();
    setSyncStatus("success", "审计日志已同步", `最近同步 ${formatSyncTime()}`);
  } catch (error) {
    console.warn("Audit log load failed.", error);
    renderAuditLogList(businessDataState.auditLogs);
    setSyncStatus("error", "审计日志同步失败", `最近失败 ${formatSyncTime()}`);
  }
}

async function loadBusinessData({ writeLog = false } = {}) {
  setSyncStatus("syncing", "同步业务数据", "队伍 / 投票 / 作品 / 评分 / 快照");
  const [teamsResult, voteResult, worksResult, judgeResult, snapshotResult] = await Promise.allSettled([
    window.AppData.loadTeams([]),
    window.AppData.loadVoteResults([]),
    window.AppData.loadWorks([]),
    window.AppData.loadJudgeScores({ scores: {} }),
    window.AppData.loadLatestResultSnapshot({ snapshot: null }),
  ]);
  const nextBusinessData = {};
  if (teamsResult.status === "fulfilled") nextBusinessData.teams = teamsResult.value;
  if (voteResult.status === "fulfilled") nextBusinessData.voteResults = voteResult.value;
  if (worksResult.status === "fulfilled") nextBusinessData.works = worksResult.value;
  if (judgeResult.status === "fulfilled") nextBusinessData.judgeScores = judgeResult.value;
  if (snapshotResult.status === "fulfilled") nextBusinessData.resultSnapshot = snapshotResult.value?.snapshot || null;

  renderBusinessData(nextBusinessData);

  const failedSources = [];
  if (teamsResult.status === "rejected") failedSources.push("队伍");
  if (voteResult.status === "rejected") failedSources.push("投票");
  if (worksResult.status === "rejected") failedSources.push("作品");
  if (judgeResult.status === "rejected") failedSources.push("评分");
  if (snapshotResult.status === "rejected") failedSources.push("快照");

  if (failedSources.length) {
    addLog("system", "同步失败：部分业务数据未加载");
    setSyncStatus("error", "部分数据同步失败", `${failedSources.join(" / ")} · ${formatSyncTime()}`);
    return;
  }

  setSyncStatus("success", "业务数据已同步", `最近同步 ${formatSyncTime()}`);
  if (writeLog) {
    addLog("system", "业务数据同步完成");
  }
}

async function updateWorkReviewStatus(teamId, status) {
  if (!teamId || !status) {
    return;
  }

  try {
    await window.AppData.updateAdminWorkStatus(teamId, {
      status,
      reviewerId: "admin",
      reviewNote: status === "published" ? "后台发布作品" : "后台退回作品",
    });
    addLog("admin", status === "published" ? `发布作品【${teamId}】` : `退回作品【${teamId}】`);
    await Promise.allSettled([loadBusinessData(), loadAuditTrail()]);
  } catch (error) {
    console.warn("Work review sync failed.", error);
    addLog("system", "同步失败：作品审核状态未更新");
  }
}

async function updateAdminVoteWindow(status) {
  if (!status) {
    return;
  }

  if (closeVoteButton) closeVoteButton.disabled = true;
  if (publishResultButton) publishResultButton.disabled = true;

  try {
    const voteResults = await window.AppData.updateAdminVoteWindow(status);
    const resultAction = "result.published";
    const snapshot = status === "published"
      ? await window.AppData.publishAdminResults({ actor: getAdminUserDisplayName(), action: resultAction })
      : null;
    const nextPayload = snapshot ? { voteResults, resultSnapshot: snapshot } : { voteResults };
    renderBusinessData(nextPayload);
    addLog("admin", snapshot ? `发布最终结果快照【${snapshot.id}】` : "关闭投票窗口");
    await loadAuditTrail();
  } catch (error) {
    console.warn("Vote window sync failed.", error);
    addLog("system", "同步失败：投票窗口状态未更新");
  } finally {
    if (confirmDangerAction) {
      confirmDangerAction.checked = false;
    }
    syncDangerActionButtons();
  }
}

async function updateMissionCountdown(startedAt) {
  try {
    const state = await window.AppData.updateAdminMissionCountdown({
      durationMs: minutesInputToDurationMs(missionCountdownDuration, 1440),
      startedAt,
    });
    renderMissionCountdownState(state);
    addLog("admin", startedAt ? "启动任务倒计时" : "重置任务倒计时");
  } catch (error) {
    console.warn("Mission countdown update failed.", error);
    addLog("system", "同步失败：任务倒计时未更新");
  }
}

async function updateRoadshow(startedAt) {
  try {
    const state = await window.AppData.updateAdminRoadshow({
      durationMs: minutesInputToDurationMs(roadshowDuration, 15),
      currentTeamId: roadshowCurrentTeamSelect?.value || roadshowTeamState.currentTeamId,
      currentTeam: getSelectedRoadshowTeam(roadshowCurrentTeamSelect?.value || roadshowTeamState.currentTeamId),
      nextTeamId: roadshowNextTeamSelect?.value || roadshowTeamState.nextTeamId,
      nextTeam: getSelectedRoadshowTeam(roadshowNextTeamSelect?.value || roadshowTeamState.nextTeamId),
      startedAt,
    });
    renderRoadshowState(state);
    addLog("admin", startedAt ? "启动路演计时" : "重置路演计时");
  } catch (error) {
    console.warn("Roadshow timer update failed.", error);
    addLog("system", "同步失败：路演计时未更新");
  }
}

function renderCurrentStage() {
  const active = getActiveStage();
  const displayTime = active.time ? active.time.replace("\n", " / ") : "管理员未设置";

  currentStageName.textContent = active.name;
  currentStageTime.textContent = `展示时间：${displayTime}`;
  currentStageStatus.textContent = statusLabel[active.status];
  currentStageStatus.className = `status-pill status-${active.status}`;
  previewStageName.textContent = active.name;
}

function renderRows() {
  stageRows.innerHTML = stages
    .map((stage, index) => {
      const commandClass = stage.status === "active" ? "is-danger" : stage.status === "pending" ? "is-primary" : "";
      const commandText = stage.status === "active" ? "结束阶段" : stage.status === "pending" ? "发布阶段" : "回放";
      const statusClass = `status-pill status-${stage.status}`;
      return `
        <div class="flow-row" role="row">
          <span class="stage-cell" role="cell">
            <i class="stage-index">${index + 1}</i>
            <span class="stage-name">
              <strong>${stage.name}</strong>
              <span>${stage.subtitle}</span>
            </span>
          </span>
          <span role="cell">
            <strong class="${statusClass}">${statusLabel[stage.status]}</strong>
          </span>
          <span class="stage-time" role="cell">
            <textarea class="stage-time-input" data-stage-time-input="${stage.id}" aria-label="${escapeHtml(stage.name)}展示时间">${escapeHtml(stage.time || "")}</textarea>
          </span>
          <span role="cell">
            <button class="stage-command ${commandClass}" type="button" data-stage-command="${stage.id}">${commandText}</button>
          </span>
        </div>
      `;
    })
    .join("");
}

function renderTimeline() {
  previewTimeline.innerHTML = stages
    .map((stage) => `<span class="timeline-node ${stage.status === "active" ? "is-active" : ""}">${stage.name}</span>`)
    .join("");
}

function renderLogs() {
  operationLog.innerHTML = logs
    .slice(0, 9)
    .map(([time, actor, message]) => `<li><span>${time}</span><strong>${actor}</strong><span>${message}</span></li>`)
    .join("");
}

function render() {
  renderCurrentStage();
  renderRows();
  renderTimeline();
  renderLogs();
  renderDashboardSummary();
  renderScreenControl();
}

function switchAdminView(view) {
  const targetView = view || "flow";
  const hasPanel = adminViewPanels.some((panel) => panel.dataset.adminViewPanel === targetView);

  if (!hasPanel) {
    return;
  }

  adminViewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.adminViewPanel === targetView);
  });

  adminNavButtons.forEach((button) => {
    const isActive = button.dataset.adminNav === targetView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (targetView === "dashboard" || targetView === "data" || targetView === "teams" || targetView === "content") {
    loadBusinessData().catch((error) => {
      console.warn("Business data refresh failed.", error);
    });
  }

  if (targetView === "screen") {
    renderScreenControl();
  }

  if (targetView === "pages") {
    renderPageManager();
  }

  if (targetView === "settings") {
    renderSystemSettings();
    loadUserRoles().catch((error) => {
      console.warn("User role mappings refresh failed.", error);
    });
  }

  if (targetView === "logs") {
    loadAuditTrail().catch((error) => {
      console.warn("Audit log refresh failed.", error);
    });
  }
}

function setupRainCanvas() {
  const canvas = document.querySelector("#adminRain");
  const context = canvas.getContext("2d");
  const chars = "AI星锐黑客松JOINCARE2026";
  const fontSize = 16;
  let columns = [];

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    columns = Array.from({ length: Math.ceil(window.innerWidth / fontSize) }, () => Math.random() * window.innerHeight);
  }

  function draw() {
    context.fillStyle = "rgba(2, 8, 14, 0.14)";
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    context.fillStyle = "rgba(40, 255, 200, 0.34)";
    context.font = `${fontSize}px Courier New, monospace`;

    columns.forEach((y, index) => {
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = index * fontSize;
      context.fillText(text, x, y);
      columns[index] = y > window.innerHeight + Math.random() * 400 ? 0 : y + fontSize;
    });

    window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

document.addEventListener("click", async (event) => {
  const navButton = event.target.closest("[data-admin-nav]");
  if (!navButton) {
    return;
  }

  switchAdminView(navButton.dataset.adminNav);
});

screenQuickMenuButton?.addEventListener("click", () => toggleTopbarMenu(screenQuickMenuButton, screenQuickMenu));
adminUserMenuButton?.addEventListener("click", () => toggleTopbarMenu(adminUserMenuButton, adminUserMenu));

document.addEventListener("click", (event) => {
  if (event.target.closest(".topbar-menu-wrap")) {
    return;
  }

  closeTopbarMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeTopbarMenus();
  }
});

document.addEventListener("click", async (event) => {
  const logoutButton = event.target.closest("[data-admin-logout]");
  if (!logoutButton) {
    return;
  }

  logoutButton.disabled = true;
  await logoutCurrentAdminUser();
});

document.addEventListener("click", async (event) => {
  const command = event.target.closest("[data-stage-command]");
  if (!command) {
    return;
  }

  const stage = stages.find((item) => item.id === command.dataset.stageCommand);
  if (!stage) {
    return;
  }

  if (stage.status === "active") {
    await finishCurrentStage();
  } else if (stage.status === "pending") {
    await publishStage(stage.id);
  } else {
    addLog("admin", `回放阶段【${stage.name}】`);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-work-status]");
  if (!button) {
    return;
  }

  const [teamId, status] = String(button.dataset.workStatus || "").split(":");
  button.disabled = true;
  await updateWorkReviewStatus(teamId, status);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-user-role]");
  if (!button) {
    return;
  }

  const user = userRoleState.users.find((item) => item.id === button.dataset.editUserRole);
  fillUserRoleForm(user);
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-screen-stage-command]");
  if (!button) {
    return;
  }

  button.disabled = true;
  await publishStage(button.dataset.screenStageCommand);
});

document.querySelector("#startNextStage").addEventListener("click", async () => {
  const activeIndex = stages.findIndex((stage) => stage.status === "active");
  const next = stages[activeIndex + 1];
  if (next) {
    await publishStage(next.id);
  }
});

document.querySelector("#finishCurrentStage").addEventListener("click", finishCurrentStage);

saveDisplayTimesButton?.addEventListener("click", saveDisplayTimes);
startMissionCountdownButton?.addEventListener("click", () => updateMissionCountdown(new Date().toISOString()));
resetMissionCountdownButton?.addEventListener("click", () => updateMissionCountdown(null));
startRoadshowButton?.addEventListener("click", () => updateRoadshow(new Date().toISOString()));
resetRoadshowButton?.addEventListener("click", () => updateRoadshow(null));
refreshBusinessDataButton?.addEventListener("click", () => loadBusinessData({ writeLog: true }));
refreshDataWorkspaceButton?.addEventListener("click", () => loadBusinessData({ writeLog: true }));
refreshContentManagerButton?.addEventListener("click", () => loadBusinessData({ writeLog: true }));
refreshAuditLogButton?.addEventListener("click", () => loadAuditTrail());
adminUserRoleForm?.addEventListener("submit", upsertUserRole);

document.querySelector("#clearLogButton").addEventListener("click", () => {
  logs.splice(0, logs.length, [new Date().toLocaleTimeString("zh-CN", { hour12: false }), "admin", "清空操作日志"]);
  renderLogs();
});

confirmDangerAction?.addEventListener("change", syncDangerActionButtons);
closeVoteButton?.addEventListener("click", () => updateAdminVoteWindow("closed"));
publishResultButton?.addEventListener("click", () => updateAdminVoteWindow("published"));
syncDangerActionButtons();

async function initAdmin() {
  render();
  renderBusinessData();
  renderAuditLogList();
  renderScreenControl();
  renderPageManager();
  renderContentManager();
  renderSystemSettings();
  renderUserRoleManager();
  renderPlatformHealth();
  renderSyncStatus();
  renderTopbarMenus();
  setupRainCanvas();

  try {
    const state = await window.AppData.loadAdminState();
    applyAdminState(state);
    await Promise.allSettled([loadCurrentAdminUser(), loadPlatformHealth(), loadTimerControls(), loadBusinessData(), loadAuditTrail(), loadUserRoles()]);
    addLog("system", "后台状态同步完成");
  } catch (error) {
    console.warn("Admin state load failed.", error);
    addLog("system", "同步失败：无法加载后端状态，暂用本地默认阶段");
    await Promise.allSettled([loadCurrentAdminUser(), loadPlatformHealth(), loadTimerControls(), loadBusinessData(), loadAuditTrail(), loadUserRoles()]);
  }
}

initAdmin();
