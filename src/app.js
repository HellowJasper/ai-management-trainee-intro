const trainees = [
  {
    id: "xu-ran",
    department: "战略部",
    departmentEn: "STRATEGY",
    name: "许然",
    romanName: "Xu Ran",
    background: "AI 产品策略 / 用户研究",
    tools: "ChatGPT / Gamma / 飞书多维表格",
    problem: "会议纪要自动归纳与跨部门追踪",
    tags: "重度咖啡 / City Walk / PPT 整洁强迫症",
    meme: "OK, SHIP",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #fc5000 46%, #d8d3c7 100%)",
  },
  {
    id: "chen-yi",
    department: "产品部",
    departmentEn: "PRODUCT",
    name: "陈一",
    romanName: "Chen Yi",
    background: "交互设计 / 增长产品",
    tools: "Cursor / ChatGPT / Figma AI",
    problem: "把零散用户反馈转成清晰需求池",
    tags: "夜跑 / 手冲入门 / 需求表洁癖",
    meme: "LET IT COOK",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #d9d3c6 45%, #524ae9 100%)",
  },
  {
    id: "zhou-ning",
    department: "运营部",
    departmentEn: "OPS",
    name: "周宁",
    romanName: "Zhou Ning",
    background: "内容运营 / 活动策划",
    tools: "豆包 / 即梦 / ChatGPT",
    problem: "自动拆解活动复盘和增长动作",
    tags: "展览爱好者 / 重度便签用户 / 早 C 晚 A",
    meme: "NO PANIC",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #f5f28e 38%, #c6c1b6 100%)",
  },
  {
    id: "lin-che",
    department: "技术部",
    departmentEn: "TECH",
    name: "林澈",
    romanName: "Lin Che",
    background: "前端工程 / 数据可视化",
    tools: "Cursor / Claude Code / GitHub Copilot",
    problem: "重复页面搭建和接口联调自动化",
    tags: "键盘收集 / 编辑器主题党 / 篮球",
    meme: "BUILD FIX",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #d0ccc1 44%, #070607 100%)",
  },
  {
    id: "song-lan",
    department: "人力部",
    departmentEn: "HR",
    name: "宋岚",
    romanName: "Song Lan",
    background: "组织发展 / 招聘运营",
    tools: "Notion AI / ChatGPT / 飞书妙记",
    problem: "候选人信息整理和面试纪要沉淀",
    tags: "心理学播客 / 轻徒步 / Excel 快捷键",
    meme: "ALIGN?",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #e2e2df 45%, #524ae9 100%)",
  },
  {
    id: "he-xu",
    department: "算法部",
    departmentEn: "ALGORITHM",
    name: "何序",
    romanName: "He Xu",
    background: "机器学习 / 推荐系统",
    tools: "Python / ChatGPT / Cursor",
    problem: "实验报告自动生成与指标解释",
    tags: "重度咖啡 / 数学冷笑话 / 周末跑山",
    meme: "LOSS DOWN",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #ded9ca 42%, #070607 100%)",
  },
  {
    id: "ye-qing",
    department: "财务部",
    departmentEn: "FINANCE",
    name: "叶青",
    romanName: "Ye Qing",
    background: "财务分析 / 经营预算",
    tools: "Excel Copilot / ChatGPT / Power BI",
    problem: "月度经营数据解释和异常识别",
    tags: "咖啡拉花 / 数字敏感 / 城市骑行",
    meme: "CHECK SUM",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #f5f28e 45%, #706b62 100%)",
  },
  {
    id: "gu-an",
    department: "市场部",
    departmentEn: "MARKETING",
    name: "顾安",
    romanName: "Gu An",
    background: "品牌传播 / 社媒增长",
    tools: "Midjourney / 即梦 / ChatGPT",
    problem: "热点趋势提炼和内容脚本生成",
    tags: "胶片相机 / 话题雷达 / 周末看展",
    meme: "VIRAL?",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #fc5000 42%, #524ae9 100%)",
  },
  {
    id: "tang-yu",
    department: "客服部",
    departmentEn: "SERVICE",
    name: "唐予",
    romanName: "Tang Yu",
    background: "客户成功 / 服务体验",
    tools: "ChatGPT / 飞书知识库 / Zendesk AI",
    problem: "客户问题归类和高频答复生成",
    tags: "猫系耐心 / 奶茶少冰 / 复盘控",
    meme: "SOLVED",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #e2e2df 46%, #fc5000 100%)",
  },
  {
    id: "shen-zhou",
    department: "销售部",
    departmentEn: "SALES",
    name: "沈舟",
    romanName: "Shen Zhou",
    background: "行业销售 / 大客户拓展",
    tools: "ChatGPT / Perplexity / CRM AI",
    problem: "客户背景调研和拜访纪要跟进",
    tags: "路演体质 / 足球 / 语速管理中",
    meme: "DEAL?",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #fc5000 40%, #070607 100%)",
  },
  {
    id: "lu-xing",
    department: "品牌部",
    departmentEn: "BRAND",
    name: "陆星",
    romanName: "Lu Xing",
    background: "视觉品牌 / 内容策划",
    tools: "Figma AI / Midjourney / ChatGPT",
    problem: "统一视觉资产和多版本文案延展",
    tags: "字体收藏 / 黑胶 / 海报墙维护者",
    meme: "MAKE POP",
    portrait: "linear-gradient(145deg, #f7f6f2 0%, #524ae9 42%, #070607 100%)",
  },
  {
    id: "wen-yue",
    department: "法务部",
    departmentEn: "LEGAL",
    name: "温悦",
    romanName: "Wen Yue",
    background: "合同审核 / 合规管理",
    tools: "ChatGPT / 通义法睿 / 飞书文档",
    problem: "合同风险点初筛和条款对比",
    tags: "推理小说 / 低糖主义 / 条款高亮达人",
    meme: "OBJECTION",
    portrait: "linear-gradient(145deg, #fffef5 0%, #d8d6ca 44%, #3c3b36 100%)",
  },
];

