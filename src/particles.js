(function () {
  "use strict";

  function createParticles(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    const count = options.count || 90;
    const colors = options.colors || [
      "rgba(255, 255, 255, 0.8)",
      "rgba(40, 255, 200, 0.7)",
      "rgba(103, 80, 255, 0.65)",
      "rgba(167, 255, 79, 0.65)"
    ];

    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrameId = null;
    let active = false;

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      initParticles();
    }

    function initParticles() {
      particles = Array.from({ length: count }, () => {
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1.6 + Math.random() * 3.4,
          vx: (Math.random() - 0.5) * 0.24,
          vy: (Math.random() - 0.5) * 0.24,
          color: baseColor,
          alpha: 0.25 + Math.random() * 0.65,
          alphaSpeed: 0.003 + Math.random() * 0.008,
          alphaDirection: Math.random() > 0.5 ? 1 : -1
        };
      });
    }

    function update() {
      if (!active) return;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Breathe alpha
        p.alpha += p.alphaSpeed * p.alphaDirection;
        if (p.alpha <= 0.25) {
          p.alpha = 0.25;
          p.alphaDirection = 1;
        } else if (p.alpha >= 0.95) {
          p.alpha = 0.95;
          p.alphaDirection = -1;
        }

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Ensure color format matches rgba with correct alpha
        let fillStyle = p.color;
        if (p.color.startsWith("rgba")) {
          const rgbaParts = p.color.split(",");
          rgbaParts[3] = ` ${p.alpha})`;
          fillStyle = rgbaParts.join(",");
        }

        ctx.fillStyle = fillStyle;
        ctx.shadowBlur = p.size * 5.0;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      // Reset shadow
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(update);
    }

    function start() {
      if (active) return;
      active = true;
      resize();
      update();
    }

    function stop() {
      active = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      ctx.clearRect(0, 0, width, height);
    }

    return {
      start,
      stop,
      resize
    };
  }

  window.createParticles = createParticles;
})();
