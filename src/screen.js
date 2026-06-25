/**
 * 大屏赛事控制器 —— AI创新黑客松 / AI Innovation Hackathon 2026
 * 自包含「演示大屏」：大赛介绍 → 赛道 → 组队 → 开发 → 路演 → 投票 → 结果 → 冠军。
 * 复用主分支 styles.css 变量 + chrome + 终端启动风（HUD / 协议 / > 前缀）+ code-rain.js。
 * 统一「五张大卡片」范式（赛道 / 组队 / 投票 / 结果 / 冠军），管理员 ← → 切屏。
 */
(function attachScreen(root, doc) {
  "use strict";

  const D = root.ScreenData;

  /* ---- 工具 ----------------------------------------------------------- */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const pad = (n) => String(n).padStart(2, "0");
  const fmtHMS = (s) => `${pad((s / 3600) | 0)}<i>:</i>${pad(((s % 3600) / 60) | 0)}<i>:</i>${pad(s % 60)}`;
  const fmtMS = (s) => `${pad((s / 60) | 0)}:${pad(s % 60)}`;

  /* ---- HUD 矢量图标 --------------------------------------------------- */
  const GLYPHS = {
    team: '<circle cx="38" cy="44" r="6"/><circle cx="62" cy="44" r="6"/><circle cx="50" cy="38" r="7"/><path d="M28 64c0-7 5-11 10-11s10 4 10 11" fill="none"/><path d="M52 64c0-7 5-11 10-11s10 4 10 11" fill="none"/><path d="M38 62c0-8 5-13 12-13s12 5 12 13" fill="none"/>',
    code: '<path d="M44 38 L32 50 L44 62" fill="none"/><path d="M56 38 L68 50 L56 62" fill="none"/><line x1="53" y1="36" x2="47" y2="64"/>',
    stage: '<rect x="32" y="34" width="36" height="24" rx="2" fill="none"/><path d="M38 52 L45 46 L51 50 L62 40" fill="none"/><line x1="50" y1="58" x2="50" y2="66"/><line x1="40" y1="68" x2="60" y2="68"/>',
    target: '<circle cx="50" cy="50" r="14" fill="none"/><circle cx="50" cy="50" r="4"/><line x1="50" y1="28" x2="50" y2="38"/><line x1="50" y1="62" x2="50" y2="72"/><line x1="28" y1="50" x2="38" y2="50"/><line x1="62" y1="50" x2="72" y2="50"/>',
    scale: '<line x1="50" y1="32" x2="50" y2="64"/><line x1="34" y1="40" x2="66" y2="40"/><path d="M34 40 L28 54 a8 6 0 0 0 12 0 Z" fill="none"/><path d="M66 40 L60 54 a8 6 0 0 0 12 0 Z" fill="none"/><line x1="42" y1="66" x2="58" y2="66"/>',
    trophy: '<path d="M40 34 h20 v8 a10 10 0 0 1 -20 0 Z" fill="none"/><path d="M40 38 h-6 a6 6 0 0 0 6 8" fill="none"/><path d="M60 38 h6 a6 6 0 0 1 -6 8" fill="none"/><line x1="50" y1="50" x2="50" y2="58"/><line x1="42" y1="64" x2="58" y2="64"/><line x1="45" y1="58" x2="55" y2="58"/>',
    rocket: '<path d="M50 30 c8 6 10 18 10 26 l-6 6 h-8 l-6 -6 c0 -8 2 -20 10 -26 Z" fill="none"/><circle cx="50" cy="46" r="4"/><path d="M40 58 l-6 8 8 -3 M60 58 l6 8 -8 -3" fill="none"/>',
    doc: '<path d="M38 32 h16 l10 10 v26 h-26 Z" fill="none"/><path d="M54 32 v10 h10" fill="none"/><line x1="43" y1="50" x2="59" y2="50"/><line x1="43" y1="57" x2="59" y2="57"/><line x1="43" y1="64" x2="53" y2="64"/>',
    upload: '<path d="M36 58 a10 10 0 0 1 2 -20 a14 14 0 0 1 26 4 a9 9 0 0 1 0 16" fill="none"/><line x1="50" y1="46" x2="50" y2="68"/><path d="M43 53 L50 46 L57 53" fill="none"/>',
    check: '<path d="M38 52 L46 60 L62 42" fill="none"/>',
    bulb: '<path d="M50 26 c-10 0 -16 7 -16 16 c0 6 3 11 7 14 l2 6 h14 l2 -6 c4 -3 7 -8 7 -14 c0 -9 -6 -16 -16 -16 Z" fill="none"/><path d="M44 67 h12 M45 71 h10 M47 75 h6" fill="none"/>',
  };
  function hud(glyph, accent, size) {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, long = i % 5 === 0, r1 = long ? 41 : 43.5;
      ticks.push(`<line x1="${(50 + Math.cos(a) * r1).toFixed(1)}" y1="${(50 + Math.sin(a) * r1).toFixed(1)}" x2="${(50 + Math.cos(a) * 46).toFixed(1)}" y2="${(50 + Math.sin(a) * 46).toFixed(1)}" stroke-width="${long ? 1.4 : 0.7}" opacity="${long ? 0.7 : 0.32}"/>`);
    }
    return `<svg class="hud" viewBox="0 0 100 100" style="--hud:${accent};width:${size}px;height:${size}px" aria-hidden="true"><g class="hud-ticks" stroke="${accent}">${ticks.join("")}</g><circle class="hud-spin" cx="50" cy="50" r="38" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="6 10" opacity="0.55"/><circle cx="50" cy="50" r="31" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.85"/><g class="hud-glyph" stroke="${accent}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none">${GLYPHS[glyph] || ""}</g></svg>`;
  }

  /* ---- 头像 ----------------------------------------------------------- */
  function avatar(p, size, cls) {
    const s = size || 56;
    if (p && p.avatar) return `<span class="ava ${cls || ""}" style="width:${s}px;height:${s}px;background-image:url('${p.avatar}')" title="${esc(p.name || "")}"></span>`;
    const ch = p && p.name ? p.name.slice(0, 1) : "·";
    return `<span class="ava ava-ph ${cls || ""}" style="width:${s}px;height:${s}px"><i>${esc(ch)}</i></span>`;
  }

  /* ---- 共用 chrome（主分支统一 + 终端风）------------------------------ */
  function head(mark) {
    const m = D.meta;
    return `<header class="screen-top"><div class="brand-lockup"><img class="brand-logo" src="${m.logo}" alt="健康元 Joincare" /><div class="brand-divider"></div><div class="brand-name"><strong>${esc(m.title)}</strong><span>${esc(m.enTitle)}</span></div></div><div class="screen-marks"><button class="brand-chip" type="button"><span class="chip-dot"></span>${esc(m.brandChip)}</button><div class="cohort-mark">${esc(mark)}</div></div></header>`;
  }
  function wm(a, b) { return `<div class="stage-title-lockup screen-wm" aria-hidden="true"><span>${esc(a)}</span><span>${esc(b)}</span></div>`; }
  function foot(status) { return `<footer class="stage-footer screen-foot"><button type="button">2026</button><span>${esc(D.meta.protocol)}</span><span>${esc(status)}</span></footer>`; }
  function cap(zh, en) { return `<div class="panel-cap"><span class="cap-bracket"></span><i class="cap-gt">&gt;</i>${esc(zh)}<span class="cap-en">${esc(en)}</span></div>`; }
  function bar(pct, accent, rgb) { return `<span class="meter" style="--accent:${accent};--rgb:${rgb}"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></span>`; }
  function qrSvg() {
    const seed = [0x7f, 0x41, 0x5d, 0x5d, 0x41, 0x7f, 0x00, 0x2a, 0x6b, 0x1c, 0x49, 0x36, 0x2d, 0x55, 0x7f, 0x22, 0x14, 0x6b, 0x14, 0x22, 0x7f, 0x08, 0x3e, 0x2a, 0x49, 0x36, 0x5d, 0x63];
    const cells = [];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if ((seed[(y * 7 + x) % seed.length] >> (x % 7)) & 1) cells.push(`<rect x="${x * 10 + 4}" y="${y * 10 + 4}" width="9" height="9"/>`);
    return `<svg viewBox="0 0 78 78" fill="var(--neon)"><rect width="78" height="78" fill="rgba(40,255,200,0.06)"/>${cells.join("")}</svg>`;
  }
  // 队伍组员头像组（含空位）
  function memberStack(team, size) {
    const ppl = team.members.map((m) => `<div class="ava-cell">${avatar(m, size)}<span>${esc(m.name)}</span></div>`).join("");
    const empty = Math.max(0, (team.capacity - 1) - team.members.length);
    const slots = Array.from({ length: empty }).map(() => `<div class="ava-cell"><span class="ava ava-empty" style="width:${size}px;height:${size}px"></span><span class="muted">待加入</span></div>`).join("");
    return ppl + slots;
  }

  /* =======================================================================
   *  屏1 · 大赛介绍与全流程
   * ===================================================================== */
  function renderBrief() {
    const m = D.meta;
    const days = D.flowDays.map((d, i) => {
      const arrow = i < D.flowDays.length - 1 ? '<div class="day-arrow" aria-hidden="true"><span></span><span></span><span></span></div>' : "";
      const timeBox = d.time ? `<div class="day-time">${esc(d.time)}</div>` : "";
      return `<div class="day-card glass" style="--d:${i}"><div class="day-badge">${esc(d.day)}<i>${esc(d.en)}</i></div><div class="day-hud">${hud(d.icon, "var(--neon)", 90)}</div><h3 class="day-title">${esc(d.title)}</h3><div class="day-lines">${d.lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>${timeBox}</div>${arrow}`;
    }).join("");
    const mech = D.mechanism.map((c) => `<div class="mech-card glass" style="--accent:${c.accent};--rgb:${c.rgb}"><div class="mech-top"><span class="mech-label">${esc(c.label)}<i>${esc(c.en)}</i></span>${hud(c.icon, c.accent, 54)}</div><div class="mech-headline">${esc(c.headline)}</div><div class="mech-sub">${esc(c.sub)}</div><span class="mech-bar"></span></div>`).join("");
    const ribbon = D.tracks.map((t) => `<span class="tk-tag" style="--accent:${t.accent};--rgb:${t.rgb}"><b>${t.code}</b>${esc(t.name)}<i>${esc(t.en)}</i></span>`).join("");
    const timeline = D.timeline.map((t, i) => `<li class="tl-node" style="--i:${i}"><span class="tl-ic">${hud(t.icon, "var(--neon)", 38)}</span><span class="tl-time">${esc(t.time)}</span><span class="tl-label">${esc(t.label)}</span></li>`).join("");
    return `<div class="brief-wrap">${head("OVERVIEW")}<div class="brief-title-row"><div class="brief-title-block"><div class="title-frame"><h1 class="brief-h1">大赛介绍<span class="h1-dim"> 与 </span>全流程</h1></div><p class="brief-slogan">${esc(m.slogan)}</p></div><div class="brief-stats"><div class="stat"><b>${D.stats.teams}</b><span>参赛队伍 TEAMS</span></div><div class="stat"><b>${D.stats.members}</b><span>参赛者 MEMBERS</span></div><div class="stat"><b>${D.stats.tracks}</b><span>赛道 TRACKS</span></div><div class="stat"><b>${D.stats.mentors}</b><span>队长 LEADERS</span></div></div></div><div class="tk-ribbon">${ribbon}</div><div class="brief-main"><section class="flow-panel">${cap("36小时 · 全流程", "FULL JOURNEY")}<div class="day-track">${days}</div></section><section class="mech-panel">${cap("赛事机制", "RULES")}<div class="mech-grid">${mech}</div></section></div><footer class="brief-timeline"><div class="tl-head"><span class="live-dot"></span>LIVE 实时赛程</div><ul class="tl-track">${timeline}</ul><div class="tl-qr"><div class="qr-box">${qrSvg()}</div><div class="qr-text"><strong>手机端入口</strong><span>扫码查看赛程 · 投票</span></div></div></footer></div>`;
  }

  /* =======================================================================
   *  屏2 · 赛道发布（卡片含飞书文档链接按钮）
   * ===================================================================== */
  function renderTracks() {
    const cards = D.tracks.map((t, i) =>
      `<article class="track-card glass" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><span class="corner tl"></span><span class="corner br"></span><div class="track-head"><span class="track-code">${esc(t.code)}</span>${hud(t.icon, t.accent, 66)}</div><h3 class="track-name">${esc(t.name)}</h3><span class="track-en">${esc(t.en)}</span><div class="track-focus-wrap"><span class="track-flabel"><i class="cap-gt">&gt;</i>业务方向</span><p class="track-focus">${esc(t.focus)}</p></div><span class="track-flabel"><i class="cap-gt">&gt;</i>痛点关键词</span><div class="track-pains">${t.pains.map((p) => `<span>${esc(p)}</span>`).join("")}</div><div class="track-foot"><span class="track-mentor">队长 · ${esc(t.mentor)}</span><a class="track-link" href="${esc(t.doc)}" target="_blank" rel="noopener">赛道讲解文档 ➔</a></div></article>`
    ).join("");
    return `<div class="page-wrap tracks-wrap">${wm("FIVE", "TRACKS")}${head("5 CORE TRACKS")}<div class="page-title"><h1>赛道发布</h1><p>只固定赛道，不固定题目 · 点击卡片查看飞书赛道讲解文档</p></div><div class="track-grid">${cards}</div>${foot("TRACKS RELEASED")}</div>`;
  }

  /* =======================================================================
   *  屏3 · 实时组队进度（沿用五卡片：队长居中 + 组员实时加入）
   * ===================================================================== */
  function renderTeaming() {
    const joined = D.teams.reduce((s, t) => s + 1 + t.members.length, 0);
    const full = D.teams.filter((t) => t.members.length >= t.capacity - 1).length;
    const cards = D.teams.map((t, i) => {
      const cnt = 1 + t.members.length;
      const locked = cnt >= t.capacity;
      return `<article class="tm-card glass" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><span class="corner tl"></span><span class="corner br"></span><div class="tm-head"><span class="track-code">${esc(t.trackCode)}</span><div class="tm-track"><b>${esc(t.track)}</b><span class="lane-en">TRACK</span></div><span class="tm-count">${cnt}<i>/${t.capacity}</i></span></div><div class="tm-advisor"><div class="tm-ava-wrap">${avatar(t.advisor, 108, "ring")}<span class="tm-ava-tag">队长</span></div><b>${esc(t.advisor.name)}</b><span class="tm-role">LEADER · 队长</span></div><div class="tm-mcap"><i class="cap-gt">&gt;</i>组员实时加入 · MEMBERS</div><div class="tm-members">${memberStack(t, 56)}</div><div class="tm-bar">${bar((cnt / t.capacity) * 100, t.accent, t.rgb)}<span class="${locked ? "lk" : ""}">${locked ? "已满员锁定 🔒" : "招募中 " + cnt + "/" + t.capacity}</span></div></article>`;
    }).join("");
    return `<div class="page-wrap teaming-wrap">${wm("TEAM", "UP")}${head("LIVE TEAMING")}<div class="page-title"><h1>实时组队进度</h1><p>抢赛道 · 先到先得 · 满员锁定 — 全员可观看<span class="pt-kpi">已加入 <b>${joined}</b> 人 · 满员 <b>${full}/${D.teams.length}</b> 队</span></p></div><div class="tm-grid">${cards}</div>${foot("TEAMING LIVE")}</div>`;
  }

  /* =======================================================================
   *  屏4 · 封闭开发倒计时（倒计时居中 + 仅 开发中/已提交）
   * ===================================================================== */
  function renderDev() {
    const cards = D.teams.map((t, i) => {
      const done = !!t.submitted;
      return `<div class="ds-card glass ${done ? "done" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><span class="track-code">${esc(t.trackCode)}</span><div class="ds-track"><b>${esc(t.track)}</b><span class="lane-en">${esc(t.en || "")}</span></div><span class="ds-status ${done ? "ok" : "wip"}"><i></i>${done ? "已提交" : "开发中"}</span></div>`;
    }).join("");
    const submitted = D.teams.filter((t) => t.submitted).length;
    return `<div class="page-wrap dev-wrap">${wm("BUILD", "MODE")}${head("BUILD MODE")}<div class="dev-center"><div class="count-cap"><span class="live-dot"></span>距交付截止 · DEADLINE</div><div class="count-clock" data-countdown data-remain="49336">${fmtHMS(49336)}</div><div class="count-sub">交付截止 · 7月11日 24:00 &nbsp;·&nbsp; 7月12日 现场路演</div></div><section class="dev-status"><div class="ds-cap">${cap("交付状态 · 五支队伍", "DELIVERY STATUS")}<span class="ds-sum">已提交 <b>${submitted}</b> / ${D.teams.length}</span></div><div class="ds-grid">${cards}</div></section>${foot("CLOSED BUILD")}</div>`;
  }

  /* =======================================================================
   *  屏5 · 路演计时（上台前点击切换 · 当前队伍 + 队列）
   * ===================================================================== */
  function renderRoadshow() {
    const order = [...D.teams];
    const now = order[0];
    const queue = order.slice(1).map((t, i) => `<div class="rq-item ${i === 0 ? "next" : ""}"><span class="rq-idx">${pad(i + 2)}</span><span class="track-code sm">${esc(t.trackCode)}</span><b>${esc(t.name)}</b><span class="rq-track">${esc(t.track)}</span>${i === 0 ? '<span class="rq-flag">NEXT</span>' : ""}</div>`).join("");
    const avas = [now.advisor, ...now.members].map((p) => avatar(p, 56, "ring")).join("");
    const dims = D.dimensions.map((d) => `<span class="rdim">${esc(d.label)}<i>${d.weight}%</i></span>`).join("");
    return `<div class="page-wrap road-wrap">${wm("DEMO", "DAY")}${head("ROADSHOW")}<div class="road-grid"><section class="road-stage glass" style="--accent:${now.accent};--rgb:${now.rgb}"><span class="corner tl"></span><span class="corner br"></span><div class="road-cap"><span class="live-dot"></span>正在路演 · ON STAGE</div><div class="road-avas">${avas}</div><div class="road-team"><span class="track-code">${esc(now.trackCode)}</span><h2>${esc(now.name)}</h2><span class="road-proj">${esc(now.project)} · ${esc(now.track)}</span></div><div class="road-timer" data-timer data-remain="372">${fmtMS(372)}</div><div class="road-phase"><span>演示 6:00</span><i></i><span>问答 3:00</span></div><div class="road-rubric">${dims}</div></section><section class="road-side">${cap("路演队列", "QUEUE")}<div class="rq-list">${queue}</div></section></div>${foot("LIVE DEMO")}</div>`;
  }

  /* =======================================================================
   *  屏6 · 作品展示大厅（大众投票入口 · 浏览作品）
   * ===================================================================== */
  function renderGallery() {
    const cards = D.teams.map((t, i) => {
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 34, "ring")).join("");
      const stack = (t.stack || []).map((s) => `<span>${esc(s)}</span>`).join("");
      return `<article class="gl-card glass" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><span class="gl-corner tl"></span><span class="gl-corner br"></span><div class="gl-head"><span class="track-code sm">${esc(t.trackCode)}</span><div class="gl-id"><b>${esc(t.name)}</b><span>${esc(t.track)}</span></div>${hud(t.icon || "code", t.accent, 46)}</div><div class="gl-preview"><h3>${esc(t.project)}</h3></div><p class="gl-pitch">${esc(t.pitch || "")}</p><div class="gl-stack">${stack}</div><div class="gl-foot"><div class="gl-avas">${avas}</div><a class="gl-vote" href="https://joincare.feishu.cn/hackathon/vote/${t.id}" target="_blank" rel="noopener">为TA加油</a></div></article>`;
    }).join("");
    return `<div class="page-wrap gl-wrap">${wm("WORKS", "GALLERY")}${head("ART GALLERY")}<div class="page-title"><h1>作品展示大厅</h1><p>大众投票入口 · 浏览真实可运行作品，为你支持的团队投 1 票<span class="pt-kpi">窗口 <b data-countdown data-remain="1148" class="inline-cd">${fmtHMS(1148)}</b></span></p></div><div class="gl-grid">${cards}</div><div class="vote-cta glass"><div class="qr-box">${qrSvg()}</div><div class="cta-text"><strong>扫码进入作品展示大厅投票</strong><span>电脑网页端 / 移动端均可 — 开发结束后开放，一人一票</span></div><a class="cta-btn" href="https://joincare.feishu.cn/hackathon/gallery" target="_blank" rel="noopener">进入展厅 ➔</a></div>${foot("GALLERY OPEN")}</div>`;
  }

  /* =======================================================================
   *  屏6 · 大众投票进度（五卡片：队名/作品/头像/实时票数 + 投票入口）
   * ===================================================================== */
  function renderVote() {
    const max = Math.max(...D.teams.map((t) => t.votes));
    const total = D.teams.reduce((s, t) => s + t.votes, 0);
    const ranked = [...D.teams].sort((a, b) => b.votes - a.votes);
    const cards = ranked.map((t, i) => {
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 40, "ring")).join("");
      return `<article class="vt-card glass ${i === 0 ? "lead" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><div class="vt-head"><span class="track-code">${esc(t.trackCode)}</span><span class="vt-rank">#${i + 1}</span></div><h3 class="vt-name">${esc(t.name)}</h3><span class="vt-proj">${esc(t.project)}</span><div class="vt-avas">${avas}</div><div class="vt-meter">${bar((t.votes / max) * 100, t.accent, t.rgb)}</div><div class="vt-votes"><b>${t.votes.toLocaleString()}</b><span>实时票数</span></div></article>`;
    }).join("");
    return `<div class="page-wrap vote-wrap">${wm("LIVE", "VOTE")}${head("LIVE VOTE")}<div class="page-title"><h1>大众投票进度</h1><p>一人一票 · 投票窗口内有效<span class="pt-kpi">累计 <b>${total.toLocaleString()}</b> 票 · 窗口 <b data-countdown data-remain="1148" class="inline-cd">${fmtHMS(1148)}</b></span></p></div><div class="vt-grid">${cards}</div><div class="vote-cta glass"><div class="qr-box">${qrSvg()}</div><div class="cta-text"><strong>进入作品展厅投票</strong><span>电脑网页端 / 移动端扫码均可 — 浏览作品，为你支持的团队投 1 票</span></div><a class="cta-btn" href="https://joincare.feishu.cn/hackathon/gallery" target="_blank" rel="noopener">作品展厅 ➔</a></div>${foot("VOTE OPEN")}</div>`;
  }

  /* =======================================================================
   *  屏7 · 大众投票结果（五卡片 + 赋分）
   * ===================================================================== */
  function renderResult() {
    const max = Math.max(...D.teams.map((t) => t.votes));
    const ranked = D.computeRanking().slice().sort((a, b) => b.votes - a.votes);
    const cards = ranked.map((t, i) =>
      `<article class="vt-card glass ${i === 0 ? "lead" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--d:${i}"><div class="vt-head"><span class="track-code">${esc(t.trackCode)}</span><span class="vt-rank">#${i + 1}</span></div><h3 class="vt-name">${esc(t.name)}</h3><span class="vt-proj">${esc(t.project)}</span><div class="vt-meter">${bar((t.votes / max) * 100, t.accent, t.rgb)}<span class="vt-vnum">${t.votes} 票</span></div><div class="rs-points"><b>${t.votePoint}</b><span>排名赋分</span></div></article>`
    ).join("");
    const scale = D.votePoints.map((p, i) => `<div class="sc-item ${i < 3 ? "hi" : ""}"><span>NO.${i + 1}</span><b>${p}</b></div>`).join("");
    return `<div class="page-wrap result-wrap">${wm("VOTE", "RESULT")}${head("VOTE RESULT")}<div class="page-title"><h1>大众投票结果</h1><p>按票数排名 · 排名赋分计入综合得分 30%</p></div><div class="vt-grid">${cards}</div><div class="rs-foot"><div class="rs-scale">${cap("排名赋分规则", "POINTS")}<div class="scale-row">${scale}</div></div><div class="rs-note glass">综合得分 = 专家评审 <b>70%</b> + 大众投票排名赋分 <b>30%</b></div></div>${foot("RESULT LOCKED")}</div>`;
  }

  /* =======================================================================
   *  屏8 · 冠军揭晓（五卡片台阶式，冠军居中 + 皇冠）
   * ===================================================================== */
  function renderChampion() {
    const ranked = D.computeRanking();          // rank1 first
    const podium = [ranked[3], ranked[1], ranked[0], ranked[2], ranked[4]].filter(Boolean);
    const cards = podium.map((t) => {
      const champ = t.rank === 1;
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, champ ? 50 : 38, "ring")).join("");
      return `<article class="cp-card glass ${champ ? "is-champ" : ""} pos-${t.rank}" style="--accent:${t.accent};--rgb:${t.rgb}">${champ ? '<div class="cp-crown">' + hud("trophy", "var(--warning)", 78) + "</div>" : ""}<div class="cp-rank ${champ ? "r1" : ""}">${champ ? "CHAMPION" : "NO." + t.rank}</div><h3 class="cp-name">${esc(t.name)}</h3><span class="cp-proj">${esc(t.project)} · ${esc(t.track)}</span><div class="cp-avas">${avas}</div><div class="cp-total"><b>${t.total}</b><span>综合得分</span></div><div class="cp-break"><span>专家 ${t.expert}</span><span>赋分 ${t.votePoint}</span></div></article>`;
    }).join("");
    return `<div class="page-wrap champ-wrap">${wm("GRAND", "PRIZE")}${head("GRAND PRIZE")}<div class="page-title center"><h1>冠军揭晓 · GRAND PRIZE</h1><p>综合得分 = 专家评审 70% + 大众投票赋分 30%</p></div><div class="cp-podium">${cards}</div><div class="cp-company">${esc(D.meta.company)}</div></div>`;
  }

  /* =======================================================================
   *  Deck
   * ===================================================================== */
  const VIEWS = [
    { key: "brief", label: "大赛介绍与全流程", render: renderBrief },
    { key: "tracks", label: "赛道发布", render: renderTracks },
    { key: "teaming", label: "实时组队进度", render: renderTeaming },
    { key: "dev", label: "封闭开发倒计时", render: renderDev },
    { key: "roadshow", label: "路演计时", render: renderRoadshow },
    { key: "gallery", label: "作品展示大厅", render: renderGallery },
    { key: "vote", label: "大众投票进度", render: renderVote },
    { key: "result", label: "大众投票结果", render: renderResult },
    { key: "champion", label: "冠军揭晓", render: renderChampion },
  ];

  let current = 0, rain = null;
  const stage = doc.getElementById("screenStage");
  const rainCanvas = doc.getElementById("screenRain");
  const deckLabel = doc.getElementById("deckLabel");
  const deckDots = doc.getElementById("deckDots");

  function show(index, dir) {
    current = (index + VIEWS.length) % VIEWS.length;
    const v = VIEWS[current];
    stage.innerHTML = `<div class="screen-view ${dir || "in"}" data-view="${v.key}">${v.render()}</div>`;
    if (deckLabel) deckLabel.textContent = `${pad(current + 1)} / ${pad(VIEWS.length)} · ${v.label}`;
    if (deckDots) deckDots.innerHTML = VIEWS.map((_, i) => `<button class="deck-dot ${i === current ? "on" : ""}" data-goto="${i}" aria-label="第 ${i + 1} 屏"></button>`).join("");
    if (location.hash.slice(1) !== v.key) history.replaceState(null, "", `#${v.key}`);
  }
  const next = () => show(current + 1, "next");
  const prev = () => show(current - 1, "prev");

  function tick() {
    doc.querySelectorAll("[data-countdown]").forEach((el) => { let r = Math.max(0, (+el.dataset.remain || 0) - 1); el.dataset.remain = r; el.innerHTML = fmtHMS(r); });
    doc.querySelectorAll("[data-timer]").forEach((el) => { let r = Math.max(0, (+el.dataset.remain || 0) - 1); el.dataset.remain = r; el.textContent = fmtMS(r); });
  }
  function toggleFs() { if (!doc.fullscreenElement) doc.documentElement.requestFullscreen?.(); else doc.exitFullscreen?.(); }
  function bind() {
    doc.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (/^[1-9]$/.test(e.key)) { const i = +e.key - 1; if (i < VIEWS.length) show(i); }
      else if (e.key === "f" || e.key === "F") toggleFs();
      else if (e.key === "h" || e.key === "H") doc.body.classList.toggle("hud-hidden");
    });
    deckDots && deckDots.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) show(+g.dataset.goto); });
    const nx = doc.getElementById("deckNext"), pv = doc.getElementById("deckPrev"), fs = doc.getElementById("deckFs");
    nx && nx.addEventListener("click", next); pv && pv.addEventListener("click", prev); fs && fs.addEventListener("click", toggleFs);
    root.addEventListener("resize", () => rain && rain.resize());

    // 鼠标滚轮切屏（节流）
    let wheelLock = false;
    doc.addEventListener("wheel", (e) => {
      if (wheelLock || Math.abs(e.deltaY) < 14) return;
      wheelLock = true;
      e.deltaY > 0 ? next() : prev();
      root.setTimeout(() => { wheelLock = false; }, 600);
    }, { passive: true });

    // 控制条自动隐藏（移动鼠标时短暂浮现，避免遮挡内容）
    const deckBar = doc.getElementById("deckBar");
    let hideTimer;
    const reveal = () => {
      doc.body.classList.add("deck-show");
      root.clearTimeout(hideTimer);
      hideTimer = root.setTimeout(() => doc.body.classList.remove("deck-show"), 2600);
    };
    doc.addEventListener("mousemove", reveal);
    if (deckBar) {
      deckBar.addEventListener("mouseenter", () => root.clearTimeout(hideTimer));
      deckBar.addEventListener("mouseleave", reveal);
    }
  }
  function init() {
    if (root.CodeRain && rainCanvas) { rain = root.CodeRain.createCodeRain(rainCanvas, { glyphs: "010101AIJOINCARE{}[]<>".split(""), fontSize: 18, fade: "rgba(2, 8, 14, 0.05)" }); rain.start(); }
    bind();
    const idx = VIEWS.findIndex((v) => v.key === location.hash.slice(1));
    show(idx >= 0 ? idx : 0);
    root.setInterval(tick, 1000);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis, document);
