# ⚡ MyHTML — Visual Website Cloner, Font Stealer & Multi-App Hub

**MyHTML** is a no-code desktop website studio, reverse-engineering workbench, and single-screen web app bundler built for exploring how cool websites are structured, capturing their fonts, remixing community templates, and bundling dozens of standalone `.html` / WebAssembly tools into a single screen.

---

## ✨ Key Features

### 1. 🌐 Copy Any Website & Inspect Its Bones
* **Offline Website Cloner (`cloner.js`):** Paste any URL and MyHTML downloads the HTML, CSS, images, Google Fonts, ES modules (`.js`), and WebAssembly (`.wasm`) files into a self-contained local folder.
* **🩻 Show Boxes Mode (`Ctrl+B`):** Instantly highlights the structural "bones" of any webpage — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, CSS Grid (`GRID`), and Flexbox (`FLEX`) containers — so you can see how any site is put together.
* **No-Jargon Visual Inspector:** Click any element to change its text, font, colors, spacing, or layout without writing a line of HTML or CSS.

### 2. 🔤 Automatic Font Stealer (`font-scanner.js`)
* Automatically extracts every `@font-face`, `.woff2`/`.ttf`/`.otf` file, and Google Font used by any cloned or generated website.
* **Live Font Playground:** Type a custom preview phrase, inspect font weights, apply any stolen font to any element on your page in one click, or reveal the raw font files in Windows Explorer.

### 3. 🧰 Single-Screen Multi-App Hub (`builtin-apps.js`)
* **Bung 5, 10, or 30+ Apps Into One Screen:** Stop hunting through 30 separate folders or executables. Drop in a **Multi-App Hub** with a left sidebar dock, instant search bar, and an **All Apps Grid** launcher that switches between tools on a single screen.
* **4 Ways to Import Apps:**
  * **📚 Bulk Folder:** Select a parent folder containing dozens of app subfolders or `.html` tools to import all of them at once.
  * **📂 App Folder:** Import a compiled web app folder (`index.html` + `.wasm` + `.js`, e.g. Rust/Trunk/Vite/Emscripten builds like `xdvdfs-web` XISO Tool). Automatically strips blocking `integrity`/`crossorigin` attributes and converts root-absolute `/` paths to relative `./` paths so WASM apps run offline from disk.
  * **📄 `.html` File(s):** Pick one or more standalone `.html` files (automatically bundling sibling `.wasm`/`.js`/`.css` assets).
  * **🌐 Web App URL:** Clone a live web utility or WASM tool straight into your Hub.

### 4. 🌍 Community Website Templates & Indie Web Explorer (`community-templates.js`)
* **🎲 Opens With a Brand-New Website Every Time:** Launches straight into a freshly generated, compact, button-rich website template (or click **🎲 Roll New Site** anytime).
* **✨ 66+ Curated Free HTML5 Templates:** One-click cloning and offline editing for **42 HTML5 UP** and **24 StartBootstrap** live templates.
* **📼 Live Neocities Indie Web Explorer:** Browse and clone real handmade community websites from `neocities.org/browse` by *Special Sauce*, *Random*, *Most Viewed*, or tags (`#retro`, `#games`, `#computers`, `#cyberpunk`, `#music`, `#pixel`, `#zine`, `#shrine`).
* **🐙 GitHub Community Templates Search:** Search 10,000+ open-source HTML templates with live GitHub Pages demos.
* **🎨 Instant Remix Studio:** Mix and match compact structural archetypes × 16 Google Font pairings × 12 high-contrast color palettes.

### 5. 🚀 One-Click Free Publishing (`publisher.js`)
* Publish your finished site or Multi-App Hub live to **Netlify** directly from the top toolbar.

---

## 🛠️ Running Locally

```bash
npm install
npm start
```

### Building a Standalone Windows Portable `.exe`

```bash
npm run dist
```

---

## 📂 Project Structure

* `main.js` & `preload.js` — Electron main process, IPC bridge, and secure token storage.
* `cloner.js` — Offline HTML, CSS, font, image, ES module, and `.wasm` website cloner.
* `font-scanner.js` — Scans local & remote stylesheets and font binaries for the `Aa Fonts` tab.
* `builtin-apps.js` — Multi-app bundler, WASM/Trunk path normalizer, and built-in offline companion tools (*Hex & Binary Inspector*, *Drive & ISO Size Calculator*, *Cover Art & Image Resizer*).
* `community-templates.js` — Curated HTML5 UP / StartBootstrap catalog, live Neocities scraper, GitHub Pages search, and procedural website generator.
* `renderer/` — Visual editor UI (`index.html`, `styles.css`, `app.js`, `templates.js`).
