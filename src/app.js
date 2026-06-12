const fallbackTrainees = [
  {
    "id": "liang-xingye",
    "department": "AI战略办公室",
    "departmentEn": "AI STRATEGY",
    "name": "梁星野",
    "romanName": "Liang Xingye",
    "background": "管理科学 / AI 战略规划",
    "aiPartners": "ChatGPT / Perplexity / 飞书多维表格",
    "favoriteAI": "Perplexity",
    "aiProblem": "把跨部门信息自动整理成可追踪的行动计划",
    "aiPower": "把复杂议题拆成三步决策路径",
    "funFact": "做任何项目之前都会先画一张任务地图。",
    "photo": "./assets/trainees/liang-xingye/photo.png",
    "memeImage": "./assets/trainees/liang-xingye/meme.png",
    "memeText": "ALIGN FIRST",
    "portrait": "linear-gradient(145deg, #041311 0%, #0c6f5e 48%, #d5fff4 100%)"
  },
  {
    "id": "xu-zhixia",
    "department": "产品增长部",
    "departmentEn": "PRODUCT GROWTH",
    "name": "许知夏",
    "romanName": "Xu Zhixia",
    "background": "用户研究 / 增长产品",
    "aiPartners": "ChatGPT / Figma AI / Gamma",
    "favoriteAI": "Figma AI",
    "aiProblem": "把用户反馈快速转成产品机会点",
    "aiPower": "从一句吐槽里提炼出真实需求",
    "funFact": "看到按钮文案不顺会忍不住现场改三版。",
    "photo": "./assets/trainees/xu-zhixia/photo.png",
    "memeImage": "./assets/trainees/xu-zhixia/meme.png",
    "memeText": "ONE MORE VERSION",
    "portrait": "linear-gradient(145deg, #07111c 0%, #2368ff 48%, #bffcf0 100%)"
  },
  {
    "id": "chen-moyan",
    "department": "数据分析部",
    "departmentEn": "DATA ANALYTICS",
    "name": "陈墨言",
    "romanName": "Chen Moyan",
    "background": "统计学 / 商业分析",
    "aiPartners": "Excel Copilot / ChatGPT / Power BI",
    "favoriteAI": "Excel Copilot",
    "aiProblem": "自动识别经营数据异常并生成解释",
    "aiPower": "在一堆数字里最快找到关键波动",
    "funFact": "看到图表没有单位会立刻进入校对状态。",
    "photo": "./assets/trainees/chen-moyan/photo.png",
    "memeImage": "./assets/trainees/chen-moyan/meme.png",
    "memeText": "CHECK THE DATA",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)"
  },
  {
    "id": "lin-yuan",
    "department": "运营中台",
    "departmentEn": "OPERATIONS",
    "name": "林予安",
    "romanName": "Lin Yuan",
    "background": "内容运营 / 项目管理",
    "aiPartners": "豆包 / 飞书妙记 / ChatGPT",
    "favoriteAI": "飞书妙记",
    "aiProblem": "把会议、复盘和待办自动串成闭环",
    "aiPower": "把混乱现场整理成一页复盘",
    "funFact": "手机备忘录里常年有几十条活动标题。",
    "photo": "./assets/trainees/lin-yuan/photo.png",
    "memeImage": "./assets/trainees/lin-yuan/meme.png",
    "memeText": "MAKE IT A FLOW",
    "portrait": "linear-gradient(145deg, #101712 0%, #2fb879 48%, #f4ff80 100%)"
  },
  {
    "id": "zhou-cheng",
    "department": "供应链部",
    "departmentEn": "SUPPLY CHAIN",
    "name": "周澄",
    "romanName": "Zhou Cheng",
    "background": "供应链管理 / 流程优化",
    "aiPartners": "ChatGPT / 飞书多维表格 / Notion AI",
    "favoriteAI": "飞书多维表格",
    "aiProblem": "预测库存风险并提前提示处理方案",
    "aiPower": "把长流程拆成可检查节点",
    "funFact": "整理行李也会按流程图来分区。",
    "photo": "./assets/trainees/zhou-cheng/photo.png",
    "memeImage": "./assets/trainees/zhou-cheng/meme.png",
    "memeText": "TRACK EVERYTHING",
    "portrait": "linear-gradient(145deg, #061817 0%, #0d8b7b 48%, #e7fff7 100%)"
  },
  {
    "id": "jasper",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "贾博深",
    "romanName": "Jasper",
    "background": "AI 技术研发 / 产品创新",
    "aiPartners": "Cursor / Claude / ChatGPT",
    "favoriteAI": "Cursor",
    "aiProblem": "跨部门系统级 AI 落地与场景探索",
    "aiPower": "将业务创意快速转化为高保真交互 Demo",
    "funFact": "写代码比咖啡更能让他提神。",
    "photo": "./assets/trainees/jasper/photo.png",
    "memeImage": "./assets/trainees/jasper/meme.png",
    "memeText": "OK, LET'S CODE",
    "portrait": "linear-gradient(145deg, #0a0f1f 0%, #1f68ff 48%, #29ffc9 100%)"
  },
  {
    "id": "tang-yu",
    "department": "人力发展部",
    "departmentEn": "TALENT",
    "name": "唐屿",
    "romanName": "Tang Yu",
    "background": "组织发展 / 人才培养",
    "aiPartners": "ChatGPT / Notion AI / 飞书文档",
    "favoriteAI": "Notion AI",
    "aiProblem": "把培训反馈自动沉淀成人才成长画像",
    "aiPower": "从一段自我介绍里抓到三个关键词",
    "funFact": "朋友聚会时经常被默认安排做主持。",
    "photo": "./assets/trainees/tang-yu/photo.png",
    "memeImage": "./assets/trainees/tang-yu/meme.png",
    "memeText": "TELL ME MORE",
    "portrait": "linear-gradient(145deg, #06140f 0%, #3f7a6d 48%, #d9ffee 100%)"
  },
  {
    "id": "ye-nanqiao",
    "department": "财务共享部",
    "departmentEn": "FINANCE",
    "name": "叶南乔",
    "romanName": "Ye Nanqiao",
    "background": "财务管理 / 经营预算",
    "aiPartners": "Excel Copilot / ChatGPT / Power BI",
    "favoriteAI": "Power BI",
    "aiProblem": "把月度预算偏差自动解释清楚",
    "aiPower": "把复杂报表翻译成业务听得懂的话",
    "funFact": "看到总数对不上会自动开启侦探模式。",
    "photo": "./assets/trainees/ye-nanqiao/photo.png",
    "memeImage": "./assets/trainees/ye-nanqiao/meme.png",
    "memeText": "SUM AGAIN",
    "portrait": "linear-gradient(145deg, #10120a 0%, #9ca400 48%, #f7ff9e 100%)"
  },
  {
    "id": "gu-bai",
    "department": "法务合规部",
    "departmentEn": "LEGAL",
    "name": "顾白",
    "romanName": "Gu Bai",
    "background": "法律合规 / 合同审核",
    "aiPartners": "ChatGPT / 通义法睿 / 飞书文档",
    "favoriteAI": "通义法睿",
    "aiProblem": "自动识别合同高风险条款并给出提示",
    "aiPower": "快速定位一句话里的隐藏风险",
    "funFact": "看推理小说会先猜作者埋的法律漏洞。",
    "photo": "./assets/trainees/gu-bai/photo.png",
    "memeImage": "./assets/trainees/gu-bai/meme.png",
    "memeText": "READ THE TERMS",
    "portrait": "linear-gradient(145deg, #050a0d 0%, #28423d 48%, #dfffee 100%)"
  },
  {
    "id": "song-yining",
    "department": "客户成功部",
    "departmentEn": "CUSTOMER SUCCESS",
    "name": "宋以宁",
    "romanName": "Song Yining",
    "background": "服务体验 / 客户运营",
    "aiPartners": "ChatGPT / 飞书知识库 / Zendesk AI",
    "favoriteAI": "飞书知识库",
    "aiProblem": "把客户问题归类并生成高频答复",
    "aiPower": "把复杂诉求拆成可处理工单",
    "funFact": "能用很平静的语气处理连续十个紧急问题。",
    "photo": "./assets/trainees/song-yining/photo.png",
    "memeImage": "./assets/trainees/song-yining/meme.png",
    "memeText": "CASE CLOSED",
    "portrait": "linear-gradient(145deg, #061817 0%, #117f98 48%, #c8fff4 100%)"
  },
  {
    "id": "he-qingyue",
    "department": "信息技术部",
    "departmentEn": "IT",
    "name": "何清越",
    "romanName": "He Qingyue",
    "background": "前端工程 / 数据可视化",
    "aiPartners": "Cursor / GitHub Copilot / ChatGPT",
    "favoriteAI": "Cursor",
    "aiProblem": "把重复页面搭建和接口联调自动化",
    "aiPower": "把重复代码抽成清晰组件",
    "funFact": "曾经高强度 coding 让编辑器插件直接崩掉。",
    "photo": "./assets/trainees/he-qingyue/photo.png",
    "memeImage": "./assets/trainees/he-qingyue/meme.png",
    "memeText": "SHIP THE FIX",
    "portrait": "linear-gradient(145deg, #03080c 0%, #26323f 48%, #38f5c8 100%)"
  },
  {
    "id": "wen-ruolan",
    "department": "研发创新部",
    "departmentEn": "R&D",
    "name": "温若澜",
    "romanName": "Wen Ruolan",
    "background": "生命科学 / 创新项目管理",
    "aiPartners": "ChatGPT / Claude / Elicit",
    "favoriteAI": "Elicit",
    "aiProblem": "快速整理论文线索和研发假设",
    "aiPower": "把研究材料压缩成可讨论的实验问题",
    "funFact": "看到咖啡和文献会自动进入专注状态。",
    "photo": "./assets/trainees/wen-ruolan/photo.png",
    "memeImage": "./assets/trainees/wen-ruolan/meme.png",
    "memeText": "HYPOTHESIS READY",
    "portrait": "linear-gradient(145deg, #050d12 0%, #255d76 48%, #bffff5 100%)"
  }
];

