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
      edgeScale = 0.74,
      centerScale = 1.1,
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
      const shapedScale = Math.pow(normalizedLift, 1.1); // subtle scale easing
      const tangentRotation = Math.sin(theta) * maxRotation;
      const arcX = (Math.sin(theta) / Math.sin(arcSpan / 2)) * centerIndex * step;

      let liftVal = -shapedLift * maxLift;
      if (index === centerIndex) {
        liftVal -= 18; // Elevate C-position card slightly to create hierarchy (more negative = higher on screen)
      }

      return {
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
    const readableStepMin = cardWidth * 0.28;
    const readableStepMax = cardWidth * 0.72;
    const idealStep = count === 1 ? 0 : Math.max(0, (availableWidth - 2.097 * cardWidth) / 9.79);
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
      maxLift: Number(clamp(cardHeight * 0.42, 90, 180).toFixed(2)),
      maxRotation: width < 760 ? 8.6 : 9.8,
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

  function getIntroTiming() {
    return { ...introTiming };
  }

  function resolveDiscoverTarget(target) {
    return ["awards"].includes(target) ? target : "home";
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
    getIntroTiming,
    nextIntroState,
    normalizeTrainee,
    pickKeywordPair,
    pickKeywordPairAB,
    resolveAdjacentTraineeId,
    resolveDiscoverTarget,
    toggleProfileMedia,
    updateSentence,
  };
});
