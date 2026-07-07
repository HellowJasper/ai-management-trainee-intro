const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssPath = path.join(__dirname, "..", "src", "site.css");
const siteJsPath = path.join(__dirname, "..", "src", "site.js");
const landingAppJsPath = path.join(__dirname, "..", "src", "app.js");
const landingHtmlPath = path.join(__dirname, "..", "index.html");
const landingCssPath = path.join(__dirname, "..", "styles.css");

function extractMediaBlock(css, query, contains) {
  let mediaIndex = css.indexOf(query);

  while (mediaIndex !== -1) {
    const openIndex = css.indexOf("{", mediaIndex);
    let depth = 0;

    for (let index = openIndex; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;
      if (depth === 0) {
        const block = css.slice(openIndex + 1, index);
        if (block.includes(contains)) return block;
        break;
      }
    }

    mediaIndex = css.indexOf(query, openIndex + 1);
  }

  throw new Error(`Missing media block ${query} containing ${contains}`);
}

test("mobile nav brand constrains logo and copy inside narrow headers", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const mobileNavBlock = extractMediaBlock(css, "@media (max-width: 680px)", ".site-nav");

  assert.match(mobileNavBlock, /\.nav-brand\s*\{[^}]*max-width:\s*100%/s);
  assert.match(mobileNavBlock, /\.nav-brand img\s*\{[^}]*max-width:/s);
  assert.match(mobileNavBlock, /\.nav-brand-copy\s*\{[^}]*justify-content:\s*space-between;[^}]*height:\s*26px;[^}]*margin-top:\s*2px/s);
  assert.match(mobileNavBlock, /\.nav-brand-copy\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden/s);
  assert.match(mobileNavBlock, /\.nav-brand small\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap/s);
});

test("site profile detail drawer stays aligned with the big-screen detail layout", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-body:has\(\.site-detail-layer\.is-open\)\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.site-detail-layer\s*\{[^}]*z-index:\s*220/s);
  assert.match(css, /--site-detail-card-width:\s*clamp\(220px,\s*20vw,\s*340px\)/);
  assert.match(css, /--site-detail-console-left:\s*calc\(var\(--site-detail-card-left\) \+ var\(--site-detail-card-width\) \+ clamp\(42px,\s*3\.8vw,\s*78px\)\)/);
  assert.match(css, /--site-detail-panel-gap:\s*clamp\(14px,\s*1\.3vw,\s*22px\)/);
  assert.match(css, /--site-detail-media-column:\s*clamp\(380px,\s*43%,\s*640px\)/);
  assert.match(css, /\.site-detail-layer \.draw-card\s*\{[^}]*width:\s*var\(--site-detail-card-width\);[^}]*min-width:\s*190px/s);
  assert.match(css, /\.site-detail-layer \.profile-console\s*\{[^}]*left:\s*var\(--site-detail-console-left\);[^}]*right:\s*var\(--site-detail-edge\);[^}]*width:\s*auto;[^}]*border-right:\s*0;[^}]*border-radius:\s*var\(--radius\) 0 0 var\(--radius\)/s);
  assert.match(css, /\.site-detail-layer\.is-open \.profile-console\s*\{[^}]*transform:\s*translateX\(0\)/s);
  assert.doesNotMatch(css, /left:\s*var\(--site-detail-side-rail\)/);
  const wideDesktopBlock = extractMediaBlock(css, "@media (max-width: 1679px)", ".site-detail-layer");
  assert.match(wideDesktopBlock, /--site-detail-card-width:\s*clamp\(200px,\s*18vw,\s*280px\)/);
  assert.doesNotMatch(wideDesktopBlock, /\.site-detail-layer \.draw-card\s*\{[^}]*display:\s*none/s);

  const compactBlock = extractMediaBlock(css, "@media (max-width: 980px)", ".site-detail-layer .profile-console");
  assert.match(compactBlock, /\.site-detail-layer \.profile-console\s*\{[^}]*left:\s*14px;[^}]*right:\s*14px;[^}]*width:\s*auto/s);
});