const libraryA = [
  "咖啡",
  "奶茶",
  "火锅",
  "烧烤",
  "螺蛳粉",
  "蛋糕",
  "冰淇淋",
  "外卖",
  "周末",
  "假期",
  "旅行",
  "自拍",
  "露营",
  "健身房",
  "演唱会",
  "电影院",
  "游戏",
  "直播",
  "摸鱼",
  "社恐",
  "社牛",
  "熬夜",
  "逆袭"
];

const libraryB = [
  "AI",
  "Agent",
  "Prompt",
  "大模型",
  "智能体",
  "自动化",
  "数据",
  "算法",
  "开挂",
  "玄学",
  "穿越",
  "平行宇宙",
  "时光机",
  "超能力",
  "机器人",
  "Bug"
];

let traineeState = fallbackTrainees.map(window.AppLogic.normalizeTrainee);
let selectedId = traineeState[0].id;
let currentKeywords = [];
let drawStage = 0; // 0: not drawn, 1: A drawn, 2: both A and B drawn
let keywordDrawTimer = null;
let appView = "intro";
let profileMediaMode = "photo";
let introTimer = null;
let introExitTimer = null;
let isIntroExiting = false;

const introTiming = window.AppLogic.getIntroTiming();
const INTRO_HOLD_MS = introTiming.holdMs;
const INTRO_EXIT_MS = introTiming.exitMs;

