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
      overlapZBase = 70,
      overlapZRange = 80,
    } = {}
  ) {
    const count = Math.max(0, Number(total) || 0);
    if (count === 0) {
      return [];
    }

    const center = (count - 1) / 2;
    const arcSpan = Math.PI * 0.86;

    return Array.from({ length: count }, (_, index) => {
      const distanceFromCenter = index - center;
      const normalized = center === 0 ? 0 : distanceFromCenter / center;
      const theta = normalized * (arcSpan / 2);
      const liftedArc = Math.cos(theta);
      const edgeArc = Math.cos(arcSpan / 2);
      const normalizedLift = center === 0 ? 1 : (liftedArc - edgeArc) / (1 - edgeArc);
      const tangentRotation = Math.sin(theta) * maxRotation;

      return {
        x: Number((distanceFromCenter * step).toFixed(2)),
        lift: Number((-normalizedLift * maxLift).toFixed(2)),
        rotation: Number((-tangentRotation).toFixed(2)),
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
    const minCardWidth = width < 760 ? 84 : 126;
    const maxCardWidth = width < 760 ? 150 : 246;
    const naturalCardWidth = Math.min(maxCardWidth, availableWidth / (width < 760 ? 4.35 : 5.6), height * 0.34);
    const cardWidth = clamp(naturalCardWidth, minCardWidth, maxCardWidth);
    const cardHeight = cardWidth * 4 / 3;
    const fittedStep = count === 1 ? 0 : Math.max(0, (availableWidth - cardWidth) / (count - 1));
    const readableStep = clamp(fittedStep, cardWidth * 0.34, cardWidth * 0.66);
    const step = Math.floor(Math.min(readableStep, fittedStep) * 100) / 100;
    const visualWidth = count === 1 ? cardWidth : step * (count - 1) + cardWidth;
    const portraitHeight = cardHeight - clamp(cardHeight * 0.23, 34, 62);

    return {
      availableWidth: Number(availableWidth.toFixed(2)),
      cardHeight: Number(cardHeight.toFixed(2)),
      cardWidth: Number(cardWidth.toFixed(2)),
      dockInfluence: Number(clamp(step * 3.1, 180, 430).toFixed(2)),
      maxLift: Number(clamp(cardHeight * 0.18, 28, 84).toFixed(2)),
      maxRotation: width < 760 ? 4.6 : 5.8,
      portraitHeight: Number(portraitHeight.toFixed(2)),
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
    return ["business", "awards"].includes(target) ? target : "home";
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

  return {
    computeArcLayout,
    computeDockTransforms,
    computePhotoWallMetrics,
    getIntroTiming,
    nextIntroState,
    normalizeTrainee,
    pickKeywordPair,
    resolveAdjacentTraineeId,
    resolveDiscoverTarget,
    toggleProfileMedia,
    updateSentence,
  };
});
