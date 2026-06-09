(function attachLogic(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.AppLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createLogic() {
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

    return Array.from({ length: count }, (_, index) => {
      const distanceFromCenter = index - center;
      const normalized = center === 0 ? 0 : distanceFromCenter / center;
      const closeness = 1 - Math.min(1, Math.abs(normalized));
      const liftedArc = Math.pow(closeness, 1.65);

      return {
        x: Number((distanceFromCenter * step).toFixed(2)),
        lift: Number((-liftedArc * maxLift).toFixed(2)),
        rotation: Number((-normalized * maxRotation).toFixed(2)),
        zIndex: Math.round(overlapZBase + liftedArc * overlapZRange),
      };
    });
  }

  function computePhotoWallMetrics({ total = 12, viewportWidth = 1280, viewportHeight = 720 } = {}) {
    const count = Math.max(1, Number(total) || 1);
    const width = Math.max(320, Number(viewportWidth) || 1280);
    const height = Math.max(520, Number(viewportHeight) || 720);
    const horizontalInset = clamp(width * 0.1, 48, 128);
    const availableWidth = Math.max(320, width - horizontalInset);
    const minCardWidth = width < 760 ? 66 : 88;
    const naturalCardWidth = Math.min(218, availableWidth / 9.8, height * 0.21);
    const cardWidth = clamp(naturalCardWidth, minCardWidth, 218);
    const fittedStep = count === 1 ? 0 : Math.max(0, (availableWidth - cardWidth) / (count - 1));
    const readableStep = clamp(fittedStep, cardWidth * 0.58, cardWidth * 0.98);
    const step = Math.floor(Math.min(readableStep, fittedStep) * 100) / 100;
    const visualWidth = count === 1 ? cardWidth : step * (count - 1) + cardWidth;
    const desiredPortraitHeight = height * (width < 760 ? 0.31 : 0.34);
    const portraitHeight = clamp(desiredPortraitHeight, cardWidth * 1.86, Math.min(height * 0.37, 380));

    return {
      availableWidth: Number(availableWidth.toFixed(2)),
      cardWidth: Number(cardWidth.toFixed(2)),
      dockInfluence: Number(clamp(step * 3.1, 180, 430).toFixed(2)),
      maxLift: Number(clamp(cardWidth * 0.32, 24, 72).toFixed(2)),
      maxRotation: width < 760 ? 3.8 : 5.2,
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

  return {
    computeArcLayout,
    computeDockTransforms,
    computePhotoWallMetrics,
    pickKeywordPair,
    updateSentence,
  };
});
