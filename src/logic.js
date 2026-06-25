(function attachLogic(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.AppLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createLogic() {
  const introTiming = Object.freeze({
    holdMs: 4000,
    exitMs: 1200,
  });
  const feishuLoginSessionKey = "joincare_feishu_login";
  const missionCountdownDurationMs = 24 * 60 * 60 * 1000;
  const roleDefinitions = Object.freeze({
    player: Object.freeze({
      label: "参赛选手",
      shortLabel: "选手",
      permissions: Object.freeze({
        canJoinTeam: true,
        canSubmitWork: true,
        canVote: false,
        canScore: false,
        canAdmin: false,
        canControlBigscreen: false,
        canViewTeamProgress: true,
      }),
    }),
    judge: Object.freeze({
      label: "专家评委",
      shortLabel: "评委",
      permissions: Object.freeze({
        canJoinTeam: false,
        canSubmitWork: false,
        canVote: false,
        canScore: true,
        canAdmin: false,
        canControlBigscreen: false,
        canViewTeamProgress: true,
      }),
    }),
    public: Object.freeze({
      label: "大众评委",
      shortLabel: "观众",
      permissions: Object.freeze({
        canJoinTeam: false,
        canSubmitWork: false,
        canVote: true,
        canScore: false,
        canAdmin: false,
        canControlBigscreen: false,
        canViewTeamProgress: true,
      }),
    }),
    admin: Object.freeze({
      label: "管理员",
      shortLabel: "管理员",
      permissions: Object.freeze({
        canJoinTeam: false,
        canSubmitWork: false,
        canVote: false,
        canScore: false,
        canAdmin: true,
        canControlBigscreen: true,
        canViewTeamProgress: true,
      }),
    }),
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function computeDockTransforms({ centers, pointerX, maxInfluence = 260 }) {
    if (!Array.isArray(centers) || centers.length === 0 || Number.isNaN(pointerX)) {
      return [];
    }

    let activeIndex = 0;
    let closestDistance = Infinity;

    centers.forEach((center, index) => {
      const distance = Math.abs(center - pointerX);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    return centers.map((center, index) => {
      const distance = Math.abs(center - pointerX);
      const influence = clamp(1 - distance / maxInfluence, 0, 1);
      const curve = influence * influence;
      const side = center < pointerX ? -1 : center > pointerX ? 1 : 0;
      const activeBoost = index === activeIndex ? 0.08 : 0;

      return {
        scale: Number((0.86 + curve * 0.28 + activeBoost).toFixed(4)),
        translateX: Number((side * curve * 34).toFixed(4)),
        lift: Number((-curve * 22 - activeBoost * 22).toFixed(4)),
        opacity: Number((0.72 + curve * 0.28).toFixed(4)),
        isActive: index === activeIndex,
      };
    });
  }

  function computeArcLayout(
    total,
    {
      step = 122,
      maxLift = 72,
      maxRotation = 4,
      arcSpan = Math.PI * 0.68,
      edgeScale = 0.64,
      centerScale = 1.18,
      centerLiftBoost = 6,
      splitGap = 0,
      overlapZBase = 70,
      overlapZRange = 80,
    } = {}
  ) {
    const count = Math.max(0, Number(total) || 0);
    if (count === 0) {
      return [];
    }

    const centerIndex = count % 2 === 0 ? Math.floor((count - 1) / 2) : (count - 1) / 2;
    const scaleRange = centerScale - edgeScale;

    return Array.from({ length: count }, (_, index) => {
      let normalized = 0;
      if (index < centerIndex) {
        normalized = centerIndex === 0 ? 0 : (index - centerIndex) / centerIndex;
      } else if (index > centerIndex) {
        const rightCount = count - 1 - centerIndex;
        normalized = rightCount === 0 ? 0 : (index - centerIndex) / rightCount;
      } else {
        normalized = 0;
      }

      const theta = normalized * (arcSpan / 2);
      const liftedArc = Math.cos(theta);
      const edgeArc = Math.cos(arcSpan / 2);
      const normalizedLift = (liftedArc - edgeArc) / (1 - edgeArc);
      const shapedLift = normalizedLift; // linear mapping matches the circular curve of Math.cos
      const shapedScale = Math.pow(normalizedLift, 1.35);
      const tangentRotation = Math.sin(theta) * maxRotation;
      const arcX = (Math.sin(theta) / Math.sin(arcSpan / 2)) * centerIndex * step;

      const curveLift = -shapedLift * maxLift;
      let liftVal = curveLift;
      if (index === centerIndex) {
        liftVal -= centerLiftBoost;
      }

      return {
        curveLift: Number(curveLift.toFixed(2)),
        x: Number(arcX.toFixed(2)),
        lift: Number(liftVal.toFixed(2)),
        rotation: Number((-tangentRotation).toFixed(2)),
        scale: Number((edgeScale + shapedScale * scaleRange).toFixed(4)),
        zIndex: Math.round(overlapZBase + normalizedLift * overlapZRange),
      };
    });
  }

  function computePhotoWallMetrics({ total = 12, viewportWidth = 1280, viewportHeight = 720 } = {}) {
    const count = Math.max(1, Number(total) || 1);
    const width = Math.max(320, Number(viewportWidth) || 1280);
    const height = Math.max(520, Number(viewportHeight) || 720);
    const horizontalInset = clamp(width * 0.08, 34, 118);
    const availableWidth = Math.max(320, width - horizontalInset);
    const minCardWidth = width < 760 ? 82 : 128;
    const maxCardWidth = width < 760 ? 142 : 246;
    const naturalCardWidth = Math.min(maxCardWidth, availableWidth / (width < 760 ? 5.2 : 7.2), height * 0.21);
    const cardWidth = clamp(naturalCardWidth, minCardWidth, maxCardWidth);
    const portraitHeight = cardWidth * 4 / 3;
    const metaHeight = clamp(cardWidth * 0.2, width < 760 ? 30 : 38, width < 760 ? 42 : 56);
    const cardPadding = clamp(cardWidth * 0.045, 7, 12);
    const cardGap = clamp(cardWidth * 0.04, 6, 10);
    const cardHeight = portraitHeight + metaHeight + cardGap + cardPadding * 2;
    const denseMobileWall = width < 760 && count > 12;
    const readableStepMin = cardWidth * (denseMobileWall ? 0.24 : 0.28);
    const readableStepMax = cardWidth * 0.72;
    const arcFitDenominator = Math.max(1, count - 2.21);
    const idealStep = count === 1 ? 0 : Math.max(0, (availableWidth - 2.097 * cardWidth) / arcFitDenominator);
    const step = Math.floor(clamp(idealStep, readableStepMin, readableStepMax) * 100) / 100;
    const splitGap = count % 2 === 0 ? Math.max(0, 1.097 * cardWidth - 1.21 * step) : 0;
    const visualWidth = count === 1 ? cardWidth : step * (count - 1) + cardWidth + splitGap;

    return {
      availableWidth: Number(availableWidth.toFixed(2)),
      cardHeight: Number(cardHeight.toFixed(2)),
      cardGap: Number(cardGap.toFixed(2)),
      cardPadding: Number(cardPadding.toFixed(2)),
      cardWidth: Number(cardWidth.toFixed(2)),
      dockInfluence: Number(clamp(step * 3.1, 180, 430).toFixed(2)),
      maxLift: Number(clamp(cardHeight * 0.26, width < 760 ? 48 : 62, 110).toFixed(2)),
      maxRotation: width < 760 ? 6.4 : 6.8,
      metaHeight: Number(metaHeight.toFixed(2)),
      portraitHeight: Number(portraitHeight.toFixed(2)),
      splitGap: Number(splitGap.toFixed(2)),
      step: Number(step.toFixed(2)),
      visualWidth: Number(visualWidth.toFixed(2)),
    };
  }

  function normalizePair(pair) {
    return pair.slice().sort().join("|");
  }

  function pickKeywordPair(keywords, previousPairs = [], salt = Date.now()) {
    const uniqueKeywords = Array.from(new Set(keywords)).filter(Boolean);
    if (uniqueKeywords.length < 2) {
      return uniqueKeywords;
    }

    const used = new Set(previousPairs.map(normalizePair));
    const allPairs = [];

    for (let i = 0; i < uniqueKeywords.length; i += 1) {
      for (let j = i + 1; j < uniqueKeywords.length; j += 1) {
        allPairs.push([uniqueKeywords[i], uniqueKeywords[j]]);
      }
    }

    const candidates = allPairs.filter((pair) => !used.has(normalizePair(pair)));
    const pool = candidates.length > 0 ? candidates : allPairs;
    const index = Math.abs(Number(salt) || 0) % pool.length;

    return pool[index];
  }

  function pickKeywordPairAB(libraryA, libraryB, previousPairs = [], salt = Date.now()) {
    const cleanA = Array.from(new Set(libraryA)).filter(Boolean);
    const cleanB = Array.from(new Set(libraryB)).filter(Boolean);

    if (cleanA.length === 0 || cleanB.length === 0) {
      return [];
    }

    const used = new Set(previousPairs.map((pair) => `${pair[0]}|${pair[1]}`));
    const pool = [];

    for (const a of cleanA) {
      for (const b of cleanB) {
        if (!used.has(`${a}|${b}`)) {
          pool.push([a, b]);
        }
      }
    }

    const candidates = pool.length > 0 ? pool : cleanA.flatMap((a) => cleanB.map((b) => [a, b]));
    const index = Math.abs(Number(salt) || 0) % candidates.length;

    return candidates[index];
  }

  function updateSentence(trainees, traineeId, sentence) {
    const cleanSentence = String(sentence || "").trim();

    return trainees.map((trainee) => {
      if (trainee.id !== traineeId) {
        return trainee;
      }

      return {
        ...trainee,
        sentence: cleanSentence,
      };
    });
  }

  function normalizeTrainee(trainee) {
    const safeTrainee = trainee || {};

    return {
      ...safeTrainee,
      tools: safeTrainee.tools || safeTrainee.aiPartners || "",
      favoriteTool: safeTrainee.favoriteTool || safeTrainee.favoriteAI || "",
      problem: safeTrainee.problem || safeTrainee.aiProblem || "",
      aiPower: safeTrainee.aiPower || "",
      funFact: safeTrainee.funFact || safeTrainee.tags || "",
      meme: safeTrainee.meme || safeTrainee.memeText || "MEME",
      idPhoto: safeTrainee.idPhoto || safeTrainee.photo || "",
      photo: safeTrainee.photo || "",
      memeImage: safeTrainee.memeImage || "",
      portrait: safeTrainee.portrait || "",
      sentence: safeTrainee.sentence || "",
      previousPairs: Array.isArray(safeTrainee.previousPairs) ? safeTrainee.previousPairs : [],
    };
  }

  function toggleProfileMedia(currentMode) {
    return currentMode === "photo" ? "meme" : "photo";
  }

  function nextIntroState() {
    return "home";
  }

  function resolveLandingCtaTarget() {
    return "welcome";
  }

  function getFeishuLoginUiState(state = "idle") {
    return {
      buttonLabel: state === "authenticating" ? "正在登录飞书" : "解锁任务",
      statusText: "",
      sessionKey: feishuLoginSessionKey,
    };
  }

  function normalizeRole(role) {
    const key = String(role || "").trim();
    return roleDefinitions[key] ? key : "";
  }

  function getRoleLabel(role) {
    const key = normalizeRole(role);
    return key ? roleDefinitions[key].label : "待鉴权";
  }

  function getRolePermissions(role) {
    const key = normalizeRole(role);
    const source = key ? roleDefinitions[key].permissions : {
      canJoinTeam: false,
      canSubmitWork: false,
      canVote: false,
      canScore: false,
      canAdmin: false,
      canControlBigscreen: false,
      canViewTeamProgress: true,
    };

    return { ...source };
  }

  function getRoleNavItems(role) {
    const key = normalizeRole(role) || "public";
    const shared = [
      { key: "home", label: "首页" },
      { key: "people", label: "新生看板" },
      { key: "schedule", label: "赛事指南" },
      { key: "team", label: key === "player" ? "组队" : "组队进度" },
      { key: "gallery", label: "作品展厅" },
    ];
    const byRole = {
      player: [],
      judge: [{ key: "judge", label: "评委评分" }],
      public: [{ key: "vote", label: "投票" }],
      admin: [{ key: "admin", label: "管理后台", href: "./admin.html" }],
    };

    return [...shared, ...(byRole[key] || []), { key: "result", label: "排行榜" }];
  }

  function getRoleWorkbenchModel({
    role,
    joinedTeamName = "",
    joinedTeamMeta = "",
    joinedTeamProject = "",
    votedTeamName = "",
    scoredTeams = 0,
    totalTeams = 0,
  } = {}) {
    const key = normalizeRole(role) || "public";
    const label = getRoleLabel(key);
    const total = Number(totalTeams) || 0;
    const scored = Math.max(0, Number(scoredTeams) || 0);

    const baseIdentity = {
      label: "当前身份",
      value: label,
      sub: "权限已按飞书账号完成同步",
      icon: "user",
      accent: "var(--neon)",
      nav: "me",
    };

    const models = {
      player: {
        eyebrow: "PLAYER CONSOLE",
        title: "选手工作台",
        subtitle: "抢赛道、认领队伍职责，并提交最终作品。",
        chips: [joinedTeamName ? "已组队" : "待组队", "可提交作品", "不可投票"],
        statusCards: [
          baseIdentity,
          {
            label: "组队状态",
            value: joinedTeamName || "未加入队伍",
            sub: joinedTeamName ? joinedTeamMeta : "可选择一个赛道队伍加入",
            icon: "team",
            accent: "var(--neon-2)",
            nav: "team",
          },
          {
            label: "作品提交",
            value: joinedTeamName ? "进入工作台" : "待组队",
            sub: joinedTeamName
              ? (joinedTeamProject ? `${joinedTeamProject} · 进入队伍工作台提交作品` : "进入队伍工作台完善作品信息并提交")
              : "组队后开放作品提交",
            icon: "upload",
            accent: "#6ad7ff",
            nav: "team",
          },
          {
            label: "投票权限",
            value: "不参与投票",
            sub: "选手默认不参与大众投票",
            icon: "vote",
            accent: "var(--muted)",
            nav: "gallery",
          },
        ],
        quickEntries: [
          { nav: "team", title: "报名组队", sub: "抢赛道并认领岗位职责" },
          { nav: "team", title: "作品提交", sub: "进入队伍工作台提交作品" },
          { nav: "gallery", title: "作品展厅", sub: "查看作品详情" },
          { nav: "schedule", title: "赛事指南", sub: "查看赛事机制与规则" },
        ],
      },
      judge: {
        eyebrow: "JUDGE CONSOLE",
        title: "评委工作台",
        subtitle: "查看待评作品、完成五维评分，并保留自己的评分记录。",
        chips: ["组队只读", "专家评分", "不参与投票"],
        statusCards: [
          baseIdentity,
          {
            label: "待评作品",
            value: `${Math.max(0, total - scored)}/${total} 队`,
            sub: "进入评委评分页完成五维评分",
            icon: "scale",
            accent: "var(--warning)",
            nav: "judge",
          },
          {
            label: "评分进度",
            value: `${scored}/${total} 队`,
            sub: "结果发布前仅展示自己的评分记录",
            icon: "check",
            accent: "#6ad7ff",
            nav: "judge",
          },
          {
            label: "组队进度",
            value: "仅可查看",
            sub: "查看各赛道名额与满员状态",
            icon: "team",
            accent: "var(--neon-2)",
            nav: "team",
          },
        ],
        quickEntries: [
          { nav: "judge", title: "待评作品", sub: "进入五维评分" },
          { nav: "judge", title: "我的评分记录", sub: "查看本地评分草稿" },
          { nav: "gallery", title: "作品展厅", sub: "浏览作品详情" },
          { nav: "schedule", title: "赛事指南", sub: "查看路演安排" },
        ],
      },
      public: {
        eyebrow: "PUBLIC VOTE DESK",
        title: "观众评委工作台",
        subtitle: "浏览作品，并在投票窗口内为一个团队投出一票。",
        chips: [votedTeamName ? "已投票" : "待投票", "组队只读", "不可评分"],
        statusCards: [
          baseIdentity,
          {
            label: "投票状态",
            value: votedTeamName ? `已投 ${votedTeamName}` : "尚未投票",
            sub: votedTeamName ? "一人一票，投票已锁定" : "前往作品展厅或投票页完成",
            icon: "vote",
            accent: "#6ad7ff",
            nav: "vote",
          },
          {
            label: "组队进度",
            value: "仅可查看",
            sub: "查看当前队伍形成情况",
            icon: "team",
            accent: "var(--neon-2)",
            nav: "team",
          },
          {
            label: "专家评分",
            value: "无权限",
            sub: "专家评分入口仅向专家评委开放",
            icon: "scale",
            accent: "var(--muted)",
            nav: "gallery",
          },
        ],
        quickEntries: [
          { nav: "vote", title: "投票入口", sub: "查看投票状态" },
          { nav: "gallery", title: "作品展厅", sub: "查看作品详情" },
          { nav: "team", title: "组队进度", sub: "查看赛道满员状态" },
          { nav: "result", title: "排行榜", sub: "查看综合结果" },
        ],
      },
      admin: {
        eyebrow: "ADMIN CONTROL",
        title: "管理员控制台",
        subtitle: "管理流程、权限、投票评分与大屏展示，不参与选手操作。",
        chips: ["后台管理", "大屏控制", "结果发布"],
        statusCards: [
          baseIdentity,
          {
            label: "组队管理",
            value: "可控场",
            sub: "开关组队、微调成员、补全空位",
            icon: "team",
            accent: "var(--neon-2)",
            nav: "team",
          },
          {
            label: "投票 / 评分",
            value: "进度管理",
            sub: "配置窗口、查看异常、汇总结果",
            icon: "scale",
            accent: "var(--warning)",
            href: "./admin.html",
          },
          {
            label: "大屏状态",
            value: "可推送",
            sub: "切换现场大屏与最终结果",
            icon: "stage",
            accent: "#6ad7ff",
            href: "./admin.html",
          },
        ],
        quickEntries: [
          { href: "./admin.html", title: "管理后台", sub: "进入后台控制台" },
          { href: "./admin.html", title: "大屏控制", sub: "推送或切换现场画面" },
          { href: "./admin.html", title: "用户与权限", sub: "维护账号角色映射" },
          { nav: "result", title: "排行榜", sub: "查看综合结果" },
        ],
      },
    };

    return models[key];
  }

  function getMissionCountdownState({
    startedAt,
    now = Date.now(),
    durationMs = missionCountdownDurationMs,
  } = {}) {
    const startTime = Number.isFinite(Number(startedAt)) ? Number(startedAt) : Number(now);
    const currentTime = Number.isFinite(Number(now)) ? Number(now) : startTime;
    const totalDuration = Math.max(1, Number(durationMs) || missionCountdownDurationMs);
    const elapsedMs = Math.max(0, currentTime - startTime);
    const remainingMs = Math.max(0, totalDuration - elapsedMs);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      progress: Math.min(1, Number((elapsedMs / totalDuration).toFixed(4))),
      remainingMs,
      isComplete: remainingMs === 0,
    };
  }

  function getRoadshowTimerState({
    startedAt,
    now = Date.now(),
    durationMs = 15 * 60 * 1000,
  } = {}) {
    const startTime = Number.isFinite(Number(startedAt)) ? Number(startedAt) : Number(now);
    const currentTime = Number.isFinite(Number(now)) ? Number(now) : startTime;
    const totalDuration = Math.max(1, Number(durationMs) || 15 * 60 * 1000);
    const elapsedMs = Math.max(0, currentTime - startTime);
    const remainingMs = Math.max(0, totalDuration - elapsedMs);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return {
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
      progress: Math.min(1, Number((elapsedMs / totalDuration).toFixed(3))),
      remainingMs,
      isComplete: remainingMs === 0,
    };
  }

  function computeVoteRanking(results = [], pointScale = []) {
    const list = Array.isArray(results) ? results : [];
    const scale = Array.isArray(pointScale) ? pointScale : [];
    const totalVotes = list.reduce((sum, item) => {
      const votes = Number(item?.votes);
      return sum + (Number.isFinite(votes) && votes > 0 ? votes : 0);
    }, 0);

    return [...list]
      .map((item, originalIndex) => ({
        ...item,
        votes: Number.isFinite(Number(item?.votes)) && Number(item?.votes) > 0 ? Number(item.votes) : 0,
        originalIndex,
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) {
          return b.votes - a.votes;
        }
        return a.originalIndex - b.originalIndex;
      })
      .map((item, index) => {
        const { originalIndex, ...team } = item;
        const voteShare = totalVotes > 0 ? Number((team.votes / totalVotes).toFixed(4)) : 0;

        return {
          ...team,
          rank: index + 1,
          voteShare,
          votePoints: Number(scale[index]) || 0,
          totalVotes,
        };
      });
  }

  function getExpertScoreValue(expert) {
    if (Array.isArray(expert)) {
      const validScores = expert
        .map((score) => Number(score))
        .filter((score) => Number.isFinite(score));

      if (!validScores.length) {
        return 0;
      }

      const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      return Number(average.toFixed(2));
    }

    const score = Number(expert);
    return Number.isFinite(score) ? score : 0;
  }

  function computeFinalResults(results = [], pointScale = []) {
    const ranking = computeVoteRanking(results, pointScale);

    return ranking
      .map((team, index) => {
        const expertScore = getExpertScoreValue(team.expert);
        const totalScore = Number((expertScore * 0.7 + team.votePoints * 0.3).toFixed(2));

        return {
          ...team,
          expertScore,
          totalScore,
          originalFinalIndex: index,
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        if (b.expertScore !== a.expertScore) {
          return b.expertScore - a.expertScore;
        }
        if (b.votePoints !== a.votePoints) {
          return b.votePoints - a.votePoints;
        }
        if (a.rank !== b.rank) {
          return a.rank - b.rank;
        }
        return a.originalFinalIndex - b.originalFinalIndex;
      })
      .map((team, index) => {
        const { originalFinalIndex, ...rest } = team;
        return {
          ...rest,
          rank: index + 1,
          isChampion: index === 0,
        };
      });
  }

  function resolveWelcomeEntryTarget() {
    return "wall";
  }

  function getIntroTiming() {
    return { ...introTiming };
  }

  function resolveDiscoverTarget(target) {
    return ["awards"].includes(target) ? target : "home";
  }

  function resolveStageScreenView(stageId) {
    const stageViews = {
      opening: "welcome",
      icebreaker: "wall",
      speech: "home",
      tracks: "discover",
      team: "team",
      vote: "vote",
      result: "vote-result",
      final: "final-result",
    };

    return stageViews[stageId] || "";
  }

  function resolveScreenViewFromRouteStage(stageValue) {
    const cleanValue = String(stageValue || "").trim();
    if (!cleanValue) {
      return "";
    }

    const routeViews = new Set([
      "home",
      "welcome",
      "wall",
      "discover",
      "team",
      "countdown",
      "roadshow",
      "vote",
      "vote-result",
      "final-result",
    ]);
    const routeAliases = {
      "vote-progress": "vote",
      result: "vote-result",
      final: "final-result",
    };

    if (routeViews.has(cleanValue)) {
      return cleanValue;
    }

    return routeAliases[cleanValue] || resolveStageScreenView(cleanValue);
  }

  function createAdminStageSyncKey(stageId, updatedAt) {
    const cleanStageId = String(stageId || "").trim();
    if (!cleanStageId) {
      return "";
    }

    return `${cleanStageId}@${String(updatedAt || "")}`;
  }

  function shouldApplyAdminStageChange(previousStageSyncKey, nextStageSyncKey) {
    return Boolean(previousStageSyncKey && nextStageSyncKey && previousStageSyncKey !== nextStageSyncKey);
  }

  function resolveAdjacentTraineeId(trainees, currentId, direction) {
    const list = Array.isArray(trainees) ? trainees.filter((trainee) => trainee?.id) : [];
    if (list.length === 0) {
      return "";
    }

    const currentIndex = list.findIndex((trainee) => trainee.id === currentId);
    if (currentIndex < 0) {
      return list[0].id;
    }

    const step = direction === "previous" ? -1 : 1;
    const nextIndex = (currentIndex + step + list.length) % list.length;

    return list[nextIndex].id;
  }

  function positionJasperAtCenter(trainees) {
    if (!Array.isArray(trainees)) return [];
    const index = trainees.findIndex((t) => t?.id === "jasper");
    if (index === -1) return trainees;
    const list = [...trainees];
    const jasper = list.splice(index, 1)[0];
    const centerIdx = Math.floor(list.length / 2);
    list.splice(centerIdx, 0, jasper);
    return list;
  }

  function getDetailOrder(trainees) {
    if (!Array.isArray(trainees)) return [];
    const order = [
      "jasper",
      "zhang-rui",
      "lin-yixin",
      "tang-jingpei",
      "gu-lingqian",
      "xu-meisheng",
      "huang-zhaoqiang",
      "li-feng",
      "zhang-hengrui",
      "li-beibei",
      "zhan-meiling",
      "chen-xulin",
      "wu-shuo",
      "zhao-yiming",
    ];
    return [...trainees].sort((a, b) => {
      const idxA = order.indexOf(a?.id);
      const idxB = order.indexOf(b?.id);
      const valA = idxA === -1 ? Infinity : idxA;
      const valB = idxB === -1 ? Infinity : idxB;
      return valA - valB;
    });
  }

  return {
    positionJasperAtCenter,
    getDetailOrder,
    computeArcLayout,
    computeDockTransforms,
    computePhotoWallMetrics,
    computeVoteRanking,
    computeFinalResults,
    getFeishuLoginUiState,
    getIntroTiming,
    getMissionCountdownState,
    getRoadshowTimerState,
    getRoleLabel,
    getRolePermissions,
    getRoleWorkbenchModel,
    getRoleNavItems,
    nextIntroState,
    normalizeTrainee,
    pickKeywordPair,
    pickKeywordPairAB,
    createAdminStageSyncKey,
    resolveLandingCtaTarget,
    resolveAdjacentTraineeId,
    shouldApplyAdminStageChange,
    resolveDiscoverTarget,
    resolveScreenViewFromRouteStage,
    resolveStageScreenView,
    resolveWelcomeEntryTarget,
    toggleProfileMedia,
    updateSentence,
  };
});