const appShell = document.querySelector(".app-shell");
const introStage = document.getElementById("introStage");
const landingStage = document.getElementById("landingStage");
const personaWallStage = document.getElementById("personaWallStage");
const photoWall = document.getElementById("photoWall");
const detailLayer = document.getElementById("detailLayer");
const challengeLayer = document.getElementById("challengeLayer");
const drawCard = document.querySelector(".draw-card");
const profileConsole = document.querySelector(".profile-console");
const challengeShell = document.querySelector(".challenge-shell");
const challengeSlot = document.getElementById("challengeSlot");
const cloudWords = document.getElementById("cloudWords");
const hostForm = document.getElementById("hostForm");
const sentenceInput = document.getElementById("sentenceInput");
const drawWordsButton = document.getElementById("drawWordsButton");
const redrawWordsButton = document.getElementById("redrawWordsButton");
const discoverButton = document.getElementById("discoverButton");
const discoverMenu = document.getElementById("discoverMenu");
const discoverPanel = document.getElementById("discoverPanel");

const rainRenderers = {
  intro: createRain("introRain", { fontSize: 17, density: 0.78, fade: "rgba(2, 8, 14, 0.08)" }),
  home: createRain("landingRain", { fontSize: 17, density: 0.78, fade: "rgba(2, 8, 14, 0.04)" }),
  wall: createRain("wallRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.04)" }),
  detail: createRain("detailRain", { fontSize: 16, fade: "rgba(2, 8, 14, 0.05)" }),
  challenge: createRain("challengeRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.05)" }),
  discover: createRain("discoverRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.04)" }),
};

