/**
 * AI创新黑客松 · 官网（PC 优先，响应式）
 * 两条主线：人（新生看板）+ 作品（作品展厅，可点进详情、投票）。
 * 复用 styles.css 变量 + code-rain.js + screen-data.js（与大屏同源）+ data/trainees.json。
 */
(function attachSite(root, doc) {
  "use strict";
  const D = root.ScreenData;
  const AppData = root.AppData || {};
  const Logic = root.AppLogic || {};
  const TEAM_KEY = "joincare_hackathon_team";
  const TEAM_NAME_KEY = "joincare_hackathon_team_names";
  const WORK_DRAFT_KEY = "joincare_hackathon_work_drafts";
  const WORKSPACE_META_KEY = "joincare_hackathon_workspace_meta";
  const JUDGE_KEY = "joincare_hackathon_judge_scores";
  const ROLE_KEY = "joincare_hackathon_role";
  const SESSION_KEY = "joincare_hackathon_session";
  const VALID_ROLES = ["public", "player", "judge", "admin"];
  let TRAINEES = [];
  let MOBILE_TRAINEE_INDEX = 0;
  let MOBILE_TRAINEE_DETAIL = false;
  let MOBILE_TRAINEE_IS_TRANSITIONING = false;
  let MOBILE_TRAINEE_SHOULD_ENTER = false;
  let SITE_STATE = null;
  let SITE_STATE_ERROR = "";
  let siteMediaMode = "photo";
  const STATIC_TEAMS = (D.teams || []).map((team) => ({
    ...team,
    advisor: { ...(team.advisor || {}) },
    members: (team.members || []).map((member) => ({ ...member })),
    stack: Array.isArray(team.stack) ? [...team.stack] : [],
  }));
  const STATIC_TEAM_BY_ID = STATIC_TEAMS.reduce((map, team, index) => {
    map[team.id] = { team, index };
    return map;
  }, {});
  const cssUrl = (path) => path ? `url('${String(path).replaceAll("'", "\\'")}')` : "none";
  let pendingAuthTarget = null;
  let CURRENT_STAGE_ID = "result";
  let COUNTDOWN_REMAIN = 6353;
  function resolveHomePhase(stageId) {
    const s = String(stageId || "").toLowerCase();
    if (["opening", "icebreaker", "speech", "tracks"].includes(s)) {
      return { phase: "挑战任务发布中", label: "距任务开始还有", remain: 7200 };
    } else if (s === "team") {
      return { phase: "挑战任务进行中", label: "距作品提交截止", remain: 129600 };
    } else {
      return { phase: "成果展示进行中", label: "距投票结束截止", remain: 6353 };
    }
  }
  async function syncHomeState() {
    try {
      const state = await apiRequest("/api/admin/state");
      if (state && state.currentStageId) {
        CURRENT_STAGE_ID = state.currentStageId;
        const phaseInfo = resolveHomePhase(CURRENT_STAGE_ID);
        COUNTDOWN_REMAIN = phaseInfo.remain;
        if (CURRENT_STAGE_ID === "team") {
          try {
            const mc = await apiRequest("/api/mission-countdown");
            if (mc && mc.startedAt) {
              const ms = new Date(mc.startedAt).getTime() + mc.durationMs - Date.now();
              if (ms > 0) COUNTDOWN_REMAIN = Math.floor(ms / 1000);
            }
          } catch (e) {}
        } else if (["vote", "result", "final"].includes(CURRENT_STAGE_ID)) {
          try {
            const rs = await apiRequest("/api/roadshow");
            if (rs && rs.startedAt) {
              const ms = new Date(rs.startedAt).getTime() + rs.durationMs - Date.now();
              if (ms > 0) COUNTDOWN_REMAIN = Math.floor(ms / 1000);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Failed to sync home state", e);
    }
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const fmtHMS = (s) => `${pad((s / 3600) | 0)}<i>:</i>${pad(((s % 3600) / 60) | 0)}<i>:</i>${pad(s % 60)}`;
  const votedTeam = () => (SITE_STATE && SITE_STATE.vote && SITE_STATE.vote.myVoteTeamId) || "";
  const joinedTeam = () => (SITE_STATE && SITE_STATE.me && SITE_STATE.me.teamId) || root.localStorage.getItem(TEAM_KEY);
  function currentRole() { return root.localStorage.getItem(ROLE_KEY); }
  const roleName = (role) => Logic.getRoleLabel ? Logic.getRoleLabel(role) : ({ player: "参赛选手", judge: "专家评委", public: "大众评委", admin: "管理员" }[role] || "待鉴权");
  const rolePermissions = (role) => Logic.getRolePermissions ? Logic.getRolePermissions(role) : { canJoinTeam: role === "player", canSubmitWork: role === "player", canVote: role === "public", canScore: role === "judge", canAdmin: role === "admin", canControlBigscreen: role === "admin", canViewTeamProgress: true };
  const roleNavItems = (role) => Logic.getRoleNavItems ? Logic.getRoleNavItems(role) : VIEWS.filter((v) => !v.hidden).map(({ key, label }) => ({ key, label }));
  const getTeam = (id) => D.teams.find((t) => t.id === id);
  function hasBackendSession() {
    const role = currentRole();
    return Boolean(SITE_STATE && SITE_STATE.me && SITE_STATE.me.authenticated && SITE_STATE.me.user && role && SITE_STATE.me.role === role);
  }
  function canUseVoteAction() {
    return hasBackendSession() && rolePermissions(currentRole()).canVote;
  }
  function clearStoredRole() {
    root.localStorage.removeItem(ROLE_KEY);
    root.localStorage.removeItem(SESSION_KEY);
  }
  function canOpenTeamWorkspace(teamId) {
    const permissions = rolePermissions(currentRole());
    return permissions.canSubmitWork && joinedTeam() === teamId;
  }
  function canEditTeamWorkspace(teamId) {
    const team = getTeam(teamId);
    if (!team || !canOpenTeamWorkspace(teamId)) return false;
    const meta = getTeamWorkspaceMeta(team);
    return currentWorkspaceMemberId(team) === meta.leaderId;
  }
  const readJson = (key, fallback) => {
    try { return JSON.parse(root.localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; }
  };
  const splitTags = (value) => String(value || "").split(/[，、,\n/]+/).map((x) => x.trim()).filter(Boolean);
  const defaultDuty = (index) => ["队长 / 统筹推进", "业务洞察", "AI 开发", "产品设计", "路演运营"][index] || "队友协作";
  const normalizeList = (value) => Array.isArray(value) ? value : [];
  const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  function normalizeSiteTrainee(trainee) {
    return Logic.normalizeTrainee ? Logic.normalizeTrainee(trainee) : trainee;
  }
  function findStaticTeam(team, index) {
    const byId = STATIC_TEAM_BY_ID[team.id];
    if (byId) return byId.team;
    return STATIC_TEAMS[index] || STATIC_TEAMS[0] || {};
  }
  function workForTeam(works, teamId) {
    return works.find((work) => String(work.teamId || work.id || "") === String(teamId || ""));
  }
  function voteForTeam(results, teamId) {
    return results.find((result) => String(result.id || result.teamId || "") === String(teamId || ""));
  }
  function normalizeMember(member = {}, index = 0) {
    return {
      id: member.id || member.userId || `member-${index + 1}`,
      userId: member.userId || member.id || "",
      name: member.name || member.displayName || "未命名成员",
      avatar: member.avatar || member.photo || member.idPhoto || "",
      role: member.role || member.duty || "队友",
      duty: member.duty || member.role || "",
      department: member.department || "",
    };
  }
  function normalizeSiteTeam(team = {}, index = 0, voteResults = [], works = []) {
    const base = findStaticTeam(team, index);
    const work = workForTeam(works, team.id);
    const vote = voteForTeam(voteResults, team.id);
    const trackCode = team.trackCode || team.index || team.track_code || base.trackCode || pad(index + 1);
    const track = team.track || team.trackName || team.nameEn || base.track || "业务赛道";
    const stack = Array.isArray(work?.stack) && work.stack.length
      ? work.stack
      : Array.isArray(team.stack) && team.stack.length
        ? team.stack
        : normalizeList(base.stack);

    return {
      ...base,
      ...team,
      id: team.id || base.id || `team-${index + 1}`,
      trackCode,
      track,
      accent: team.accent || base.accent || "var(--neon)",
      rgb: team.rgb || team.colorRgb || base.rgb || "40,255,200",
      name: team.name || base.name || track,
      project: work?.project || team.project || base.project || "作品待提交",
      pitch: work?.pitch || team.pitch || base.pitch || "",
      stack,
      submitted: Boolean(work && !["draft", "rejected"].includes(work.status)) || Boolean(team.submitted),
      advisor: team.advisor || base.advisor || { name: "赛道顾问", avatar: "" },
      members: normalizeList(team.members).map(normalizeMember),
      votes: toNumber(vote?.votes, 0),
      expert: toNumber(vote?.expert ?? team.expert, 0),
      work: work || null,
    };
  }
  function updateSiteStats() {
    const memberCount = D.teams.reduce((sum, team) => sum + 1 + normalizeList(team.members).length, 0);
    D.stats = {
      ...(D.stats || {}),
      teams: D.teams.length,
      members: memberCount,
      mentors: D.teams.length,
    };
  }
  function computeSiteRanking() {
    const snapshot = SITE_STATE && SITE_STATE.result && SITE_STATE.result.snapshot;
    if (SITE_STATE?.result?.published && Array.isArray(snapshot?.results) && snapshot.results.length) {
      return snapshot.results.map((result, index) => {
        const team = getTeam(result.id || result.teamId) || {};
        return {
          ...team,
          ...result,
          id: result.id || result.teamId || team.id,
          rank: toNumber(result.rank, index + 1),
          total: toNumber(result.total ?? result.score, 0),
          expert: toNumber(result.expert ?? result.expertAverage, team.expert || 0),
          votePoint: toNumber(result.votePoint ?? result.voteScore, 0),
        };
      });
    }

    const byVotes = [...D.teams].sort((a, b) => b.votes - a.votes);
    const pointScale = normalizeList(SITE_STATE?.vote?.pointScale).length
      ? SITE_STATE.vote.pointScale
      : normalizeList(D.votePoints);
    const ranked = D.teams.map((team) => {
      const voteRank = byVotes.findIndex((item) => item.id === team.id) + 1;
      const votePoint = toNumber(pointScale[voteRank - 1], 0);
      return {
        ...team,
        voteRank,
        votePoint,
        total: +(team.expert * 0.7 + votePoint * 0.3).toFixed(2),
      };
    }).sort((a, b) => b.total - a.total);
    ranked.forEach((team, index) => { team.rank = index + 1; });
    return ranked;
  }
  function applySiteState(state) {
    SITE_STATE = state || null;
    SITE_STATE_ERROR = "";
    const voteResults = normalizeList(state?.vote?.results);
    const works = normalizeList(state?.works);
    TRAINEES = normalizeList(state?.trainees).map(normalizeSiteTrainee);
    D.teams = normalizeList(state?.teams).map((team, index) => normalizeSiteTeam(team, index, voteResults, works));
    D.computeRanking = computeSiteRanking;
    updateSiteStats();
  }
  async function loadSiteState() {
    if (!AppData || typeof AppData.loadSiteBootstrap !== "function") {
      applySiteState({ trainees: [], teams: [], works: [], vote: { results: [] }, result: { published: false, snapshot: null } });
      SITE_STATE_ERROR = "观众端真实数据接口未加载";
      return null;
    }

    try {
      const state = await AppData.loadSiteBootstrap();
      applySiteState(state);
      return state;
    } catch (error) {
      console.warn("Failed to load site bootstrap state.", error);
      applySiteState({ trainees: [], teams: [], works: [], vote: { results: [] }, result: { published: false, snapshot: null } });
      SITE_STATE_ERROR = "无法连接观众端真实数据接口，请稍后重试";
      return null;
    }
  }
  function getRuntimeApiBaseUrl() {
    const runtimeConfig = root.JoincareRuntimeConfig || {};
    const value = root.JOINCARE_API_BASE_URL || runtimeConfig.apiBaseUrl || "";
    return String(value || "").trim().replace(/\/+$/, "");
  }
  function resolveApiUrl(path) {
    const value = String(path || "");
    if (!value.startsWith("/api/") && value !== "/api") return value;
    const apiBaseUrl = getRuntimeApiBaseUrl();
    return apiBaseUrl ? `${apiBaseUrl}${value}` : value;
  }
  function teamPeople(team) {
    return [{ ...team.advisor, id: `${team.id}-leader`, defaultDuty: defaultDuty(0) }, ...team.members.map((m, i) => ({ ...m, id: `${team.id}-m${i + 1}`, defaultDuty: defaultDuty(i + 1) }))];
  }
  function getTeamWorkspaceMeta(team) {
    const people = teamPeople(team);
    const saved = readJson(WORKSPACE_META_KEY, {})[team.id] || {};
    const knownIds = new Set(people.map((p) => p.id));
    const duties = {};
    people.forEach((p) => { duties[p.id] = (saved.duties && saved.duties[p.id]) || p.defaultDuty; });
    return {
      leaderId: knownIds.has(saved.leaderId) ? saved.leaderId : people[0].id,
      duties,
    };
  }
  function saveTeamWorkspaceMeta(teamId, meta) {
    const all = readJson(WORKSPACE_META_KEY, {});
    all[teamId] = meta;
    root.localStorage.setItem(WORKSPACE_META_KEY, JSON.stringify(all));
  }
  function currentWorkspaceMemberId(team) {
    const session = readJson(SESSION_KEY, {});
    const people = teamPeople(team);
    const meta = getTeamWorkspaceMeta(team);
    const sessionMemberId = session.memberId || session.traineeId || session.userId || "";
    if (people.some((p) => p.id === sessionMemberId)) return sessionMemberId;
    if (session.name) {
      const byName = people.find((p) => p.name === session.name);
      if (byName) return byName.id;
    }
    return meta.leaderId;
  }

  async function apiRequest(path, options) {
    const response = await fetch(resolveApiUrl(path), {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options && options.headers) },
      ...options,
    });
    if (!response.ok) {
      const error = new Error(`API ${path} responded ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  const SiteRoleApi = {
    getMe: () => apiRequest("/api/me"),
    getPermissions: () => apiRequest("/api/permissions"),
    getFeishuAuthorizeUrl: (redirect, page) => apiRequest(`/api/auth/feishu/authorize?redirect=${encodeURIComponent(redirect)}&page=${encodeURIComponent(page)}`),
    exchangeFeishuCode: (code, state) => apiRequest("/api/auth/feishu/login", { method: "POST", body: JSON.stringify({ code, state }) }),
    setCurrentRole: (role) => apiRequest("/api/auth/role", { method: "POST", body: JSON.stringify({ role }) }),
    logout: () => apiRequest("/api/auth/logout", { method: "POST", body: "{}" }),
    joinTeam: (teamId) => apiRequest("/api/team/join", { method: "POST", body: JSON.stringify({ teamId }) }),
    leaveTeam: (teamId) => apiRequest("/api/team/leave", { method: "POST", body: JSON.stringify({ teamId }) }),
    castVote: (teamId) => apiRequest("/api/vote/cast", { method: "POST", body: JSON.stringify({ teamId }) }),
    cancelVote: (teamId) => apiRequest("/api/vote/cancel", { method: "POST", body: JSON.stringify({ teamId }) }),
    saveJudgeScores: (scores) => apiRequest("/api/judge/scores", { method: "POST", body: JSON.stringify({ scores }) }),
    submitWork: (payload) => apiRequest("/api/work/submit", { method: "POST", body: JSON.stringify(payload || {}) }),
  };
  root.JoincareRoleApi = SiteRoleApi;

  function avatar(p, size, cls) {
    const s = size || 44;
    if (p && p.avatar) return `<span class="s-ava ${cls || ""}" style="width:${s}px;height:${s}px;background-image:url('${p.avatar}')" title="${esc(p.name || "")}"></span>`;
    return `<span class="s-ava s-ava-ph ${cls || ""}" style="width:${s}px;height:${s}px"><i>${esc((p && p.name || "·").slice(0, 1))}</i></span>`;
  }

  const G = {
    target: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
    vote: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2l-1 6a2 2 0 0 1-2 2H7z"/>',
    trophy: '<path d="M7 5h10v3a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9 20h6"/>',
    team: '<circle cx="9" cy="9" r="2.4"/><circle cx="15" cy="9" r="2.4"/><path d="M5 18a4 4 0 0 1 8 0M11 18a4 4 0 0 1 8 0"/>',
    code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    scale: '<path d="M12 4v16M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    rocket: '<path d="M12 15l-3 3-3-3 3-3M12 15l5-5a7 7 0 0 0-3-3l-5 5"/><path d="M14 7l3-3 3 1-2 4"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',
    stage: '<path d="M4 19h16M7 19V8h10v11M9 8V5h6v3"/><path d="M10 12h4"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    bulb: '<path d="M12 2a5 5 0 0 0-5 5c0 2.2 1.3 4.1 3 5l1 2h2l1-2c1.7-.9 3-2.8 3-5a5 5 0 0 0-5-5z"/><path d="M9 17h6M10 20h4"/>',
  };
  const ICON = (name, accent) => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${G[name] || G.code}</svg>`;

  function pageHead(zh, sub, en) {
    return `<section class="page-hero"><div class="container"><span class="ph-en">${esc(en)}</span><h1>${esc(zh)}</h1><p>${esc(sub)}</p></div></section>`;
  }
  const teamLinks = (t) => ({
    gitlab: `https://git.joincare.com.cn/hackathon/${t.id}`,
    page: `https://joincare.feishu.cn/docx/work-${t.id}`,
    video: `https://joincare.feishu.cn/file/demo-${t.id}`,
  });
  const isMobileView = () => root.matchMedia("(max-width: 680px)").matches;
  const traineeList = () => TRAINEES || [];
  const traineeIdImage = (p) => esc((p && (p.idPhoto || p.photo)) || "");
  const traineeLifeImage = (p) => esc((p && (p.photo || p.memeImage || p.idPhoto)) || "");
  const traineeImage = traineeIdImage;
  const shortText = (s, n) => {
    const v = String(s || "").replace(/\s+/g, " ").trim();
    return v.length > n ? `${v.slice(0, n)}...` : v;
  };
  const toolTags = (s) => String(s || "").split(/[，、,\n/]+/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const entryCard = ({ nav, href, title, en, sub, icon, accent, rgb }, index, options = {}) => {
    const attr = href ? `href="${esc(href)}"` : `data-nav="${esc(nav)}"`;
    const compactClass = options.hideEnglish ? " no-entry-en" : "";
    const englishLine = options.hideEnglish ? "" : `<i>${esc(en)}</i>`;
    let arrow = "";
    if (index !== undefined) {
      if (index === 0 || index === 1 || index === 2) {
        arrow = `<span class="entry-go right-arr">➔</span>`;
      } else if (index === 3) {
        arrow = `<span class="entry-go down-arr">➔</span>`;
      } else if (index === 5 || index === 6 || index === 7) {
        arrow = `<span class="entry-go left-arr">➔</span>`;
      }
    }
    return `<a class="entry-card${compactClass}" ${attr} style="--accent:${accent};--rgb:${rgb}"><span class="entry-ic">${ICON(icon, accent)}</span><div class="entry-tx"><b>${esc(title)}</b>${englishLine}<span>${esc(sub)}</span></div>${arrow}</a>`;
  };
  function getHomeActions(role) {
    return [
      { nav: "schedule", title: "启航时刻", en: "KICKOFF", sub: "总裁致辞·认识彼此·认识组织", icon: "calendar", accent: "#6ad7ff", rgb: "106,215,255" },
      { nav: "tracks", title: "挑战发布", en: "CHALLENGE BRIEFING", sub: "五大业务赛道发布挑战课题", icon: "doc", accent: "#c79bff", rgb: "199,155,255" },
      { nav: "team", title: "自由组队", en: "TEAM FORMATION", sub: "选择感兴趣的赛题，组建战队", icon: "team", accent: "var(--neon-2)", rgb: "167,255,79" },
      { nav: "schedule", title: "方案共创", en: "SOLUTION DESIGN", sub: "洞察业务需求，探索解决方案方向", icon: "bulb", accent: "var(--warning)", rgb: "246,255,129" },
      { nav: "schedule", title: "创新冲刺", en: "HACKATHON SPRINT", sub: "完成方案打磨、原型开发与成果完善", icon: "code", accent: "var(--neon)", rgb: "40,255,200" },
      { nav: "gallery", title: "成果展示", en: "SHOWCASE", sub: "展示团队成果与解决方案思路", icon: "stage", accent: "#ff9be1", rgb: "255,155,225" },
      { nav: "vote", title: "评审与投票", en: "EVALUATION & VOTING", sub: "专家评审团评分·全员投票", icon: "vote", accent: "#ffd06a", rgb: "255,208,106" },
      { nav: "result", title: "荣誉揭晓", en: "FINAL RANKING", sub: "公布最终排名与获奖团队", icon: "trophy", accent: "#ff6a6a", rgb: "255,106,106" },
    ];
  }

  function showAuthGate(target) {
    if (currentRole() && hasBackendSession()) return true;
    pendingAuthTarget = target && target !== "entry" ? target : pendingAuthTarget;
    let gate = doc.getElementById("authGate");
    if (!gate) {
      gate = doc.createElement("div");
      gate.id = "authGate";
      gate.className = "auth-gate";
      doc.body.appendChild(gate);
    }
    gate.innerHTML = `<div class="auth-gate-backdrop"></div><section class="auth-card glass">
      <span class="ph-en">ENTRY AUTH</span>
      <h2>飞书登录</h2>
      <p>请使用飞书账号登录；登录后将按你被授予的角色进入，多个角色时可自行选择当前身份。</p>
      <button class="auth-feishu" type="button" data-auth-feishu>飞书账号登录</button>
    </section>`;
    gate.classList.add("show");
    return false;
  }
  function closeAuthGate() {
    const gate = doc.getElementById("authGate");
    if (gate) gate.classList.remove("show");
  }
  function requireAuth(target) {
    if (currentRole() && hasBackendSession()) return true;
    if (currentRole() && !hasBackendSession()) {
      clearStoredRole();
      renderNavLinks();
      renderMobileTabbar();
      refreshRoleChrome();
    }
    showAuthGate(target);
    return false;
  }
  function requireRole(target, check, deniedMessage) {
    if (!requireAuth(target)) return false;
    if (!check(rolePermissions(currentRole()))) {
      toast(deniedMessage);
      return false;
    }
    return true;
  }
  function authParams() {
    return new URLSearchParams(root.location.search);
  }
  function wantsAuthChooser() {
    return authParams().get("auth") === "choose";
  }
  function setRole(role, session) {
    if (!VALID_ROLES.includes(role)) return false;
    root.localStorage.setItem(ROLE_KEY, role);
    if (session) root.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }
  function hydrateRole() {
    if (wantsAuthChooser()) {
      root.localStorage.removeItem(ROLE_KEY);
      return;
    }
    if (currentRole() && !VALID_ROLES.includes(currentRole())) {
      root.localStorage.removeItem(ROLE_KEY);
    }
  }
  function clearLocalSession() {
    root.localStorage.removeItem(ROLE_KEY);
    root.localStorage.removeItem(SESSION_KEY);
    renderNavLinks();
    renderMobileTabbar();
    refreshRoleChrome();
  }

  // 每次重载都以后端会话为准：会话失效/已退出就清掉本地登录态，避免"假登录"误导。
  async function syncRoleFromBackend() {
    let me;
    try {
      me = await SiteRoleApi.getMe();
    } catch (e) {
      return; // 网络/服务异常：不动本地状态，避免误清。
    }

    if (!me || !me.user) {
      // 后端无有效会话：若本地还残留登录态，清掉并提示。
      const hadLocal = Boolean(currentRole()) || Boolean(readJson(SESSION_KEY, null));
      clearLocalSession();
      if (hadLocal) toast("登录已失效，请重新登录");
      return;
    }

    // 有有效会话：以后端为准同步。
    storeSession(me);
    if (me.needsRoleSelection) {
      root.localStorage.removeItem(ROLE_KEY);
      refreshRoleChrome();
      showRolePicker(me.roles || []);
      return;
    }
    if (me.role) {
      setRole(me.role, me);
    }
    renderNavLinks();
    renderMobileTabbar();
    refreshRoleChrome();
  }
  // 角色弹窗用的简洁标签（按用户口径：观众/选手/评委/管理员）。
  const ROLE_PICK_LABELS = { public: "观众", player: "选手", judge: "评委", admin: "管理员" };
  const ROLE_PICK_HINT = {
    public: "浏览作品 · 投票",
    player: "抢赛道 · 提交作品",
    judge: "评分 · 评语 · 排位",
    admin: "后台管理 · 大屏控制",
  };
  const pickLabel = (role) => ROLE_PICK_LABELS[role] || roleName(role);

  function storeSession(res) {
    try {
      root.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: res.user || null, role: res.role || "", roles: res.roles || [] }));
    } catch (e) { /* 存储不可用时忽略 */ }
  }

  function finalizeLogin(role, session, redirectPath) {
    storeSession({ ...session, role });
    setRole(role, session);
    renderNavLinks();
    renderMobileTabbar();
    refreshRoleChrome();
    closeAuthGate();
    closeRolePicker();
    toast(`已进入「${pickLabel(role)}」视角`);
    const target = (String(redirectPath || "").split("#")[1] || pendingAuthTarget || "me").trim() || "me";
    pendingAuthTarget = null;
    go(target);
  }

  // 发起飞书登录：拿授权 URL → 跳转飞书（前端回跳式，回到本页带 ?code&state）。
  async function startFeishuLogin() {
    toast("正在跳转飞书登录…");
    const target = pendingAuthTarget || (location.hash.slice(1) || "me");
    // 回调地址动态取当前页面（去 hash/query），跳转前生成，无需任何额外配置。
    const page = root.location.pathname || "/site.html";
    try {
      const res = await SiteRoleApi.getFeishuAuthorizeUrl(`${page}#${target}`, page);
      if (res && res.configured && res.url) { root.location.href = res.url; return; }
      toast("飞书登录未配置（缺少应用凭证）");
    } catch (e) {
      toast("无法发起飞书登录，请稍后重试");
    }
  }

  let feishuExchanged = false; // 防 code 重复消费 / 重复执行
  async function consumeFeishuCallback() {
    const params = authParams();
    const code = params.get("code");
    const state = params.get("state");
    if (!code || feishuExchanged) return false;
    feishuExchanged = true;
    // 一次性：先把 code/state 从地址栏清掉，避免刷新重放。
    try {
      const u = new URL(root.location.href);
      u.searchParams.delete("code");
      u.searchParams.delete("state");
      history.replaceState(null, "", u.pathname + (u.search || "") + (u.hash || ""));
    } catch (e) { /* 忽略 */ }
    try {
      const res = await SiteRoleApi.exchangeFeishuCode(code, state);
      if (!res || !res.authenticated) {
        toast(res && res.reason === "missing-oauth-config" ? "飞书登录未配置" : "飞书登录失败，请重试");
        return false;
      }
      storeSession(res);
      if (res.needsRoleSelection) {
        showRolePicker(res.roles || [], res.redirectPath);
        return true;
      }
      finalizeLogin(res.role, res, res.redirectPath);
      return true;
    } catch (e) {
      toast("飞书登录失败：" + (e && e.message ? e.message : "请重试"));
      return false;
    }
  }

  // 右上角用户菜单：切换角色 + 退出登录。
  function closeUserMenu() {
    const m = doc.getElementById("navUserMenu");
    if (m) m.remove();
  }
  function toggleUserMenu() {
    if (doc.getElementById("navUserMenu")) { closeUserMenu(); return; }
    if (!navLogin) return;
    const session = readJson(SESSION_KEY, {});
    const user = session && session.user;
    if (!user) return;
    const roles = (session.roles || []).filter((r) => VALID_ROLES.includes(r));
    const cur = currentRole();
    const menu = doc.createElement("div");
    menu.id = "navUserMenu";
    menu.className = "nav-user-menu glass";
    menu.innerHTML = `
      <div class="num-head">
        ${user.avatar
          ? `<span class="nav-ava" style="background-image:url('${esc(user.avatar)}')"></span>`
          : `<span class="nav-ava nav-ava-fallback">${esc(String(user.name).slice(0, 1))}</span>`}
        <div class="num-id"><b>${esc(user.name)}</b><i>${cur ? esc(pickLabel(cur)) : "未选择角色"}</i></div>
      </div>
      ${roles.length > 1 ? `<div class="num-roles"><span class="num-label">切换角色</span>${roles.map((r) => `<button type="button" data-switch-role="${esc(r)}" class="${r === cur ? "on" : ""}">${esc(pickLabel(r))}${r === cur ? "<i>当前</i>" : ""}</button>`).join("")}</div>` : ""}
      <button type="button" class="num-logout" data-logout>退出登录</button>`;
    navLogin.parentElement.appendChild(menu);
  }
  async function switchCurrentRole(role) {
    closeUserMenu();
    if (!VALID_ROLES.includes(role) || role === currentRole()) return;
    try {
      const res = await SiteRoleApi.setCurrentRole(role);
      if (res && res.role) {
        storeSession(res);
        setRole(res.role, res);
        await loadSiteState();
        renderNavLinks();
        renderMobileTabbar();
        refreshRoleChrome();
        toast(`已切换到「${pickLabel(res.role)}」`);
        go("me");
        return;
      }
      toast("角色切换失败，请重试");
    } catch (e) {
      toast("角色切换失败：" + (e && e.message ? e.message : "请重试"));
    }
  }
  async function doLogout() {
    closeUserMenu();
    try { await SiteRoleApi.logout(); } catch (e) { /* 忽略网络错误，仍清本地 */ }
    root.localStorage.removeItem(ROLE_KEY);
    root.localStorage.removeItem(SESSION_KEY);
    await loadSiteState();
    renderNavLinks();
    renderMobileTabbar();
    refreshRoleChrome();
    toast("已退出登录");
    go("home");
  }

  // 多角色弹窗：让用户选择当前角色。
  function closeRolePicker() {
    const el = doc.getElementById("siteRolePicker");
    if (el) el.remove();
  }
  function showRolePicker(roles, redirectPath) {
    closeRolePicker();
    const list = (roles || []).filter((r) => VALID_ROLES.includes(r));
    if (!list.length) { finalizeLogin("public", { roles: ["public"] }, redirectPath); return; }
    const overlay = doc.createElement("div");
    overlay.id = "siteRolePicker";
    overlay.className = "role-picker-overlay";
    overlay.innerHTML = `
      <div class="role-picker glass" role="dialog" aria-modal="true" aria-label="选择当前角色">
        <span class="role-picker-en">SELECT ROLE</span>
        <h2>选择当前身份</h2>
        <p>你拥有多个角色，请选择本次进入的身份（之后可重新登录切换）。</p>
        <div class="role-picker-grid">
          ${list.map((r) => `<button type="button" data-pick-role="${esc(r)}"><b>${esc(pickLabel(r))}</b><span>${esc(ROLE_PICK_HINT[r] || "")}</span></button>`).join("")}
        </div>
      </div>`;
    overlay.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-pick-role]");
      if (!btn) return;
      const role = btn.dataset.pickRole;
      btn.disabled = true;
      try {
        const res = await SiteRoleApi.setCurrentRole(role);
        if (res && res.role) { finalizeLogin(res.role, res, redirectPath); return; }
        toast("角色选择失败，请重试");
        btn.disabled = false;
      } catch (err) {
        toast("角色选择失败：" + (err && err.message ? err.message : "请重试"));
        btn.disabled = false;
      }
    });
    doc.body.appendChild(overlay);
  }

  function renderMobileHome(totalVotes) {
    const list = traineeList();
    const sample = list.slice(0, 8).map((p, i) => `<span style="--i:${i};--lift:${i % 2}"><img src="${traineeIdImage(p)}" alt="${esc(p.name)}" /></span>`).join("");
    const agenda = [
      ["DAY 1", "发布挑战，完成组队"],
      ["DAY 2", "集中制作可运行 Demo"],
      ["DAY 3", "路演展评，投票颁奖"],
    ].map(([day, text]) => `<li><b>${day}</b><span>${text}</span></li>`).join("");
    const phaseInfo = resolveHomePhase(CURRENT_STAGE_ID);
    return `<section class="mobile-home">
      <div class="mh-hero">
        <span class="hero-kicker"><span class="live-dot"></span>LIVE · HACKATHON 2026</span>
        <h1>AI创新黑客松</h1>
        <p>36小时，把 AI 创意做成可运行系统</p>
        <div class="mh-live glass">
          <div><span>${esc(phaseInfo.phase)}</span><b>${esc(phaseInfo.label)}</b></div>
          <strong data-countdown data-remain="${COUNTDOWN_REMAIN}">${fmtHMS(COUNTDOWN_REMAIN)}</strong>
        </div>
      </div>
      <div class="mh-grid">
        <a class="mh-card mh-people glass" data-nav="people">
          <div class="mh-card-top"><span>参赛伙伴图鉴</span><b>CARDS</b></div>
          <h3>认识这一届 AI 星锐</h3>
          <p>证件照卡组快速浏览，点开后看生活照和完整档案。</p>
          <div class="mh-faces">${sample}</div>
        </a>
        <a class="mh-card mh-schedule glass" data-nav="schedule">
          <div class="mh-card-top"><span>活动议程</span><b>36H</b></div>
          <h3>看懂比赛怎么进行</h3>
          <ul class="mh-agenda">${agenda}</ul>
        </a>
        <a class="mh-card mh-work glass" data-nav="gallery" style="--accent:var(--neon-2);--rgb:167,255,79">
          <div class="mh-card-top"><span>作品展评</span><b>${D.teams.length} 组</b></div>
          <h3>查看现场作品</h3>
          <p>浏览各组 Demo、作品说明与投票状态。</p>
        </a>
      </div>
    </section>`;
  }

  /* ---- 首页：人 + 作品 两条主线 -------------------------------------- */
  function renderHome() {
    const role = currentRole();
    const permissions = rolePermissions(role);
    const totalVotes = D.teams.reduce((s, t) => s + t.votes, 0);
    const secondaryCta = permissions.canAdmin
        ? `<a class="btn-ghost" href="./admin.html">进入管理后台 ➔</a>`
        : `<a class="btn-ghost" data-nav="result">查看实时排行 ➔</a>`;
    const days = D.flowDays.map((d, i) => {
      const timeSpan = d.time ? `<span class="fs-time">${esc(d.time)}</span>` : "";
      const card = `<div class="flow-step"><div class="fs-header"><div class="fs-ic">${ICON(d.icon, "var(--neon)")}</div><div class="fs-badge"><span>${esc(d.day)}</span><i>${esc(d.en)}</i></div></div><b>${esc(d.title)}</b><p>${d.lines.map(esc).join("<br>")}</p>${timeSpan}</div>`;
      const arrow = i < 2 ? `<span class="fs-arrow">➔</span>` : "";
      return card + arrow;
    }).join("");

    const phaseInfo = resolveHomePhase(CURRENT_STAGE_ID);

    return `${renderMobileHome(totalVotes)}<section class="hero"><div class="container hero-grid">
      <div class="hero-copy">
        <div class="hero-header-group">
          <span class="hero-kicker"><span class="live-dot"></span>LIVE · AI_INNOVATION_HACKATHON_2026</span>
          <h1 class="hero-title">AI创新黑客松</h1>
        </div>
        <p class="hero-slogan">36小时，把 AI 创意做成可运行系统</p>
        <p class="hero-desc">五大真实业务挑战，五支战队，从业务场景出发，用AI解决真实问题。认识参赛伙伴，探索创新方案，并为你支持的团队投出关键一票。</p>
        <div class="hero-ctas"><a class="btn-primary" data-nav="gallery">进入作品展厅</a>${secondaryCta}</div>
      </div>
      <aside class="hero-panel glass">
        <div class="hp-row"><span class="live-dot"></span><span class="hp-label">当前阶段</span></div>
        <div class="hp-phase">${esc(phaseInfo.phase)}</div>
        <div class="hp-row hp-sub-row"><span class="live-dot"></span><span class="hp-label">${esc(phaseInfo.label)}</span></div>
        <div class="hp-cd" data-countdown data-remain="${COUNTDOWN_REMAIN}">${fmtHMS(COUNTDOWN_REMAIN)}</div>
        <div class="hp-stats">
          <div><b>${D.stats.tracks}</b><span>赛道</span></div>
          <div><b>${D.stats.teams}</b><span>队伍</span></div>
          <div><b>${D.stats.members}</b><span>参赛者</span></div>
          <div><b>${totalVotes.toLocaleString()}</b><span>总票数</span></div>
        </div>
      </aside>
    </div></section>

    <section class="container sec"><div class="sec-cap"><span></span>赛事全景 · HACKATHON OVERVIEW</div>
      <div class="flow-row">${days}</div>
    </section>`;
  }

  /* ---- 新生看板（复用照片墙轮盘 + 点击看详情）------------------------ */
  let WALL = [];
  function renderPeople() {
    if (isMobileView()) return renderMobilePeople();
    return `<section class="people-stage">
      <header class="people-head"><span class="ph-en">TALENT PROFILES</span><h1>新生看板</h1><p>认识本届AI管培生，了解他们的背景、兴趣与独特的AI超能力。</p></header>
      <div class="photo-wall-wrap"><div class="photo-wall" id="peopleWall"></div></div>
    </section>`;
  }
  function renderMobilePeople() {
    const list = traineeList();
    if (!list.length) {
      return `<section class="mobile-people-stage"><div class="mobile-card-empty">新人资料加载中</div></section>`;
    }
    if (MOBILE_TRAINEE_INDEX < 0 || MOBILE_TRAINEE_INDEX >= list.length) MOBILE_TRAINEE_INDEX = 0;
    const p = list[MOBILE_TRAINEE_INDEX];
    if (MOBILE_TRAINEE_DETAIL) return renderMobileTraineeDetail(p, list);
    const prevOne = list[(MOBILE_TRAINEE_INDEX - 1 + list.length) % list.length];
    const nextOne = list[(MOBILE_TRAINEE_INDEX + 1) % list.length];
    const nextTwo = list[(MOBILE_TRAINEE_INDEX + 2) % list.length]; // dummy for ghost-three
    const tags = toolTags(p.aiPartners || p.favoriteAI).map((x) => `<span>${esc(shortText(x, 12))}</span>`).join("");
    const dots = list.map((item, i) => `<span class="${i === MOBILE_TRAINEE_INDEX ? "on" : ""}"></span>`).join("");

    return `<section class="mobile-people-stage" id="mobilePeopleStage">
      <header class="mobile-people-head">
        <button class="mobile-back-link" type="button" data-nav="home">首页</button>
        <div><span class="ph-en">ROSTER CARDS</span><h1>星锐卡组</h1></div>
        <span class="mobile-card-index">${pad(MOBILE_TRAINEE_INDEX + 1)} / ${pad(list.length)}</span>
      </header>
      <div class="mobile-swipe-deck-wrap" style="position: relative; width: 100%;">
        <button class="mobile-nav-arrow mobile-nav-arrow-left" type="button" data-mobile-nav="prev" aria-label="上一个">‹</button>
        <button class="mobile-nav-arrow mobile-nav-arrow-right" type="button" data-mobile-nav="next" aria-label="下一个">›</button>
        <div class="mobile-swipe-deck" data-mobile-swipe-deck>
          <article class="mobile-person-card mobile-card-ghost ghost-three" aria-hidden="true">
            <img class="mobile-card-photo" src="${traineeIdImage(nextTwo)}" alt="" />
          </article>
          <article class="mobile-person-card mobile-card-ghost ghost-two" aria-hidden="true">
            <img class="mobile-card-photo" src="${traineeIdImage(prevOne)}" alt="" />
          </article>
          <article class="mobile-person-card mobile-card-ghost ghost-one" aria-hidden="true">
            <img class="mobile-card-photo" src="${traineeIdImage(nextOne)}" alt="" />
          </article>
          <article class="mobile-person-card mobile-card-active" data-mobile-card-detail>
            <div class="mobile-card-photo-wrap">
              <img class="mobile-card-photo" src="${traineeIdImage(p)}" alt="${esc(p.name)}" />
            </div>
            <div class="mobile-person-main">
              <span>${esc(p.department || "")}</span>
              <h2>${esc(p.name)}</h2>
            </div>
            <p class="mobile-person-line">${esc(shortText(p.favoriteAI || p.aiPartners || p.aiPower, 62))}</p>
            <div class="mobile-tool-tags">${tags}</div>
          </article>
        </div>
      </div>
      <div class="mobile-card-progress">${dots}</div>
    </section>`;
  }
  function renderMobileTraineeDetail(p, list) {
    const tags = toolTags(p.aiPartners || p.favoriteAI).map((x) => `<span>${esc(shortText(x, 12))}</span>`).join("");
    const fields = [
      ["专业背景", p.background],
      ["AI 搭子", p.aiPartners],
      ["AI 超能力", p.aiPower],
      ["想让 AI 解决", p.aiProblem],
      ["有趣事实", p.funFact],
    ].filter((x) => x[1]).map(([label, value]) => `<section><span>${esc(label)}</span><p>${esc(value)}</p></section>`).join("");
    return `<section class="mobile-profile-detail" id="mobilePeopleStage">
      <header class="mobile-detail-head">
        <button type="button" data-mobile-detail-close aria-label="返回新人卡组">‹</button>
        <span>${pad(MOBILE_TRAINEE_INDEX + 1)} / ${pad(list.length)}</span>
      </header>
      <article class="mobile-detail-card">
        <div class="mobile-detail-photo-wrap" style="position: relative; width: 100%;">
          <button class="mobile-detail-nav-arrow mobile-detail-nav-arrow-left" type="button" data-mobile-detail-nav="prev" aria-label="上一个">‹</button>
          <button class="mobile-detail-nav-arrow mobile-detail-nav-arrow-right" type="button" data-mobile-detail-nav="next" aria-label="下一个">›</button>
          <div class="mobile-detail-photo">
            <img src="${traineeLifeImage(p)}" alt="${esc(p.name)}" />
          </div>
        </div>
        <div class="mobile-detail-name">
          <span>${esc(p.department || "")}</span>
          <h1>${esc(p.name)}</h1>
        </div>
        <p>${esc(shortText(p.favoriteAI || p.aiPartners || p.aiPower, 88))}</p>
        <div class="mobile-tool-tags">${tags}</div>
      </article>
      <div class="mobile-back-fields">${fields}</div>
    </section>`;
  }
  function renderMobilePeopleIntoMain() {
    if (doc.body.dataset.view !== "people" || !isMobileView()) return;
    main.innerHTML = renderMobilePeople();
    setActive("people");
    setupMobilePeople();
  }
  function setMobileTrainee(id) {
    const list = traineeList();
    const next = list.findIndex((p) => p.id === id);
    if (next >= 0) MOBILE_TRAINEE_INDEX = next;
    MOBILE_TRAINEE_DETAIL = false;
    renderMobilePeopleIntoMain();
  }
  function moveMobileTrainee(delta) {
    const list = traineeList();
    if (!list.length) return;
    MOBILE_TRAINEE_INDEX = (MOBILE_TRAINEE_INDEX + delta + list.length) % list.length;
    MOBILE_TRAINEE_DETAIL = false;
    renderMobilePeopleIntoMain();
  }
  function showMobileTraineeDetail() {
    MOBILE_TRAINEE_DETAIL = true;
    renderMobilePeopleIntoMain();
  }
  function closeMobileTraineeDetail() {
    MOBILE_TRAINEE_DETAIL = false;
    renderMobilePeopleIntoMain();
  }
  function setupMobilePeople() {
    const stage = doc.getElementById("mobilePeopleStage");
    if (stage) stage.style.setProperty("--mobile-card-index", MOBILE_TRAINEE_INDEX);
    const deck = doc.querySelector("[data-mobile-swipe-deck]");
    if (deck && MOBILE_TRAINEE_SHOULD_ENTER) {
      deck.classList.add("is-entering");
      MOBILE_TRAINEE_SHOULD_ENTER = false;
      root.setTimeout(() => deck.classList.remove("is-entering"), 280);
    }
    bindMobileSwipeDeck();
  }
  function bindMobileSwipeDeck() {
    const deck = doc.querySelector("[data-mobile-swipe-deck]");
    if (!deck) return;
    let startX = 0;
    let activePointer = null;
    let moved = false;
    let suppressClick = false;
    let isAnimating = false;
    const clear = () => {
      startX = 0;
      activePointer = null;
      deck.classList.remove("is-dragging");
      deck.style.setProperty("--swipe-x", "0px");
      deck.style.setProperty("--swipe-rot", "0deg");
    };
    deck.addEventListener("pointerdown", (e) => {
      if (isAnimating || MOBILE_TRAINEE_IS_TRANSITIONING) return;
      startX = e.clientX;
      activePointer = e.pointerId;
      moved = false;
      deck.classList.add("is-dragging");
      deck.setPointerCapture && deck.setPointerCapture(e.pointerId);
    });
    deck.addEventListener("pointermove", (e) => {
      if (activePointer !== e.pointerId || isAnimating || MOBILE_TRAINEE_IS_TRANSITIONING) return;
      const dx = Math.max(-96, Math.min(96, e.clientX - startX));
      if (Math.abs(dx) > 8) moved = true;
      deck.style.setProperty("--swipe-x", `${dx}px`);
      deck.style.setProperty("--swipe-rot", `${dx / 28}deg`);
    });
    deck.addEventListener("pointerup", (e) => {
      if (activePointer !== e.pointerId || isAnimating || MOBILE_TRAINEE_IS_TRANSITIONING) return;
      const dx = e.clientX - startX;
      const shouldMove = Math.abs(dx) > 54;
      suppressClick = moved || shouldMove;
      if (shouldMove) {
        isAnimating = true;
        MOBILE_TRAINEE_IS_TRANSITIONING = true;
        deck.classList.remove("is-dragging");
        deck.style.setProperty("--swipe-x", "0px");
        deck.style.setProperty("--swipe-rot", "0deg");
        deck.classList.add("is-animating");
        activePointer = null;
        root.setTimeout(() => {
          deck.classList.remove("is-animating");
          clear();
          MOBILE_TRAINEE_SHOULD_ENTER = true;
          moveMobileTrainee(dx < 0 ? 1 : -1);
          isAnimating = false;
          root.setTimeout(() => {
            MOBILE_TRAINEE_IS_TRANSITIONING = false;
            suppressClick = false;
            moved = false;
          }, 110);
        }, 240);
        return;
      }
      clear();
      root.setTimeout(() => { suppressClick = false; moved = false; }, 80);
    });
    deck.addEventListener("pointercancel", clear);
    deck.addEventListener("click", () => {
      if (!suppressClick) showMobileTraineeDetail();
    });
  }
  function getArcStyle(l) {
    return `--arc-x:${l.x}px;--arc-lift:${l.lift}px;--arc-rot:${l.rotation};--arc-yaw:${l.rotation * 1.65};--arc-z:${l.zIndex};--arc-scale:${l.scale}`;
  }
  function renderWall() {
    const wall = doc.getElementById("peopleWall");
    if (!wall || !root.AppLogic || !TRAINEES.length) return;
    WALL = root.AppLogic.positionJasperAtCenter(TRAINEES.map(root.AppLogic.normalizeTrainee));
    const m = root.AppLogic.computePhotoWallMetrics({ total: WALL.length, viewportWidth: root.innerWidth, viewportHeight: root.innerHeight });
    const arc = root.AppLogic.computeArcLayout(WALL.length, { step: m.step, maxLift: m.maxLift, maxRotation: m.maxRotation, splitGap: m.splitGap });
    const set = (k, v) => wall.style.setProperty(k, v);
    set("--card-width", m.cardWidth + "px"); set("--card-height", m.cardHeight + "px"); set("--card-gap", m.cardGap + "px");
    set("--card-padding", m.cardPadding + "px"); set("--meta-height", m.metaHeight + "px"); set("--portrait-height", m.portraitHeight + "px");
    set("--wall-visual-width", m.visualWidth + "px"); set("--dock-influence", m.dockInfluence);
    const cards = WALL.map((t, i) => `<button class="profile-card" type="button" data-id="${esc(t.id)}" aria-label="${esc(t.name)}" style="${getArcStyle(arc[i])}"><div class="portrait-frame" style="--portrait:${t.portrait};--media-image:url('${esc(t.idPhoto || t.photo)}')"></div><div class="profile-meta"><span class="profile-name">${esc(t.name)}</span><span class="profile-department">${esc(t.department)}</span></div></button>`).join("");
    const w = m.visualWidth, h = 220; let d = "";
    if (arc.length > 1) {
      const f = arc[0], la = arc[arc.length - 1], ci = Math.floor((arc.length - 1) / 2), c = arc[ci];
      const xf = w / 2 + f.x, yf = h + f.lift + 18, xl = w / 2 + la.x, yl = h + la.lift + 18, xc = w / 2 + c.x, yp = h + (c.lift + 18) + 18;
      d = `M ${xf},${yf} Q ${xc},${2 * yp - (yf + yl) / 2} ${xl},${yl}`;
    }
    wall.innerHTML = cards + `<svg class="photo-wall-svg" style="--svg-width:${w}px;--svg-height:${h}px" viewBox="0 0 ${w} ${h}"><path d="${d}"/></svg>`;
  }
  function dockReset() {
    const wall = doc.getElementById("peopleWall"); if (!wall) return;
    wall.querySelectorAll(".profile-card").forEach((c) => { c.classList.remove("is-active"); c.style.setProperty("--scale", "1"); c.style.setProperty("--shift-x", "0px"); c.style.setProperty("--lift", "0px"); c.style.setProperty("--alpha", "0.94"); });
  }
  function dockMove(x) {
    const wall = doc.getElementById("peopleWall"); if (!wall || !root.AppLogic) return;
    const cards = Array.from(wall.querySelectorAll(".profile-card"));
    const centers = cards.map((c) => { const r = c.getBoundingClientRect(); return r.left + r.width / 2; });
    const tr = root.AppLogic.computeDockTransforms({ centers, pointerX: x, maxInfluence: +wall.style.getPropertyValue("--dock-influence") || 260 });
    cards.forEach((c, i) => { const t = tr[i]; c.classList.toggle("is-active", t.isActive); c.style.setProperty("--scale", t.scale); c.style.setProperty("--shift-x", t.translateX + "px"); c.style.setProperty("--lift", t.lift + "px"); c.style.setProperty("--alpha", t.opacity); });
  }
  function setupWall() {
    renderWall();
    const wall = doc.getElementById("peopleWall"); if (!wall) return;
    wall.addEventListener("pointermove", (e) => dockMove(e.clientX));
    wall.addEventListener("pointerleave", dockReset);
    wall.addEventListener("click", (e) => { const c = e.target.closest(".profile-card"); if (c) openTrainee(c.dataset.id); });
  }
  function openTrainee(id) {
    const p = TRAINEES.find((x) => x.id === id); if (!p) return;
    const trainee = Logic.normalizeTrainee ? Logic.normalizeTrainee(p) : p;
    siteMediaMode = "photo";

    let m = doc.getElementById("ppModal");
    if (!m) {
      m = doc.createElement("div");
      m.id = "ppModal";
      doc.body.appendChild(m);
    }
    m.className = "detail-layer site-detail-layer";

    const currentIdx = TRAINEES.findIndex((x) => x.id === trainee.id);
    const totalTrainees = TRAINEES.length;
    const pad = (num) => String(num).padStart(2, "0");
    const detailIndexText = `PROFILE ${pad(currentIdx + 1)} / ${pad(totalTrainees)}`;

    m.innerHTML = `
      <canvas class="code-rain-canvas detail-rain" aria-hidden="true"></canvas>
      <div class="detail-backdrop" data-close></div>
      <div class="draw-card" aria-label="抽卡卡片预览">
        <button class="detail-nav-arrow detail-nav-arrow-left" type="button" data-pm-nav="prev" aria-label="切换到上一张卡片">
          <span aria-hidden="true">‹</span>
        </button>
        <button class="detail-nav-arrow detail-nav-arrow-right" type="button" data-pm-nav="next" aria-label="切换到下一张卡片">
          <span aria-hidden="true">›</span>
        </button>
        <div class="draw-card-topline">
          <span id="detailIndex">${esc(detailIndexText)}</span>
        </div>
        <div class="draw-photo-card" id="selectedPhoto"></div>
        <div class="draw-nameplate">
          <strong id="selectedName">${esc(trainee.name)}</strong>
          <span id="selectedDepartment">${esc(trainee.department || "")}</span>
        </div>
      </div>

      <article class="profile-console" role="dialog" aria-modal="true" aria-labelledby="detailName">
        <div class="console-chrome" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <button class="close-button" type="button" data-close>CLOSE</button>

        <section class="profile-info-panel">
          <span class="info-chip" id="detailDepartment">INFO</span>
          <div class="profile-fact-list">
            <section>
              <span>#1 🎓 专业背景</span>
              <p id="detailBackground">${esc(trainee.background || "")}</p>
            </section>
            <section>
              <span>#2 🤖 我的AI搭子们</span>
              <p id="detailTools">${esc(trainee.tools || "")}</p>
            </section>
            <section>
              <span>#3 🌟 我的本命AI搭子</span>
              <p id="detailFavoriteTool">${esc(trainee.favoriteTool || "")}</p>
            </section>
            <section>
              <span>#4 💡 我最想让AI解决的问题</span>
              <p id="detailProblem">${esc(trainee.problem || "")}</p>
            </section>
            <section>
              <span>#5 ⚡️ 我的AI超能力</span>
              <p id="detailPower">${esc(trainee.aiPower || "")}</p>
            </section>
            <section>
              <span>#6 🤣 一个有趣的事实</span>
              <p id="detailFunFact">${esc(trainee.funFact || "")}</p>
            </section>
          </div>
        </section>

        <section class="profile-media-panel" aria-label="照片与表情包">
          <h1 class="profile-name-pill" id="detailName">${esc(trainee.romanName || trainee.name)}</h1>
          <div class="profile-media-frame" id="profileMediaFrame">
            <button class="photo-toggle" id="photoToggleButton" type="button">PHOTO</button>
            <span id="memeText">${esc(trainee.meme || "")}</span>
          </div>
        </section>

        <footer class="profile-console-footer">
          <span>AI INNOVATION HACKATHON &gt; JOINCARE</span>
        </footer>
      </article>
    `;

    function updateMedia() {
      const selectedPhoto = m.querySelector("#selectedPhoto");
      const mediaFrame = m.querySelector("#profileMediaFrame");
      const photoToggleButton = m.querySelector("#photoToggleButton");

      if (selectedPhoto) {
        selectedPhoto.style.setProperty("--portrait", trainee.portrait || "");
        selectedPhoto.style.setProperty("--media-image", cssUrl(trainee.idPhoto || trainee.photo));
      }
      if (mediaFrame) {
        mediaFrame.style.setProperty("--portrait", trainee.portrait || "");
        mediaFrame.style.setProperty("--media-image", cssUrl(siteMediaMode === "photo" ? trainee.photo : trainee.memeImage));
        mediaFrame.dataset.mode = siteMediaMode;
      }
      if (photoToggleButton) {
        photoToggleButton.textContent = siteMediaMode === "photo" ? "PHOTO" : "MEME";
      }
    }

    updateMedia();

    if (!m._detailRain && root.CodeRain) {
      m._detailRain = root.CodeRain.createCodeRain(m.querySelector(".detail-rain"), {
        fontSize: 16,
        fade: "rgba(2, 8, 14, 0.05)"
      });
    }

    m.classList.add("is-open");
    if (m._detailRain) {
      m._detailRain.resize();
      m._detailRain.start();
    }

    const closeModal = () => {
      m.classList.remove("is-open");
      if (m._detailRain) {
        m._detailRain.stop();
      }
    };

    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));

    m.querySelectorAll("[data-pm-nav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dir = btn.dataset.pmNav;
        if (currentIdx >= 0) {
          const nextIdx = (currentIdx + (dir === "next" ? 1 : -1) + totalTrainees) % totalTrainees;
          openTrainee(TRAINEES[nextIdx].id);
        }
      });
    });

    const photoToggleButton = m.querySelector("#photoToggleButton");
    if (photoToggleButton) {
      photoToggleButton.addEventListener("click", (e) => {
        e.stopPropagation();
        siteMediaMode = siteMediaMode === "photo" ? "meme" : "photo";
        updateMedia();
      });
    }
  }

  /* ---- 大赛介绍 ------------------------------------------------------- */
  function renderBrief() {
    const days = D.flowDays.map((d, i) => {
      const timeSpan = d.time ? `<span class="fs-time">${esc(d.time)}</span>` : "";
      const card = `<div class="flow-step"><div class="fs-header"><div class="fs-ic">${ICON(d.icon, "var(--neon)")}</div><div class="fs-badge"><span>${esc(d.day)}</span><i>${esc(d.en)}</i></div></div><b>${esc(d.title)}</b><p>${d.lines.map(esc).join("<br>")}</p>${timeSpan}</div>`;
      const arrow = i < 2 ? `<span class="fs-arrow">➔</span>` : "";
      return card + arrow;
    }).join("");
    const mech = D.mechanism.map((c) => `<div class="mech2 glass" style="--accent:${c.accent};--rgb:${c.rgb}"><div class="m2-top"><span>${esc(c.label)}<i>${esc(c.en)}</i></span>${ICON(c.icon, c.accent)}</div><b>${esc(c.headline)}</b><span class="m2-sub">${esc(c.sub)}</span></div>`).join("");
    return `${pageHead("大赛介绍与全流程", "36小时，把 AI 创意做成可运行系统", "ABOUT")}
    <section class="container sec"><div class="sec-cap"><span></span>赛事全景 · HACKATHON OVERVIEW</div><div class="flow-row">${days}</div></section>
    <section class="container sec"><div class="sec-cap"><span></span>赛事机制</div><div class="mech2-grid">${mech}</div></section>`;
  }

  /* ---- 我的 ----------------------------------------------------------- */
  function renderMe() {
    const myTeam = getTeam(joinedTeam());
    const myVote = getTeam(votedTeam());
    const draft = readJson(JUDGE_KEY, {});
    const scoredTeams = D.teams.filter((t) => draft[t.id] && Object.keys(draft[t.id]).length).length;
    const role = currentRole();
    const model = Logic.getRoleWorkbenchModel ? Logic.getRoleWorkbenchModel({
      role,
      joinedTeamName: myTeam ? myTeam.name : "",
      joinedTeamMeta: myTeam ? `${myTeam.trackCode} · ${myTeam.track}` : "",
      joinedTeamProject: myTeam ? myTeam.project : "",
      votedTeamName: myVote ? myVote.name : "",
      scoredTeams,
      totalTeams: D.teams.length,
    }) : null;
    const safeModel = model || {
      eyebrow: "ROLE DESK",
      title: "角色工作台",
      subtitle: "请先登录并完成角色绑定。",
      chips: ["待鉴权"],
      statusCards: [],
      quickEntries: [],
    };
    const cardToLink = (c) => {
      const attr = c.href ? `href="${esc(c.href)}"` : `data-nav="${esc(c.nav || "home")}"`;
      return `<a class="status-card glass" ${attr} style="--accent:${c.accent}"><span class="status-ic">${ICON(c.icon, c.accent)}</span><small>${esc(c.label)}</small><b>${esc(c.value)}</b><em>${esc(c.sub)}</em></a>`;
    };
    const quickToLink = (entry) => {
      const attr = entry.href ? `href="${esc(entry.href)}"` : `data-nav="${esc(entry.nav || "home")}"`;
      return `<a class="quick-link" ${attr}><b>${esc(entry.title)}</b><span>${esc(entry.sub)}</span><i>➔</i></a>`;
    };
    const cards = safeModel.statusCards.map(cardToLink).join("");
    const quick = safeModel.quickEntries.map(quickToLink).join("");
    const chips = safeModel.chips.map((chip, index) => `<span class="status-chip ${index === 0 ? "on" : ""}">${esc(chip)}</span>`).join("");

    return `${pageHead(safeModel.title, safeModel.subtitle, safeModel.eyebrow)}
    <section class="container sec me-dashboard">
      <div class="role-console glass">
        <div>
          <span class="ph-en">${esc(safeModel.eyebrow)}</span>
          <h2>${esc(roleName(role))}</h2>
          <p>${esc(safeModel.subtitle)}</p>
        </div>
        <div class="status-strip">${chips}</div>
      </div>
      <div class="dash-grid">${cards}</div>
      <div class="quick-panel glass"><div class="sec-cap"><span></span>快捷入口</div><div class="quick-grid">${quick}</div></div>
    </section>`;
  }

  /* ---- 赛程 / 大赛介绍 ----------------------------------------------- */
  function renderSchedule() {
    const role = currentRole();
    const journeyCards = getHomeActions(role);
    const snakeOrder = [0, 1, 2, 3, 7, 6, 5, 4];
    const actionCards = snakeOrder.map((sourceIndex, gridIndex) => entryCard(journeyCards[sourceIndex], gridIndex, { hideEnglish: true })).join("");
    const mechanismBriefs = {
      format: { headline: "五大业务赛道开放命题", sub: "围绕真实场景自由发现问题" },
      delivery: { headline: "真实可运行方案", sub: "提交作品与现场展示" },
      scoring: { headline: "专家评审 70% + 大众投票 30%", sub: "五维评审 + 全员投票" },
      prize: { headline: "最终评选一支冠军团队", sub: "Grand Prize 冠军团队" },
    };
    const mech = D.mechanism.map((c) => {
      const copy = mechanismBriefs[c.key] || c;
      return `<div class="mech2 glass" style="--accent:${c.accent};--rgb:${c.rgb}"><div class="m2-top"><span>${esc(c.label)}<i>${esc(c.en)}</i></span>${ICON(c.icon, c.accent)}</div><b>${esc(copy.headline)}</b><span class="m2-sub">${esc(copy.sub)}</span></div>`;
    }).join("");
    const dims = D.dimensions.map((d, index) => `<li class="score-dim-card" style="--score-width:${d.weight * 4}%"><i>${pad(index + 1)}</i><b>${esc(d.label)}</b><span><em>${d.weight}</em>%</span><small><ins></ins></small></li>`).join("");

    return `${pageHead("赛事指南", "了解赛事进展与赛事机制，快速掌握黑客松全貌", "EVENT GUIDE")}
    <section class="container sec schedule-board">
      <div class="schedule-live glass">
        <div class="schedule-info">
          <span class="status-chip on">当前阶段</span>
          <h2>大众投票进行中</h2>
        </div>
        <div class="schedule-count">
          <span class="status-chip on">距投票截止</span>
          <b data-countdown data-remain="6353">${fmtHMS(6353)}</b>
        </div>
      </div>
      <div class="sec-cap"><span></span>赛事旅程 · EVENT JOURNEY</div><div class="entry-grid four">${actionCards}</div>
      <div class="sec-cap"><span></span>赛事机制 · EVENT FORMAT</div><div class="mech2-grid">${mech}</div>
      <div class="score-criteria"><div class="sec-cap score-criteria-title"><span></span>评分维度 · EVALUATION CRITERIA</div><ul class="score-dim-grid">${dims}</ul></div>
    </section>`;
  }

  /* ---- 报名 / 组队 ---------------------------------------------------- */
  function renderTeam() {
    const permissions = rolePermissions(currentRole());
    const canJoin = permissions.canJoinTeam;
    const selected = canJoin ? joinedTeam() : "";
    const selectedTeam = getTeam(selected);
    const teamNameDrafts = readJson(TEAM_NAME_KEY, {});
    const selectedTeamName = selectedTeam ? (teamNameDrafts[selectedTeam.id] || selectedTeam.name) : "";
    const teams = D.teams.map((t) => {
      const count = 1 + t.members.length;
      const mine = selectedTeam && selectedTeam.id === t.id;
      const disabled = selectedTeam && !mine ? "disabled" : "";
      const displayName = teamNameDrafts[t.id] || t.name;
      const openTarget = mine ? `data-team-workspace="${t.id}"` : `data-work="${t.id}"`;
      const roster = [{ ...t.advisor, role: "技术顾问" }, ...t.members.map((m) => ({ ...m, role: "组员" }))]
        .map((p) => `<span class="team-avatar">${avatar(p, 34)}<i>${esc(p.role)} · ${esc(p.name)}</i></span>`).join("");
      const action = canJoin
        ? mine
          ? `<button class="team-join is-joined is-leave" data-leave-team="${t.id}">退出队伍</button>`
          : `<button class="team-join" data-join-team="${t.id}" ${disabled}>选择队伍</button>`
        : `<span class="team-readonly">仅查看组队进度</span>`;
      const openAction = mine
        ? `<button class="team-workspace-link" type="button" data-team-workspace="${t.id}">进入工作台</button>`
        : `<button class="team-workspace-link" type="button" data-work="${t.id}">查看公开作品</button>`;
      return `<article class="team-card glass ${mine ? "mine" : ""}" ${openTarget} style="--accent:${t.accent};--rgb:${t.rgb}">
        <div class="team-head"><span class="status-chip ${mine ? "on" : ""}">${mine ? "我的队伍" : t.trackCode}</span><b>${esc(displayName)}</b><em>${esc(t.track)}</em></div>
        <h3>${esc(t.project)}</h3><p>${esc(t.pitch)}</p>
        <div class="team-roster">${roster}</div>
        <div class="team-foot"><span>${count} 名成员已就位 · ${t.submitted ? "作品已提交" : "Demo 制作中"}</span><div class="team-actions">${action}${openAction}</div></div>
      </article>`;
    }).join("");
    const teamStatusLabel = selectedTeam ? "已选择战队" : "尚未选择战队";
    const teamStatusHeadline = selectedTeam ? "你已完成组队，期待与你的伙伴共同完成挑战" : "请选择一个赛道方向";
    const statusSub = canJoin
      ? (selectedTeam
        ? `${esc(selectedTeamName)} · ${esc(selectedTeam.project)}。点击队伍卡片进入专属工作台，维护队名与作品信息。`
        : "选择你感兴趣的挑战方向，与伙伴组建战队，开启共创之旅。")
      : "赛道名额、成员与作品方向可浏览，但不会出现选手操作按钮。";
    const statusCta = canJoin && selectedTeam
      ? `<button class="btn-ghost is-cancel" type="button" data-leave-team="${selectedTeam.id}">退出当前队伍</button>`
      : rolePermissions(currentRole()).canAdmin
      ? `<a class="btn-ghost" href="./admin.html">进入管理后台</a>`
      : `<a class="btn-ghost" data-nav="schedule">查看赛事指南</a>`;

    return `${pageHead("组队", "选择赛道队伍，查看技术顾问、成员与作品方向", "TEAM FORMATION")}
    <section class="container sec team-board">
      <div class="team-formation-panel glass">
        <div class="team-live-strip">
          <div class="team-formation-copy"><span class="status-chip on">TEAM FORMATION HUB</span><h2>固定赛道，队伍自定义命名</h2><p>参考大屏组队方案，五条赛道对称呈现；加入队伍后队长可编辑队名、自定义队伍名称，技术顾问、业务洞察、AI 开发、产品设计、路演运营等职责在队伍内沉淀。</p></div>
          <div class="team-countdown-box"><span>任务倒计时</span><b data-countdown data-remain="129600">${fmtHMS(129600)}</b><em>组队锁定后进入 36H Demo preparation</em></div>
        </div>
        <div class="team-selection-summary"><div><span class="status-chip ${selectedTeam ? "on" : ""}">${canJoin ? teamStatusLabel : "只读进度"}</span><h2>${canJoin ? teamStatusHeadline : "当前角色仅可查看组队进度"}</h2><p>${statusSub}</p></div>${statusCta}</div>
      </div>
      <div class="sec-cap"><span></span>队伍列表</div><div class="team-grid">${teams}</div>
    </section>`;
  }

  function getWorkDraft(team) {
    const allDrafts = readJson(WORK_DRAFT_KEY, {});
    const nameDrafts = readJson(TEAM_NAME_KEY, {});
    const draft = allDrafts[team.id] || {};
    const links = teamLinks(team);
    return {
      teamName: draft.teamName || nameDrafts[team.id] || team.name,
      project: draft.project || team.project,
      pitch: draft.pitch || team.pitch || "",
      stack: draft.stack || (team.stack || []).join(" / "),
      demoUrl: draft.demoUrl || links.video,
      codeUrl: draft.codeUrl || links.gitlab,
      docUrl: draft.docUrl || links.page,
      screenshots: draft.screenshots || "主界面截图 / 数据看板截图 / AI 输出截图",
    };
  }

  function renderWorkspaceField({ teamId, field, label, value, hint, multiline = false, editable = true }) {
    const readOnly = editable ? "" : 'readonly aria-readonly="true"';
    const body = multiline
      ? `<textarea data-work-field="${teamId}:${field}" rows="4" ${readOnly}>${esc(value)}</textarea>`
      : `<input type="text" data-work-field="${teamId}:${field}" value="${esc(value)}" ${readOnly} />`;
    return `<label class="workspace-field ${field === "teamName" ? "team-name-draft" : ""}">
      <span>${esc(label)}</span>
      ${body}
      <em>${esc(hint || "")}</em>
    </label>`;
  }

  function renderWorkspaceRoles(team, editable) {
    const meta = getTeamWorkspaceMeta(team);
    const currentMemberId = currentWorkspaceMemberId(team);
    const rows = teamPeople(team).map((person) => {
      const isLeader = person.id === meta.leaderId;
      const isCurrent = person.id === currentMemberId;
      const locked = editable ? "" : "disabled";
      const readonly = editable ? "" : 'readonly aria-readonly="true"';
      return `<div class="workspace-person-role ${isLeader ? "is-leader" : ""} ${isCurrent ? "is-current" : ""}">
        ${avatar(person, 42)}
        <div class="workspace-role-main">
          <b>${esc(person.name)}${isLeader ? "<i>当前队长</i>" : ""}${isCurrent ? "<em>当前身份</em>" : ""}</b>
          <input type="text" data-team-duty="${team.id}:${person.id}" value="${esc(meta.duties[person.id])}" ${readonly} />
        </div>
        <label class="workspace-leader-pick">
          <input type="radio" name="leader-${team.id}" data-team-leader="${team.id}" value="${person.id}" ${isLeader ? "checked" : ""} ${locked} />
          <span>设为队长</span>
        </label>
      </div>`;
    }).join("");
    return `<section class="workspace-roles glass" aria-label="队长与职责">
      <div class="workspace-form-head">
        <span>SQUAD ROLES</span>
        <b>队长与职责</b>
      </div>
      <p>队伍可以根据现场分工调整队长与职责；作品提交、Demo 链接、代码地址和展示截图仅队长可编辑。</p>
      <div class="workspace-role-list">${rows}</div>
    </section>`;
  }

  function renderTeamWorkspace(id) {
    const team = getTeam(id);
    if (!team) return renderTeam();
    if (!canOpenTeamWorkspace(team.id)) return renderWork(team.id);
    const selectedTeam = getTeam(joinedTeam());
    const isMine = selectedTeam && selectedTeam.id === team.id;
    const canEdit = canEditTeamWorkspace(team.id);
    const draft = getWorkDraft(team);
    const stackTags = splitTags(draft.stack).map((s) => `<span>${esc(s)}</span>`).join("");
    const meta = getTeamWorkspaceMeta(team);
    const roster = teamPeople(team)
      .map((p) => `<div class="workspace-person ${p.id === meta.leaderId ? "is-leader" : ""}">${avatar(p, 42)}<b>${esc(p.name)}</b><span>${esc(meta.duties[p.id])}${p.id === meta.leaderId ? " · 队长" : ""}</span></div>`).join("");
    const editHint = canEdit
      ? "你是当前队长，可调整职责并编辑作品提交内容；后端接入后同步到队伍与作品表。"
      : "当前身份为队友，可查看职责与作品预览；作品提交内容仅队长可编辑。";
    const joinAction = canEdit
      ? `<button class="btn-primary" type="button" data-save-work-draft="${team.id}">保存草稿</button>`
      : `<button class="btn-primary" type="button" disabled>仅队长可保存</button>`;

    return `${pageHead("队伍工作台 / 作品提交", "维护队伍名称、作品资料与发布预览；作品展厅只展示审核发布后的内容", "WORKSPACE")}
    <section class="container sec team-workspace" style="--accent:${team.accent};--rgb:${team.rgb}">
      <div class="workspace-shell glass">
        <header class="workspace-top">
          <a class="wk-back" data-nav="team">‹ 返回队伍列表</a>
          <div>
            <span class="status-chip ${isMine ? "on" : ""}">${isMine ? "我的队伍" : `${team.trackCode} · ${team.track}`}</span>
            <h2>${esc(draft.teamName)}</h2>
            <p>${esc(editHint)}</p>
          </div>
          <div class="workspace-actions">
            ${joinAction}
            <button class="btn-ghost" type="button" data-work="${team.id}">预览作品展示</button>
          </div>
        </header>
        <div class="workspace-grid">
          <section class="workspace-form ${canEdit ? "" : "is-readonly"}" aria-label="作品提交表单">
            <div class="workspace-form-head">
              <span>SUBMISSION FORM</span>
              <b>提交内容</b>
            </div>
            ${renderWorkspaceField({ teamId: team.id, field: "teamName", label: "自定义队伍名称", value: draft.teamName, hint: "展示在组队页、作品展厅和最终结果中。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "project", label: "作品标题", value: draft.project, hint: "对应作品展厅卡片标题。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "pitch", label: "一句话介绍", value: draft.pitch, hint: "对应作品展厅摘要与作品详情介绍。", multiline: true, editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "stack", label: "技术栈 / AI 能力", value: draft.stack, hint: "用 / 或逗号分隔，会展示为标签。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "demoUrl", label: "Demo 链接", value: draft.demoUrl, hint: "用于管理员审核和现场路演。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "codeUrl", label: "代码地址", value: draft.codeUrl, hint: "用于技术复核，不在公开展厅直接暴露。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "docUrl", label: "飞书作品页", value: draft.docUrl, hint: "作品详情页的正式说明文档。", editable: canEdit })}
            ${renderWorkspaceField({ teamId: team.id, field: "screenshots", label: "展示截图", value: draft.screenshots, hint: "对应作品详情轮播，可先填写截图名称。", multiline: true, editable: canEdit })}
          </section>
          <aside class="workspace-preview" aria-label="发布预览">
            ${renderWorkspaceRoles(team, canEdit)}
            <div class="workspace-preview-card">
              <span class="gl2-dots"></span>
              <span class="workspace-preview-kicker">发布预览 · ${esc(team.trackCode)} PROJECT</span>
              <h3 data-work-preview="project">${esc(draft.project)}</h3>
              <em data-work-preview="teamName">${esc(draft.teamName)}</em>
              <p data-work-preview="pitch">${esc(draft.pitch)}</p>
              <div class="workspace-preview-stack" data-work-preview="stack">${stackTags}</div>
              <div class="workspace-preview-shots" data-work-preview="screenshots">
                ${splitTags(draft.screenshots).slice(0, 3).map((shot, index) => `<span>${pad(index + 1)} ${esc(shot)}</span>`).join("")}
              </div>
            </div>
            <div class="workspace-map glass">
              <b>作品展厅展示字段</b>
              <ul>
                <li>队伍名称：${esc(draft.teamName)}</li>
                <li>作品标题：${esc(draft.project)}</li>
                <li>一句话介绍：${esc(draft.pitch)}</li>
                <li>技术标签：${esc(draft.stack)}</li>
                <li>成员与票数：由队伍和投票数据自动同步</li>
              </ul>
            </div>
            <div class="workspace-roster">${roster}</div>
          </aside>
        </div>
      </div>
    </section>`;
  }

  /* ---- 投票状态 ------------------------------------------------------- */
  function renderVote() {
    const permissions = rolePermissions(currentRole());
    const voted = getTeam(votedTeam());
    const total = D.teams.reduce((s, t) => s + t.votes, 0);
    const max = Math.max(1, ...D.teams.map((t) => t.votes));
    const rows = [...D.teams].sort((a, b) => b.votes - a.votes).map((t, i) => {
      const mine = voted && voted.id === t.id;
      const pct = total ? ((t.votes / total) * 100).toFixed(1) : 0;
      const width = ((t.votes / max) * 100).toFixed(2);
      return `<div class="vote-row ${mine ? "mine" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--vote-width:${width}%"><span class="vote-rank">${pad(i + 1)}</span><div class="vote-info"><b>${esc(t.name)}${mine ? '<i>我的选择</i>' : ""}</b><em>${esc(t.project)}</em><span class="vote-meter"><i></i></span></div><strong>${t.votes.toLocaleString()}</strong><small>${pct}%</small></div>`;
    }).join("");

    return `${pageHead("投票状态", "一人一票，投票选择与票数分布实时同步", "VOTE")}
    <section class="container sec vote-board">
      <div class="vote-rule glass"><span class="status-chip">规则</span><p>每位用户仅可投一票；大众投票按票数排名转换为赋分，并以 30% 权重计入最终综合得分。</p></div>
      <div class="vote-list">${rows}</div>
    </section>`;
  }

  /* ---- 评委评分 ------------------------------------------------------- */
  function renderJudge() {
    const draft = readJson(JUDGE_KEY, {});
    const head = D.dimensions.map((d) => `<span>${esc(d.label)}<i>${d.weight}%</i></span>`).join("");
    const rows = D.teams.map((t) => {
      const inputs = D.dimensions.map((d, i) => {
        const val = draft[t.id] && draft[t.id][i] != null && draft[t.id][i] !== "" ? draft[t.id][i] : 80;
        return `<label class="judge-slider" style="--score-pct:${esc(val)}%"><div class="judge-slider-top"><em>${esc(d.label)}</em><b data-score-value="${t.id}:${i}">${esc(val)}</b></div><input class="judge-score" type="range" min="0" max="100" step="1" value="${esc(val)}" data-score="${t.id}:${i}" /><small><i></i></small></label>`;
      }).join("");
      return `<article class="judge-row glass" style="--accent:${t.accent};--rgb:${t.rgb}">
        <div class="judge-team"><span class="status-chip">${esc(t.trackCode)}</span><b>${esc(t.name)}</b><em>${esc(t.project)}</em></div>
        <div class="judge-input-grid">${inputs}</div>
      </article>`;
    }).join("");

    return `${pageHead("评委评分", "五维评分草稿演示，数据仅保存在本地浏览器", "JUDGE")}
    <section class="container sec judge-board">
      <div class="judge-toolbar glass"><div><span class="status-chip on">演示入口</span><h2>评委评分表</h2><p>拖动滑杆完成 0-100 分五维评分；正式评审仍以后台系统为准。</p></div><button class="judge-save" data-judge-save>保存评分草稿</button></div>
      <div class="judge-head">${head}</div>
      <div class="judge-list">${rows}</div>
    </section>`;
  }

  /* ---- 赛道 ----------------------------------------------------------- */
  function renderTracks() {
    const cards = D.tracks.map((t) => `<article class="tk2 glass tk2-h" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="tk2-l"><span class="tk2-code">${esc(t.code)}</span><span class="tk2-ic">${ICON(t.icon, t.accent)}</span></div><div class="tk2-m"><h3>${esc(t.name)} <i class="tk2-en">${esc(t.en)}</i></h3><p class="tk2-focus">${esc(t.focus)}</p></div><div class="tk2-pains">${t.pains.map((p) => `<span>${esc(p)}</span>`).join("")}</div><div class="tk2-r"><span class="tk2-mentor">主讲 · ${esc(t.mentor)}</span><a href="${esc(t.doc)}" target="_blank" rel="noopener">赛道讲解文档 ➔</a></div></article>`).join("");
    return `${pageHead("五大赛道", "只固定赛道，不固定题目 · 作品展厅按赛道呈现", "TRACKS")}<section class="container sec"><div class="tk2-grid horizontal">${cards}</div></section>`;
  }

  /* ---- 作品展厅（5 个对称一排，可点进详情）-------------------------- */
  function renderGallery() {
    const permissions = rolePermissions(currentRole());
    const voted = votedTeam();
    const canVote = canUseVoteAction();
    const cards = D.teams.map((t) => {
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 34)).join("");
      const isVoted = voted === t.id;
      const btn = !hasBackendSession()
        ? `<button class="gl2-vote" data-auth-vote="${t.id}">登录后投票</button>`
        : !permissions.canVote
          ? `<button class="gl2-vote dim" disabled>无投票权限</button>`
          : voted
        ? isVoted
          ? `<button class="gl2-vote is-voted is-cancel" data-cancel-vote="${t.id}">取消投票</button>`
          : `<button class="gl2-vote dim" disabled>已投票</button>`
        : canVote
          ? `<button class="gl2-vote" data-vote="${t.id}">为TA加油</button>`
          : `<button class="gl2-vote dim" disabled>无投票权限</button>`;
      const stack = (t.stack || []).map((s) => `<span>${esc(s)}</span>`).join("");
      return `<article class="gl2-card glass gl2-h ${isVoted ? "voted" : ""}" data-work="${t.id}" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="gl2-shot"><span class="gl2-dots"></span><span class="gl2-cover-label"><span class="gl2-cover-index">${esc(t.trackCode)}</span><span class="gl2-cover-track">${esc(t.track)}</span></span><h3 class="gl2-cover-name">${esc(t.name)}</h3><span class="gl2-bars"></span><span class="gl2-hover">点击查看作品详情 ➔</span></div><div class="gl2-mid"><div class="gl2-id"><b class="gl2-project-name">${esc(t.project)}</b></div><p class="gl2-pitch">${esc(t.pitch || "")}</p><div class="gl2-stack2">${stack}</div><div class="gl2-avas">${avas}</div></div><div class="gl2-right"><div class="gl2-vcount"><b>${t.votes.toLocaleString()}</b><span>实时票数</span></div><span class="gl2-detail" data-work="${t.id}">查看详情 ➔</span>${btn}</div></article>`;
    }).join("");
    const dataNotice = SITE_STATE_ERROR
      ? `<div class="vote-banner"><span class="live-dot"></span>${esc(SITE_STATE_ERROR)}</div>`
      : "";
    const banner = voted
      ? `<div class="vote-banner ok"><span class="live-dot"></span>你已为 <b>${esc((D.teams.find((t) => t.id === voted) || {}).name || "")}</b> 投出一票；可在已投队伍卡片中取消后重新选择。</div>`
      : `<div class="vote-banner"><span class="live-dot"></span>浏览五大战队作品，选出你最认可的解决方案，并投出关键一票。</div>`;
    return `${pageHead("作品展厅", "从真实业务挑战出发，见证 AI 从想法走向实践", "INNOVATION SHOWCASE")}${dataNotice}${banner}<section class="container sec"><div class="gl2-grid horizontal">${cards}</div></section>`;
  }

  /* ---- 作品详情 ------------------------------------------------------- */
  function renderWork(id) {
    const t = D.teams.find((x) => x.id === id);
    if (!t) return renderGallery();
    const voted = votedTeam();
    const permissions = rolePermissions(currentRole());
    const canVote = canUseVoteAction();
    const isVoted = voted === t.id;
    const L = teamLinks(t);
    const people = [{ ...t.advisor, role: "技术顾问" }, ...t.members.map((m) => ({ ...m, role: "组员" }))]
      .map((p) => `<div class="wk-person">${avatar(p, 64, "ring")}<b>${esc(p.name)}</b><span>${esc(p.role)}</span></div>`).join("");
    const stack = (t.stack || []).map((s) => `<span>${esc(s)}</span>`).join("");
    const voteBtn = !hasBackendSession()
      ? `<button class="btn-primary" data-auth-vote="${t.id}">登录后投票</button>`
      : !permissions.canVote
        ? `<button class="btn-primary dim" disabled>当前身份不可投票</button>`
        : voted
      ? isVoted
        ? `<button class="btn-primary is-cancel" data-cancel-vote="${t.id}">取消投票</button>`
        : `<button class="btn-primary dim" disabled>投票已用</button>`
      : canVote
        ? `<button class="btn-primary" data-vote="${t.id}">为这支队伍加油</button>`
        : `<button class="btn-primary dim" disabled>当前身份不可投票</button>`;
    const slides = [["主界面", "产品核心流程"], ["数据看板", "关键指标可视化"], ["AI 能力", "模型推理与结果"]];
    const slideEls = slides.map((s, i) => `<div class="wkc-slide ${i === 0 ? "on" : ""}"><span class="gl2-dots"></span><h3>${esc(t.project)}</h3><span class="wkc-cap">${esc(s[0])} · ${esc(s[1])}</span><span class="gl2-bars"></span></div>`).join("");
    const dotEls = slides.map((_, i) => `<button class="wkc-dot ${i === 0 ? "on" : ""}" data-cgoto="${i}" aria-label="第 ${i + 1} 张"></button>`).join("");
    return `<section class="page-hero wk-hero" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="container">
      <a class="wk-back" data-nav="gallery">‹ 返回作品展厅</a>
      <span class="ph-en">${esc(t.trackCode)} · ${esc(t.track)} TRACK</span>
      <h1>${esc(t.project)}</h1>
      <p class="wk-pitch">${esc(t.pitch || "")}</p>
      <div class="wk-by"><b>${esc(t.name)}</b> · <span class="gl2-votes"><b>${t.votes.toLocaleString()}</b> 票</span></div>
    </div></section>
    <section class="container sec wk-grid">
      <div class="wk-main">
        <div class="sec-cap"><span></span>作品预览 · 轮播</div>
        <div class="wk-carousel" id="wkCarousel" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="wkc-viewport"><div class="wkc-track">${slideEls}</div></div><button class="wkc-arrow prev" data-cdir="-1" aria-label="上一张">‹</button><button class="wkc-arrow next" data-cdir="1" aria-label="下一张">›</button><div class="wkc-foot"><div class="wkc-dots">${dotEls}</div><span class="wkc-hint">＋ 提交作品时可上传多张截图</span></div></div>
        <div class="sec-cap"><span></span>作品介绍</div>
        <p class="wk-desc">该作品聚焦「${esc(t.track)}」赛道的真实业务痛点，构建可运行系统：${esc(t.pitch || "")}。完整介绍、功能说明与使用方式见飞书作品页文档。</p>
        <div class="sec-cap"><span></span>技术栈</div>
        <div class="wk-stack">${stack}</div>
        <div class="sec-cap"><span></span>团队成员</div>
        <div class="wk-people">${people}</div>
      </div>
      <aside class="wk-side">
        <div class="wk-card glass">
          <div class="wk-cap">作品交付 · DELIVERY</div>
          <a class="wk-doc" href="${L.page}" target="_blank" rel="noopener"><span class="wk-li">${ICON("doc", "var(--void)")}</span><span class="wk-doc-tx"><b>飞书作品页文档</b><span>项目介绍 · 功能 · 使用说明</span></span><i>➔</i></a>
          <div class="wk-status-list">
            <div><span>提交状态</span><b>${t.submitted ? "已提交" : "待补交"}</b></div>
            <div><span>当前票数</span><b>${t.votes.toLocaleString()}</b></div>
            <div><span>交付形式</span><b>飞书作品页</b></div>
            <div><span>作品赛道</span><b>${esc(t.trackCode)} · ${esc(t.track)}</b></div>
          </div>
          <div class="wk-vote">${voteBtn}</div>
        </div>
      </aside>
    </section>`;
  }
  function setupCarousel() {
    const car = doc.getElementById("wkCarousel"); if (!car) return;
    const track = car.querySelector(".wkc-track");
    const slides = car.querySelectorAll(".wkc-slide");
    const dots = car.querySelectorAll(".wkc-dot");
    let idx = 0;
    const apply = () => { track.style.transform = `translateX(-${idx * 100}%)`; slides.forEach((s, i) => s.classList.toggle("on", i === idx)); dots.forEach((d, i) => d.classList.toggle("on", i === idx)); };
    car.addEventListener("click", (e) => {
      const a = e.target.closest("[data-cdir]"); const g = e.target.closest("[data-cgoto]");
      if (a) { idx = (idx + +a.dataset.cdir + slides.length) % slides.length; apply(); }
      else if (g) { idx = +g.dataset.cgoto; apply(); }
    });
  }

  function renderOverviewBanner() {
    const permissions = rolePermissions(currentRole());
    const canVote = canUseVoteAction();
    const voted = getTeam(votedTeam());

    const chipText = !hasBackendSession() ? "登录后投票" : !canVote ? "无投票权限" : voted ? "已投票" : "待投票";
    const chipClass = voted ? "on" : "";
    const titleText = !hasBackendSession() ? "请先登录" : !canVote ? "当前身份不参与大众投票" : voted ? "已投票" : "尚未投票";

    let descText = "";
    if (!hasBackendSession()) {
      descText = "请先使用飞书账号登录；后端确认身份后，观众角色才能投出一票。";
    } else if (!canVote) {
      descText = "参赛选手、专家评委与管理员默认不参与大众投票，仅大众评委可在投票窗口内投一次。";
    } else if (voted) {
      descText = `你已支持「${esc(voted.name)}」${voted.project ? ` · ${esc(voted.project)}` : ""}`;
    }

    const cta = !hasBackendSession()
      ? `<a class="btn-primary" data-nav="me">登录后投票</a>`
      : !canVote
      ? `<a class="btn-primary" data-nav="gallery">查看作品展厅</a>`
      : voted
      ? `<button class="btn-ghost is-cancel" type="button" data-cancel-vote="${voted.id}">取消投票</button>`
      : `<a class="btn-primary" data-nav="gallery">去作品展厅</a>`;

    return `<div class="vote-overview glass">
      <div>
        <span class="status-chip ${chipClass}">${chipText}</span>
        <h2>${titleText}</h2>
        ${descText ? `<p>${descText}</p>` : ""}
      </div>
      ${cta}
    </div>`;
  }

  /* ---- 最终排行（仅公布后显示）-------------------------------------- */
  function renderResult(forcePreview) {
    const resultSubtitle = "创新与价值并重，共同见证最终荣誉的诞生";
    const resultHead = (title, subtitle = resultSubtitle) => {
      const overviewHtml = renderOverviewBanner();
      return `<section class="page-hero result-hero"><div class="container">${overviewHtml}<h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></section>`;
    };
    const hasPublishedResult = Boolean(SITE_STATE?.result?.published && SITE_STATE.result.snapshot);
    if (!hasPublishedResult) {
      return `${resultHead("排行榜")}
      <section class="container sec"><div class="rk-locked glass"><span class="rk-lock-ic">${ICON("lock", "var(--neon)")}</span><h2>结果待公布</h2><p>排行榜将在后台正式发布后展示。<br>当前请前往作品展厅，为你支持的团队投票。</p><div class="rk-locked-cta"><a class="btn-primary" data-nav="gallery">去作品展厅加油</a></div></div></section>`;
    }
    const ranked = D.computeRanking();
    if (!ranked.length) {
      return `${resultHead("排行榜")}<section class="container sec"><div class="rk-locked glass"><span class="rk-lock-ic">${ICON("lock", "var(--neon)")}</span><h2>暂无排行数据</h2><p>后台尚未发布有效结果。</p></div></section>`;
    }
    const max = Math.max(1, ...ranked.map((t) => t.total));
    const rows = ranked.map((t) => {
      const champ = t.rank === 1;
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 30)).join("");
      const scoreWidth = ((t.total / max) * 100).toFixed(2);
      const delay = (t.rank - 1) * 120;
      return `<div class="rk-row glass ${champ ? "champ" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--score-width:${scoreWidth}%;--rank-delay:${delay}ms"><span class="rk-no ${t.rank <= 3 ? "top" : ""}">${champ ? "🏆" : pad(t.rank)}</span><div class="rk-id"><b>${esc(t.name)}${champ ? '<i class="rk-crown">Grand Prize · 冠军战队</i>' : ""}</b><span>${esc(t.track)} · ${esc(t.project)}</span></div><div class="rk-avas">${avas}</div><div class="rk-bar"><span class="meter" style="--accent:${t.accent};--rgb:${t.rgb}"><i></i></span></div><div class="rk-mini"><span>专家 ${t.expert}</span><span>赋分 ${t.votePoint}</span></div><span class="rk-total">${t.total}</span></div>`;
    }).join("");
    return `${resultHead("排行榜")}<section class="container sec result-sec"><div class="rk-list">${rows}</div></section>`;
  }
  function renderNoPermission(title, message, target) {
    return `${pageHead(title, message, "ACCESS CONTROL")}
    <section class="container sec">
      <div class="rk-locked glass permission-panel">
        <span class="rk-lock-ic">${ICON("lock", "var(--neon)")}</span>
        <h2>当前身份无权限</h2>
        <p>${esc(message)}</p>
        <div class="rk-locked-cta"><a class="btn-primary" data-nav="${esc(target || "me")}">返回角色工作台</a><button class="btn-ghost" type="button" data-auth-reset>重新选择角色</button></div>
      </div>
    </section>`;
  }

  /* =======================================================================
   *  SPA 控制
   * ===================================================================== */
  const VIEWS = [
    { key: "home", label: "首页", render: renderHome },
    { key: "people", label: "新生看板", render: renderPeople },
    { key: "schedule", label: "赛事指南", render: renderSchedule },
    { key: "team", label: "组队", render: renderTeam },
    { key: "gallery", label: "作品展厅", render: renderGallery },
    { key: "vote", label: "投票", render: renderVote },
    { key: "result", label: "排行榜", render: () => renderResult(location.search.indexOf("preview") >= 0) },
    { key: "me", label: "我的", render: renderMe, hidden: true },
    { key: "tracks", label: "赛道", render: renderTracks, hidden: true },
    { key: "judge", label: "评委评分", render: renderJudge, hidden: true },
    { key: "brief", label: "大赛介绍", render: renderBrief, hidden: true },
  ];
  const MOBILE_TABS = [
    { key: "home", label: "首页", icon: "target" },
    { key: "people", label: "星锐", icon: "user" },
    { key: "schedule", label: "赛事指南", icon: "calendar" },
    { key: "gallery", label: "作品", icon: "doc" },
    { key: "me", label: "角色", icon: "team" },
  ];
  const MOBILE_TABS_PLAYER = [
    { key: "home", label: "首页", icon: "target" },
    { key: "schedule", label: "赛事指南", icon: "calendar" },
    { key: "team", label: "组队", icon: "team" },
    { key: "gallery", label: "作品", icon: "doc" },
    { key: "me", label: "我的", icon: "user" },
  ];
  const MOBILE_TABS_PUBLIC = [
    { key: "home", label: "首页", icon: "target" },
    { key: "people", label: "星锐", icon: "user" },
    { key: "gallery", label: "作品", icon: "doc" },
    { key: "vote", label: "投票", icon: "vote" },
    { key: "me", label: "角色", icon: "team" },
  ];
  const MOBILE_TABS_JUDGE = [
    { key: "home", label: "首页", icon: "target" },
    { key: "people", label: "星锐", icon: "user" },
    { key: "schedule", label: "赛事指南", icon: "calendar" },
    { key: "gallery", label: "作品", icon: "doc" },
    { key: "judge", label: "评分", icon: "scale" },
  ];
  const MOBILE_TABS_ADMIN = [
    { key: "home", label: "首页", icon: "target" },
    { key: "team", label: "组队", icon: "team" },
    { key: "gallery", label: "作品", icon: "doc" },
    { key: "result", label: "排行榜", icon: "trophy" },
    { key: "me", label: "权限", icon: "lock" },
  ];

  const main = doc.getElementById("siteMain");
  const navLinks = doc.getElementById("navLinks");
  const navPhase = doc.getElementById("navPhase");
  const navLogin = doc.getElementById("navLogin");
  const mobileTabbar = doc.getElementById("mobileTabbar");
  let rain = null;
  let lastMobileView = isMobileView();

  function mobileTabs() {
    if (currentRole() === "player") return MOBILE_TABS_PLAYER;
    if (currentRole() === "judge") return MOBILE_TABS_JUDGE;
    if (currentRole() === "admin") return MOBILE_TABS_ADMIN;
    if (currentRole() === "public") return MOBILE_TABS_PUBLIC;
    return MOBILE_TABS;
  }
  function renderNavLinks() {
    if (!navLinks) return;
    navLinks.innerHTML = roleNavItems(currentRole()).map((v) => (
      v.href
        ? `<a href="${esc(v.href)}" data-nav-external="${esc(v.key)}">${esc(v.label)}</a>`
        : `<a data-nav="${esc(v.key)}" href="#${esc(v.key)}">${esc(v.label)}</a>`
    )).join("");
  }
  function refreshRoleChrome() {
    const role = currentRole();
    const session = readJson(SESSION_KEY, {});
    const user = session && session.user;
    if (navLogin) {
      if (user && user.name) {
        navLogin.classList.add("is-user");
        navLogin.innerHTML = `${user.avatar
          ? `<span class="nav-ava" style="background-image:url('${esc(user.avatar)}')"></span>`
          : `<span class="nav-ava nav-ava-fallback">${esc(String(user.name).slice(0, 1))}</span>`}<span class="nav-login-meta"><b>${esc(user.name)}</b><i>${role ? esc(pickLabel(role)) : "待选择角色"}</i></span>`;
      } else {
        navLogin.classList.remove("is-user");
        navLogin.textContent = role ? roleName(role) : "登录 / 角色";
      }
    }
    if (navPhase) navPhase.textContent = role ? `ROLE:${role.toUpperCase()}` : "ROLE:UNBOUND";
  }
  function renderMobileTabbar() {
    if (!mobileTabbar) return;
    mobileTabbar.innerHTML = mobileTabs().map((v) => `<a data-nav="${v.key}" href="#${v.key}"><span aria-hidden="true">${ICON(v.icon, "currentColor")}</span><b>${esc(v.label)}</b></a>`).join("");
  }

  function setActive(key) {
    navLinks.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.nav === key));
    if (mobileTabbar) {
      const availableTabs = mobileTabs().map((item) => item.key);
      const tabKey = availableTabs.includes(key) ? key : (key === "vote" || key === "result" ? "gallery" : key);
      mobileTabbar.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.nav === tabKey));
    }
    doc.body.dataset.view = key;
    navLinks.classList.remove("open");
    root.scrollTo({ top: 0, behavior: "auto" });
  }
  function go(key, push) {
    const v = VIEWS.find((x) => x.key === key) || VIEWS[0];
    const protectedView = { me: true, vote: true, judge: true };
    if (protectedView[v.key] && !currentRole()) {
      main.innerHTML = renderHome();
      setActive("home");
      showAuthGate(v.key);
      return;
    }
    if (v.key === "judge" && !rolePermissions(currentRole()).canScore) {
      main.innerHTML = renderNoPermission("评委评分", "专家评分入口仅向专家评委开放；当前身份可以返回角色工作台查看自己的可用入口。", "me");
      setActive("me");
      if (push !== false && location.hash.slice(1) !== "me") history.pushState(null, "", "#me");
      return;
    }
    main.innerHTML = v.render();
    setActive(v.key);
    if (v.key === "people") {
      if (isMobileView()) setupMobilePeople();
      else setupWall();
    }
    if (push !== false && location.hash.slice(1) !== v.key) history.pushState(null, "", `#${v.key}`);
  }
  function showWork(id, push) {
    main.innerHTML = renderWork(id);
    setActive("gallery");
    setupCarousel();
    if (push !== false) history.pushState(null, "", `#work-${id}`);
  }
  function showTeamWorkspace(id, push) {
    const team = getTeam(id);
    if (team && !canOpenTeamWorkspace(team.id)) {
      toast("队伍工作台仅限已加入该队伍的参赛选手");
      showWork(team.id, push);
      return;
    }
    main.innerHTML = renderTeamWorkspace(id);
    setActive("team");
    if (push !== false) history.pushState(null, "", `#team-workspace-${id}`);
  }
  const HASH_ALIASES = {
    final: "result",
    champion: "result",
    awards: "result",
  };

  function route(push) {
    const raw = location.hash.slice(1);
    const h = HASH_ALIASES[raw] || raw;
    if (h.indexOf("work-") === 0) showWork(h.slice(5), false);
    else if (h.indexOf("team-workspace-") === 0) showTeamWorkspace(h.slice("team-workspace-".length), false);
    else go(h || "home", false);
  }

  function refreshCurrentView({ preserveScroll = false } = {}) {
    const scrollTop = root.scrollY || doc.documentElement.scrollTop || 0;
    route(false);

    if (!preserveScroll) return;

    const restoreScroll = () => root.scrollTo({ top: scrollTop, behavior: "auto" });
    restoreScroll();
    root.requestAnimationFrame(restoreScroll);
  }

  function toast(msg) {
    let t = doc.getElementById("siteToast");
    if (!t) { t = doc.createElement("div"); t.id = "siteToast"; t.className = "site-toast"; doc.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    root.clearTimeout(t._h); t._h = root.setTimeout(() => t.classList.remove("show"), 2600);
  }
  function showConfirmDialog(options) {
    const { title, message, team, confirmText, onConfirm } = options;
    let gate = doc.getElementById("confirmGate");
    if (!gate) {
      gate = doc.createElement("div");
      gate.id = "confirmGate";
      gate.className = "confirm-gate";
      doc.body.appendChild(gate);
    }
    gate.innerHTML = `<div class="confirm-backdrop" data-close></div>
      <div class="confirm-wrapper">
        <div class="confirm-window glass" style="--accent: ${team.accent}; --rgb: ${team.rgb}">
          <!-- Window Header -->
          <div class="confirm-win-header">
            <div class="confirm-win-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="confirm-win-title">SYSTEM // ${esc(title)}</div>
            <button class="confirm-close" data-close>×</button>
          </div>
          <div class="confirm-win-body">
            <div class="confirm-team-section">
              <span class="confirm-team-code" style="color: var(--accent); border-color: rgba(${team.rgb}, 0.3); background: rgba(${team.rgb}, 0.05);">${esc(team.trackCode)} · ${esc(team.track)}</span>
              <h3 class="confirm-team-name">${esc(team.name)}</h3>
              <p class="confirm-team-project">${esc(team.project)}</p>
            </div>
            <div class="confirm-action-section">
              <p class="confirm-msg">${esc(message)}</p>
              <div class="confirm-footer-flat">
                <button class="btn-ghost confirm-btn-cancel" type="button" data-close>取消</button>
                <button class="btn-primary confirm-btn-ok" type="button" id="confirmOkBtn">${esc(confirmText)}</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    gate.classList.add("show");
    const close = () => gate.classList.remove("show");
    gate.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    const okBtn = gate.querySelector("#confirmOkBtn");
    if (okBtn) {
      okBtn.addEventListener("click", () => {
        close();
        onConfirm();
      });
    }
  }

  async function castVote(id, confirmed = false) {
    if (!requireRole("vote", (p) => p.canVote, "当前身份不参与大众投票")) return;
    if (votedTeam()) return;
    const team = D.teams.find((t) => t.id === id); if (!team) return;
    if (!confirmed) {
      showConfirmDialog({
        title: "为TA加油",
        message: "是否要为此队伍加油？",
        team: team,
        confirmText: "确定",
        onConfirm: () => castVote(id, true)
      });
      return;
    }
    try {
      await SiteRoleApi.castVote(id);
      await loadSiteState();
      toast(`已为「${team.name}」投票成功`);
      refreshCurrentView({ preserveScroll: true });
    } catch (e) {
      toast("投票失败，请稍后重试");
    }
  }

  async function cancelVote(id, confirmed = false) {
    if (!requireRole("vote", (p) => p.canVote, "当前身份不参与大众投票")) return;
    const currentVoteId = votedTeam();
    if (!currentVoteId) {
      toast("当前没有已投票记录");
      return;
    }
    const team = getTeam(id || currentVoteId);
    if (!team || team.id !== currentVoteId) return;
    if (!confirmed) {
      showConfirmDialog({
        title: "取消投票",
        message: "是否取消对这支队伍的投票？取消后可以重新选择。",
        team: team,
        confirmText: "取消投票",
        onConfirm: () => cancelVote(team.id, true)
      });
      return;
    }
    try {
      await SiteRoleApi.cancelVote(team.id);
      await loadSiteState();
      toast(`已取消对「${team.name}」的投票`);
      refreshCurrentView({ preserveScroll: true });
    } catch (e) {
      toast("取消投票失败，请稍后重试");
    }
  }

  async function joinTeam(id, confirmed = false) {
    if (!requireRole("team", (p) => p.canJoinTeam, "只有参赛选手可以加入队伍")) return;
    const team = getTeam(id); if (!team) return;
    if (!confirmed) {
      showConfirmDialog({
        title: "加入队伍",
        message: "是否要加入此队伍？",
        team: team,
        confirmText: "加入",
        onConfirm: () => joinTeam(id, true)
      });
      return;
    }
    try {
      await SiteRoleApi.joinTeam(id);
    } catch (e) {
      // 后端未接入时使用本地演示组队状态。
    }
    root.localStorage.setItem(TEAM_KEY, id);
    toast(`已加入「${team.name}」`);
    refreshCurrentView({ preserveScroll: true });
  }

  async function leaveTeam(id, confirmed = false) {
    if (!requireRole("team", (p) => p.canJoinTeam, "只有参赛选手可以加入队伍")) return;
    const currentTeamId = joinedTeam();
    if (!currentTeamId) {
      toast("当前没有已加入的队伍");
      return;
    }
    const team = getTeam(id || currentTeamId);
    if (!team || team.id !== currentTeamId) return;
    if (!confirmed) {
      showConfirmDialog({
        title: "退出队伍",
        message: "是否退出当前队伍？退出后可以重新选择其他队伍。",
        team: team,
        confirmText: "退出队伍",
        onConfirm: () => leaveTeam(team.id, true)
      });
      return;
    }
    try {
      await SiteRoleApi.leaveTeam(team.id);
    } catch (e) {
      // 后端未接入时使用本地演示组队状态。
    }
    root.localStorage.removeItem(TEAM_KEY);
    toast(`已退出「${team.name}」`);
    refreshCurrentView({ preserveScroll: true });
  }

  async function saveJudgeDraft() {
    if (!requireRole("judge", (p) => p.canScore, "只有专家评委可以保存评分")) return;
    const draft = {};
    doc.querySelectorAll("[data-score]").forEach((input) => {
      const [teamId, dim] = String(input.dataset.score || "").split(":");
      if (!teamId) return;
      const value = input.value === "" ? "" : Math.max(0, Math.min(100, +input.value || 0));
      if (!draft[teamId]) draft[teamId] = {};
      draft[teamId][dim] = value;
      input.value = value;
      updateJudgeRange(input);
    });
    try {
      await SiteRoleApi.saveJudgeScores(draft);
    } catch (e) {
      // 后端未接入时使用本地评分草稿。
    }
    root.localStorage.setItem(JUDGE_KEY, JSON.stringify(draft));
    toast("评分草稿已保存");
  }
  function updateJudgeRange(input) {
    if (!input || !input.dataset || !input.dataset.score) return;
    const value = Math.max(0, Math.min(100, +input.value || 0));
    const box = input.closest(".judge-slider");
    if (box) box.style.setProperty("--score-pct", `${value}%`);
    const output = doc.querySelector(`[data-score-value="${input.dataset.score}"]`);
    if (output) output.textContent = value;
  }

  function updateTeamNameDraft(input) {
    const teamId = input?.dataset?.teamNameDraft || "";
    if (!teamId) return;
    const drafts = readJson(TEAM_NAME_KEY, {});
    const value = input.value.trim();
    if (value) drafts[teamId] = value;
    else delete drafts[teamId];
    root.localStorage.setItem(TEAM_NAME_KEY, JSON.stringify(drafts));
  }
  function renderPreviewTags(value) {
    return splitTags(value).map((s) => `<span>${esc(s)}</span>`).join("");
  }
  function updateWorkDraft(input) {
    const [teamId, field] = String(input?.dataset?.workField || "").split(":");
    if (!teamId || !field) return;
    if (!canEditTeamWorkspace(teamId)) return;
    const drafts = readJson(WORK_DRAFT_KEY, {});
    drafts[teamId] = { ...(drafts[teamId] || {}), [field]: input.value.trim() };
    root.localStorage.setItem(WORK_DRAFT_KEY, JSON.stringify(drafts));

    if (field === "teamName") {
      const teamNameDraft = { ...readJson(TEAM_NAME_KEY, {}) };
      if (input.value.trim()) teamNameDraft[teamId] = input.value.trim();
      else delete teamNameDraft[teamId];
      root.localStorage.setItem(TEAM_NAME_KEY, JSON.stringify(teamNameDraft));
    }

    const preview = doc.querySelector(`[data-work-preview="${field}"]`);
    if (!preview) return;
    if (field === "stack") preview.innerHTML = renderPreviewTags(input.value);
    else if (field === "screenshots") {
      preview.innerHTML = splitTags(input.value).slice(0, 3).map((shot, index) => `<span>${pad(index + 1)} ${esc(shot)}</span>`).join("");
    }
    else preview.textContent = input.value;
  }
  function updateTeamLeader(input) {
    const teamId = input?.dataset?.teamLeader || "";
    const team = getTeam(teamId);
    if (!team) return;
    if (!canEditTeamWorkspace(teamId)) {
      toast("只有当前队长可以调整队长与职责");
      refreshCurrentView({ preserveScroll: true });
      return;
    }
    const people = teamPeople(team);
    if (!people.some((p) => p.id === input.value)) return;
    const meta = getTeamWorkspaceMeta(team);
    meta.leaderId = input.value;
    saveTeamWorkspaceMeta(teamId, meta);
    toast("队长已更新");
    refreshCurrentView({ preserveScroll: true });
  }
  function updateTeamDuty(input) {
    const [teamId, personId] = String(input?.dataset?.teamDuty || "").split(":");
    const team = getTeam(teamId);
    if (!team || !personId) return;
    if (!canEditTeamWorkspace(teamId)) return;
    const meta = getTeamWorkspaceMeta(team);
    meta.duties[personId] = input.value.trim() || defaultDuty(teamPeople(team).findIndex((p) => p.id === personId));
    saveTeamWorkspaceMeta(teamId, meta);
  }
  async function saveWorkDraft(teamId) {
    const team = getTeam(teamId);
    if (!team) return;
    if (!canEditTeamWorkspace(teamId)) {
      toast("只有已加入该队伍的参赛选手可以保存作品草稿");
      return;
    }

    const draft = getWorkDraft(team);
    try {
      await SiteRoleApi.submitWork({
        ...draft,
        teamId: team.id,
        userId: currentWorkspaceMemberId(team) || "local-player",
      });
      toast(`「${draft.teamName || team.name}」作品草稿已同步`);
    } catch (error) {
      console.warn("Work submit API failed.", error);
      toast(`「${team.name}」作品草稿已保存在本地`);
    }
  }

  function bind() {
    renderNavLinks();
    renderMobileTabbar();
    refreshRoleChrome();
    doc.addEventListener("click", (e) => {
      const work = e.target.closest("[data-work]");
      const vote = e.target.closest("[data-vote]");
      const authVote = e.target.closest("[data-auth-vote]");
      const cancelVoteButton = e.target.closest("[data-cancel-vote]");
      const team = e.target.closest("[data-join-team]");
      const leaveTeamButton = e.target.closest("[data-leave-team]");
      const teamWorkspace = e.target.closest("[data-team-workspace]");
      const saveWork = e.target.closest("[data-save-work-draft]");
      const judgeSave = e.target.closest("[data-judge-save]");
      const mobileTrainee = e.target.closest("[data-mobile-trainee]");
      const mobileDetailClose = e.target.closest("[data-mobile-detail-close]");
      const authFeishu = e.target.closest("[data-auth-feishu]");
      const authReset = e.target.closest("[data-auth-reset]");
      const nav = e.target.closest("[data-nav]");
      const prev = e.target.closest("[data-preview]");
      const mobileNav = e.target.closest("[data-mobile-nav]");
      if (mobileNav) {
        e.preventDefault();
        moveMobileTrainee(mobileNav.dataset.mobileNav === "next" ? 1 : -1);
        return;
      }
      const mobileDetailNav = e.target.closest("[data-mobile-detail-nav]");
      if (mobileDetailNav) {
        e.preventDefault();
        moveMobileTrainee(mobileDetailNav.dataset.mobileDetailNav === "next" ? 1 : -1);
        showMobileTraineeDetail();
        return;
      }
      if (authFeishu) { e.preventDefault(); startFeishuLogin(); return; }
      if (authReset) {
        e.preventDefault();
        root.localStorage.removeItem(ROLE_KEY);
        root.localStorage.removeItem(SESSION_KEY);
        SiteRoleApi.logout().catch(() => {});
        renderNavLinks();
        renderMobileTabbar();
        refreshRoleChrome();
        showAuthGate("me");
        return;
      }
      if (mobileTrainee) {
        e.preventDefault();
        setMobileTrainee(mobileTrainee.dataset.mobileTrainee);
        if (doc.body.dataset.view !== "people") go("people");
        return;
      }
      if (mobileDetailClose) { e.preventDefault(); closeMobileTraineeDetail(); return; }
      if (authVote) {
        e.preventDefault();
        showAuthGate(root.location.hash.slice(1) || "gallery");
        return;
      }
      if (cancelVoteButton) { cancelVote(cancelVoteButton.dataset.cancelVote); return; }
      if (vote) { castVote(vote.dataset.vote); return; }
      if (leaveTeamButton) { leaveTeam(leaveTeamButton.dataset.leaveTeam); return; }
      if (team) { joinTeam(team.dataset.joinTeam); return; }
      if (saveWork) { saveWorkDraft(saveWork.dataset.saveWorkDraft); return; }
      if (teamWorkspace) { showTeamWorkspace(teamWorkspace.dataset.teamWorkspace); return; }
      if (judgeSave) { saveJudgeDraft(); return; }
      if (work) { showWork(work.dataset.work); return; }
      if (nav) { e.preventDefault(); go(nav.dataset.nav); return; }
      if (prev) { main.innerHTML = renderResult(true); setActive("result"); return; }
      const switchRoleBtn = e.target.closest("[data-switch-role]");
      if (switchRoleBtn) { e.preventDefault(); switchCurrentRole(switchRoleBtn.dataset.switchRole); return; }
      if (e.target.closest("[data-logout]")) { e.preventDefault(); doLogout(); return; }
      if (e.target.closest("#navLogin")) {
        e.preventDefault();
        const sess = readJson(SESSION_KEY, {});
        if (sess && sess.user) toggleUserMenu(); else go("me");
        return;
      }
      if (e.target.closest("#navBurger")) { navLinks.classList.toggle("open"); return; }
    });
    // 点击菜单外区域关闭右上角用户菜单。
    doc.addEventListener("click", (e) => {
      if (!doc.getElementById("navUserMenu")) return;
      if (e.target.closest("#navUserMenu") || e.target.closest("#navLogin")) return;
      closeUserMenu();
    });
    doc.addEventListener("input", (e) => {
      const teamNameDraft = e.target.closest("[data-team-name-draft]");
      if (teamNameDraft) updateTeamNameDraft(teamNameDraft);
      const workField = e.target.closest("[data-work-field]");
      if (workField) updateWorkDraft(workField);
      const teamDuty = e.target.closest("[data-team-duty]");
      if (teamDuty) updateTeamDuty(teamDuty);
      const score = e.target.closest("[data-score]");
      if (score) updateJudgeRange(score);
    });
    doc.addEventListener("change", (e) => {
      const teamLeader = e.target.closest("[data-team-leader]");
      if (teamLeader) updateTeamLeader(teamLeader);
    });
    root.addEventListener("hashchange", () => route(false));
    root.addEventListener("scroll", () => doc.getElementById("siteNav").classList.toggle("scrolled", root.scrollY > 20));
    root.addEventListener("resize", () => {
      rain && rain.resize();
      const nowMobile = isMobileView();
      if (doc.body.dataset.view === "people") {
        if (nowMobile !== lastMobileView) route(false);
        else if (nowMobile) setupMobilePeople();
        else renderWall();
      }
      lastMobileView = nowMobile;
    });
  }

  function tick() { doc.querySelectorAll("[data-countdown]").forEach((el) => { let r = Math.max(0, (+el.dataset.remain || 0) - 1); el.dataset.remain = r; el.innerHTML = fmtHMS(r); }); }

  // 从受限页面(大屏/后台/演示)被拦回时的提示弹窗。
  function showDeniedNotice() {
    try {
      const u = new URL(root.location.href);
      u.searchParams.delete("denied");
      history.replaceState(null, "", u.pathname + (u.search || "") + (u.hash || ""));
    } catch (e) { /* 忽略 */ }
    const overlay = doc.createElement("div");
    overlay.className = "role-picker-overlay";
    overlay.innerHTML = `
      <div class="role-picker glass" role="alertdialog" aria-label="访问受限">
        <span class="role-picker-en">ACCESS DENIED</span>
        <h2>访问非法</h2>
        <p>该页面仅管理员可见，已为你返回用户站。如需访问，请用具备管理员角色的飞书账号登录。</p>
        <div class="role-picker-grid"><button type="button" data-denied-close>我知道了</button></div>
      </div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target.closest("[data-denied-close]") || e.target === overlay) overlay.remove();
    });
    doc.body.appendChild(overlay);
  }

  async function init() {
    if (root.CodeRain) { rain = root.CodeRain.createCodeRain(doc.getElementById("siteRain"), { glyphs: "010101AIJOINCARE{}[]<>".split(""), fontSize: 16, fade: "rgba(2,8,14,0.06)" }); rain.start(); }
    hydrateRole();
    const handledLogin = await consumeFeishuCallback();
    if (!handledLogin) await syncRoleFromBackend();
    await loadSiteState();
    await syncHomeState();
    bind();
    route(false);
    if (wantsAuthChooser()) showAuthGate("entry");
    if (authParams().get("denied")) showDeniedNotice();
    root.setInterval(tick, 1000);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis, document);
