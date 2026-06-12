(function attachCodeRain(root, factory) {
  root.CodeRain = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createCodeRainFactory() {
  function createCodeRain(canvas, options = {}) {
    if (!canvas) {
      return {
        start() {},
        stop() {},
        resize() {},
      };
    }

    const context = canvas.getContext("2d");
    const glyphs = options.glyphs || "010101AIJOINCARE{}[]<>".split("");
    const fontSize = options.fontSize || 18;
    const frameInterval = options.frameInterval || 20;
    let animationFrame = 0;
    let columns = [];
    let running = false;
    let lastFrameAt = 0;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const density = options.density || (width < 720 ? 1.75 : 1);
      const columnStep = fontSize * density;
      columns = Array.from({ length: Math.ceil(width / columnStep) }, (_, index) => ({
        x: index * columnStep,
        y: Math.random() * -height,
        speed: (1.4 + Math.random() * 3.4) * (frameInterval / 50),
        alpha: 0.38 + Math.random() * 0.62,
      }));
    }

    function draw(timestamp = 0) {
      if (!running) return;
      if (timestamp - lastFrameAt < frameInterval) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = timestamp;

      context.fillStyle = options.fade || "rgba(2, 8, 14, 0.18)";
      context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      context.textBaseline = "top";

      columns.forEach((column) => {
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)] || "1";
        const isHead = Math.random() > 0.9;
        context.fillStyle = isHead
          ? `rgba(216, 255, 239, ${column.alpha})`
          : `rgba(37, 245, 197, ${column.alpha * 0.72})`;
        context.fillText(glyph, column.x, column.y);
        column.y += column.speed;

        if (column.y > canvas.clientHeight + 40) {
          column.y = Math.random() * -180;
          column.speed = (1.4 + Math.random() * 3.4) * (frameInterval / 50);
        }
      });

      animationFrame = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      lastFrameAt = 0;
      resize();
      draw();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(animationFrame);
    }

    return { start, stop, resize };
  }

  return { createCodeRain };
});