const discoverParticles = typeof window.createParticles === "function"
  ? window.createParticles("discoverParticles", {
      count: 100,
      colors: [
        "rgba(255, 255, 255, 0.75)",
        "rgba(40, 255, 200, 0.65)",
        "rgba(103, 80, 255, 0.6)",
        "rgba(167, 255, 79, 0.6)"
      ]
    })
  : null;


const viewStages = {
  intro: introStage,
  home: landingStage,
  wall: personaWallStage,
  discover: document.getElementById("discoverStage"),
};

function createRain(id, options) {
  if (!window.CodeRain) return null;
  return window.CodeRain.createCodeRain(document.getElementById(id), {
    glyphs: "010101AIJOINCARE{}[]<>".split(""),
    ...options,
  });
}

function setStageActive(stage, isActive) {
  stage.hidden = !isActive;
  stage.style.display = isActive ? "" : "none";
  stage.style.opacity = isActive ? "1" : "0";
  stage.style.visibility = isActive ? "visible" : "hidden";
  stage.style.pointerEvents = isActive ? "auto" : "none";
}

function forceStagePaint(stage) {
  void stage.offsetHeight;
}

function syncStages(view) {
  setStageActive(viewStages.intro, view === "intro");
  setStageActive(viewStages.home, view === "home");
  setStageActive(viewStages.wall, ["wall", "detail", "challenge"].includes(view));
  setStageActive(viewStages.discover, view === "discover");
}

function syncRain(view) {
  const activeKeys = new Set(
    view === "intro"
      ? ["intro"]
      : view === "home"
        ? ["home"]
        : view === "detail"
          ? ["detail"]
          : view === "challenge"
            ? ["challenge"]
            : view === "discover"
              ? ["discover"]
              : ["wall"]
  );

  Object.entries(rainRenderers).forEach(([key, rain]) => {
    if (!rain) return;
    if (activeKeys.has(key)) {
      rain.resize();
      rain.start();
    } else {
      rain.stop();
    }
  });
}

function syncParticles(view) {
  if (!discoverParticles) return;
  if (view === "discover") {
    discoverParticles.start();
  } else {
    discoverParticles.stop();
  }
}

function startIntroExit(skipped = false) {
  if (isIntroExiting) return;
  isIntroExiting = true;
  window.clearTimeout(introTimer);
  window.clearTimeout(introExitTimer);

  appView = "home";
  setStageActive(landingStage, true);
  landingStage.style.opacity = "0";
  landingStage.style.pointerEvents = "none";
  introStage.style.pointerEvents = "none";

  appShell.dataset.view = "intro-exit";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add("view-intro-exit");

  rainRenderers.home?.resize();
  rainRenderers.home?.start();

  forceStagePaint(landingStage);
  introStage.style.opacity = "0";
  landingStage.style.opacity = "1";

  introExitTimer = window.setTimeout(() => {
    isIntroExiting = false;
    setView(window.AppLogic.nextIntroState({ skipped }));
  }, INTRO_EXIT_MS);
}

function syncDetailMotion(isOpen) {
  drawCard.style.transform = isOpen ? "translate(0, -50%) rotate(-4deg)" : "translate(-120px, -50%) rotate(-4deg)";
  drawCard.style.opacity = isOpen ? "1" : "0";
  profileConsole.style.transform = isOpen ? "translateX(0)" : "translateX(12%)";
}

function syncChallengeMotion(isOpen) {
  challengeShell.style.transform = isOpen ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -46%) scale(0.98)";
}

function selectedTrainee() {
  return traineeState.find((trainee) => trainee.id === selectedId) || traineeState[0];
}

