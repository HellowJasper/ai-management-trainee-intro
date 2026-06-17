/**
 * AI创新黑客松 · 官网（PC 优先，响应式）
 * 两条主线：人（新生看板）+ 作品（作品展厅，可点进详情、投票）。
 * 复用 styles.css 变量 + code-rain.js + screen-data.js（与大屏同源）+ data/trainees.json。
 */
(function attachSite(root, doc) {
  "use strict";
  const D = root.ScreenData;
  const VOTE_KEY = "joincare_hackathon_vote";
  const PHASE = "published"; // voting | published —— 投票期不显示排名，公布后才出最终排行
  let TRAINEES = [];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const fmtHMS = (s) => `${pad((s / 3600) | 0)}<i>:</i>${pad(((s % 3600) / 60) | 0)}<i>:</i>${pad(s % 60)}`;
  const votedTeam = () => root.localStorage.getItem(VOTE_KEY);

  function avatar(p, size, cls) {
    const s = size || 44;
    if (p && p.avatar) return `<span class="s-ava ${cls || ""}" style="width:${s}px;height:${s}px;background-image:url('${p.avatar}')" title="${esc(p.name || "")}"></span>`;
    return `<span class="s-ava s-ava-ph ${cls || ""}" style="width:${s}px;height:${s}px"><i>${esc((p && p.name || "·").slice(0, 1))}</i></span>`;
  }

  const G = {
    target: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
    vote: '<path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z"/>',
    trophy: '<path d="M7 5h10v3a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M9 20h6"/>',
    team: '<circle cx="9" cy="9" r="2.4"/><circle cx="15" cy="9" r="2.4"/><path d="M5 18a4 4 0 0 1 8 0M11 18a4 4 0 0 1 8 0"/>',
    code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
    scale: '<path d="M12 4v16M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
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

  /* ---- 首页：人 + 作品 两条主线 -------------------------------------- */
  function renderHome() {
    const totalVotes = D.teams.reduce((s, t) => s + t.votes, 0);
    const faces = (TRAINEES.length ? TRAINEES : D.teams.flatMap((t) => [t.advisor, ...t.members])).slice(0, 9)
      .map((p) => avatar({ name: p.name, avatar: p.idPhoto || p.photo || p.avatar }, 46, "stack")).join("");
    const workTags = D.teams.map((t) => `<span class="wt-tag" style="--accent:${t.accent};--rgb:${t.rgb}">${esc(t.name)}</span>`).join("");

    return `<section class="hero"><div class="container hero-grid">
      <div class="hero-copy">
        <span class="hero-kicker"><span class="live-dot"></span>LIVE · HACKATHON_PROTOCOL_2026</span>
        <h1 class="hero-title">AI创新黑客松</h1>
        <p class="hero-slogan">三天，把 AI 创意做成可运行系统</p>
        <p class="hero-desc">健康元药业 2026 AI 管培生黑客松 · 五大赛道、真实业务挑战。认识参赛伙伴，浏览他们真实可运行的作品，为你支持的团队投票。</p>
        <div class="hero-ctas"><a class="btn-primary" data-nav="gallery">进入作品展厅 ♥</a><a class="btn-ghost" data-nav="people">认识参赛伙伴 ➔</a></div>
      </div>
      <aside class="hero-panel glass">
        <div class="hp-row"><span class="live-dot"></span><span class="hp-label">当前阶段 · LIVE</span></div>
        <div class="hp-phase">大众投票进行中</div>
        <div class="hp-cd" data-countdown data-remain="6353">${fmtHMS(6353)}</div>
        <div class="hp-sub">距投票截止</div>
        <div class="hp-stats">
          <div><b>${D.stats.tracks}</b><span>赛道</span></div>
          <div><b>${D.stats.teams}</b><span>队伍</span></div>
          <div><b>${D.stats.members}</b><span>参赛者</span></div>
          <div><b>${totalVotes.toLocaleString()}</b><span>总票数</span></div>
        </div>
      </aside>
    </div></section>

    <section class="container sec"><div class="sec-cap"><span></span>两条主线 · PEOPLE &amp; WORKS</div>
      <div class="pillars">
        <a class="pillar glass" data-nav="people" style="--accent:var(--neon);--rgb:40,255,200">
          <div class="pl-top"><span class="pl-en">PEOPLE</span><h3>新生看板</h3></div>
          <p>认识本届 AI 管培生 —— 他们的背景、AI 搭子与超能力。</p>
          <div class="pl-faces">${faces}<span class="pl-more">+${Math.max(0, (TRAINEES.length || D.stats.members) - 9)}</span></div>
          <span class="pl-go">进入新生看板 ➔</span>
        </a>
        <a class="pillar glass" data-nav="gallery" style="--accent:var(--neon-2);--rgb:167,255,79">
          <div class="pl-top"><span class="pl-en">WORKS</span><h3>作品展厅</h3></div>
          <p>五支队伍、五大赛道的真实可运行作品 —— 点进去看团队与作品，并投票。</p>
          <div class="pl-tags">${workTags}</div>
          <span class="pl-go">进入作品展厅 ➔</span>
        </a>
      </div>
    </section>

    <section class="container sec"><div class="sec-cap"><span></span>了解大赛 · ABOUT</div>
      <div class="entry-grid two">
        <a class="entry-card" data-nav="brief" style="--accent:#6ad7ff;--rgb:106,215,255"><span class="entry-ic">${ICON("target", "#6ad7ff")}</span><div class="entry-tx"><b>大赛介绍<i>ABOUT</i></b><span>赛制 · 三天全流程 · 评分机制</span></div><span class="entry-go">➔</span></a>
        <a class="entry-card" data-nav="tracks" style="--accent:#c79bff;--rgb:199,155,255"><span class="entry-ic">${ICON("doc", "#c79bff")}</span><div class="entry-tx"><b>五大赛道<i>TRACKS</i></b><span>临床/药学/生产/营销/职能 + 讲解文档</span></div><span class="entry-go">➔</span></a>
      </div>
    </section>`;
  }

  /* ---- 新生看板（复用照片墙轮盘 + 点击看详情）------------------------ */
  let WALL = [];
  function renderPeople() {
    return `<section class="people-stage">
      <header class="people-head"><span class="ph-en">PEOPLE</span><h1>新生看板</h1><p>认识本届 AI 管培生 · 移动鼠标浏览，点击头像查看完整档案</p></header>
      <div class="photo-wall-wrap"><div class="photo-wall" id="peopleWall"></div></div>
      <div class="people-hint">← 滑动浏览 · 点击头像查看 TA 的完整档案 →</div>
    </section>`;
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
    const F = [["🎓 专业背景", p.background], ["🤖 我的 AI 搭子们", p.aiPartners], ["🌟 本命 AI 搭子", p.favoriteAI], ["💡 最想让 AI 解决的问题", p.aiProblem], ["⚡️ 我的 AI 超能力", p.aiPower], ["🤣 一个有趣的事实", p.funFact]];
    const fields = F.filter((f) => f[1]).map((f) => `<section class="pm-field"><span>${esc(f[0])}</span><p>${esc(f[1])}</p></section>`).join("");
    let m = doc.getElementById("ppModal");
    if (!m) { m = doc.createElement("div"); m.id = "ppModal"; m.className = "pp-modal"; doc.body.appendChild(m); }
    m.innerHTML = `<div class="pm-backdrop" data-close></div><article class="pm-card glass"><button class="pm-close" data-close>×</button><div class="pm-media" style="background-image:url('${esc(p.photo || p.idPhoto)}')"></div><div class="pm-info"><span class="pm-dept">${esc(p.department || "")}</span><h2>${esc(p.name)}</h2><span class="pm-roman">${esc(p.romanName || "")}</span><div class="pm-fields">${fields}</div></div></article>`;
    m.classList.add("show");
    m.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => m.classList.remove("show")));
  }

  /* ---- 大赛介绍 ------------------------------------------------------- */
  function renderBrief() {
    const days = D.flowDays.map((d, i) => `<div class="flow-step"><div class="fs-badge">${esc(d.day)}<i>${esc(d.en)}</i></div><div class="fs-ic">${ICON(d.icon, "var(--neon)")}</div><b>${esc(d.title)}</b><p>${d.lines.map(esc).join("<br>")}</p><span class="fs-time">${esc(d.time)}</span>${i < 2 ? '<span class="fs-arrow">➔</span>' : ""}</div>`).join("");
    const mech = D.mechanism.map((c) => `<div class="mech2 glass" style="--accent:${c.accent};--rgb:${c.rgb}"><div class="m2-top"><span>${esc(c.label)}<i>${esc(c.en)}</i></span>${ICON(c.icon, c.accent)}</div><b>${esc(c.headline)}</b><span class="m2-sub">${esc(c.sub)}</span></div>`).join("");
    return `${pageHead("大赛介绍与全流程", "三天，把 AI 创意做成可运行系统", "ABOUT")}
    <section class="container sec"><div class="sec-cap"><span></span>三天 · 全流程</div><div class="flow-row">${days}</div></section>
    <section class="container sec"><div class="sec-cap"><span></span>赛事机制</div><div class="mech2-grid">${mech}</div></section>`;
  }

  /* ---- 赛道 ----------------------------------------------------------- */
  function renderTracks() {
    const cards = D.tracks.map((t) => `<article class="tk2 glass tk2-h" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="tk2-l"><span class="tk2-code">${esc(t.code)}</span><span class="tk2-ic">${ICON(t.icon, t.accent)}</span></div><div class="tk2-m"><h3>${esc(t.name)} <i class="tk2-en">${esc(t.en)}</i></h3><p class="tk2-focus">${esc(t.focus)}</p></div><div class="tk2-pains">${t.pains.map((p) => `<span>${esc(p)}</span>`).join("")}</div><div class="tk2-r"><span class="tk2-mentor">主讲 · ${esc(t.mentor)}</span><a href="${esc(t.doc)}" target="_blank" rel="noopener">赛道讲解文档 ➔</a></div></article>`).join("");
    return `${pageHead("五大赛道", "只固定赛道，不固定题目 · 作品展厅按赛道呈现", "TRACKS")}<section class="container sec"><div class="tk2-grid horizontal">${cards}</div></section>`;
  }

  /* ---- 作品展厅（5 个对称一排，可点进详情）-------------------------- */
  function renderGallery() {
    const voted = votedTeam();
    const cards = D.teams.map((t) => {
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 34)).join("");
      const isVoted = voted === t.id;
      const btn = voted
        ? `<button class="gl2-vote ${isVoted ? "is-voted" : "dim"}" disabled>${isVoted ? "✓ 已投" : "已投票"}</button>`
        : `<button class="gl2-vote" data-vote="${t.id}">投票 ♥</button>`;
      const stack = (t.stack || []).map((s) => `<span>${esc(s)}</span>`).join("");
      return `<article class="gl2-card glass gl2-h ${isVoted ? "voted" : ""}" data-work="${t.id}" style="--accent:${t.accent};--rgb:${t.rgb}"><div class="gl2-shot"><span class="gl2-dots"></span><h3>${esc(t.project)}</h3><span class="gl2-bars"></span><span class="gl2-hover">点击查看作品详情 ➔</span></div><div class="gl2-mid"><div class="gl2-id"><b>${esc(t.name)}</b><span class="gl2-track2">${esc(t.trackCode)} · ${esc(t.track)}</span></div><p class="gl2-pitch">${esc(t.pitch || "")}</p><div class="gl2-stack2">${stack}</div><div class="gl2-avas">${avas}</div></div><div class="gl2-right"><div class="gl2-vcount"><b>${t.votes.toLocaleString()}</b><span>实时票数</span></div><span class="gl2-detail" data-work="${t.id}">查看详情 ➔</span>${btn}</div></article>`;
    }).join("");
    const banner = voted
      ? `<div class="vote-banner ok"><span class="live-dot"></span>感谢投票！你已为 <b>${esc((D.teams.find((t) => t.id === voted) || {}).name || "")}</b> 投出一票 — 一人一票。</div>`
      : `<div class="vote-banner"><span class="live-dot"></span>投票进行中 · 一人一票 · 点卡片看团队与作品详情，点「投票 ♥」支持团队。</div>`;
    return `${pageHead("作品展示大厅", "五支队伍 · 五大赛道 · 真实可运行作品", "GALLERY")}${banner}<section class="container sec"><div class="gl2-grid horizontal">${cards}</div></section>`;
  }

  /* ---- 作品详情 ------------------------------------------------------- */
  function renderWork(id) {
    const t = D.teams.find((x) => x.id === id);
    if (!t) return renderGallery();
    const voted = votedTeam();
    const isVoted = voted === t.id;
    const L = teamLinks(t);
    const people = [{ ...t.advisor, role: "技术顾问" }, ...t.members.map((m) => ({ ...m, role: "组员" }))]
      .map((p) => `<div class="wk-person">${avatar(p, 64, "ring")}<b>${esc(p.name)}</b><span>${esc(p.role)}</span></div>`).join("");
    const stack = (t.stack || []).map((s) => `<span>${esc(s)}</span>`).join("");
    const voteBtn = voted
      ? `<button class="btn-primary ${isVoted ? "" : "dim"}" disabled>${isVoted ? "✓ 已投此队" : "投票已用"}</button>`
      : `<button class="btn-primary" data-vote="${t.id}">为这支队伍投票 ♥</button>`;
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
          <div class="wk-sublinks"><a href="${L.gitlab}" target="_blank" rel="noopener">${ICON("code", "var(--neon)")}GitLab 仓库</a><a href="${L.video}" target="_blank" rel="noopener">${ICON("play", "var(--neon)")}演示视频</a></div>
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

  /* ---- 最终排行（仅公布后显示）-------------------------------------- */
  function renderResult(forcePreview) {
    if (PHASE !== "published" && !forcePreview) {
      return `${pageHead("最终排行", "综合得分 = 专家评审 70% + 大众投票赋分 30%", "RESULT")}
      <section class="container sec"><div class="rk-locked glass"><span class="rk-lock-ic">${ICON("lock", "var(--neon)")}</span><h2>结果待公布</h2><p>投票尚未结束，最终排行将在颁奖环节由现场统一揭晓。<br>当前请前往作品展厅，为你支持的团队投票。</p><div class="rk-locked-cta"><a class="btn-primary" data-nav="gallery">去作品展厅投票 ♥</a><button class="btn-ghost" data-preview="1">预览最终榜（演示）</button></div></div></section>`;
    }
    const ranked = D.computeRanking();
    const max = Math.max(...ranked.map((t) => t.total));
    const rows = ranked.map((t) => {
      const champ = t.rank === 1;
      const avas = [t.advisor, ...t.members].slice(0, 5).map((p) => avatar(p, 30)).join("");
      const scoreWidth = ((t.total / max) * 100).toFixed(2);
      const delay = (t.rank - 1) * 120;
      return `<div class="rk-row glass ${champ ? "champ" : ""}" style="--accent:${t.accent};--rgb:${t.rgb};--score-width:${scoreWidth}%;--rank-delay:${delay}ms"><span class="rk-no ${t.rank <= 3 ? "top" : ""}">${champ ? "★" : pad(t.rank)}</span><div class="rk-id"><b>${esc(t.name)}${champ ? '<i class="rk-crown">CHAMPION · 冠军</i>' : ""}</b><span>${esc(t.project)} · ${esc(t.track)}</span></div><div class="rk-avas">${avas}</div><div class="rk-bar"><span class="meter" style="--accent:${t.accent};--rgb:${t.rgb}"><i></i></span></div><div class="rk-mini"><span>专家 ${t.expert}</span><span>赋分 ${t.votePoint}</span></div><span class="rk-total">${t.total}</span></div>`;
    }).join("");
    return `${pageHead("最终排行 · GRAND PRIZE", "综合得分 = 专家评审 70% + 大众投票赋分 30%", "RESULT")}<section class="container sec result-sec"><div class="rk-list">${rows}</div></section>`;
  }

  /* =======================================================================
   *  SPA 控制
   * ===================================================================== */
  const VIEWS = [
    { key: "home", label: "首页", render: renderHome },
    { key: "people", label: "新生看板", render: renderPeople },
    { key: "tracks", label: "赛道", render: renderTracks },
    { key: "gallery", label: "作品展厅", render: renderGallery },
    { key: "result", label: "最终排行", render: () => renderResult(location.search.indexOf("preview") >= 0) },
    { key: "brief", label: "大赛介绍", render: renderBrief, hidden: true },
  ];

  const main = doc.getElementById("siteMain");
  const navLinks = doc.getElementById("navLinks");
  let rain = null;

  function setActive(key) {
    navLinks.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.nav === key));
    doc.body.dataset.view = key;
    navLinks.classList.remove("open");
    root.scrollTo({ top: 0, behavior: "auto" });
  }
  function go(key, push) {
    const v = VIEWS.find((x) => x.key === key) || VIEWS[0];
    main.innerHTML = v.render();
    setActive(v.key);
    if (v.key === "people") setupWall();
    if (push !== false && location.hash.slice(1) !== v.key) history.pushState(null, "", `#${v.key}`);
  }
  function showWork(id, push) {
    main.innerHTML = renderWork(id);
    setActive("gallery");
    setupCarousel();
    if (push !== false) history.pushState(null, "", `#work-${id}`);
  }
  function route(push) {
    const h = location.hash.slice(1);
    if (h.indexOf("work-") === 0) showWork(h.slice(5), false);
    else go(h || "home", false);
  }

  function toast(msg) {
    let t = doc.getElementById("siteToast");
    if (!t) { t = doc.createElement("div"); t.id = "siteToast"; t.className = "site-toast"; doc.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    root.clearTimeout(t._h); t._h = root.setTimeout(() => t.classList.remove("show"), 2600);
  }
  function castVote(id) {
    if (votedTeam()) return;
    const team = D.teams.find((t) => t.id === id); if (!team) return;
    team.votes += 1;
    root.localStorage.setItem(VOTE_KEY, id);
    toast(`已为「${team.name}」投票成功 ♥`);
    route();
  }

  function bind() {
    navLinks.innerHTML = VIEWS.filter((v) => !v.hidden).map((v) => `<a data-nav="${v.key}" href="#${v.key}">${v.label}</a>`).join("");
    doc.addEventListener("click", (e) => {
      const work = e.target.closest("[data-work]");
      const vote = e.target.closest("[data-vote]");
      const nav = e.target.closest("[data-nav]");
      const prev = e.target.closest("[data-preview]");
      if (vote) { castVote(vote.dataset.vote); return; }
      if (work) { showWork(work.dataset.work); return; }
      if (nav) { e.preventDefault(); go(nav.dataset.nav); return; }
      if (prev) { main.innerHTML = renderResult(true); setActive("result"); return; }
      if (e.target.closest("#navLogin")) { toast("登录后绑定角色（选手/评委/大众）— 演示版默认大众身份"); return; }
      if (e.target.closest("#navBurger")) { navLinks.classList.toggle("open"); return; }
    });
    root.addEventListener("hashchange", () => route(false));
    root.addEventListener("scroll", () => doc.getElementById("siteNav").classList.toggle("scrolled", root.scrollY > 20));
    root.addEventListener("resize", () => { rain && rain.resize(); if (doc.body.dataset.view === "people") renderWall(); });
  }

  function tick() { doc.querySelectorAll("[data-countdown]").forEach((el) => { let r = Math.max(0, (+el.dataset.remain || 0) - 1); el.dataset.remain = r; el.innerHTML = fmtHMS(r); }); }

  async function loadTrainees() {
    try { const r = await fetch("./data/trainees.json"); if (r.ok) TRAINEES = await r.json(); } catch (e) { TRAINEES = []; }
  }
  async function init() {
    if (root.CodeRain) { rain = root.CodeRain.createCodeRain(doc.getElementById("siteRain"), { glyphs: "010101AIJOINCARE{}[]<>".split(""), fontSize: 16, fade: "rgba(2,8,14,0.06)" }); rain.start(); }
    await loadTrainees();
    bind();
    route(false);
    root.setInterval(tick, 1000);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : globalThis, document);
