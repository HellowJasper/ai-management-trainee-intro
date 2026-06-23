const fallbackTrainees = [
  {
    "id": "jasper",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "贾博深",
    "romanName": "Jasper",
    "background": "我毕业于宁夏理工学院软件工程专业，连续两年获得国家奖学金，此前在智谱华章担任AI产品实习生。",
    "aiPartners": "codex，gemini，claude",
    "favoriteAI": "codex--我的24h工作队友。",
    "aiProblem": "希望AI能结合我的实时身体数据，帮助我更好的做健康与精力管理，成为我24h在线的小助手。",
    "aiPower": "我希望有超长上下文窗口，这样可以让我少很多幻觉。",
    "funFact": "凌晨的时候会灵感爆发偷偷学东西.......",
    "photo": "./assets/trainees/jasper/photo.jpg",
    "memeImage": "./assets/trainees/jasper/meme.png",
    "memeText": "凌晨的时候会灵感爆发偷偷学东西.......",
    "portrait": "linear-gradient(145deg, #041311 0%, #0c6f5e 48%, #d5fff4 100%)",
    "idPhoto": "./assets/trainees/jasper/idPhoto.jpg"
  },
  {
    "id": "zhang-rui",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "张瑞",
    "romanName": "Zhang Rui",
    "background": "我毕业于沈阳药科大学药学信息学专业，从事AI产品方向",
    "aiPartners": "ChatGPT，claude，DeepSeek",
    "favoriteAI": "codex-救我大命",
    "aiProblem": "希望它可以自己去赚token养自己",
    "aiPower": "超级大脑，无限容量",
    "funFact": "多多交流",
    "photo": "./assets/trainees/zhang-rui/photo.jpg",
    "memeImage": "./assets/trainees/zhang-rui/meme.png",
    "memeText": "多多交流",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)",
    "idPhoto": "./assets/trainees/zhang-rui/idPhoto.jpg"
  },
  {
    "id": "lin-yixin",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "林艺新",
    "romanName": "Lin Yixin",
    "background": "我毕业于武汉东湖学院软件工程专业，擅长利用Cursor/Codex等agent工具进行高效全栈交付。",
    "aiPartners": "Cursor，Windsurf，Kiro，Codex，Claude Code，NotebookLM，影刀RPA，DeepSeek， ChatGPT, Gemini，Google AI Studio，Nano Banana，千问，豆包，即梦",
    "favoriteAI": "Codex——我的全能编程搭档，辅助我快速完成从全栈系统搭建到复杂算法实现的高效交付",
    "aiProblem": "我希望能构建一个懂我业务逻辑的超级Agent团队，自动执行跨平台的重复性任务，减少我时间上的成本投入",
    "aiPower": "我最希望自己有的 AI 超能力，是能提前发现赚钱风口，然后顺手把能落地的方案也给我整理出来。因为光知道机会没用，关键是得知道怎么做、怎么开始、怎么执行。要是有这个能力，我就能更快找到方向，少走弯路，把时间和精力花在真的能变现的事情上。",
    "funFact": "深夜 Vibe Coding 选手（两晚熬夜 vibe coding 的经历）\n午夜灵感爆肝王（半夜动手肝项目）\n美区夜行侠（白天睡觉，晚上干活）\n硬件维修贡献者（遇过3D打印机，舵机，汽车，公路车等硬件故障）",
    "photo": "./assets/trainees/lin-yixin/photo.jpg",
    "memeImage": "./assets/trainees/lin-yixin/meme.png",
    "memeText": "深夜 Vibe Coding 选手（两晚熬夜 vibe coding 的经历）\n午夜灵感爆肝王（半夜动手肝项目）\n美区夜行侠（白天睡觉，晚上干活）\n硬件维修贡献者（遇过3D打印机，舵机，汽车，公路车等硬件故障）",
    "portrait": "linear-gradient(145deg, #07111c 0%, #2368ff 48%, #bffcf0 100%)",
    "idPhoto": "./assets/trainees/lin-yixin/idPhoto.jpg"
  },
  {
    "id": "tang-jingpei",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "唐靖沛",
    "romanName": "Tang Jingpei",
    "background": "我毕业于重庆三峡科技大学，计算机系数据科学与大数据技术专业，主攻AI应用开发方向",
    "aiPartners": "ChatGPT、Claude、Gemini、Grok、MiniMax、DeepSeek、Cursor、Dify、Midjourney、即梦等",
    "favoriteAI": "- Claude Code—我的编程搭子\n- ChatGPT—我的第二大脑\n- Midjourney—我的艺术细胞",
    "aiProblem": "自动读取解析我的扣款账单每日帮我记账",
    "aiPower": "3分钟收集整合全网所需信息。极大提高信息位面和搜索效率",
    "funFact": "- 喜欢听音乐\n- 相比咖啡更喜欢茶\n- 偶尔健身跑步锻炼身体\n- 喜欢写待办，记账等将事情规划清晰",
    "photo": "./assets/trainees/tang-jingpei/photo.jpg",
    "memeImage": "./assets/trainees/tang-jingpei/meme.jpg",
    "memeText": "- 喜欢听音乐\n- 相比咖啡更喜欢茶\n- 偶尔健身跑步锻炼身体\n- 喜欢写待办，记账等将事情规划清晰",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)",
    "idPhoto": "./assets/trainees/tang-jingpei/idPhoto.jpg"
  },
  {
    "id": "gu-lingqian",
    "department": "AIDD研究部",
    "departmentEn": "AIDD R&D",
    "name": "顾灵茜",
    "romanName": "Gu Lingqian",
    "background": "我毕业于中国药科大学生物与医药专业，研究方向是医药大数据与人工智能",
    "aiPartners": "Gemini、ChatGPT",
    "favoriteAI": "Gemini——我的编程搭子",
    "aiProblem": "我希望AI能帮我解决代码补全和调试问题",
    "aiPower": "根据代码逻辑3分钟实现可视化输出，比如思维导图，流程架构图或PPT。因为日常汇报时使用图和PPT频率较高",
    "funFact": "甜食重度依赖者",
    "photo": "./assets/trainees/gu-lingqian/photo.jpg",
    "memeImage": "./assets/trainees/gu-lingqian/meme.jpg",
    "memeText": "甜食重度依赖者",
    "portrait": "linear-gradient(145deg, #041311 0%, #0c6f5e 48%, #d5fff4 100%)",
    "idPhoto": "./assets/trainees/gu-lingqian/idPhoto.jpg"
  },
  {
    "id": "xu-meisheng",
    "department": "临床研发中心",
    "departmentEn": "CLINICAL R&D",
    "name": "许镁胜",
    "romanName": "Xu Meisheng",
    "background": "我毕业于广东药科大学智能医学工程专业，主攻AI医疗、医药、大健康领域，擅长深度学习模型训练、Agent开发、数据分析等。",
    "aiPartners": "ChatGPT、Cursor、Gemini、Claude、GLM、Seedance、NanoBanana",
    "favoriteAI": "Cloude——我的决策中心\nChatGPT——我的编程搭子\nManus——我的调研助手\nGemini——我的生活小助手\nObsidian——我的第二海马体\n豆包——我的唱歌搭子",
    "aiProblem": "能告诉我下一期彩票中奖号码😜",
    "aiPower": "3秒读心术:语言在很多复杂场景面前总会显得苍白无力，那能不能不用开口就让对方知道呢",
    "funFact": "－写捉弄脚本结果把自己电脑弄死机了",
    "photo": "./assets/trainees/xu-meisheng/photo.jpg",
    "memeImage": "./assets/trainees/xu-meisheng/meme.png",
    "memeText": "－写捉弄脚本结果把自己电脑弄死机了",
    "portrait": "linear-gradient(145deg, #041311 0%, #0c6f5e 48%, #d5fff4 100%)",
    "idPhoto": "./assets/trainees/xu-meisheng/idPhoto.jpg"
  },
  {
    "id": "huang-zhaoqiang",
    "department": "药学研发中心",
    "departmentEn": "PHARMA R&D",
    "name": "黄钊强",
    "romanName": "Huang Zhaoqiang",
    "background": "毕业于百色学院电子信息工程专业",
    "aiPartners": "codex、Claude code、Antigravity、cursor、opencode…",
    "favoriteAI": "codex，编程搭子",
    "aiProblem": "提升工作效率",
    "aiPower": "拥有 AI 的海量世界知识库",
    "funFact": "经常熬夜写项目",
    "photo": "./assets/trainees/huang-zhaoqiang/photo.jpg",
    "memeImage": "./assets/trainees/huang-zhaoqiang/meme.png",
    "memeText": "经常熬夜写项目",
    "portrait": "linear-gradient(145deg, #07111c 0%, #2368ff 48%, #bffcf0 100%)",
    "idPhoto": "./assets/trainees/huang-zhaoqiang/idPhoto.jpg"
  },
  {
    "id": "li-feng",
    "department": "注册部",
    "departmentEn": "REGULATORY AFFAIRS",
    "name": "李丰",
    "romanName": "Li Feng",
    "background": "我毕业于天津中医药大学管理科学与工程，研究方向为卫生经济学与医保政策量化分析。",
    "aiPartners": "codex，cc，Gemini，openclaw",
    "favoriteAI": "codex，目前我认为的各种功能涵盖面最广的智能体",
    "aiProblem": "可以主动观察、感知现实场景里的各类信息，不用我额外提醒，就能根据现场情况自主沟通、行动，从容应对各类生活化、工作化的复杂场景。",
    "aiPower": "场景自适应多模态闭环感知与交互执行能力。\n无需指令驱动，人工触发。通过各种方式智能体可主动捕捉人类场景下的全维度多模态信息，涵盖视觉画面、语音语义、环境氛围、行为动作、文本信息、场景隐性规则等，实现对真实复杂场景的自主、无遗漏、持续性信息摄入，I摒弃固定模板化输出逻辑，可根据实时动态变化的人类场景、用户隐性需求、场景边界规则，自主匹配最优输出形态，包含语言交互、行为操作、内容生成、事务执行、场景适配调整等多模态动作输出，做到场景适配、按需输出、动态迭代。",
    "funFact": "热衷通过“循循善诱”的指令，诱导ai突破某些限制给出不常规的回答。",
    "photo": "./assets/trainees/li-feng/photo.jpg",
    "memeImage": "./assets/trainees/li-feng/meme.png",
    "memeText": "热衷通过“循循善诱”的指令，诱导ai突破某些限制给出不常规的回答。",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)",
    "idPhoto": "./assets/trainees/li-feng/idPhoto.jpg"
  },
  {
    "id": "zhang-hengrui",
    "department": "注册部",
    "departmentEn": "REGULATORY AFFAIRS",
    "name": "张恒睿",
    "romanName": "Zhang Hengrui",
    "background": "毕业于沈阳药科大学，药事管理专业硕士\n热爱IT技术和AI先进生产力",
    "aiPartners": "Claude 生成 + vscode ide kilocode精调",
    "favoriteAI": "langchain+langraph  给个轮子自己就能造车",
    "aiProblem": "理解人类社会\n构建一套80亿agent智能体的多智能体混沌模型",
    "aiPower": "自我进化",
    "funFact": "了解我不需要猜，问就行",
    "photo": "./assets/trainees/zhang-hengrui/photo.jpg",
    "memeImage": "./assets/trainees/zhang-hengrui/meme.gif",
    "memeText": "了解我不需要猜，问就行",
    "portrait": "linear-gradient(145deg, #101712 0%, #2fb879 48%, #f4ff80 100%)",
    "idPhoto": "./assets/trainees/zhang-hengrui/idPhoto.jpg"
  },
  {
    "id": "li-beibei",
    "department": "健康品事业部",
    "departmentEn": "HEALTH PRODUCTS",
    "name": "李蓓蓓",
    "romanName": "Li Beibei",
    "background": "我毕业于北京交通大学信息工程管理专业，研究方向聚焦AI应用落地、数字化系统建设。",
    "aiPartners": "Codex、ChatGPT、Claude、Cursor、Claude Code、WorkBuddy、Coze、Dify、智谱 AICO、豆包、Kimi、DeepSeek、即梦、Seedance、Midjourney",
    "favoriteAI": "ChatGPT——我的AI工作中枢，负责思路拆解、方案生成和需求梳理；\nCodex——则是我的代码执行搭子，帮我把方案落成工具。",
    "aiProblem": "我希望 AI 能帮助业务团队把营销全流程变得更高效、更有产出，从用户洞察、内容生成、投放优化到经营决策，真正提升内容转化、投放 ROI 和业务增长效果。",
    "aiPower": "我的 AI 超能力是：快速把想法变成方案，把方案变成可落地的工具。因为我希望 AI 不只是辅助思考，而是能真正服务业务、创造结果。",
    "funFact": "我经常不是在用 AI，就是在思考还有什么事可以交给 AI。",
    "photo": "./assets/trainees/li-beibei/photo.jpg",
    "memeImage": "./assets/trainees/li-beibei/meme.png",
    "memeText": "我经常不是在用 AI，就是在思考还有什么事可以交给 AI。",
    "portrait": "linear-gradient(145deg, #101712 0%, #2fb879 48%, #f4ff80 100%)",
    "idPhoto": "./assets/trainees/li-beibei/idPhoto.jpg"
  },
  {
    "id": "zhan-meiling",
    "department": "AIDD研究部",
    "departmentEn": "AIDD R&D",
    "name": "占美玲",
    "romanName": "Zhan Meiling",
    "background": "我毕业于华东理工大学药学专业，主攻AI辅助药物设计。",
    "aiPartners": "ChatGPT、Cursor、Codex",
    "favoriteAI": "Cursor：我的 AI 编程助手",
    "aiProblem": "我希望AI能帮助我把复杂的科研问题拆解成清晰的工作流程，提高数据分析、模型构建和结果解释的效率。",
    "aiPower": "我希望AI能帮助我高效阅读文献、整理数据",
    "funFact": "一直间歇性减肥",
    "photo": "./assets/trainees/zhan-meiling/photo.jpg",
    "memeImage": "./assets/trainees/zhan-meiling/meme.png",
    "memeText": "一直间歇性减肥",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)",
    "idPhoto": "./assets/trainees/zhan-meiling/idPhoto.jpg"
  },
  {
    "id": "chen-xulin",
    "department": "AI创新部",
    "departmentEn": "AI INNOVATION",
    "name": "陈徐林",
    "romanName": "Chen Xulin",
    "background": "我就读于沈阳药科大学生物医学工程专业，主攻医学图像分割方向。",
    "aiPartners": "Codex、ClaudeCode、deepseek、千问、cursor、即梦",
    "favoriteAI": "Codex——主要AI工具\nChatGPT——主要的AI模型",
    "aiProblem": "代替我上班  T A T",
    "aiPower": "学会世界上所有的知识。",
    "funFact": "重度人文社科爱好者",
    "photo": "./assets/trainees/chen-xulin/photo.jpg",
    "memeImage": "./assets/trainees/chen-xulin/meme.jpg",
    "memeText": "重度人文社科爱好者",
    "portrait": "linear-gradient(145deg, #101712 0%, #2fb879 48%, #f4ff80 100%)",
    "idPhoto": "./assets/trainees/chen-xulin/idPhoto.png"
  },
  {
    "id": "wu-shuo",
    "department": "药学研发中心",
    "departmentEn": "PHARMA R&D",
    "name": "吴烁",
    "romanName": "Wu Shuo",
    "background": "我毕业于中国科学院大学生物技术与工程专业，主攻生物信息方向",
    "aiPartners": "ChatGPT，Deepseek，豆包，Gemini，元宝",
    "favoriteAI": "Codex--我的最强帮手",
    "aiProblem": "帮我写代码和debug",
    "aiPower": "无限token，可以想做什么做什么",
    "funFact": "能睡12个小时",
    "photo": "./assets/trainees/wu-shuo/photo.jpg",
    "memeImage": "./assets/trainees/wu-shuo/meme.png",
    "memeText": "能睡12个小时",
    "portrait": "linear-gradient(145deg, #041311 0%, #0c6f5e 48%, #d5fff4 100%)",
    "idPhoto": "./assets/trainees/wu-shuo/idPhoto.jpg"
  },
  {
    "id": "zhao-yiming",
    "department": "药学研发中心",
    "departmentEn": "PHARMA R&D",
    "name": "赵一鸣",
    "romanName": "Zhao Yiming",
    "background": "我毕业于广东药科大学智能医学专业，主攻机器学习和人工智能应用方向",
    "aiPartners": "ChatGPT(codex)、claude、gemini、hermes、openclaw、即梦、Midjourney、kimi、trae、马维斯、qclaw、workbuddy等",
    "favoriteAI": "hermes–我的万能个人助理",
    "aiProblem": "彻底接管工作中那些“格式化、流转性”的沟通与对接消耗。我希望AI能像一个无形的齿轮，自动拉齐跨部门的数据壁垒、追踪繁琐的审批流、提炼冗长的会议关键点。让人类的大脑从机械的流程执行中彻底解脱出来，把所有的精力收敛到真正高价值的“本质创造”与业务洞察上",
    "aiPower": "数字agent影分身\n为什么？\n人的精力是极其有限的，我希望的超能力是：每当遇到一个明确的业务痛点，我能瞬间裂变出一个专属的数字智能体agent替我驻扎在业务流中分析和试错。它负责扛下所有的重复对接和机械测试，而我只需要作为主控大脑，去调用对应的agent",
    "funFact": "宁愿熬夜花3小时做一套自动化脚本，也不想连续5分钟手动复制粘贴的效率强迫症",
    "photo": "./assets/trainees/zhao-yiming/photo.jpg",
    "memeImage": "./assets/trainees/zhao-yiming/meme.jpg",
    "memeText": "宁愿熬夜花3小时做一套自动化脚本，也不想连续5分钟手动复制粘贴的效率强迫症",
    "portrait": "linear-gradient(145deg, #08100c 0%, #6a9f16 48%, #f1ff9b 100%)",
    "idPhoto": "./assets/trainees/zhao-yiming/idPhoto.jpg"
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

const TEAM_ROLE_BLUEPRINT = [
  {
    key: "business",
    label: "业务洞察",
    labelEn: "BIZ",
    description: "拆解场景价值，定义问题边界",
  },
  {
    key: "ai-dev",
    label: "AI开发",
    labelEn: "DEV",
    description: "搭建模型流程，完成原型能力",
  },
  {
    key: "design",
    label: "产品设计",
    labelEn: "UX",
    description: "设计交互路径，打磨演示界面",
  },
  {
    key: "pitch",
    label: "路演运营",
    labelEn: "PITCH",
    description: "组织答辩叙事，统筹现场协作",
  },
];

function fallbackMemberByName(name, role) {
  const trainee = fallbackTrainees.find((item) => item.name === name);
  return {
    name,
    department: trainee?.department || "",
    role,
    photo: trainee?.idPhoto || trainee?.photo || "",
  };
}

function getFallbackTeamState() {
  const teams = [
    {
      id: "pharma",
      index: "01",
      name: "药学",
      nameEn: "PHARMACEUTICALS",
      hostDepartment: "药学研发中心",
      color: "var(--neon)",
      colorRgb: "40, 255, 200",
      advisor: { name: "赛道顾问 A", department: "药学研发中心", role: "赛道顾问" },
      memberNames: ["黄钊强", "占美玲", "顾灵茜", "林艺新"],
    },
    {
      id: "medicine",
      index: "02",
      name: "医学",
      nameEn: "CLINICAL MEDICINE",
      hostDepartment: "临床研发中心",
      color: "rgb(205, 255, 92)",
      colorRgb: "205, 255, 92",
      advisor: { name: "赛道顾问 B", department: "临床研发中心", role: "赛道顾问" },
      memberNames: ["许镁胜", "陈徐林", "唐靖沛", "张瑞"],
    },
    {
      id: "marketing",
      index: "03",
      name: "营销",
      nameEn: "SALES & MARKETING",
      hostDepartment: "健康品事业部",
      color: "rgb(100, 232, 214)",
      colorRgb: "100, 232, 214",
      advisor: { name: "赛道顾问 C", department: "健康品事业部", role: "赛道顾问" },
      memberNames: ["李蓓蓓", "李丰", "张恒睿", "贾博深"],
    },
    {
      id: "functions",
      index: "04",
      name: "职能",
      nameEn: "GENERAL FUNCTIONS",
      hostDepartment: "董事长办公室",
      color: "var(--neon-2)",
      colorRgb: "167, 255, 79",
      advisor: { name: "赛道顾问 D", department: "董事长办公室", role: "赛道顾问" },
      memberNames: ["张瑞", "唐靖沛", "李丰", "陈徐林"],
    },
    {
      id: "production",
      index: "05",
      name: "生产",
      nameEn: "PRODUCTION & MANUFACTURING",
      hostDepartment: "生产管理中心",
      color: "rgb(110, 235, 150)",
      colorRgb: "110, 235, 150",
      advisor: { name: "赛道顾问 E", department: "生产管理中心", role: "赛道顾问" },
      memberNames: ["顾灵茜", "许镁胜", "李蓓蓓", "黄钊强"],
    },
  ];

  return teams.map(({ memberNames, advisor, ...team }) => ({
    ...team,
    advisor: { ...advisor },
    members: memberNames.map((name, index) => fallbackMemberByName(name, `队友 ${String(index + 1).padStart(2, "0")}`)),
  }));
}

let traineeState = window.AppLogic.positionJasperAtCenter(fallbackTrainees.map(window.AppLogic.normalizeTrainee));
let teamState = getFallbackTeamState();
let selectedTeamId = "";
let selectedTeamRoleKey = "";
let selectedId = traineeState.find((t) => t.id === "jasper")?.id || traineeState[0].id;
let currentKeywords = [];
let drawStage = 0; // 0: not drawn, 1: A drawn, 2: both A and B drawn
let keywordDrawTimer = null;
let appView = "intro";
let profileMediaMode = "photo";
let introTimer = null;
let introExitTimer = null;
let isIntroExiting = false;
let lastAdminStageSyncKey = "";
let adminPollTimer = null;
let countdownTimer = null;
let countdownStartedAt = null;
let countdownDurationMs = 24 * 60 * 60 * 1000;
let countdownLoadRequestId = 0;
let roadshowTimer = null;
let roadshowState = {
  currentTeamId: "marketing",
  currentTeam: null,
  nextTeamId: "functions",
  nextTeam: null,
  phase: "DEMO",
  startedAt: 0,
  durationMs: 15 * 60 * 1000,
};
let roadshowLoadRequestId = 0;
let voteResultsState = {
  pointScale: [100, 85, 70, 55, 40],
  results: [],
  status: "voting",
  windowLabel: "投票窗口开启中",
  updatedAt: "",
};
let voteResultsLoadRequestId = 0;

const introTiming = window.AppLogic.getIntroTiming();
const INTRO_HOLD_MS = introTiming.holdMs;
const INTRO_EXIT_MS = introTiming.exitMs;
const COUNTDOWN_STORAGE_KEY = "joincare_mission_countdown_started_at_manual_v2";
const COUNTDOWN_DURATION_MS = 24 * 60 * 60 * 1000;
const ROADSHOW_STORAGE_KEY = "joincare_roadshow_timer_started_at_manual_v1";
const ROADSHOW_DURATION_MS = 15 * 60 * 1000;

const appShell = document.querySelector(".app-shell");
const introStage = document.getElementById("introStage");
const landingStage = document.getElementById("landingStage");
const welcomeStage = document.getElementById("welcomeStage");
const personaWallStage = document.getElementById("personaWallStage");
const teamStage = document.getElementById("teamStage");
const countdownStage = document.getElementById("countdownStage");
const roadshowStage = document.getElementById("roadshowStage");
const voteStage = document.getElementById("voteStage");
const voteResultStage = document.getElementById("voteResultStage");
const finalResultStage = document.getElementById("finalResultStage");
const photoWall = document.getElementById("photoWall");
const teamGrid = document.getElementById("teamGrid");
const countdownHours = document.getElementById("countdownHours");
const countdownMinutes = document.getElementById("countdownMinutes");
const countdownSeconds = document.getElementById("countdownSeconds");
const countdownStatus = document.getElementById("countdownStatus");
const countdownProgress = document.getElementById("countdownProgress");
const countdownStartButton = document.getElementById("countdownStartButton");
const roadshowTeamCode = document.getElementById("roadshowTeamCode");
const roadshowTeamName = document.getElementById("roadshowTeamName");
const roadshowProject = document.getElementById("roadshowProject");
const roadshowTrackName = document.getElementById("roadshowTrackName");
const roadshowPhase = document.getElementById("roadshowPhase");
const roadshowRoster = document.getElementById("roadshowRoster");
const roadshowCommandStatus = document.getElementById("roadshowCommandStatus");
const roadshowNextTeamName = document.getElementById("roadshowNextTeamName");
const roadshowNextProject = document.getElementById("roadshowNextProject");
const roadshowTimerTeam = document.getElementById("roadshowTimerTeam");
const roadshowTimerPhase = document.getElementById("roadshowTimerPhase");
const roadshowTimerNext = document.getElementById("roadshowTimerNext");
const roadshowMinutes = document.getElementById("roadshowMinutes");
const roadshowSeconds = document.getElementById("roadshowSeconds");
const roadshowProgress = document.getElementById("roadshowProgress");
const roadshowStartButton = document.getElementById("roadshowStartButton");
const voteWindowStatus = document.getElementById("voteWindowStatus");
const voteTotalCount = document.getElementById("voteTotalCount");
const voteTotalOrbit = document.getElementById("voteTotalOrbit");
const voteProgressList = document.getElementById("voteProgressList");
const voteWinnerPanel = document.getElementById("voteWinnerPanel");
const voteResultTable = document.getElementById("voteResultTable");
const votePointScale = document.getElementById("votePointScale");
const finalResultChampion = document.getElementById("finalResultChampion");
const finalResultLeaderboard = document.getElementById("finalResultLeaderboard");
const finalResultPointScale = document.getElementById("finalResultPointScale");
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
const landingActions = document.getElementById("landingActions");
const enterButton = document.getElementById("enterButton");

const rainRenderers = {
  intro: typeof window.IntroSequence !== "undefined"
    ? window.IntroSequence.createIntroSequence("introRain", { logoSrc: "./assets/joincare-full-clean.png", onComplete: () => startIntroExit(false) })
    : createRain("introRain", { fontSize: 17, density: 0.78, fade: "rgba(2, 8, 14, 0.08)" }),
  home: createRain("landingRain", { fontSize: 17, density: 0.78, fade: "rgba(2, 8, 14, 0.04)" }),
  welcome: createRain("welcomeRain", { fontSize: 17, density: 0.74, fade: "rgba(2, 8, 14, 0.045)" }),
  wall: createRain("wallRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.04)" }),
  detail: createRain("detailRain", { fontSize: 16, fade: "rgba(2, 8, 14, 0.05)" }),
  challenge: createRain("challengeRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.05)" }),
  discover: createRain("discoverRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.04)" }),
  team: createRain("teamRain", { fontSize: 18, fade: "rgba(2, 8, 14, 0.04)" }),
  countdown: createRain("countdownRain", { fontSize: 18, density: 0.68, fade: "rgba(2, 8, 14, 0.045)" }),
  roadshow: createRain("roadshowRain", { fontSize: 18, density: 0.7, fade: "rgba(2, 8, 14, 0.045)" }),
  vote: createRain("voteRain", { fontSize: 18, density: 0.72, fade: "rgba(2, 8, 14, 0.045)" }),
  voteResult: createRain("voteResultRain", { fontSize: 18, density: 0.66, fade: "rgba(2, 8, 14, 0.045)" }),
  finalResult: createRain("finalResultRain", { fontSize: 18, density: 0.6, fade: "rgba(2, 8, 14, 0.045)" }),
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
  welcome: welcomeStage,
  wall: personaWallStage,
  discover: document.getElementById("discoverStage"),
  team: document.getElementById("teamStage"),
  countdown: document.getElementById("countdownStage"),
  roadshow: document.getElementById("roadshowStage"),
  vote: document.getElementById("voteStage"),
  voteResult: document.getElementById("voteResultStage"),
  finalResult: document.getElementById("finalResultStage"),
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
  setStageActive(viewStages.welcome, view === "welcome");
  setStageActive(viewStages.wall, ["wall", "detail", "challenge"].includes(view));
  setStageActive(viewStages.discover, view === "discover");
  setStageActive(viewStages.team, view === "team");
  setStageActive(viewStages.countdown, view === "countdown");
  setStageActive(viewStages.roadshow, view === "roadshow");
  setStageActive(viewStages.vote, view === "vote");
  setStageActive(viewStages.voteResult, view === "vote-result");
  setStageActive(viewStages.finalResult, view === "final-result");
}

