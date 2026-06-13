(function attachIntroSequence(root, factory) {
  root.IntroSequence = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createIntroFactory() {
  "use strict";

  // ---- timeline (ms) ----------------------------------------------------
  const T = {
    rainOnly: 1200,   // pure code-rain on black
    assemble: 1700,   // rain glyphs coalesce into the BIG centred icon
    iconHold: 600,    // hold the hero icon
    shrink: 1000,     // icon scales down / moves to final lockup slot
    word: 1500,       // 健康元 + JOINCARE characters assemble
    sub: 1600,        // subtitle decodes in (green / yellow)
    tail: 700,        // final hold before handing off to landing
  };
  // absolute markers
  const M = {};
  M.assembleStart = T.rainOnly;
  M.assembleEnd = M.assembleStart + T.assemble;
  M.shrinkStart = M.assembleEnd + T.iconHold;
  M.shrinkEnd = M.shrinkStart + T.shrink;
  M.wordStart = M.shrinkStart + 200;
  M.wordEnd = M.wordStart + T.word;
  M.subStart = M.wordEnd - 200;
  M.subEnd = M.subStart + T.sub;
  M.total = M.subEnd + T.tail;

  const ICON_SPLIT = 0.42;            // image-fraction boundary icon | wordmark
  const SUBTITLE = "AI Innovation Hackathon 2026";
  const LOGO_GLYPHS = "01101001AIJC<>{}".split("");
  const RAIN_GLYPHS = "010101AIJOINCARE{}[]<>".split("");
  const SUB_SCRAMBLE = "01<>{}/\\=+*#$%&ABCDEFKLMNXYZ".split("");

  const GREEN = [40, 255, 200];       // --neon
  const LIME = [167, 255, 79];        // --neon-2
  const YELLOW = [246, 255, 129];     // --warning

  // ---- math helpers -----------------------------------------------------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mix = (c1, c2, t) => [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  function createIntroSequence(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return { start() { options.onComplete && options.onComplete(); }, stop() {}, resize() {} };
    }
    const ctx = canvas.getContext("2d");
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};
    const logoSrc = options.logoSrc || "./assets/joincare-full-clean.png";

    let running = false;
    let finished = false;
    let raf = 0;
    let startTs = 0;

    let samples = [];        // {ix,iy,color,group,glyph,delay}
    let layout = null;       // cached geometry for current size
    let rainCols = [];

    const logoImg = new Image();
    let logoReady = false;

    // offscreen for pixel sampling
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- size / layout --------------------------------------------------
    function viewport() {
      return {
        w: Math.max(1, canvas.clientWidth),
        h: Math.max(1, canvas.clientHeight),
      };
    }

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const { w, h } = viewport();
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildLayout();
      buildRain();
    }

    function buildLayout() {
      const { w, h } = viewport();
      const logoW = clamp(Math.min(w * 0.7, 960), 320, Math.max(320, w * 0.9));
      const logoH = logoW * (988 / 2891);
      const logoX = (w - logoW) / 2;
      const logoY = h * 0.30;

      // icon-group final bounding box (image fractions < ICON_SPLIT)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      samples.forEach((s) => {
        if (s.group !== "icon") return;
        const fx = logoX + s.ix * logoW;
        const fy = logoY + s.iy * logoH;
        if (fx < minX) minX = fx;
        if (fx > maxX) maxX = fx;
        if (fy < minY) minY = fy;
        if (fy > maxY) maxY = fy;
      });
      if (!isFinite(minX)) { minX = logoX; maxX = logoX + logoW * 0.4; minY = logoY; maxY = logoY + logoH; }

      const iconCx = (minX + maxX) / 2;
      const iconCy = (minY + maxY) / 2;
      const iconH = Math.max(1, maxY - minY);
      const heroH = h * 0.46;
      const k = heroH / iconH;

      layout = {
        w, h, logoW, logoH, logoX, logoY,
        iconCx, iconCy, k,
        heroCx: w / 2, heroCy: h * 0.40,
        gap: Math.max(7, Math.round(logoW / 120)),
        baseFont: clamp(logoW / 175, 4.5, 8),
        subY: logoY + logoH + h * 0.085,
        subFont: clamp(logoW * 0.062, 22, 64),
      };
    }

    function buildRain() {
      const { w, h } = viewport();
      const fs = w < 720 ? 13 : 15;
      const step = fs * 0.92;
      rainCols = Array.from({ length: Math.ceil(w / step) }, (_, i) => ({
        x: i * step,
        y: Math.random() * -h,
        speed: 1.3 + Math.random() * 3.2,
        alpha: 0.35 + Math.random() * 0.6,
        fs,
      }));
    }

    // ---- pixel sampling -------------------------------------------------
    function buildSamples() {
      const iw = logoImg.naturalWidth || 2891;
      const ih = logoImg.naturalHeight || 988;
      // higher sampler resolution + tighter stride => more, finer characters
      const SW = 900;
      const SH = Math.round(SW * ih / iw);
      sampler.width = SW;
      sampler.height = SH;
      sctx.clearRect(0, 0, SW, SH);
      sctx.drawImage(logoImg, 0, 0, SW, SH);
      const data = sctx.getImageData(0, 0, SW, SH).data;

      const gap = 4; // sampling stride in sampler px (smaller = denser)
      samples = [];
      for (let y = 0; y < SH; y += gap) {
        for (let x = 0; x < SW; x += gap) {
          const idx = (y * SW + x) * 4;
          const a = data[idx + 3];
          if (a < 90) continue;
          let r = data[idx], g = data[idx + 1], b = data[idx + 2];
          // bias washed-out pixels toward the brand neon so they read on black
          if (r + g + b > 690) { r = GREEN[0]; g = GREEN[1]; b = GREEN[2]; }
          const ix = x / SW;
          const iy = y / SH;
          samples.push({
            ix, iy,
            color: [r, g, b],
            group: ix < ICON_SPLIT ? "icon" : "word",
            glyph: LOGO_GLYPHS[(Math.random() * LOGO_GLYPHS.length) | 0],
            delay: Math.random(),
            seedX: (Math.random() - 0.5) * 70,
            seedY: -120 - Math.random() * 160,
          });
        }
      }
    }

    // ---- per-frame drawing ----------------------------------------------
    function drawRain(globalAlpha) {
      const { h } = viewport();
      ctx.globalCompositeOperation = "source-over";
      ctx.textBaseline = "top";
      rainCols.forEach((c) => {
        ctx.font = `${c.fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        const glyph = RAIN_GLYPHS[(Math.random() * RAIN_GLYPHS.length) | 0];
        const head = Math.random() > 0.9;
        const a = c.alpha * globalAlpha;
        ctx.fillStyle = head
          ? `rgba(216, 255, 239, ${a})`
          : `rgba(37, 245, 197, ${a * 0.7})`;
        ctx.fillText(glyph, c.x, c.y);
        c.y += c.speed;
        if (c.y > h + 30) {
          c.y = Math.random() * -160;
          c.speed = 1.3 + Math.random() * 3.2;
        }
      });
    }

    function drawLogo(elapsed) {
      const L = layout;
      const assembleP = clamp((elapsed - M.assembleStart) / T.assemble, 0, 1);
      const shrinkP = clamp((elapsed - M.shrinkStart) / T.shrink, 0, 1);
      const wordP = clamp((elapsed - M.wordStart) / T.word, 0, 1);
      const flicker = (elapsed / 70) | 0;

      ctx.globalCompositeOperation = "lighter";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      const scaleNow = shrinkP > 0 ? lerp(L.k, 1, easeInOut(shrinkP)) : L.k;
      const iconFont = Math.max(5, L.baseFont * scaleNow);
      const wordFont = Math.max(5, L.baseFont);

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        let x, y, alpha, font;

        if (s.group === "icon") {
          const fx = L.logoX + s.ix * L.logoW;
          const fy = L.logoY + s.iy * L.logoH;
          const hx = L.heroCx + (fx - L.iconCx) * L.k;
          const hy = L.heroCy + (fy - L.iconCy) * L.k;
          if (shrinkP > 0) {
            const t = easeInOut(shrinkP);
            x = lerp(hx, fx, t);
            y = lerp(hy, fy, t);
            alpha = 1;
          } else {
            const pp = easeOut(clamp((assembleP - s.delay * 0.4) / 0.6, 0, 1));
            x = lerp(hx + s.seedX, hx, pp);
            y = lerp(hy + s.seedY, hy, pp);
            alpha = pp;
          }
          font = iconFont;
        } else {
          if (wordP <= 0) continue;
          const fx = L.logoX + s.ix * L.logoW;
          const fy = L.logoY + s.iy * L.logoH;
          const pp = easeOut(clamp((wordP - s.delay * 0.45) / 0.55, 0, 1));
          x = fx;
          y = lerp(fy - 26, fy, pp);
          alpha = pp;
          font = wordFont;
        }

        if (alpha <= 0.02) continue;
        ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        const glyph = ((i + flicker) % 11 === 0)
          ? LOGO_GLYPHS[(Math.random() * LOGO_GLYPHS.length) | 0]
          : s.glyph;
        ctx.fillStyle = rgba(s.color, alpha * 0.92);
        ctx.fillText(glyph, x, y);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function drawSubtitle(elapsed) {
      const subP = clamp((elapsed - M.subStart) / T.sub, 0, 1);
      if (subP <= 0) return;
      const L = layout;
      const reveal = easeOut(subP);
      const len = SUBTITLE.length;

      ctx.font = `700 ${L.subFont}px "Noto Sans SC", "PingFang SC", "Segoe UI", sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      // measure for centering
      let total = 0;
      for (let i = 0; i < len; i++) total += ctx.measureText(SUBTITLE[i]).width;
      let x = L.w / 2 - total / 2;
      const y = L.subY;

      for (let i = 0; i < len; i++) {
        const ch = SUBTITLE[i];
        const w = ctx.measureText(ch).width;
        const frac = i / Math.max(1, len - 1);
        const resolved = (i / len) <= reveal;
        // brand green -> lime -> yellow across the string
        const baseColor = frac < 0.5 ? mix(GREEN, LIME, frac * 2) : mix(LIME, YELLOW, (frac - 0.5) * 2);
        if (ch === " ") { x += w; continue; }

        if (resolved) {
          ctx.fillStyle = rgba(baseColor, 1);
          ctx.shadowColor = rgba(baseColor, 0.85);
          ctx.shadowBlur = 14;
          ctx.fillText(ch, x, y);
          ctx.shadowBlur = 0;
        } else {
          const g = SUB_SCRAMBLE[(Math.random() * SUB_SCRAMBLE.length) | 0];
          ctx.fillStyle = rgba(baseColor, 0.55);
          ctx.shadowColor = rgba(baseColor, 0.5);
          ctx.shadowBlur = 8;
          ctx.fillText(g, x, y);
          ctx.shadowBlur = 0;
        }
        x += w;
      }
    }

    function frame(ts) {
      if (!running) return;
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const { w, h } = viewport();

      // trailing fade -> code-rain streaks + keeps logo crisp (redrawn on top)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 8, 14, 0.18)";
      ctx.fillRect(0, 0, w, h);

      // rain dims once the logo starts emerging so the mark stands out
      const rainAlpha = elapsed < M.assembleStart
        ? 1
        : lerp(1, 0.32, clamp((elapsed - M.assembleStart) / 1400, 0, 1));
      drawRain(rainAlpha);

      if (logoReady) drawLogo(elapsed);
      drawSubtitle(elapsed);

      if (!finished && elapsed >= M.total) {
        finished = true;
        running = false;
        cancelAnimationFrame(raf);
        onComplete();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    // ---- reduced-motion fast path ---------------------------------------
    function drawStatic() {
      const { w, h } = viewport();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 8, 14, 1)";
      ctx.fillRect(0, 0, w, h);
      if (logoReady && layout) {
        const L = layout;
        ctx.globalCompositeOperation = "lighter";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        samples.forEach((s) => {
          const fx = L.logoX + s.ix * L.logoW;
          const fy = L.logoY + s.iy * L.logoH;
          ctx.font = `${Math.max(5, L.baseFont)}px ui-monospace, monospace`;
          ctx.fillStyle = rgba(s.color, 0.92);
          ctx.fillText(s.glyph, fx, fy);
        });
        ctx.globalCompositeOperation = "source-over";
      }
      // subtitle static
      if (layout) {
        const L = layout;
        ctx.font = `700 ${L.subFont}px "Noto Sans SC", "PingFang SC", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const grad = ctx.createLinearGradient(L.w / 2 - 200, 0, L.w / 2 + 200, 0);
        grad.addColorStop(0, rgba(GREEN, 1));
        grad.addColorStop(1, rgba(YELLOW, 1));
        ctx.fillStyle = grad;
        ctx.fillText(SUBTITLE, L.w / 2, L.subY);
      }
    }

    // ---- public ---------------------------------------------------------
    function begin() {
      resize();
      if (reduceMotion) {
        drawStatic();
        window.setTimeout(() => { if (running) { running = false; onComplete(); } }, 900);
        return;
      }
      startTs = 0;
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      finished = false;
      // make canvas fully visible & neutral (override old intro CSS)
      canvas.style.opacity = "1";
      canvas.style.animation = "none";
      canvas.style.mixBlendMode = "normal";

      if (logoReady) {
        begin();
      } else {
        logoImg.onload = () => {
          logoReady = true;
          buildSamples();
          if (running) begin();
        };
        logoImg.onerror = () => {
          // no logo: still run rain then hand off
          logoReady = false;
          if (running) begin();
        };
        logoImg.src = logoSrc;
      }
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    return { start, stop, resize };
  }

  return { createIntroSequence };
});