const keywordBank = [
  "咖啡",
  "自动化",
  "提示词",
  "会议纪要",
  "灵感",
  "复盘",
  "效率",
  "表情包",
  "协作",
  "周一",
  "模型",
  "入职",
];

let traineeState = trainees.map((trainee) => ({
  ...trainee,
  sentence: "",
  previousPairs: [],
}));

let selectedId = traineeState[0].id;
let currentKeywords = [];
let keywordDrawTimer = null;

const photoWall = document.getElementById("photoWall");
const detailLayer = document.getElementById("detailLayer");
const challengeLayer = document.getElementById("challengeLayer");
const challengeSlot = document.getElementById("challengeSlot");
const cloudWords = document.getElementById("cloudWords");
const hostForm = document.getElementById("hostForm");
const sentenceInput = document.getElementById("sentenceInput");
const drawWordsButton = document.getElementById("drawWordsButton");

function selectedTrainee() {
  return traineeState.find((trainee) => trainee.id === selectedId) || traineeState[0];
}

function setPortrait(element, trainee) {
  element.style.setProperty("--portrait", trainee.portrait);
}

function getArcStyle(layoutItem) {
  return [
    `--arc-x: ${layoutItem.x}px`,
    `--arc-lift: ${layoutItem.lift}px`,
    `--arc-rot: ${layoutItem.rotation}`,
    `--arc-yaw: ${layoutItem.rotation * 1.65}`,
    `--arc-z: ${layoutItem.zIndex}`,
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
  });

  photoWall.style.setProperty("--card-width", `${metrics.cardWidth}px`);
  photoWall.style.setProperty("--portrait-height", `${metrics.portraitHeight}px`);
  photoWall.style.setProperty("--wall-visual-width", `${metrics.visualWidth}px`);
  photoWall.style.setProperty("--dock-influence", metrics.dockInfluence);

  photoWall.innerHTML = traineeState
    .map((trainee, index) => {
      const arcStyle = getArcStyle(arcLayout[index]);

      return `
        <button class="profile-card" type="button" data-id="${trainee.id}" aria-label="${trainee.department}${trainee.name}" style="${arcStyle}">
          <div class="portrait-frame" style="--portrait: ${trainee.portrait}"></div>
          <div class="profile-meta">
            <span>${trainee.department}</span>
            <span>${trainee.name}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function resetDock() {
  const cards = Array.from(photoWall.querySelectorAll(".profile-card"));
  cards.forEach((card) => {
    card.classList.remove("is-active");
    card.style.setProperty("--scale", "1");
    card.style.setProperty("--shift-x", "0px");
    card.style.setProperty("--lift", "0px");
    card.style.setProperty("--alpha", "0.9");
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

function renderDetail() {
  const trainee = selectedTrainee();
  const selectedPhoto = document.getElementById("selectedPhoto");
  const largeLifePhoto = document.getElementById("largeLifePhoto");
  const selectedIndex = traineeState.findIndex((item) => item.id === trainee.id) + 1;

  setPortrait(selectedPhoto, trainee);
  setPortrait(largeLifePhoto, trainee);

  document.getElementById("detailIndex").textContent = `CARD ${String(selectedIndex).padStart(2, "0")} / 12`;
  document.getElementById("selectedDepartment").textContent = trainee.department;
  document.getElementById("selectedName").textContent = trainee.name;
  document.getElementById("detailDepartment").textContent = `${trainee.department} · ${trainee.departmentEn}`;
  document.getElementById("detailName").textContent = trainee.romanName;
  document.getElementById("detailBackground").textContent = trainee.background;
  document.getElementById("detailTools").textContent = trainee.tools;
  document.getElementById("detailProblem").textContent = trainee.problem;
  document.getElementById("detailTags").textContent = trainee.tags;
  document.getElementById("memeText").textContent = trainee.meme;
  document.getElementById("challengeMember").textContent = `${trainee.department} · ${trainee.name}`;

  if (trainee.sentence) {
    challengeSlot.innerHTML = `<div class="sentence-card">${trainee.sentence}</div>`;
  } else {
    challengeSlot.innerHTML = `<button class="challenge-button" type="button" id="openChallenge">抽词云</button>`;
    document.getElementById("openChallenge").addEventListener("click", openChallenge);
  }
}

function openDetail(id) {
  selectedId = id;
  renderDetail();
  detailLayer.classList.add("is-open");
  detailLayer.setAttribute("aria-hidden", "false");
}

function closeDetail() {
  detailLayer.classList.remove("is-open");
  detailLayer.setAttribute("aria-hidden", "true");
}

function renderCloudWords(words = []) {
  cloudWords.innerHTML = words.map((word) => `<span class="cloud-word">${word}</span>`).join("");
}

function drawKeywords() {
  window.clearTimeout(keywordDrawTimer);
  challengeLayer.classList.add("is-drawing");
  drawWordsButton.disabled = true;
  renderCloudWords([]);

  const trainee = selectedTrainee();
  const salt = Date.now() + trainee.previousPairs.length;

  keywordDrawTimer = window.setTimeout(() => {
    currentKeywords = window.AppLogic.pickKeywordPair(keywordBank, trainee.previousPairs, salt);
    trainee.previousPairs = [...trainee.previousPairs, currentKeywords];
    renderCloudWords(currentKeywords);
    challengeLayer.classList.remove("is-drawing");
    drawWordsButton.disabled = false;
    sentenceInput.focus();
  }, 1000);
}

function openChallenge() {
  sentenceInput.value = "";
  challengeLayer.classList.add("is-open");
  challengeLayer.setAttribute("aria-hidden", "false");
  drawKeywords();
}

function closeChallenge() {
  window.clearTimeout(keywordDrawTimer);
  challengeLayer.classList.remove("is-drawing");
  challengeLayer.classList.remove("is-open");
  challengeLayer.setAttribute("aria-hidden", "true");
  drawWordsButton.disabled = false;
}

photoWall.addEventListener("pointermove", (event) => {
  updateDock(event.clientX);
});

photoWall.addEventListener("pointerleave", resetDock);

photoWall.addEventListener("click", (event) => {
  const card = event.target.closest(".profile-card");
  if (!card) {
    return;
  }
  openDetail(card.dataset.id);
});

document.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (action === "close") {
    closeDetail();
  }
  if (action === "back-detail") {
    closeChallenge();
  }
});

drawWordsButton.addEventListener("click", drawKeywords);

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
  if (event.key === "Escape") {
    if (challengeLayer.classList.contains("is-open")) {
      closeChallenge();
      return;
    }
    closeDetail();
  }
});

renderPhotoWall();
resetDock();

window.addEventListener("resize", () => {
  renderPhotoWall();
  resetDock();
});