function syncRain(view) {
  const activeKeys = new Set(
    view === "intro"
      ? ["intro"]
      : view === "home"
        ? ["home"]
        : view === "welcome"
          ? ["welcome"]
          : view === "detail"
            ? ["detail"]
            : view === "challenge"
              ? ["challenge"]
              : view === "discover"
                ? ["discover"]
                : view === "team"
                  ? ["team"]
                  : view === "countdown"
                  ? ["countdown"]
                  : view === "roadshow"
                    ? ["roadshow"]
                    : view === "vote"
                      ? ["vote"]
                      : view === "vote-result"
                        ? ["voteResult"]
                        : view === "final-result"
                          ? ["finalResult"]
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
  drawLandingLogo();
  landingStage.style.opacity = "0";
  landingStage.style.pointerEvents = "none";
  introStage.style.pointerEvents = "none";

  appShell.dataset.view = "intro-exit";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
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
  drawCard.style.transform = isOpen ? "translate(0, -50%) rotate(-7deg)" : "translate(-120px, -50%) rotate(-7deg)";
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
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
  appShell.classList.add(`view-${view}`);
  syncStages(view);

  if (view === "home" || view === "wall") {
    detailLayer.classList.remove("is-open");
    detailLayer.setAttribute("aria-hidden", "true");
  }

  syncRain(view);
  syncParticles(view);
  if (view === "countdown") {
    syncCountdownClock();
  } else {
    stopCountdownClock();
  }
  if (view === "roadshow") {
    syncRoadshowTimer();
  } else {
    stopRoadshowTimer();
  }
  if (view === "vote" || view === "vote-result" || view === "final-result") {
    syncVoteResults();
  }
  discoverPanel.classList.remove("is-visible");
}

function cssUrl(path) {
  return path ? `url('${String(path).replaceAll("'", "\\'")}')` : "none";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
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
        <button class="profile-card" type="button" data-id="${escapeAttribute(trainee.id)}" aria-label="${escapeAttribute(`${trainee.department}${trainee.name}`)}" style="${arcStyle}">
          <div class="portrait-frame" style="--portrait: ${trainee.portrait}; --media-image: ${cssUrl(trainee.idPhoto || trainee.photo)}"></div>
          <div class="profile-meta">
            <span class="profile-name">${escapeHtml(trainee.name)}</span>
            <span class="profile-department">${escapeHtml(trainee.department)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  const svgWidth = metrics.visualWidth;
  const svgHeight = 220;

  let pathD = "";
  let glassMaskHeight = svgHeight;
  let glassDepth = 58;
  let glassTranslateY = 29;
  if (arcLayout.length > 1) {
    const firstLayout = arcLayout[0];
    const lastLayout = arcLayout[arcLayout.length - 1];
    const centerIndex = Math.floor((arcLayout.length - 1) / 2);
    const centerLayout = arcLayout[centerIndex];
    const lineLiftRatio = 0.62;
    glassDepth = Math.max(42, Math.min(86, metrics.cardHeight * 0.26));
    glassTranslateY = glassDepth / 2;

    const x_first = svgWidth / 2 + firstLayout.x;
    const y_first = svgHeight + firstLayout.curveLift * lineLiftRatio;
    const x_last = svgWidth / 2 + lastLayout.x;
    const y_last = svgHeight + lastLayout.curveLift * lineLiftRatio;
    const x_center = svgWidth / 2 + centerLayout.x;
    const y_peak = svgHeight + centerLayout.curveLift * lineLiftRatio;

    const x_ctrl = x_center;
    const y_ctrl = 2 * y_peak - (y_first + y_last) / 2;
    glassMaskHeight = svgHeight + glassDepth * 1.4;

    pathD = `M ${x_first},${y_first} Q ${x_ctrl},${y_ctrl} ${x_last},${y_last}`;
  }

  const svgHtml = `
    <svg class="photo-wall-svg" style="--svg-width: ${svgWidth}px; --svg-height: ${svgHeight}px;" viewBox="0 0 ${svgWidth} ${svgHeight}">
      <defs>
        <linearGradient id="photoWallGlassGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#bffff0" stop-opacity="0.22" />
          <stop offset="28%" stop-color="#28ffc8" stop-opacity="0.18" />
          <stop offset="74%" stop-color="#04866f" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#02080e" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="photoWallGlassSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#28ffc8" stop-opacity="0" />
          <stop offset="48%" stop-color="#dffff5" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#28ffc8" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="photoWallGlassEdgeFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="white" stop-opacity="0" />
          <stop offset="12%" stop-color="white" stop-opacity="0.2" />
          <stop offset="28%" stop-color="white" stop-opacity="0.92" />
          <stop offset="50%" stop-color="white" stop-opacity="1" />
          <stop offset="72%" stop-color="white" stop-opacity="0.92" />
          <stop offset="88%" stop-color="white" stop-opacity="0.2" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
        <mask id="photoWallGlassMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${svgWidth}" height="${glassMaskHeight}">
          <rect x="0" y="0" width="${svgWidth}" height="${glassMaskHeight}" fill="url(#photoWallGlassEdgeFade)" />
        </mask>
      </defs>
      <path class="photo-wall-glass-fill" d="${pathD}" transform="translate(0 ${glassTranslateY})" style="--glass-stroke-width: ${glassDepth}px;" mask="url(#photoWallGlassMask)" />
      <path class="photo-wall-glass-sheen" d="${pathD}" />
      <path class="photo-wall-arc-line" d="${pathD}" />
    </svg>
  `;

  photoWall.innerHTML = cardsHtml + svgHtml;
}

function renderTeamFormation() {
  if (!teamGrid) return;

  if (!teamState.length) {
    teamGrid.innerHTML = `
      <div class="team-empty-state">
        <span>TEAM DATA</span>
        <strong>SYNCING...</strong>
      </div>
    `;
    return;
  }

  teamGrid.innerHTML = teamState
    .map((team) => {
      const advisor = team.advisor || {};
      const members = Array.isArray(team.members) ? team.members.slice(0, 4) : [];
      const advisorFilledCount = advisor.name ? 1 : 0;
      const totalSeats = TEAM_ROLE_BLUEPRINT.length + 1;
      const roleSlots = TEAM_ROLE_BLUEPRINT.map((role, index) => ({
        ...role,
        member: members[index] || {
          name: "待定队友",
          department: "待分配",
          photo: "",
        },
      }));
      const filledCount = advisorFilledCount + members.filter((member) => member?.name).length;
      const isSelectedTeam = selectedTeamId === team.id;
      const isClaimedAdvisor = isSelectedTeam && selectedTeamRoleKey === "advisor";

      return `
        <article class="team-squad-card${isSelectedTeam ? " is-selected" : ""}" data-track-id="${escapeAttribute(team.id || "")}" style="--team-color: ${escapeAttribute(team.color || "var(--neon)")}; --team-color-rgb: ${escapeAttribute(team.colorRgb || "40, 255, 200")};">
          <header class="team-track-head">
            <span class="team-track-index">${escapeHtml(team.index || "")}</span>
            <div>
              <h3>${escapeHtml(team.name || "")}</h3>
              <span>${escapeHtml(team.nameEn || "")}</span>
            </div>
            <span class="team-seat-meter">${filledCount}/${totalSeats}</span>
          </header>
          <section class="team-role-slot team-advisor-slot${isClaimedAdvisor ? " is-claimed" : ""}">
            <div class="team-role-avatar" style="--avatar-image: ${cssUrl(advisor.photo || advisor.avatar || advisor.idPhoto || "")}">
              <span>${escapeHtml(String(advisor.name || "?").slice(0, 1))}</span>
            </div>
            <div class="team-role-copy">
              <div class="team-role-main">
                <span class="team-role-chip">LEAD</span>
                <strong>赛道顾问</strong>
              </div>
              <p>赛道牵头选手，协调业务方向</p>
              <small>${escapeHtml(advisor.name || "待定选手")} · ${escapeHtml(advisor.department || team.hostDepartment || "待分配")}</small>
            </div>
            <button class="team-role-action" type="button" data-team-action="claim-role" data-track-id="${escapeAttribute(team.id || "")}" data-role-key="advisor" aria-label="${escapeAttribute(`抢占${team.name || "赛道"}赛道顾问位`)}">
              ${isClaimedAdvisor ? "我的顾问位" : "抢顾问位"}
            </button>
          </section>
          <div class="team-role-grid">
            ${roleSlots
              .map(({ key, label, labelEn, description, member }) => {
                const isClaimedRole = isSelectedTeam && selectedTeamRoleKey === key;

                return `
                  <section class="team-role-slot${isClaimedRole ? " is-claimed" : ""}">
                    <div class="team-role-avatar" style="--avatar-image: ${cssUrl(member.photo)}">
                      <span>${escapeHtml(String(member.name || "?").slice(0, 1))}</span>
                    </div>
                    <div class="team-role-copy">
                      <div class="team-role-main">
                        <span class="team-role-chip">${escapeHtml(labelEn)}</span>
                        <strong>${escapeHtml(label)}</strong>
                      </div>
                      <p>${escapeHtml(description)}</p>
                      <small>${escapeHtml(member.name || "待定队友")} · ${escapeHtml(member.department || "待分配")}</small>
                    </div>
                    <button class="team-role-action" type="button" data-team-action="claim-role" data-track-id="${escapeAttribute(team.id || "")}" data-role-key="${escapeAttribute(key)}" aria-label="${escapeAttribute(`认领${team.name || "赛道"}${label}职责`)}">
                      ${isClaimedRole ? "我的职责" : "认领职责"}
                    </button>
                  </section>
                `;
              })
              .join("")}
          </div>
          <footer class="team-card-footer">
            <button class="team-claim-button" type="button" data-team-action="claim-track" data-track-id="${escapeAttribute(team.id || "")}" data-track-name="${escapeAttribute(team.name || "赛道")}">
              ${isSelectedTeam ? "赛道已锁定" : "抢占赛道"}
            </button>
          </footer>
        </article>
      `;
    })
    .join("");
}

function handleTeamAction(actionButton) {
  const action = actionButton.dataset.teamAction;
  const trackId = actionButton.dataset.trackId || "";

  if (!trackId) return;

  selectedTeamId = trackId;

  if (action === "claim-track") {
    selectedTeamRoleKey = "";
    renderTeamFormation();
    return;
  }

  if (action === "claim-role") {
    selectedTeamRoleKey = actionButton.dataset.roleKey || "";
    renderTeamFormation();
  }
}

function readCountdownStartedAt() {
  return Number(countdownStartedAt) || 0;
}

function applyCountdownState(state = {}) {
  const nextStartedAt = Number(state.startedAt);
  const nextDurationMs = Number(state.durationMs);

  countdownStartedAt = Number.isFinite(nextStartedAt) && nextStartedAt > 0 ? nextStartedAt : 0;
  countdownDurationMs = Number.isFinite(nextDurationMs) && nextDurationMs > 0
    ? nextDurationMs
    : COUNTDOWN_DURATION_MS;

  return {
    startedAt: countdownStartedAt,
    durationMs: countdownDurationMs,
  };
}

function formatCountdownDuration(durationMs = COUNTDOWN_DURATION_MS) {
  const totalSeconds = Math.max(0, Math.floor((Number(durationMs) || COUNTDOWN_DURATION_MS) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

async function loadCountdownState() {
  try {
    return applyCountdownState(await window.AppData.loadMissionCountdown({
      storageKey: COUNTDOWN_STORAGE_KEY,
      durationMs: COUNTDOWN_DURATION_MS,
    }));
  } catch (error) {
    console.warn("Mission countdown state failed to load.", error);
    return applyCountdownState({
      startedAt: countdownStartedAt,
      durationMs: countdownDurationMs,
    });
  }
}

function renderCountdownClock() {
  const startedAt = readCountdownStartedAt();

  if (!startedAt) {
    const readyTimer = formatCountdownDuration(countdownDurationMs);
    if (countdownHours) countdownHours.textContent = readyTimer.hours;
    if (countdownMinutes) countdownMinutes.textContent = readyTimer.minutes;
    if (countdownSeconds) countdownSeconds.textContent = readyTimer.seconds;
    if (countdownProgress) countdownProgress.style.transform = "scaleX(0)";
    if (countdownStatus) countdownStatus.textContent = "WAITING FOR ADMIN";
    if (countdownStartButton) {
      countdownStartButton.disabled = true;
      countdownStartButton.textContent = "ADMIN CONTROLLED";
    }
    return;
  }

  const countdown = window.AppLogic.getMissionCountdownState({
    startedAt,
    durationMs: countdownDurationMs,
  });

  if (countdownHours) countdownHours.textContent = countdown.hours;
  if (countdownMinutes) countdownMinutes.textContent = countdown.minutes;
  if (countdownSeconds) countdownSeconds.textContent = countdown.seconds;
  if (countdownProgress) countdownProgress.style.transform = `scaleX(${countdown.progress})`;
  if (countdownStatus) {
    countdownStatus.textContent = countdown.isComplete
      ? "MISSION WINDOW COMPLETE"
      : "24H BUILD WINDOW ACTIVE";
  }
  if (countdownStartButton) {
    countdownStartButton.disabled = true;
    countdownStartButton.textContent = countdown.isComplete ? "MISSION COMPLETE" : "MISSION RUNNING";
  }
}

async function syncCountdownClock() {
  const requestId = ++countdownLoadRequestId;
  await loadCountdownState();
  if (requestId !== countdownLoadRequestId) {
    return;
  }

  renderCountdownClock();
  if (!readCountdownStartedAt()) {
    stopCountdownClock();
    return;
  }
  startCountdownClock();
}

function startCountdownClock() {
  window.clearInterval(countdownTimer);
  renderCountdownClock();
  countdownTimer = window.setInterval(renderCountdownClock, 1000);
}

function stopCountdownClock() {
  window.clearInterval(countdownTimer);
  countdownTimer = null;
}

function applyRoadshowState(state = {}) {
  const nextStartedAt = Number(state.startedAt);
  const nextDurationMs = Number(state.durationMs);

  roadshowState = {
    ...roadshowState,
    ...state,
    currentTeamId: state.currentTeamId || roadshowState.currentTeamId || "marketing",
    currentTeam: state.currentTeam || roadshowState.currentTeam,
    nextTeamId: state.nextTeamId || roadshowState.nextTeamId || "functions",
    nextTeam: state.nextTeam || roadshowState.nextTeam,
    phase: state.phase || roadshowState.phase || "DEMO",
    startedAt: Number.isFinite(nextStartedAt) && nextStartedAt > 0 ? nextStartedAt : 0,
    durationMs: Number.isFinite(nextDurationMs) && nextDurationMs > 0
      ? nextDurationMs
      : ROADSHOW_DURATION_MS,
  };

  return { ...roadshowState };
}

function resolveRoadshowTeam() {
  const teamId = roadshowState.currentTeamId || selectedTeamId || "marketing";
  const dataTeam = teamState.find((team) => team.id === teamId) || teamState[2] || teamState[0] || {};
  const stateTeam = roadshowState.currentTeam || {};

  return {
    ...dataTeam,
    ...stateTeam,
    id: stateTeam.id || dataTeam.id || teamId,
    index: stateTeam.index || dataTeam.index || dataTeam.trackCode || "03",
    name: stateTeam.name || dataTeam.name || "当前路演队伍",
    nameEn: stateTeam.nameEn || dataTeam.nameEn || dataTeam.track || "LIVE ROADSHOW",
    project: stateTeam.project || dataTeam.project || dataTeam.hostDepartment || "AI 创新解决方案路演中",
    color: stateTeam.color || dataTeam.color || "var(--neon)",
    colorRgb: stateTeam.colorRgb || dataTeam.colorRgb || dataTeam.rgb || "40, 255, 200",
    advisor: dataTeam.advisor || {},
    members: Array.isArray(dataTeam.members) ? dataTeam.members : [],
  };
}

function resolveNextRoadshowTeam() {
  const currentTeam = resolveRoadshowTeam();
  const stateTeam = roadshowState.nextTeam || {};
  const nextTeamId = roadshowState.nextTeamId || stateTeam.id || "";
  const byId = teamState.find((team) => team.id === nextTeamId);
  const currentIndex = teamState.findIndex((team) => team.id === currentTeam.id);
  const fallback = currentIndex >= 0
    ? teamState[(currentIndex + 1) % teamState.length]
    : teamState.find((team) => team.id !== currentTeam.id) || {};
  const dataTeam = byId || fallback || {};

  return {
    ...dataTeam,
    ...stateTeam,
    id: stateTeam.id || dataTeam.id || nextTeamId,
    name: stateTeam.name || dataTeam.name || "待定队伍",
    project: stateTeam.project || dataTeam.project || dataTeam.hostDepartment || "等待后端控场指定",
  };
}

function formatRoadshowDuration(durationMs = ROADSHOW_DURATION_MS) {
  const totalSeconds = Math.max(0, Math.floor((Number(durationMs) || ROADSHOW_DURATION_MS) / 1000));
  return {
    minutes: String(Math.floor(totalSeconds / 60)).padStart(2, "0"),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
  };
}

function renderRoadshowStage() {
  if (!roadshowTeamName) return;

  const team = resolveRoadshowTeam();
  const nextTeam = resolveNextRoadshowTeam();
  const roster = [team.advisor, ...team.members]
    .filter((member) => member && member.name)
    .slice(0, 5);

  roadshowStage?.style.setProperty("--roadshow-color", team.color || "var(--neon)");
  roadshowStage?.style.setProperty("--roadshow-color-rgb", team.colorRgb || "40, 255, 200");

  if (roadshowTeamCode) roadshowTeamCode.textContent = String(team.index || "03").padStart(2, "0");
  roadshowTeamName.textContent = team.name || "当前路演队伍";
  if (roadshowProject) roadshowProject.textContent = team.project || "AI 创新解决方案路演中";
  if (roadshowTrackName) roadshowTrackName.textContent = team.nameEn || team.track || "LIVE ROADSHOW";
  if (roadshowPhase) roadshowPhase.textContent = roadshowState.phase || "DEMO";
  if (roadshowNextTeamName) roadshowNextTeamName.textContent = nextTeam.name || "待定队伍";
  if (roadshowNextProject) roadshowNextProject.textContent = nextTeam.project || "等待后端控场指定";
  if (roadshowTimerTeam) roadshowTimerTeam.textContent = team.name || "当前队伍";
  if (roadshowTimerPhase) roadshowTimerPhase.textContent = roadshowState.phase || "DEMO";
  if (roadshowTimerNext) roadshowTimerNext.textContent = nextTeam.name || "待定队伍";
  if (roadshowRoster) {
    roadshowRoster.innerHTML = roster.map((member, index) => {
      const seatLabel = index === 0 ? "LEAD" : `S${String(index + 1).padStart(2, "0")}`;
      const avatarUrl = member.photo || member.avatar || member.idPhoto || "";
      const avatarState = avatarUrl ? "has-photo" : "is-placeholder";
      const avatarMark = index === 0 ? "赛" : String(member.name || "?").slice(0, 1);

      return `
      <div class="roadshow-member" data-member-seat="${escapeAttribute(seatLabel)}">
        <span class="roadshow-member-seat">${escapeHtml(seatLabel)}</span>
        <span class="roadshow-member-avatar ${avatarState}" data-avatar-mark="${escapeAttribute(avatarMark)}" style="--avatar-image: ${cssUrl(avatarUrl)}" aria-hidden="true"></span>
        <span class="roadshow-member-copy">
          <b>${escapeHtml(member.name || `队员 ${index + 1}`)}</b>
          <em>${escapeHtml(member.department || member.role || "路演成员")}</em>
        </span>
        <span class="roadshow-member-status">${escapeHtml(index === 0 ? "ON" : "READY")}</span>
      </div>
    `;
    }).join("");
  }
}

function readRoadshowStartedAt() {
  return Number(roadshowState.startedAt) || 0;
}

async function loadRoadshowState() {
  try {
    return applyRoadshowState(await window.AppData.loadRoadshow({
      storageKey: ROADSHOW_STORAGE_KEY,
      durationMs: ROADSHOW_DURATION_MS,
    }));
  } catch (error) {
    console.warn("Roadshow state failed to load.", error);
    return applyRoadshowState(roadshowState);
  }
}

function renderRoadshowTimer() {
  renderRoadshowStage();

  const startedAt = readRoadshowStartedAt();

  if (!startedAt) {
    const readyTimer = formatRoadshowDuration(roadshowState.durationMs);
    if (roadshowMinutes) roadshowMinutes.textContent = readyTimer.minutes;
    if (roadshowSeconds) roadshowSeconds.textContent = readyTimer.seconds;
    if (roadshowProgress) roadshowProgress.style.transform = "scaleX(0)";
    if (roadshowStartButton) {
      roadshowStartButton.disabled = true;
      roadshowStartButton.textContent = "ADMIN CONTROLLED";
    }
    if (roadshowCommandStatus) roadshowCommandStatus.textContent = "WAITING ADMIN";
    return;
  }

  const timer = window.AppLogic.getRoadshowTimerState({
    startedAt,
    durationMs: roadshowState.durationMs,
  });

  if (roadshowMinutes) roadshowMinutes.textContent = timer.minutes;
  if (roadshowSeconds) roadshowSeconds.textContent = timer.seconds;
  if (roadshowProgress) roadshowProgress.style.transform = `scaleX(${timer.progress})`;
  if (roadshowStartButton) {
    roadshowStartButton.disabled = true;
    roadshowStartButton.textContent = timer.isComplete ? "ROADSHOW COMPLETE" : "ROADSHOW RUNNING";
  }
  if (roadshowCommandStatus) {
    roadshowCommandStatus.textContent = timer.isComplete ? "COMPLETE" : "ON AIR";
  }
}

async function syncRoadshowTimer() {
  const requestId = ++roadshowLoadRequestId;
  await loadRoadshowState();
  if (requestId !== roadshowLoadRequestId) {
    return;
  }

  renderRoadshowTimer();
  if (!readRoadshowStartedAt()) {
    stopRoadshowTimer();
    return;
  }
  startRoadshowTimer();
}

function startRoadshowTimer() {
  window.clearInterval(roadshowTimer);
  renderRoadshowTimer();
  roadshowTimer = window.setInterval(renderRoadshowTimer, 1000);
}

function stopRoadshowTimer() {
  window.clearInterval(roadshowTimer);
  roadshowTimer = null;
}

function applyVoteResultsState(payload = {}) {
  voteResultsState = {
    pointScale: Array.isArray(payload.pointScale) && payload.pointScale.length
      ? payload.pointScale
      : [100, 85, 70, 55, 40],
    results: Array.isArray(payload.results) ? payload.results : [],
    status: payload.status || "voting",
    windowLabel: payload.windowLabel || "投票窗口开启中",
    updatedAt: payload.updatedAt || "",
  };

  return { ...voteResultsState };
}

function getVoteRanking() {
  return window.AppLogic.computeVoteRanking(voteResultsState.results, voteResultsState.pointScale);
}

function getFinalResults() {
  return window.AppLogic.computeFinalResults(voteResultsState.results, voteResultsState.pointScale);
}

async function loadVoteResultsState() {
  try {
    return applyVoteResultsState(await window.AppData.loadVoteResults(voteResultsState.results));
  } catch (error) {
    console.warn("Vote results failed to load.", error);
    return applyVoteResultsState(voteResultsState);
  }
}

function renderVoteProgress() {
  const ranking = getVoteRanking();
  const totalVotes = ranking[0]?.totalVotes || 0;

  if (voteWindowStatus) voteWindowStatus.textContent = voteResultsState.windowLabel || "VOTING";
  if (voteTotalCount) voteTotalCount.textContent = `${totalVotes} VOTES`;
  if (voteTotalOrbit) voteTotalOrbit.textContent = String(totalVotes).padStart(3, "0");

  if (!voteProgressList) return;
  if (!ranking.length) {
    voteProgressList.innerHTML = `
      <div class="vote-empty-state">
        <span>VOTE DATA</span>
        <strong>SYNCING...</strong>
      </div>
    `;
    return;
  }

  voteProgressList.innerHTML = ranking.map((team) => {
    const percent = Math.round(team.voteShare * 1000) / 10;

    return `
      <article class="vote-progress-row" style="--vote-color: ${escapeAttribute(team.color || "var(--neon)")}; --vote-color-rgb: ${escapeAttribute(team.colorRgb || "40, 255, 200")}; --vote-share: ${team.voteShare};">
        <div class="vote-row-rank">#${team.rank}</div>
        <div class="vote-row-copy">
          <strong>${escapeHtml(team.name || "待定队伍")}</strong>
          <span>${escapeHtml(team.track || team.nameEn || "AI HACKATHON TEAM")}</span>
        </div>
        <div class="vote-row-meter" aria-hidden="true"><i></i></div>
        <div class="vote-row-count">
          <strong>${team.votes}</strong>
          <span>${percent.toFixed(1)}%</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderVoteResult() {
  const ranking = getVoteRanking();
  const winner = ranking[0] || {};
  const scaleText = voteResultsState.pointScale.join(" / ");

  if (votePointScale) votePointScale.textContent = scaleText;

  if (voteWinnerPanel) {
    voteWinnerPanel.style.setProperty("--vote-color", winner.color || "var(--neon)");
    voteWinnerPanel.style.setProperty("--vote-color-rgb", winner.colorRgb || "40, 255, 200");
    voteWinnerPanel.innerHTML = ranking.length ? `
      <span class="vote-kicker">TOP RANKED BY PUBLIC VOTE</span>
      <div class="vote-winner-rank">#${winner.rank}</div>
      <h2>${escapeHtml(winner.name || "待定队伍")}</h2>
      <p>${escapeHtml(winner.project || "AI 创新解决方案")}</p>
      <div class="vote-winner-stats">
        <section>
          <span>票数</span>
          <strong>${winner.votes}</strong>
        </section>
        <section>
          <span>排名赋分</span>
          <strong>${winner.votePoints}</strong>
        </section>
      </div>
    ` : `
      <span class="vote-kicker">TOP RANKED BY PUBLIC VOTE</span>
      <h2>等待投票数据</h2>
      <p>结果同步后自动生成排名与赋分。</p>
    `;
  }

  if (!voteResultTable) return;
  voteResultTable.innerHTML = ranking.map((team) => {
    const percent = Math.round(team.voteShare * 1000) / 10;

    return `
      <article class="vote-result-row${team.rank === 1 ? " is-winner" : ""}" style="--vote-color: ${escapeAttribute(team.color || "var(--neon)")}; --vote-color-rgb: ${escapeAttribute(team.colorRgb || "40, 255, 200")};">
        <span class="vote-result-rank">${team.rank}</span>
        <div class="vote-result-team">
          <strong>${escapeHtml(team.name || "待定队伍")}</strong>
          <span>${escapeHtml(team.track || team.nameEn || "")} / ${escapeHtml(team.project || "")}</span>
        </div>
        <div class="vote-result-number">
          <span>票数</span>
          <strong>${team.votes}</strong>
        </div>
        <div class="vote-result-number vote-result-share">
          <span>占比</span>
          <strong>${percent.toFixed(1)}%</strong>
        </div>
        <div class="vote-result-points">
          <span>排名赋分</span>
          <strong>${team.votePoints}</strong>
        </div>
      </article>
    `;
  }).join("");
}

function renderFinalResult() {
  const finalResults = getFinalResults();
  const champion = finalResults[0] || {};
  const scaleText = voteResultsState.pointScale.join(" / ");

  if (finalResultPointScale) finalResultPointScale.textContent = scaleText;

  if (finalResultChampion) {
    finalResultChampion.style.setProperty("--vote-color", champion.color || "var(--neon)");
    finalResultChampion.style.setProperty("--vote-color-rgb", champion.colorRgb || "40, 255, 200");
    finalResultChampion.innerHTML = finalResults.length ? `
      <span class="vote-kicker">OVERALL CHAMPION</span>
      <div class="final-result-emblem">#1</div>
      <h2>${escapeHtml(champion.name || "待定队伍")}</h2>
      <p>${escapeHtml(champion.project || "AI 创新解决方案")}</p>
      <div class="final-result-score">
        <span>综合得分</span>
        <strong>${champion.totalScore.toFixed(2)}</strong>
      </div>
      <div class="final-result-metrics">
        <section>
          <span>专家评审均分</span>
          <strong>${champion.expertScore.toFixed(1)}</strong>
        </section>
        <section>
          <span>大众票数</span>
          <strong>${champion.votes}</strong>
        </section>
        <section>
          <span>大众赋分</span>
          <strong>${champion.votePoints}</strong>
        </section>
      </div>
    ` : `
      <span class="vote-kicker">OVERALL CHAMPION</span>
      <h2>等待最终结果</h2>
      <p>投票与评审数据同步后展示冠军。</p>
    `;
  }

  if (!finalResultLeaderboard) return;
  if (!finalResults.length) {
    finalResultLeaderboard.innerHTML = `
      <article class="final-result-row is-empty">
        <div class="final-result-team">
          <strong>等待冠军数据</strong>
          <span>综合得分同步后展示冠军队伍。</span>
        </div>
      </article>
    `;
    return;
  }

  const expertWeighted = Number((champion.expertScore * 0.7).toFixed(2));
  const voteWeighted = Number((champion.votePoints * 0.3).toFixed(2));

  finalResultLeaderboard.innerHTML = `
    <article class="final-result-row is-champion" style="--vote-color: ${escapeAttribute(champion.color || "var(--neon)")}; --vote-color-rgb: ${escapeAttribute(champion.colorRgb || "40, 255, 200")};">
      <div class="final-result-rank">冠军</div>
      <div class="final-result-team">
        <strong>${escapeHtml(champion.name || "待定队伍")}</strong>
        <span>${escapeHtml(champion.track || champion.nameEn || "")} / ${escapeHtml(champion.project || "")}</span>
      </div>
      <div class="final-result-total">
        <span>TOTAL</span>
        <strong>${champion.totalScore.toFixed(2)}</strong>
      </div>
    </article>
    <div class="final-result-score-grid">
      <section>
        <span>专家权重 70%</span>
        <strong>${expertWeighted.toFixed(2)}</strong>
      </section>
      <section>
        <span>大众权重 30%</span>
        <strong>${voteWeighted.toFixed(2)}</strong>
      </section>
      <section>
        <span>综合得分</span>
        <strong>${champion.totalScore.toFixed(2)}</strong>
      </section>
    </div>
    <div class="final-result-context">
      <span>CHAMPION PROFILE</span>
      <strong>${escapeHtml(champion.project || "AI 创新解决方案")}</strong>
      <p>${escapeHtml(champion.name || "冠军队伍")} 已在综合评分中位列第一，本页用于大屏最终展示。</p>
    </div>
  `;
}

async function syncVoteResults() {
  const requestId = ++voteResultsLoadRequestId;
  await loadVoteResultsState();
  if (requestId !== voteResultsLoadRequestId) {
    return;
  }

  renderVoteProgress();
  renderVoteResult();
  renderFinalResult();
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

  setMediaBackground(selectedPhoto, trainee.idPhoto || trainee.photo, trainee);
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
        <p class="sentence-text">${escapeHtml(trainee.sentence)}</p>
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
  const detailOrderTrainees = window.AppLogic.getDetailOrder(traineeState);
  const displayIndex = detailOrderTrainees.findIndex((item) => item.id === trainee.id) + 1;

  document.getElementById("detailIndex").textContent = `PROFILE ${String(displayIndex).padStart(2, "0")} / ${detailOrderTrainees.length}`;
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
  const detailOrderTrainees = window.AppLogic.getDetailOrder(traineeState);

  selectedId = window.AppLogic.resolveAdjacentTraineeId(detailOrderTrainees, selectedId, direction);
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
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
  appShell.classList.add("view-detail");
}

function closeDetail() {
  syncDetailMotion(false);
  detailLayer.classList.remove("is-open");
  detailLayer.setAttribute("aria-hidden", "true");
  appShell.dataset.view = appView === "home" ? "home" : "wall";
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
  appShell.classList.add(appView === "home" ? "view-home" : "view-wall");
  syncStages(appView === "home" ? "home" : "wall");
  syncRain(appView === "home" ? "home" : "wall");
}

function drawLandingLogo() {
  const canvas = document.getElementById("landingLogoCanvas");
  if (!canvas) return;
  const intro = rainRenderers.intro;
  if (!intro || typeof intro.getSamples !== "function") return;
  const data = intro.getSamples();
  if (!data || !data.samples || data.samples.length === 0) return;

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  const samples = data.samples;
  const TETROMINOES = data.TETROMINOES;
  const getRotatedOffset = data.getRotatedOffset;
  const cellSize = Math.max(0.5, w / 150);

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.group !== "icon") continue;

    const normX = s.ix / 0.47; // ICON_SPLIT is 0.47
    const cx = normX * w;
    const cy = s.iy * h;

    const shape = TETROMINOES[s.type];
    ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 0.94)`;
    const cellW = Math.max(0.5, cellSize - 0.25);

    for (let c = 0; c < 4; c++) {
      const [ox, oy] = getRotatedOffset(shape[c][0], shape[c][1], s.rotation);
      const cellX = cx + ox * cellSize;
      const cellY = cy + oy * cellSize;
      ctx.fillRect(cellX - cellW / 2, cellY - cellW / 2, cellW, cellW);
    }
  }
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
    appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
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
  appShell.classList.remove("view-intro", "view-intro-exit", "view-home", "view-welcome", "view-wall", "view-detail", "view-challenge", "view-discover", "view-team", "view-countdown", "view-roadshow", "view-vote", "view-vote-result", "view-final-result");
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
  if (discoverMenu) discoverMenu.classList.remove("is-open");
  if (discoverButton) discoverButton.setAttribute("aria-expanded", "false");
}

async function syncVisibleTimerState() {
  if (appView === "countdown") {
    await syncCountdownClock();
  }
  if (appView === "roadshow") {
    await syncRoadshowTimer();
  }
}

async function pollAdminState() {
  try {
    const state = await window.AppData.loadAdminState();
    await syncVisibleTimerState();
    const stageId = state?.currentStageId || "";
    if (!stageId) {
      return;
    }

    const stageSyncKey = window.AppLogic.createAdminStageSyncKey(stageId, state.updatedAt);
    const shouldSwitchStage = window.AppLogic.shouldApplyAdminStageChange(lastAdminStageSyncKey, stageSyncKey);
    lastAdminStageSyncKey = stageSyncKey;
    if (!shouldSwitchStage) {
      return;
    }

    const screenView = window.AppLogic.resolveStageScreenView(state.currentStageId);
    if (!screenView) {
      return;
    }

    window.clearTimeout(introTimer);
    window.clearTimeout(introExitTimer);
    isIntroExiting = false;
    challengeLayer.classList.remove("is-open", "is-drawing");
    challengeLayer.setAttribute("aria-hidden", "true");
    detailLayer.classList.remove("is-open");
    detailLayer.setAttribute("aria-hidden", "true");
    setView(screenView);
  } catch (error) {
    console.warn("Admin state polling failed.", error);
  }
}

function startAdminStatePolling() {
  pollAdminState();
  adminPollTimer = window.setInterval(pollAdminState, 3000);
}

function setLandingAuthState(state) {
  const authState = window.AppLogic.getFeishuLoginUiState(state);
  landingActions?.classList.toggle("is-authing", state === "authenticating");
  landingActions?.setAttribute("data-auth-state", state);

  if (enterButton) {
    enterButton.disabled = state === "authenticating";
    enterButton.textContent = authState.buttonLabel;
  }

}

async function handleLandingEntry() {
  const authState = window.AppLogic.getFeishuLoginUiState("authenticating");
  setLandingAuthState("authenticating");

  try {
    const result = await window.AppData.loginWithFeishu({
      redirectUrl: "./site.html#home",
      sessionKey: authState.sessionKey,
    });
    const redirectUrl = result?.redirectUrl || "./site.html#home";
    window.setTimeout(() => {
      window.location.href = redirectUrl;
    }, 520);
  } catch (error) {
    console.warn("Feishu login failed.", error);
    setLandingAuthState("idle");
  }
}

function bindEvents() {
  document.getElementById("skipIntroButton").addEventListener("click", () => {
    startIntroExit(true);
  });

  document.getElementById("backdropToggleBtn").addEventListener("click", () => {
    landingStage.classList.toggle("backdrop-mode");
  });

  enterButton.addEventListener("click", handleLandingEntry);

  document.getElementById("welcomeEnterButton").addEventListener("click", () => {
    setView(window.AppLogic.resolveWelcomeEntryTarget());
  });

  if (discoverButton && discoverMenu) {
    discoverButton.addEventListener("click", () => {
      const isOpen = discoverMenu.classList.toggle("is-open");
      discoverButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

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
    const teamActionButton = event.target.closest("[data-team-action]");

    if (profileNavDirection && detailLayer.classList.contains("is-open")) {
      switchAdjacentProfile(profileNavDirection);
      return;
    }
    if (teamActionButton) {
      handleTeamAction(teamActionButton);
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

  hostForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sentence = sentenceInput.value.trim();
    if (!sentence) {
      sentenceInput.focus();
      return;
    }

    const traineeId = selectedId;
    traineeState = window.AppLogic.updateSentence(traineeState, traineeId, sentence);
    closeChallenge();
    renderDetail();

    try {
      const savedTrainee = await window.AppData.saveSentence(traineeId, sentence);
      traineeState = traineeState.map((trainee) => trainee.id === traineeId ? savedTrainee : trainee);
      if (selectedId === traineeId) {
        renderDetail();
      }
    } catch (error) {
      console.warn("Sentence was kept locally because the API save failed.", error);
    }
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
    drawLandingLogo();
  });

  window.addEventListener("pagehide", () => {
    window.clearInterval(adminPollTimer);
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
  renderTeamFormation();
  resetDock();
  if (typeof window.IntroSequence === "undefined") {
    introTimer = window.setTimeout(() => {
      startIntroExit(false);
    }, INTRO_HOLD_MS);
  }

  traineeState = window.AppLogic.positionJasperAtCenter(await window.AppData.loadTrainees(fallbackTrainees));
  teamState = await window.AppData.loadTeams(getFallbackTeamState());
  applyRoadshowState(await window.AppData.loadRoadshow({
    storageKey: ROADSHOW_STORAGE_KEY,
    durationMs: ROADSHOW_DURATION_MS,
  }));
  applyVoteResultsState(await window.AppData.loadVoteResults([]));
  selectedId = traineeState.find((t) => t.id === "jasper")?.id || traineeState[0]?.id || "";
  renderPhotoWall();
  renderTeamFormation();
  renderRoadshowStage();
  renderVoteProgress();
  renderVoteResult();
  resetDock();
  startAdminStatePolling();
}

initApp();