test("site profile detail panels use the photo ratio and equal height", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-detail-layer \.profile-console\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) var\(--site-detail-media-column\);[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto/s);
  assert.match(css, /\.site-detail-layer \.profile-console\s*\{[^}]*gap:\s*var\(--site-detail-panel-gap\)/s);
  assert.match(css, /\.site-detail-layer \.profile-media-panel\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*auto;[^}]*max-width:\s*none;[^}]*padding:\s*clamp\(14px,\s*1\.8vw,\s*22px\)/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-size:\s*cover,\s*cover,\s*cover\s*!important/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-repeat:\s*no-repeat,\s*no-repeat,\s*no-repeat\s*!important/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-position:\s*center,\s*center,\s*center\s*!important/s);
  assert.doesNotMatch(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-size:\s*cover,\s*contain,\s*cover\s*!important/s);
});

test("site profile detail text is compact enough for the shorter photo panel", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-detail-layer \.profile-fact-list\s*\{[^}]*gap:\s*9px/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list section\s*\{[^}]*gap:\s*5px;[^}]*padding:\s*9px 11px/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list span\s*\{[^}]*font-size:\s*clamp\(10px,\s*0\.72vw,\s*11\.5px\)/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list p\s*\{[^}]*font-size:\s*clamp\(11\.5px,\s*0\.82vw,\s*13px\);[^}]*line-height:\s*1\.35/s);
});

test("site trainee detail removes the digital blind box footer module", () => {
  const siteJs = fs.readFileSync(siteJsPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.doesNotMatch(siteJs, /challenge-slot/);
  assert.doesNotMatch(siteJs, /MY DIGITAL BLIND BOX/);
  assert.doesNotMatch(siteJs, /blind-box-button/);
  assert.match(siteJs, /<span class="profile-footer-left">AI INNOVATION HACKATHON<\/span>/);
  assert.match(siteJs, /<span class="profile-footer-right">JOINCARE<\/span>/);
  assert.doesNotMatch(siteJs, /AI INNOVATION HACKATHON &gt; JOINCARE/);
  assert.match(css, /\.site-detail-layer \.profile-console-footer\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr auto;[^}]*align-items:\s*center;[^}]*min-height:\s*clamp\(26px,\s*3dvh,\s*38px\);[^}]*border-top:\s*1px solid rgba\(103,\s*255,\s*213,\s*0\.12\)/s);
  assert.match(css, /\.site-detail-layer \.profile-footer-left\s*\{[^}]*justify-self:\s*start/s);
  assert.doesNotMatch(css, /\.site-detail-layer \.profile-footer-left\s*\{[^}]*margin-left:/s);
  assert.match(css, /\.site-detail-layer \.profile-footer-right\s*\{[^}]*justify-self:\s*end/s);
  assert.match(css, /\.site-detail-layer \.profile-console-footer\s*\{[^}]*padding-left:\s*0/s);
  assert.match(css, /\.site-detail-layer \.profile-console-footer\s*\{[^}]*padding-right:\s*0/s);
  assert.match(css, /\.site-detail-layer \.profile-console-footer\s*\{[^}]*margin-left:\s*0/s);
  assert.match(css, /\.site-detail-layer \.profile-console-footer\s*\{[^}]*margin-right:\s*0/s);
});

test("schedule journey cards keep consistent desktop height", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.schedule-board \.entry-grid\.four \.entry-card\s*\{[^}]*height:\s*clamp\(124px,\s*7vw,\s*142px\)/s);
  assert.match(css, /\.schedule-board \.entry-grid\.four \.entry-tx span\s*\{[^}]*-webkit-line-clamp:\s*2/s);
});

