# 🧠 MyHTML Engineering Tricks & Reusable Patterns (`SKILLS.md`)

A cheat-sheet of the best under-the-hood tricks built into **MyHTML** so they can be reused in future projects.

---

## 1. 🔑 Zero-Prompt GitHub API Auth via Windows Git Credential Manager
Instead of forcing users to manually generate and paste a GitHub Personal Access Token for API calls (like searching GitHub repositories), query `git credential fill` first and cache the token in memory:

```js
const { execSync } = require('child_process');

let cachedGitCredToken = null;
function getWindowsGithubToken() {
  if (cachedGitCredToken !== null) return cachedGitCredToken;
  try {
    const credOut = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      timeout: 2500
    }).toString();
    const m = credOut.match(/password=(.+)/);
    cachedGitCredToken = m && m[1] ? m[1].trim() : '';
  } catch {
    cachedGitCredToken = '';
  }
  return cachedGitCredToken;
}
```
* **Why it's great:** Bumps GitHub API rate limits from **60 requests/hr** to **5,000 requests/hr** automatically on any machine where Git is already signed in.

---

## 2. 🦀 Making Compiled WebAssembly / Trunk / Vite Builds Run Offline from Disk (`file://`)
Compiled WASM web apps (like Rust `Trunk` or `wasm-bindgen` builds such as `xdvdfs-web` XISO Tool) normally fail when opened directly from a local folder because:
1. They use root-absolute paths (`href="/app.wasm"`, `from '/app.js'`).
2. They include `<base href="/">` which breaks relative assets.
3. They include `integrity="sha384-..."` and `crossorigin="anonymous"` which trigger CORS/SRI failures over `file://`.

**The Fix ([`normalizeAppDirectory`](file:///C:/Users/adria/.gemini/antigravity/scratch/MyHTML/builtin-apps.js)):**
* Strip `<base>` tags, `integrity`, and `crossorigin` attributes from `.html` files.
* Rewrite root-absolute `href="/..."`, `src="/..."`, `import ... from '/...'`, and `fetch('/...')` to relative `./...` paths in both `.html` and `.js` glue files.
* Enable `webSecurity: false` in Electron's `BrowserWindow` so local `<iframe>` embeds can fetch `.wasm` binaries cleanly.

---

## 3. 🎨 Cloning HTML5 UP & Modern Templates Without Invisible Elements
Many template libraries (especially **HTML5 UP**) put `class="is-preload"` on `<body>` and rely on JavaScript `window.onload` to remove `is-preload` and copy `<span class="image"><img src="..."></span>` into parent `background-image` styles.
When scripts are paused in a visual editor, the hero banner stays `opacity: 0` and tile backgrounds look blank.

**The Fix ([`cloner.js`](file:///C:/Users/adria/.gemini/antigravity/scratch/MyHTML/cloner.js)):**
* Automatically strip `is-preload`, `is-loading`, `preload`, and `loading` from `<body>`.
* Unwrap `<noscript>` stylesheets when scripts are stripped.
* Promote `.tiles > article .image img[src]` into inline `style="background-image: url(...)"` so tiles render in full color even with scripts disabled.

---

## 4. 🔤 Stealing Fonts from Any Cloned Website ([`font-scanner.js`](file:///C:/Users/adria/.gemini/antigravity/scratch/MyHTML/font-scanner.js))
* Scan both downloaded `.woff2`/`.ttf`/`.otf` binaries in `assets/fonts/` and `@font-face` / Google Fonts `<link>` declarations across `.html` and `.css` files.
* Inject discovered `@font-face` rules into both the main app shell and the editor `<iframe>` so stolen fonts can be previewed and applied to any element with one click.
