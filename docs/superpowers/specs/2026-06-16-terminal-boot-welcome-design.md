# Terminal Boot Welcome Design

## Goal

Clicking the landing page `Let's Get Started!` button should open a full-screen Terminal Boot welcome stage instead of going straight to the persona wall. The welcome stage should feel consistent with the existing Joincare AI Hackathon visual system: dark matrix-rain background, teal/green neon, pixel/HUD details, and compact stage-like composition.

## Experience

- Landing page remains unchanged until the central CTA is clicked.
- CTA click switches to a new `welcome` view.
- The `welcome` view shows a terminal/HUD panel with the selected B-style copy:
  - `BOOTING HACKATHON_PROTOCOL_2026`
  - `AI创新黑客松协议启动`
  - `Welcome to AI innovation hackathon 2026. / 欢迎来到AI创新黑客松 2026`
  - `24H mission window unlocked. / 未来24小时，真实业务挑战已解锁。`
  - `Business leaders + future teammates linked. / 业务专家与未来伙伴正在接入。`
  - `AI-powered solutions: ready to build. / 借助AI创造创新解决方案。`
  - `MISSION STARTS NOW / 任务现在开始 / Let’s get to know your future teammates!`
- The welcome stage stops and waits for manual entry.
- Clicking `ENTER PROFILES / 进入未来伙伴档案` switches to the persona wall.

## Compatibility

- Reuse existing stage/view conventions in `src/app.js`.
- Add a dedicated `welcomeRain` canvas so the welcome screen keeps the live code-rain atmosphere.
- Include `welcome` in class removal and rain synchronization wherever view transitions are managed.
- Keep responsive layout stable on desktop and mobile.

## Verification

- Unit tests cover the landing CTA target and welcome manual-entry target.
- Unit tests confirm the HTML contains the welcome stage and primary welcome copy.
- Browser verification confirms the landing CTA opens the welcome view and the welcome CTA opens the persona wall.
