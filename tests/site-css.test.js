const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssPath = path.join(__dirname, "..", "src", "site.css");
const siteJsPath = path.join(__dirname, "..", "src", "site.js");

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
  assert.match(mobileNavBlock, /\.nav-brand-copy\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden/s);
  assert.match(mobileNavBlock, /\.nav-brand small\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap/s);
});

test("site profile detail drawer stays aligned with the big-screen detail layout", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-body:has\(\.site-detail-layer\.is-open\)\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.site-detail-layer\s*\{[^}]*z-index:\s*220/s);
  assert.match(css, /\.site-detail-layer \.profile-console\s*\{[^}]*right:\s*clamp\(16px,\s*2vw,\s*32px\);[^}]*width:\s*calc\(min\(80vw,\s*1260px\) - 24px\);[^}]*max-width:\s*calc\(100vw - clamp\(32px,\s*4vw,\s*64px\)\);[^}]*border-right:\s*1px solid var\(--line-strong\);[^}]*border-radius:\s*var\(--radius\)/s);
  assert.doesNotMatch(css, /\.site-detail-layer \.profile-console\s*\{[^}]*right:\s*0;/s);
  assert.doesNotMatch(css, /\.site-detail-layer \.profile-console\s*\{[^}]*border-right:\s*0;/s);

  const compactBlock = extractMediaBlock(css, "@media (max-width: 980px)", ".site-detail-layer .profile-console");
  assert.match(compactBlock, /\.site-detail-layer \.profile-console\s*\{[^}]*left:\s*14px;[^}]*right:\s*14px;[^}]*width:\s*auto/s);
});

test("site profile detail panels use the photo ratio and equal height", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-detail-layer \.profile-console\s*\{[^}]*--site-detail-panel-height:\s*min\(clamp\(560px,\s*31vw,\s*670px\),\s*calc\(100vh - 210px\)\);[^}]*grid-template-rows:\s*minmax\(0,\s*var\(--site-detail-panel-height\)\) auto;[^}]*align-content:\s*center/s);
  assert.match(css, /\.site-detail-layer \.profile-info-panel,\s*\.site-detail-layer \.profile-media-panel\s*\{[^}]*height:\s*100%;[^}]*max-height:\s*var\(--site-detail-panel-height\)/s);
  assert.match(css, /\.site-detail-layer \.profile-media-panel\s*\{[^}]*aspect-ratio:\s*2736 \/ 3668;[^}]*max-width:\s*none;[^}]*padding:\s*0/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\s*\{[^}]*height:\s*100%/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-size:\s*cover,\s*contain,\s*cover\s*!important/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-repeat:\s*no-repeat,\s*no-repeat,\s*no-repeat\s*!important/s);
  assert.match(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-position:\s*center,\s*center,\s*center\s*!important/s);
  assert.doesNotMatch(css, /\.site-detail-layer \.profile-media-frame\[data-mode="photo"\]\s*\{[^}]*background-size:\s*cover,\s*cover,\s*cover\s*!important/s);
});

test("site profile detail text is compact enough for the shorter photo panel", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.site-detail-layer \.profile-fact-list\s*\{[^}]*gap:\s*9px/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list section\s*\{[^}]*gap:\s*5px;[^}]*padding:\s*9px 11px/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list span\s*\{[^}]*font-size:\s*clamp\(10px,\s*0\.72vw,\s*11\.5px\)/s);
  assert.match(css, /\.site-detail-layer \.profile-fact-list p\s*\{[^}]*font-size:\s*clamp\(11\.5px,\s*0\.82vw,\s*13px\);[^}]*line-height:\s*1\.35/s);
});

test("site trainee detail does not include the digital blind box module", () => {
  const siteJs = fs.readFileSync(siteJsPath, "utf8");

  assert.doesNotMatch(siteJs, /challenge-slot/);
  assert.doesNotMatch(siteJs, /MY DIGITAL BLIND BOX/);
  assert.doesNotMatch(siteJs, /blind-box-button/);
});
