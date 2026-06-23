const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cssPath = path.join(__dirname, "..", "src", "site.css");

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
