/**
 * 大屏赛事数据 —— AI创新黑客松 / AI Innovation Hackathon 2026
 * 演示用 mock，后续接管理后台 / API。文案、英文标签沿用主分支风格。
 * 规模真实：5 条赛道 = 5 支队伍、每队 1 名队长 + ≤4 名组员、单一冠军奖。
 */
(function attachScreenData(root) {
  "use strict";

  const A = (id, file) => `./assets/trainees/${id}/${file}`;

  const FLOW_DAYS = [
    { day: "DAY 1", en: "KICKOFF", icon: "team", title: "启航时刻·挑战发布·自由组队", lines: ["从认识组织到理解业务挑战，", "完成团队组建，开启黑客松之旅"], time: "" },
    { day: "DAY 2", en: "DEMO PREP", icon: "bulb", title: "方案共创·创新冲刺", lines: ["围绕真实业务场景，", "开展方案设计、系统开发与成果打磨"], time: "" },
    { day: "DAY 3", en: "SHOWCASE", icon: "trophy", title: "成果展示·评审投票·荣誉揭晓", lines: ["展示团队解决方案，专家评审与全员投票，", "共同见证最终荣誉揭晓。"], time: "" },
  ];

  // ---- 赛事机制卡 ------------------------------------------------------
  const MECHANISM = [
    { key: "format", icon: "target", label: "赛制", en: "FORMAT", headline: "只固定赛道", sub: "不固定题目 · 自由发现问题", accent: "var(--neon)", rgb: "40, 255, 200" },
    { key: "delivery", icon: "code", label: "交付", en: "DELIVERY", headline: "真实可运行系统", sub: "飞书作品页 + 现场 Demo", accent: "var(--neon-2)", rgb: "167, 255, 79" },
    { key: "scoring", icon: "scale", label: "评分", en: "SCORING", headline: "专家 70% · 大众 30%", sub: "五维评审 + 排名赋分", accent: "#6ad7ff", rgb: "106, 215, 255" },
    { key: "prize", icon: "trophy", label: "奖项", en: "PRIZE", headline: "单一冠军", sub: "Grand Prize 冠军团队", accent: "var(--warning)", rgb: "246, 255, 129" },
  ];

  // ---- LIVE 实时赛程时间轴 --------------------------------------------
  const TIMELINE = [
    { time: "Day 1 · 1:00-1:30 PM", label: "IT负责人项目发布", icon: "rocket" },
    { time: "Day 1 · 1:30-4:30 PM", label: "业务部门课题发布", icon: "doc" },
    { time: "Day 1 · 4:30-5:30 PM", label: "自由组队 & Ideation Workshop", icon: "team" },
    { time: "Day 2 · 全天", label: "方案共创·创新冲刺", icon: "bulb" },
    { time: "Day 3 · 8:30-9:00 AM", label: "技术检查 · 页面检查", icon: "check" },
    { time: "Day 3 · 9:00-9:20 AM", label: "开场 · 致辞 · Demo 开始", icon: "stage" },
    { time: "Day 3 · 9:20-11:00 AM", label: "5组 Demo 展示", icon: "play" },
    { time: "Day 3 · 11:00-11:10 AM", label: "投票", icon: "vote" },
    { time: "Day 3 · 11:10-11:20 AM", label: "评委评议", icon: "scale" },
    { time: "Day 3 · 11:20-11:50 AM", label: "结果公布 · 颁奖 · closing · 合影", icon: "trophy" },
  ];

  // ---- 五条赛道（与飞书文档一致；doc 为讲解文档占位链接）----------------
  const TRACKS = [
    { code: "01", name: "临床研发", en: "CLINICAL R&D", accent: "var(--neon)", rgb: "40, 255, 200", icon: "target",
      focus: "临床试验 · 数据洞察 · 真实世界研究", pains: ["试验入组", "病例管理", "数据清洗", "随访追踪"], mentor: "临床研发中心",
      doc: "https://joincare.feishu.cn/docx/track-clinical" },
    { code: "02", name: "药学研发", en: "PHARMA R&D", accent: "var(--neon-2)", rgb: "167, 255, 79", icon: "scale",
      focus: "分子设计 · 工艺优化 · 文献挖掘", pains: ["靶点筛选", "配方实验", "文献综述", "专利检索"], mentor: "药学研发中心",
      doc: "https://joincare.feishu.cn/docx/track-pharma" },
    { code: "03", name: "生产", en: "PRODUCTION", accent: "#6ad7ff", rgb: "106, 215, 255", icon: "code",
      focus: "智能制造 · 质量管控 · 设备预测", pains: ["排产优化", "质检视觉", "能耗监控", "设备维保"], mentor: "生产管理中心",
      doc: "https://joincare.feishu.cn/docx/track-production" },
    { code: "04", name: "营销", en: "MARKETING", accent: "#c79bff", rgb: "199, 155, 255", icon: "rocket",
      focus: "用户洞察 · 内容生成 · 投放优化", pains: ["内容生产", "客户分层", "投放 ROI", "经营分析"], mentor: "健康品事业部",
      doc: "https://joincare.feishu.cn/docx/track-marketing" },
    { code: "05", name: "职能", en: "FUNCTIONS", accent: "var(--warning)", rgb: "246, 255, 129", icon: "doc",
      focus: "人力 · 财务 · 行政 · 董办", pains: ["流程自动化", "报表生成", "知识问答", "合同审阅"], mentor: "董事长办公室",
      doc: "https://joincare.feishu.cn/docx/track-functions" },
  ];

  // ---- 五支队伍（每队 1 名队长 + 组员，含真实头像）------------------
  // name/project 在组队完成后由队伍自取；组队进度屏不展示队名。
  const TEAMS = [
    {
      id: "t1", trackCode: "01", track: "临床研发", accent: "var(--neon)", rgb: "40, 255, 200",
      name: "智元先锋", project: "临床试验智能入组系统", submitted: true, capacity: 5,
      pitch: "AI 自动匹配受试者，入组效率提升 3 倍", stack: ["RAG", "Agent", "FastAPI"],
      advisor: { name: "林艺新", avatar: A("lin-yixin", "idPhoto.jpg") },
      members: [
        { name: "许镁胜", avatar: A("xu-meisheng", "idPhoto.jpg") },
        { name: "占美玲", avatar: A("zhan-meiling", "idPhoto.jpg") },
        { name: "顾灵茜", avatar: A("gu-lingqian", "idPhoto.jpg") },
        { name: "陈徐林", avatar: A("chen-xulin", "idPhoto.png") },
      ],
      expert: 93.2, votes: 312,
    },
    {
      id: "t2", trackCode: "02", track: "药学研发", accent: "var(--neon-2)", rgb: "167, 255, 79",
      name: "丹方智造", project: "AI 辅助配方优化平台", submitted: true, capacity: 5,
      pitch: "工艺参数智能寻优，研发周期缩短一半", stack: ["贝叶斯优化", "LLM", "Vue"],
      advisor: { name: "张瑞", avatar: A("zhang-rui", "idPhoto.jpg") },
      members: [
        { name: "黄钊强", avatar: A("huang-zhaoqiang", "idPhoto.jpg") },
        { name: "张恒睿", avatar: A("zhang-hengrui", "idPhoto.jpg") },
        { name: "李丰", avatar: A("li-feng", "idPhoto.jpg") },
      ],
      expert: 90.5, votes: 286,
    },
    {
      id: "t3", trackCode: "03", track: "生产", accent: "#6ad7ff", rgb: "106, 215, 255",
      name: "智造引擎", project: "产线质检视觉系统", submitted: false, capacity: 5,
      pitch: "缺陷识别准确率 99.2%，质检零漏检", stack: ["YOLO", "Edge", "React"],
      advisor: { name: "唐靖沛", avatar: A("tang-jingpei", "idPhoto.jpg") },
      members: [
        { name: "顾柏", avatar: A("gu-bai", "photo.png") },
        { name: "梁星野", avatar: A("liang-xingye", "photo.png") },
        { name: "林源", avatar: A("lin-yuan", "photo.png") },
        { name: "宋怡宁", avatar: A("song-yining", "photo.png") },
      ],
      expert: 88.1, votes: 251,
    },
    {
      id: "t4", trackCode: "04", track: "营销", accent: "#c79bff", rgb: "199, 155, 255",
      name: "增长黑客", project: "全域内容生成引擎", submitted: true, capacity: 5,
      pitch: "一键生成全渠道营销内容，产能 ×10", stack: ["Diffusion", "LLM", "Next.js"],
      advisor: { name: "李蓓蓓", avatar: A("li-beibei", "idPhoto.jpg") },
      members: [
        { name: "唐雨", avatar: A("tang-yu", "photo.png") },
        { name: "温若兰", avatar: A("wen-ruolan", "photo.png") },
        { name: "许之夏", avatar: A("xu-zhixia", "photo.png") },
      ],
      expert: 86.7, votes: 274,
    },
    {
      id: "t5", trackCode: "05", track: "职能", accent: "var(--warning)", rgb: "246, 255, 129",
      name: "效能中枢", project: "职能流程自动化助手", submitted: false, capacity: 5,
      pitch: "表单/合同/报表自动化，人均提效 40%", stack: ["RPA", "Workflow", "Dify"],
      advisor: { name: "贾博深", avatar: A("jasper", "idPhoto.jpg") },
      members: [
        { name: "何清玥", avatar: A("he-qingyue", "photo.png") },
        { name: "叶南乔", avatar: A("ye-nanqiao", "photo.png") },
        { name: "周丞", avatar: A("zhou-cheng", "photo.png") },
      ],
      expert: 84.3, votes: 198,
    },
  ];

  // ---- 五维评审维度 ---------------------------------------------------
  const DIMENSIONS = [
    { key: "innovation", label: "创新性", en: "INNOVATION", weight: 25 },
    { key: "engineering", label: "技术实现", en: "ENGINEERING", weight: 25 },
    { key: "business", label: "业务价值", en: "BUSINESS VALUE", weight: 25 },
    { key: "feasibility", label: "可行性", en: "FEASIBILITY", weight: 15 },
    { key: "presentation", label: "演示表现", en: "PRESENTATION", weight: 10 },
  ];

  // ---- 排名赋分规则 ---------------------------------------------------
  const VOTE_POINTS = [100, 85, 70, 55, 45];

  function computeRanking() {
    const byVotes = [...TEAMS].sort((a, b) => b.votes - a.votes);
    const votePoint = {};
    byVotes.forEach((t, i) => { votePoint[t.id] = VOTE_POINTS[i] != null ? VOTE_POINTS[i] : 40; });
    const ranked = TEAMS.map((t) => {
      const vp = votePoint[t.id];
      return { ...t, votePoint: vp, voteRank: byVotes.findIndex((x) => x.id === t.id) + 1, total: +(t.expert * 0.7 + vp * 0.3).toFixed(2) };
    }).sort((a, b) => b.total - a.total);
    ranked.forEach((t, i) => { t.rank = i + 1; });
    return ranked;
  }

  const memberCount = TEAMS.reduce((s, t) => s + 1 + t.members.length, 0);

  root.ScreenData = {
    meta: {
      title: "AI创新黑客松",
      enTitle: "AI Innovation Hackathon 2026",
      brandChip: "AI INNOVATION HACKATHON",
      protocol: "HACKATHON_PROTOCOL_2026",
      company: "健康元药业集团 · Joincare Pharmaceutical",
      slogan: "36小时，用 AI 把创意照进现实",
      logo: "./assets/joincare-full-clean.png",
      icon: "./assets/joincare-icon-clean.png",
    },
    stats: { teams: TEAMS.length, members: memberCount, tracks: TRACKS.length, mentors: TEAMS.length },
    flowDays: FLOW_DAYS,
    mechanism: MECHANISM,
    timeline: TIMELINE,
    tracks: TRACKS,
    teams: TEAMS,
    dimensions: DIMENSIONS,
    votePoints: VOTE_POINTS,
    computeRanking: computeRanking,
  };
})(typeof window !== "undefined" ? window : globalThis);