test("landing headline uses glitch text layers without decorative bars or subtitle backdrop", () => {
  const html = fs.readFileSync(landingHtmlPath, "utf8");
  const css = fs.readFileSync(landingCssPath, "utf8");
  const appJs = fs.readFileSync(landingAppJsPath, "utf8");
  const logoBlock = css.match(/\.landing-logo-container\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(html, /class="landing-title-cn"[^>]*data-text="AI创新黑客松"/);
  assert.match(html, /class="landing-title-sub"[^>]*data-text="36小时 · 让想法落地，让创新发生"/);
  assert.match(html, /styles\.css\?v=20260706-team-formation-spacing/);
  assert.match(html, /src\/app\.js\?v=20260705-company-stage/);
  assert.match(logoBlock, /top:\s*calc\(23% \+ 15px\)/);
  assert.match(logoBlock, /width:\s*clamp\(240px,\s*20vw,\s*420px\)/);
  assert.doesNotMatch(css, /\.landing-title::before/);
  assert.match(css, /\.landing-title-cn::before,\s*\.landing-title-cn::after/s);
  assert.match(css, /@keyframes landing-title-glitch-cyan/);
  assert.match(css, /@keyframes landing-title-glitch-magenta/);
  assert.match(css, /\.landing-title-sub\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.landing-title-sub\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.app-shell\.landing-glitch-ended \.landing-title-cn::before,\s*\.app-shell\.landing-glitch-ended \.landing-title-cn::after,\s*\.app-shell\.landing-glitch-ended \.landing-title-sub::before,\s*\.app-shell\.landing-glitch-ended \.landing-title-sub::after\s*\{[^}]*animation:\s*none;[^}]*opacity:\s*0/s);
  assert.match(css, /@keyframes landing-subtitle-glitch/);
  assert.match(appJs, /const LANDING_GLITCH_MS = 15 \* 1000/);
  assert.match(appJs, /function startLandingGlitchWindow\(\)/);
  assert.match(appJs, /appShell\.classList\.add\("landing-glitch-ended"\)/);
});

test("index profile detail drawer keeps the card rail and console fluid across desktop widths", () => {
  const html = fs.readFileSync(landingHtmlPath, "utf8");
  const css = fs.readFileSync(landingCssPath, "utf8");

  assert.match(html, /styles\.css\?v=20260706-team-formation-spacing/);
  assert.match(css, /\.detail-layer\s*\{[^}]*--detail-card-width:\s*clamp\(260px,\s*20vw,\s*340px\)[^}]*--detail-card-left:\s*clamp\(28px,\s*2\.4vw,\s*64px\)[^}]*--detail-panel-gap:\s*clamp\(14px,\s*1\.3vw,\s*22px\)[^}]*--detail-media-column:\s*clamp\(380px,\s*43%,\s*640px\)[^}]*--detail-console-left:\s*clamp\(\s*420px,\s*calc\(var\(--detail-card-left\) \+ var\(--detail-card-width\) \+ clamp\(70px,\s*5vw,\s*110px\)\),\s*520px\s*\)/s);
  assert.match(css, /\.draw-card\s*\{[^}]*left:\s*var\(--detail-card-left\)[^}]*width:\s*var\(--detail-card-width\)/s);
  assert.match(css, /\.profile-console\s*\{[^}]*left:\s*var\(--detail-console-left\)[^}]*right:\s*var\(--detail-edge\)[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) var\(--detail-media-column\)[^}]*gap:\s*var\(--detail-panel-gap\)[^}]*width:\s*auto/s);
  assert.match(css, /\.profile-media-panel\s*\{[^}]*aspect-ratio:\s*auto;[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*justify-self:\s*stretch/s);
  const shortHeightBlock = extractMediaBlock(css, "@media (max-height: 780px)", ".detail-layer");
  assert.match(shortHeightBlock, /--detail-card-width:\s*clamp\(260px,\s*20vw,\s*340px\)/);
  assert.match(shortHeightBlock, /\.draw-card\s*\{[^}]*width:\s*var\(--detail-card-width\)/s);
  const tabletBlock = extractMediaBlock(css, "@media (max-width: 1180px)", ".detail-layer");
  assert.match(tabletBlock, /--detail-card-width:\s*clamp\(190px,\s*18vw,\s*240px\)/);
  assert.match(tabletBlock, /\.profile-console\s*\{[^}]*left:\s*var\(--detail-console-left\)[^}]*right:\s*var\(--detail-edge\)[^}]*width:\s*auto/s);
  const compactBlock = extractMediaBlock(css, "@media (max-width: 980px)", ".profile-console");
  assert.match(compactBlock, /\.draw-card\s*\{[^}]*display:\s*none/s);
  assert.match(compactBlock, /\.profile-console\s*\{[^}]*left:\s*14px;[^}]*right:\s*14px;[^}]*width:\s*auto/s);
});