function setView(view) {
  appView = view;
  appShell.dataset.view = view;
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add(`view-${view}`);
  syncStages(view);

  if (view === "home" || view === "wall") {
    detailLayer.classList.remove("is-open");
    detailLayer.setAttribute("aria-hidden", "true");
  }

  syncRain(view);
  syncParticles(view);
  discoverPanel.classList.remove("is-visible");
}

function cssUrl(path) {
  return path ? `url('${String(path).replaceAll("'", "\\'")}')` : "none";
}

function setPortrait(element, trainee) {
  element.style.setProperty("--portrait", trainee.portrait);
}

function setMediaBackground(element, imagePath, trainee) {
  setPortrait(element, trainee);
  element.style.setProperty("--media-image", cssUrl(imagePath));
}

function getArcStyle(layoutItem) {
  return [
    `--arc-x: ${layoutItem.x}px`,
    `--arc-lift: ${layoutItem.lift}px`,
    `--arc-rot: ${layoutItem.rotation}`,
    `--arc-yaw: ${layoutItem.rotation * 1.65}`,
    `--arc-z: ${layoutItem.zIndex}`,
    `--arc-scale: ${layoutItem.scale}`,
  ].join("; ");
}

function renderPhotoWall() {
  const metrics = window.AppLogic.computePhotoWallMetrics({
    total: traineeState.length,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
  const arcLayout = window.AppLogic.computeArcLayout(traineeState.length, {
    step: metrics.step,
    maxLift: metrics.maxLift,
    maxRotation: metrics.maxRotation,
    splitGap: metrics.splitGap,
  });

  photoWall.style.setProperty("--card-width", `${metrics.cardWidth}px`);
  photoWall.style.setProperty("--card-height", `${metrics.cardHeight}px`);
  photoWall.style.setProperty("--card-gap", `${metrics.cardGap}px`);
  photoWall.style.setProperty("--card-padding", `${metrics.cardPadding}px`);
  photoWall.style.setProperty("--meta-height", `${metrics.metaHeight}px`);
  photoWall.style.setProperty("--portrait-height", `${metrics.portraitHeight}px`);
  photoWall.style.setProperty("--wall-visual-width", `${metrics.visualWidth}px`);
  photoWall.style.setProperty("--dock-influence", metrics.dockInfluence);

  const cardsHtml = traineeState
    .map((trainee, index) => {
      const arcStyle = getArcStyle(arcLayout[index]);

      return `
        <button class="profile-card" type="button" data-id="${trainee.id}" aria-label="${trainee.department}${trainee.name}" style="${arcStyle}">
          <div class="portrait-frame" style="--portrait: ${trainee.portrait}; --media-image: ${cssUrl(trainee.photo)}"></div>
          <div class="profile-meta">
            <span class="profile-name">${trainee.name}</span>
            <span class="profile-department">${trainee.department}</span>
          </div>
        </button>
      `;
    })
    .join("");

  const svgWidth = metrics.visualWidth;
  const svgHeight = 220;

  const points = arcLayout.map((layoutItem) => {
    const x = svgWidth / 2 + layoutItem.x;
    const y = svgHeight + layoutItem.lift + 18;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  const svgHtml = `
    <svg class="photo-wall-svg" style="--svg-width: ${svgWidth}px; --svg-height: ${svgHeight}px;" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <path d="${pathD}" />
    </svg>
  `;

  photoWall.innerHTML = cardsHtml + svgHtml;
}

function resetDock() {
  const cards = Array.from(photoWall.querySelectorAll(".profile-card"));
  cards.forEach((card) => {
    card.classList.remove("is-active");
    card.style.setProperty("--scale", "1");
    card.style.setProperty("--shift-x", "0px");
    card.style.setProperty("--lift", "0px");
    card.style.setProperty("--alpha", "0.94");
  });
}

function updateDock(pointerX) {
  const cards = Array.from(photoWall.querySelectorAll(".profile-card"));
  const centers = cards.map((card) => {
    const rect = card.getBoundingClientRect();
    return rect.left + rect.width / 2;
  });

  const transforms = window.AppLogic.computeDockTransforms({
    centers,
    pointerX,
    maxInfluence: Number(photoWall.style.getPropertyValue("--dock-influence")) || 260,
  });

  cards.forEach((card, index) => {
    const transform = transforms[index];
    card.classList.toggle("is-active", transform.isActive);
    card.style.setProperty("--scale", transform.scale);
    card.style.setProperty("--shift-x", `${transform.translateX}px`);
    card.style.setProperty("--lift", `${transform.lift}px`);
    card.style.setProperty("--alpha", transform.opacity);
  });
}

function renderProfileMedia(trainee) {
  const selectedPhoto = document.getElementById("selectedPhoto");
  const mediaFrame = document.getElementById("profileMediaFrame");
  const photoToggleButton = document.getElementById("photoToggleButton");

  setMediaBackground(selectedPhoto, trainee.photo, trainee);
  setMediaBackground(mediaFrame, profileMediaMode === "photo" ? trainee.photo : trainee.memeImage, trainee);
  mediaFrame.dataset.mode = profileMediaMode;
  mediaFrame.dataset.fallbackText = trainee.meme;
  photoToggleButton.textContent = profileMediaMode === "photo" ? "PHOTO" : "MEME";
}

function renderChallengeSlot(trainee) {
  if (trainee.sentence) {
    challengeSlot.innerHTML = `
      <div class="sentence-card" role="textbox" aria-readonly="true">
        <span class="sentence-tag">[ DIGITAL RECORD ]</span>
        <p class="sentence-text">${trainee.sentence}</p>
        <button class="sentence-edit-btn" type="button" id="editChallenge" aria-label="编辑或重抽">EDIT</button>
      </div>
    `;
    document.getElementById("editChallenge").addEventListener("click", openChallenge);
    return;
  }

  challengeSlot.innerHTML = `<button class="blind-box-button" type="button" id="openChallenge">MY DIGITAL BLIND BOX</button>`;
  document.getElementById("openChallenge").addEventListener("click", openChallenge);
}

function renderDetail() {
  const trainee = selectedTrainee();
  const selectedIndex = traineeState.findIndex((item) => item.id === trainee.id) + 1;

  document.getElementById("detailIndex").textContent = `CARD ${String(selectedIndex).padStart(2, "0")} / 12`;
  document.getElementById("selectedDepartment").textContent = trainee.department;
  document.getElementById("selectedName").textContent = trainee.name;
  document.getElementById("detailDepartment").textContent = "INFO";
  document.getElementById("detailName").textContent = trainee.romanName;
  document.getElementById("detailBackground").textContent = trainee.background;
  document.getElementById("detailTools").textContent = trainee.tools;
  document.getElementById("detailFavoriteTool").textContent = trainee.favoriteTool;
  document.getElementById("detailProblem").textContent = trainee.problem;
  document.getElementById("detailPower").textContent = trainee.aiPower;
  document.getElementById("detailFunFact").textContent = trainee.funFact;
  document.getElementById("memeText").textContent = trainee.meme;
  document.getElementById("challengeMember").textContent = `${trainee.department} · ${trainee.name}`;
  renderProfileMedia(trainee);
  renderChallengeSlot(trainee);
}

function switchAdjacentProfile(direction) {
  selectedId = window.AppLogic.resolveAdjacentTraineeId(traineeState, selectedId, direction);
  profileMediaMode = "photo";
  renderDetail();
}

function openDetail(id) {
  selectedId = id;
  profileMediaMode = "photo";
  renderDetail();
  syncStages("detail");
  syncRain("detail");
  detailLayer.classList.add("is-open");
  detailLayer.setAttribute("aria-hidden", "false");
  syncDetailMotion(true);
  appShell.dataset.view = "detail";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add("view-detail");
}

function closeDetail() {
  syncDetailMotion(false);
  detailLayer.classList.remove("is-open");
  detailLayer.setAttribute("aria-hidden", "true");
  appShell.dataset.view = appView === "home" ? "home" : "wall";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add(appView === "home" ? "view-home" : "view-wall");
  syncStages(appView === "home" ? "home" : "wall");
  syncRain(appView === "home" ? "home" : "wall");
}

function renderCloudWords(words = []) {
  const wordAEl = document.getElementById("cloudWordA");
  const wordBEl = document.getElementById("cloudWordB");
  if (!wordAEl || !wordBEl) return;

  if (words.length >= 1) {
    wordAEl.textContent = words[0];
    wordAEl.classList.add("is-visible");
  } else {
    wordAEl.textContent = "";
    wordAEl.classList.remove("is-visible");
  }

  if (words.length >= 2) {
    wordBEl.textContent = words[1];
    wordBEl.classList.add("is-visible");
  } else {
    wordBEl.textContent = "";
    wordBEl.classList.remove("is-visible");
  }
}

function drawKeywords() {
  window.clearTimeout(keywordDrawTimer);

  if (drawStage === 2) {
    drawStage = 0;
  }

  challengeLayer.classList.add("is-drawing");
  drawWordsButton.disabled = true;
  redrawWordsButton.disabled = true;

  const trainee = selectedTrainee();
  const salt = Date.now() + trainee.previousPairs.length;

  if (drawStage === 0) {
    renderCloudWords([]);
    const chosenPair = window.AppLogic.pickKeywordPairAB(
      libraryA,
      libraryB,
      trainee.previousPairs,
      salt
    );
    currentKeywords = chosenPair;

    keywordDrawTimer = window.setTimeout(() => {
      renderCloudWords([currentKeywords[0]]);
      challengeLayer.classList.remove("is-drawing");
      drawWordsButton.disabled = false;
      redrawWordsButton.disabled = false;
      drawStage = 1;
    }, 1000);
  } else if (drawStage === 1) {
    renderCloudWords([currentKeywords[0]]);

    keywordDrawTimer = window.setTimeout(() => {
      renderCloudWords(currentKeywords);
      trainee.previousPairs = [...trainee.previousPairs, currentKeywords];
      challengeLayer.classList.remove("is-drawing");
      drawWordsButton.disabled = false;
      redrawWordsButton.disabled = false;
      drawStage = 2;
      sentenceInput.focus();
    }, 1000);
  }
}

function openChallenge() {
  const trainee = selectedTrainee();
  sentenceInput.value = trainee.sentence || "";
  syncStages("challenge");
  syncRain("challenge");
  challengeLayer.classList.add("is-open");
  challengeLayer.setAttribute("aria-hidden", "false");
  syncChallengeMotion(true);
  appShell.dataset.view = "challenge";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add("view-challenge");

  if (trainee.previousPairs.length > 0) {
    currentKeywords = trainee.previousPairs[trainee.previousPairs.length - 1];
    renderCloudWords(currentKeywords);
    drawStage = 2;
    sentenceInput.focus();
  } else {
    currentKeywords = [];
    renderCloudWords([]);
    drawStage = 0;
  }
}

function closeChallenge() {
  window.clearTimeout(keywordDrawTimer);
  challengeLayer.classList.remove("is-drawing");
  syncChallengeMotion(false);
  challengeLayer.classList.remove("is-open");
  challengeLayer.setAttribute("aria-hidden", "true");
  drawWordsButton.disabled = false;
  redrawWordsButton.disabled = false;
  appShell.dataset.view = "detail";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-wall", "view-detail", "view-challenge", "view-discover");
  appShell.classList.add("view-detail");
  syncStages("detail");
  syncRain("detail");
}

function renderDiscoverPanel(target) {
  const resolvedTarget = window.AppLogic.resolveDiscoverTarget(target);
  const panels = {
    awards: {
      title: "Demo & Awards",
      body: "每组展示一段可运行 Demo 或流程样机，评委从业务价值、AI 使用深度、表达完成度三个维度打分。",
    },
    home: {
      title: "Discover More",
      body: "选择一个模块查看活动流程。",
    },
  };
  const panel = panels[resolvedTarget] || panels.home;

  discoverPanel.classList.add("is-visible");
  discoverPanel.innerHTML = `
    <button class="discover-close-btn" type="button" id="closeDiscoverPanel" aria-label="关闭">×</button>
    <strong>${panel.title}</strong>
    <p>${panel.body}</p>
  `;
  discoverMenu.classList.remove("is-open");
  discoverButton.setAttribute("aria-expanded", "false");
}

function bindEvents() {
  document.getElementById("skipIntroButton").addEventListener("click", () => {
    startIntroExit(true);
  });

  document.getElementById("backdropToggleBtn").addEventListener("click", () => {
    landingStage.classList.toggle("backdrop-mode");
  });

  document.getElementById("enterButton").addEventListener("click", () => {
    setView("wall");
  });

  discoverButton.addEventListener("click", () => {
    const isOpen = discoverMenu.classList.toggle("is-open");
    discoverButton.setAttribute("aria-expanded", String(isOpen));
  });

  photoWall.addEventListener("pointermove", (event) => {
    updateDock(event.clientX);
  });

  photoWall.addEventListener("pointerleave", resetDock);

  photoWall.addEventListener("click", (event) => {
    const card = event.target.closest(".profile-card");
    if (!card) return;
    openDetail(card.dataset.id);
  });

  document.getElementById("photoToggleButton").addEventListener("click", () => {
    profileMediaMode = window.AppLogic.toggleProfileMedia(profileMediaMode);
    renderProfileMedia(selectedTrainee());
  });

  document.addEventListener("click", (event) => {
    if (event.target.id === "closeDiscoverPanel") {
      discoverPanel.classList.remove("is-visible");
      return;
    }

    if (discoverPanel.classList.contains("is-visible")) {
      const isPanelClick = discoverPanel.contains(event.target);
      const isDiscoverTrigger = event.target.closest("#discoverButton") || event.target.closest("#discoverMenu") || event.target.closest("[data-discover-target]");
      if (!isPanelClick && !isDiscoverTrigger) {
        discoverPanel.classList.remove("is-visible");
      }
    }

    const action = event.target.dataset.action;
    const profileNavDirection = event.target.closest("[data-profile-nav]")?.dataset.profileNav;
    const viewTarget = event.target.dataset.viewTarget;
    const discoverTarget = event.target.dataset.discoverTarget;

    if (profileNavDirection && detailLayer.classList.contains("is-open")) {
      switchAdjacentProfile(profileNavDirection);
      return;
    }
    if (action === "close") {
      closeDetail();
    }
    if (action === "back-detail") {
      closeChallenge();
    }
    if (viewTarget) {
      window.clearTimeout(introTimer);
      window.clearTimeout(introExitTimer);
      setView(viewTarget);
    }
    if (discoverTarget) {
      renderDiscoverPanel(discoverTarget);
    }
  });

  drawWordsButton.addEventListener("click", drawKeywords);
  redrawWordsButton.addEventListener("click", drawKeywords);

  hostForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const sentence = sentenceInput.value.trim();
    if (!sentence) {
      sentenceInput.focus();
      return;
    }

    traineeState = window.AppLogic.updateSentence(traineeState, selectedId, sentence);
    closeChallenge();
    renderDetail();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (challengeLayer.classList.contains("is-open")) {
      closeChallenge();
      return;
    }
    if (detailLayer.classList.contains("is-open")) {
      closeDetail();
    }
  });

  // 3D Card Hover Tilting & Gloss Effects
  const deptCards = document.querySelectorAll(".dept-card");
  deptCards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const width = rect.width;
      const height = rect.height;

      const px = (x / width) * 100;
      const py = (y / height) * 100;

      card.style.setProperty("--mouse-x", `${px}%`);
      card.style.setProperty("--mouse-y", `${py}%`);

      const rotateX = ((y / height) - 0.5) * -12;
      const rotateY = ((x / width) - 0.5) * 12;

      card.style.transition = "none";
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform 450ms cubic-bezier(0.16, 1, 0.3, 1), border-color 300ms ease, box-shadow 300ms ease";
      card.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  });

  window.addEventListener("resize", () => {
    renderPhotoWall();
    resetDock();
    Object.values(rainRenderers).forEach((rain) => rain?.resize());
    discoverParticles?.resize();
  });
}

async function initApp() {
  appShell.classList.add("view-intro");
  appShell.style.setProperty("--intro-hold-duration", `${INTRO_HOLD_MS}ms`);
  appShell.style.setProperty("--intro-exit-duration", `${INTRO_EXIT_MS}ms`);
  syncStages("intro");
  bindEvents();
  syncRain("intro");
  syncParticles("intro");
  renderPhotoWall();
  resetDock();
  introTimer = window.setTimeout(() => {
    startIntroExit(false);
  }, INTRO_HOLD_MS);

  traineeState = await window.AppData.loadTrainees(fallbackTrainees);
  selectedId = traineeState[0]?.id || "";
  renderPhotoWall();
  resetDock();
}

initApp();
