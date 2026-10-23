// Built-in standalone utility apps & universal HTML/WASM App Importer helpers
const fs = require('fs');
const path = require('path');
const os = require('os');

function getSharedAppsDir(projectDir) {
  const sitesRoot = projectDir ? path.dirname(path.resolve(projectDir)) : path.join(os.homedir(), 'Documents', 'MyHTML Sites');
  const shared = path.join(sitesRoot, '_Shared_Hub_Apps');
  try { fs.mkdirSync(shared, { recursive: true }); } catch {}
  return shared;
}

function mirrorAppToSharedLibrary(targetDir, projectDir) {
  try {
    if (!targetDir || !fs.existsSync(targetDir)) return;
    const slug = path.basename(targetDir);
    const sharedBase = getSharedAppsDir(projectDir);
    const sharedDest = path.join(sharedBase, slug);
    if (path.resolve(targetDir).toLowerCase() === path.resolve(sharedDest).toLowerCase()) return;
    if (fs.existsSync(sharedDest)) {
      try { fs.rmSync(sharedDest, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(sharedDest, { recursive: true });
    fs.cpSync(targetDir, sharedDest, { recursive: true, force: true });
  } catch (e) {
    console.warn('Could not mirror app to shared hub library:', e.message);
  }
}

const safeSlug = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/\.html?$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'web-app';

function guessIcon(title = '', slug = '') {
  const s = (title + ' ' + slug).toLowerCase();
  if (s.includes('xiso') || s.includes('iso') || s.includes('dvd') || s.includes('disc')) return '💿';
  if (s.includes('xbox') || s.includes('game') || s.includes('snake') || s.includes('arcade') || s.includes('play')) return '🕹️';
  if (s.includes('hex') || s.includes('byte') || s.includes('bin') || s.includes('eeprom') || s.includes('rom')) return '🔬';
  if (s.includes('calc') || s.includes('size') || s.includes('storage') || s.includes('drive') || s.includes('math')) return '💾';
  if (s.includes('img') || s.includes('image') || s.includes('photo') || s.includes('cover') || s.includes('art')) return '🖼️';
  if (s.includes('audio') || s.includes('synth') || s.includes('music') || s.includes('piano') || s.includes('sound')) return '🎹';
  if (s.includes('timer') || s.includes('clock') || s.includes('pomodoro')) return '⏱️';
  if (s.includes('note') || s.includes('todo') || s.includes('task') || s.includes('text')) return '📝';
  return '📦';
}

function extractTitleFromHtml(html, fallback = 'Web App') {
  if (!html) return fallback;
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (m && m[1].trim()) return m[1].trim();
  const h1 = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
  if (h1 && h1[1].trim()) return h1[1].trim();
  return fallback;
}

/**
 * Recursively normalizes HTML, JS, and CSS files inside an imported app folder
 * so that root-absolute paths (/foo.wasm, /foo.js) and blocking SRI integrity
 * attributes work seamlessly inside iframes, subfolders, and over file://.
 */
function normalizeAppDirectory(targetDir) {
  function normalizeFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html' || ext === '.htm') {
        let content = fs.readFileSync(filePath, 'utf8');
        // Remove restrictive CSP or base tags that break subfolder embedding
        content = content.replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
        // Remove integrity and crossorigin attributes on local/preload links that can block file:// execution
        content = content.replace(/\s+integrity=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
        content = content.replace(/\s+crossorigin(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
        // 1. Rewrite root-absolute href="/..." and src="/..." (ignoring // protocol-relative URLs)
        content = content.replace(/(href|src)=["']\/(?!\/)([^"']+)["']/gi, '$1="./$2"');
        // 2. Rewrite JS imports: from '/...' -> from './...'
        content = content.replace(/from\s+["']\/(?!\/)([^"']+)["']/g, 'from "./$1"');
        content = content.replace(/import\s*\(\s*["']\/(?!\/)([^"']+)["']\s*\)/g, 'import("./$1")');
        // 3. Rewrite Trunk/wasm-bindgen init: module_or_path: '/...' -> './...'
        content = content.replace(/module_or_path:\s*["']\/(?!\/)([^"']+)["']/g, 'module_or_path: "./$1"');
        // 4. Rewrite fetch('/...') or Worker('/...')
        content = content.replace(/(fetch|Worker)\s*\(\s*["']\/(?!\/)([^"']+)["']/g, '$1("./$2"');
        // 5. Rewrite any leftover root-absolute asset strings like '/foo.wasm'
        content = content.replace(/(['"])\/(?!\/)([a-zA-Z0-9_\-\./]+\.(?:wasm|js|mjs|css|json|png|jpg|jpeg|gif|svg|webp|ico|pck|data|mem|bin))(["'])/g, '$1./$2$3');
        // 6. Rewrite CSS url(/...)
        content = content.replace(/url\(\s*["']?\/(?!\/)([^"')]+)["']?\s*\)/gi, 'url("./$1")');
        fs.writeFileSync(filePath, content, 'utf8');
      } else if (ext === '.js' || ext === '.mjs') {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = content
          .replace(/from\s+["']\/(?!\/)([^"']+)["']/g, 'from "./$1"')
          .replace(/import\s*\(\s*["']\/(?!\/)([^"']+)["']\s*\)/g, 'import("./$1")')
          .replace(/(fetch|Worker)\s*\(\s*["']\/(?!\/)([^"']+)["']/g, '$1("./$2"')
          .replace(/(['"])\/(?!\/)([a-zA-Z0-9_\-\./]+\.(?:wasm|json|pck|data|mem|bin))(["'])/g, '$1./$2$3')
          .replace(/url\(\s*["']?\/(?!\/)([^"')]+)["']?\s*\)/gi, 'url("./$1")');
        if (updated !== content) fs.writeFileSync(filePath, updated, 'utf8');
      } else if (ext === '.css') {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = content.replace(/url\(\s*["']?\/(?!\/)([^"')]+)["']?\s*\)/gi, 'url("./$1")');
        if (updated !== content) fs.writeFileSync(filePath, updated, 'utf8');
      }
    } catch (e) {
      console.warn('Path normalization warning on', filePath, e.message);
    }
  }

  function walk(dir) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) walk(p);
      else normalizeFile(p);
    }
  }
  walk(targetDir);
}

/**
 * Imports a single app directory (containing index.html or a specified .html file)
 * into <projectDir>/assets/apps/<slug>/
 */
function importAppFromDir(srcDir, projectDir, entryHtmlName = 'index.html', preferredTitle = '') {
  const indexPath = path.join(srcDir, entryHtmlName);
  if (!fs.existsSync(indexPath)) return null;

  let rawHtml = '';
  try { rawHtml = fs.readFileSync(indexPath, 'utf8'); } catch {}

  const baseFolder = path.basename(srcDir);
  const fallbackName = entryHtmlName.toLowerCase() !== 'index.html'
    ? path.basename(entryHtmlName, path.extname(entryHtmlName))
    : baseFolder;

  const appTitle = preferredTitle || extractTitleFromHtml(rawHtml, fallbackName);
  let slug = safeSlug(appTitle !== 'Document' && appTitle !== 'Untitled' ? appTitle : fallbackName);
  if (!slug || slug === 'dist' || slug === 'build') {
    slug = safeSlug(appTitle || baseFolder || 'web-app');
  }

  const appsBase = path.join(projectDir, 'assets', 'apps');
  fs.mkdirSync(appsBase, { recursive: true });

  let targetDir = path.join(appsBase, slug);
  let n = 2;
  while (path.resolve(targetDir).toLowerCase() === path.resolve(srcDir).toLowerCase()) {
    targetDir = path.join(appsBase, `${slug}-${n++}`);
  }

  if (fs.existsSync(targetDir)) {
    try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(srcDir, targetDir, { recursive: true, force: true });

  // If the entry HTML wasn't named index.html, copy it to index.html as well
  if (entryHtmlName.toLowerCase() !== 'index.html') {
    const copiedEntry = path.join(targetDir, entryHtmlName);
    const destIndex = path.join(targetDir, 'index.html');
    if (fs.existsSync(copiedEntry) && !fs.existsSync(destIndex)) {
      fs.copyFileSync(copiedEntry, destIndex);
    }
  }

  normalizeAppDirectory(targetDir);
  mirrorAppToSharedLibrary(targetDir, projectDir);

  const finalSlug = path.basename(targetDir);
  const relPath = `assets/apps/${finalSlug}/index.html`;
  return {
    success: true,
    name: finalSlug,
    slug: finalSlug,
    title: appTitle,
    icon: guessIcon(appTitle, finalSlug),
    relPath,
    fullDir: targetDir
  };
}

/**
 * Imports a single .html file.
 * If the .html file lives inside an app folder (like dist/index.html) that has
 * companion .wasm/.js/.css files, and it's not a giant user root folder (Desktop/Documents),
 * we bundle the companion files automatically!
 */
function importSingleHtmlFile(htmlFilePath, projectDir) {
  if (!fs.existsSync(htmlFilePath)) return null;
  const parentDir = path.dirname(htmlFilePath);
  const fileName = path.basename(htmlFilePath);
  const rawHtml = fs.readFileSync(htmlFilePath, 'utf8');

  // Check if parentDir looks like a dedicated app folder (e.g., <= 40 items and contains .wasm or .js companions)
  let bundleWholeDir = false;
  try {
    const siblings = fs.readdirSync(parentDir);
    const hasCompanions = siblings.some((f) => /\.(wasm|js|mjs|pck|data|css)$/i.test(f) || f === 'snippets' || f === 'assets');
    const isSystemRoot = /^(desktop|documents|downloads|users|windows|system32)$/i.test(path.basename(parentDir));
    if (hasCompanions && !isSystemRoot && siblings.length <= 50) {
      bundleWholeDir = true;
    }
  } catch {}

  if (bundleWholeDir) {
    return importAppFromDir(parentDir, projectDir, fileName);
  }

  // Otherwise, copy the .html file AND any local relative files it explicitly references
  const fallbackTitle = path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ');
  const appTitle = extractTitleFromHtml(rawHtml, fallbackTitle);
  const slug = safeSlug(appTitle || fallbackTitle);

  const appsBase = path.join(projectDir, 'assets', 'apps');
  fs.mkdirSync(appsBase, { recursive: true });
  const targetDir = path.join(appsBase, slug);
  if (fs.existsSync(targetDir)) {
    try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
  }
  fs.mkdirSync(targetDir, { recursive: true });

  fs.copyFileSync(htmlFilePath, path.join(targetDir, 'index.html'));
  if (fileName.toLowerCase() !== 'index.html') {
    fs.copyFileSync(htmlFilePath, path.join(targetDir, fileName));
  }

  // Check for referenced local sibling files in the HTML (e.g. src="foo.js", href="style.css", "/foo.wasm")
  const refRegex = /(?:href|src|from|module_or_path:)\s*=?["']\/?(\.?\/?[a-zA-Z0-9_\-\./]+\.(?:wasm|js|mjs|css|json|png|jpg|jpeg|svg|webp|ico))["']/gi;
  let m;
  while ((m = refRegex.exec(rawHtml)) !== null) {
    const relRef = m[1].replace(/^\.?\//, '');
    const topSegment = relRef.split('/')[0];
    const srcCandidate = path.join(parentDir, topSegment);
    const destCandidate = path.join(targetDir, topSegment);
    if (fs.existsSync(srcCandidate) && !fs.existsSync(destCandidate)) {
      try {
        fs.cpSync(srcCandidate, destCandidate, { recursive: true, force: true });
      } catch {}
    }
  }

  normalizeAppDirectory(targetDir);
  mirrorAppToSharedLibrary(targetDir, projectDir);

  return {
    success: true,
    name: slug,
    slug,
    title: appTitle,
    icon: guessIcon(appTitle, slug),
    relPath: `assets/apps/${slug}/index.html`,
    fullDir: targetDir
  };
}

/**
 * Bulk-imports a folder that may contain 1 app, or 30+ app subfolders / standalone .html files!
 */
function importBulkAppsFromFolder(rootDir, projectDir) {
  if (!fs.existsSync(rootDir)) return [];
  const imported = [];

  // First check if rootDir itself has index.html (or dist/index.html) AND no other app subfolders
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const subDirs = entries.filter((e) => e.isDirectory() && !/^(node_modules|\.git|snippets|assets|css|js|img|images|fonts|static|lib)$/i.test(e.name));
  const htmlFiles = entries.filter((e) => e.isFile() && /\.html?$/i.test(e.name));

  // Check if subDirs actually contain their own HTML apps
  const appSubDirs = [];
  for (const sub of subDirs) {
    const subPath = path.join(rootDir, sub.name);
    if (fs.existsSync(path.join(subPath, 'index.html'))) {
      appSubDirs.push({ dir: subPath, entry: 'index.html', title: sub.name });
      continue;
    }
    let foundSub = false;
    for (const buildSub of ['dist', 'build', 'public', 'out']) {
      if (fs.existsSync(path.join(subPath, buildSub, 'index.html'))) {
        appSubDirs.push({ dir: path.join(subPath, buildSub), entry: 'index.html', title: sub.name });
        foundSub = true;
        break;
      }
    }
    if (!foundSub) {
      try {
        const subHtmls = fs.readdirSync(subPath).filter((f) => /\.html?$/i.test(f));
        if (subHtmls.length === 1) {
          appSubDirs.push({ dir: subPath, entry: subHtmls[0], title: sub.name });
        } else if (subHtmls.length > 1) {
          for (const sh of subHtmls) {
            appSubDirs.push({ file: path.join(subPath, sh) });
          }
        }
      } catch {}
    }
  }

  // Case 1: The selected folder itself is a single app (has index.html or 1 html file, and no separate appSubDirs)
  if (appSubDirs.length === 0 && htmlFiles.length === 1) {
    const one = importAppFromDir(rootDir, projectDir, htmlFiles[0].name);
    if (one) imported.push(one);
    return imported;
  }

  // Case 2: Multiple standalone .html files in rootDir
  if (htmlFiles.length > 1) {
    for (const hf of htmlFiles) {
      const res = importSingleHtmlFile(path.join(rootDir, hf.name), projectDir);
      if (res) imported.push(res);
    }
  } else if (htmlFiles.length === 1 && appSubDirs.length > 0) {
    // Also import the root html file if present
    const res = importSingleHtmlFile(path.join(rootDir, htmlFiles[0].name), projectDir);
    if (res) imported.push(res);
  }

  // Case 3: Import all discovered app subdirectories
  for (const item of appSubDirs) {
    if (item.file) {
      const res = importSingleHtmlFile(item.file, projectDir);
      if (res) imported.push(res);
    } else {
      const res = importAppFromDir(item.dir, projectDir, item.entry, '');
      if (res) imported.push(res);
    }
  }

  return imported;
}

/* =====================================================================
   BUILT-IN COMPANION WEB APPS (100% Client-Side, Offline Ready)
   ===================================================================== */
const BUILTIN_APPS = {
  'hex-inspector': {
    title: 'Hex & Binary Inspector',
    icon: '🔬',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Hex & Binary Inspector</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
  .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; background: #1e293b; padding: 14px 18px; border-radius: 12px; border: 1px solid #334155; }
  h2 { margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
  .meta { font-size: 12px; color: #94a3b8; }
  .dropzone { border: 2px dashed #475569; background: #1e293b; border-radius: 10px; padding: 16px; text-align: center; cursor: pointer; margin-bottom: 14px; transition: .15s; }
  .dropzone:hover { border-color: #6366f1; background: #26334d; }
  .controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
  input[type=text], input[type=number] { background: #0f172a; border: 1px solid #334155; color: #fff; padding: 7px 10px; border-radius: 6px; font-size: 12px; }
  button { background: #4f46e5; color: #fff; border: 0; padding: 7px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
  button.sec { background: #334155; }
  .grid { display: grid; grid-template-columns: 1fr 240px; gap: 14px; }
  @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  .hex-box { background: #090d16; border: 1px solid #334155; border-radius: 10px; padding: 14px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 12.5px; line-height: 1.65; overflow-x: auto; white-space: pre; min-height: 320px; color: #cbd5e1; }
  .offset { color: #64748b; user-select: none; }
  .ascii { color: #34d399; }
  .info-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 14px; font-size: 12.5px; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #334155; }
  .info-row:last-child { border-bottom: 0; }
  .badge { background: rgba(16,185,129,0.18); color: #34d399; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <h2>🔬 Hex & Binary File Inspector</h2>
      <div class="meta">Inspect headers, magic bytes, offsets & ASCII of any ISO, ROM, EEPROM, or binary file locally</div>
    </div>
    <span class="badge">100% LOCAL</span>
  </div>
  <label class="dropzone" id="dropLabel">
    <input type="file" id="fileInp" style="display:none">
    <strong>📂 Click to open any file</strong> (or drag & drop here) — Instant zero-upload inspection
  </label>
  <div class="controls">
    <label style="font-size:12px;color:#94a3b8;">Offset (Hex/Dec):</label>
    <input type="text" id="offsetInp" value="0x0" style="width:110px;">
    <button id="goBtn">Jump</button>
    <button class="sec" id="prevBtn">◀ Prev 512 B</button>
    <button class="sec" id="nextBtn">Next 512 B ▶</button>
    <button class="sec" id="sampleBtn">Load Sample Xbox/XISO Header</button>
  </div>
  <div class="grid">
    <div class="hex-box" id="hexOut">Select a file above or click "Load Sample Xbox/XISO Header" to inspect bytes...</div>
    <div class="info-card">
      <h4 style="margin:0 0 10px;color:#fff;font-size:13px;">File Telemetry</h4>
      <div class="info-row"><span>Name:</span><strong id="iName">—</strong></div>
      <div class="info-row"><span>Size:</span><strong id="iSize">—</strong></div>
      <div class="info-row"><span>Magic (ASCII):</span><strong id="iMagic" style="color:#38bdf8;">—</strong></div>
      <div class="info-row"><span>First 4 Bytes:</span><strong id="iHex4" style="font-family:monospace;">—</strong></div>
      <div class="info-row"><span>Viewing Offset:</span><strong id="iOff">0x00000000</strong></div>
    </div>
  </div>
<script>
  let currentFile = null, sampleBytes = null, currentOffset = 0;
  const PAGE = 512;
  const hexOut = document.getElementById('hexOut');

  function renderBytes(u8, totalSize, name) {
    document.getElementById('iName').textContent = name.slice(0, 20);
    document.getElementById('iSize').textContent = totalSize.toLocaleString() + ' bytes';
    document.getElementById('iOff').textContent = '0x' + currentOffset.toString(16).toUpperCase().padStart(8, '0');
    let lines = [];
    for (let i = 0; i < u8.length; i += 16) {
      const slice = u8.subarray(i, i + 16);
      const off = (currentOffset + i).toString(16).toUpperCase().padStart(8, '0');
      let hex = '', ascii = '';
      for (let j = 0; j < 16; j++) {
        if (j < slice.length) {
          const b = slice[j];
          hex += b.toString(16).toUpperCase().padStart(2, '0') + (j === 7 ? '  ' : ' ');
          ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        } else {
          hex += '   ' + (j === 7 ? ' ' : '');
        }
      }
      lines.push('<span class="offset">' + off + '</span>  ' + hex + ' <span class="ascii">|' + ascii.replace(/[<>&]/g, '.') + '|</span>');
    }
    hexOut.innerHTML = lines.join('\\n') || '(Empty)';
  }

  async function updateView() {
    if (sampleBytes) {
      const sub = sampleBytes.subarray(currentOffset, currentOffset + PAGE);
      renderBytes(sub, sampleBytes.length, 'sample_xiso_header.bin');
      return;
    }
    if (!currentFile) return;
    const slice = currentFile.slice(currentOffset, currentOffset + PAGE);
    const buf = await slice.arrayBuffer();
    const u8 = new Uint8Array(buf);
    if (currentOffset === 0 && u8.length >= 4) {
      document.getElementById('iHex4').textContent = [...u8.subarray(0, 4)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      document.getElementById('iMagic').textContent = [...u8.subarray(0, 8)].map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
    }
    renderBytes(u8, currentFile.size, currentFile.name);
  }

  document.getElementById('fileInp').onchange = (e) => {
    if (!e.target.files[0]) return;
    currentFile = e.target.files[0];
    sampleBytes = null;
    currentOffset = 0;
    updateView();
  };

  document.getElementById('goBtn').onclick = () => {
    const val = document.getElementById('offsetInp').value.trim();
    const parsed = val.startsWith('0x') ? parseInt(val, 16) : parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) { currentOffset = parsed; updateView(); }
  };
  document.getElementById('prevBtn').onclick = () => { currentOffset = Math.max(0, currentOffset - PAGE); updateView(); };
  document.getElementById('nextBtn').onclick = () => { currentOffset += PAGE; updateView(); };
  document.getElementById('sampleBtn').onclick = () => {
    sampleBytes = new Uint8Array(512);
    const sig = 'MICROSOFT*XBOX*MEDIA';
    for (let i = 0; i < sig.length; i++) sampleBytes[i] = sig.charCodeAt(i);
    sampleBytes[20] = 0x01; sampleBytes[24] = 0x00; sampleBytes[25] = 0x08;
    for (let i = 32; i < 512; i++) sampleBytes[i] = (i * 7) & 0xff;
    currentOffset = 0;
    document.getElementById('iHex4').textContent = '4D 49 43 52';
    document.getElementById('iMagic').textContent = 'MICROSOF';
    updateView();
  };
  document.getElementById('sampleBtn').click();
</script>
</body>
</html>`
  },

  'storage-calc': {
    title: 'Drive & ISO Size Calculator',
    icon: '💾',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Drive & ISO Size Calculator</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin-bottom: 14px; }
  h2 { margin: 0 0 6px; font-size: 18px; }
  p { margin: 0 0 14px; font-size: 12.5px; color: #94a3b8; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 14px; }
  .box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
  label { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; }
  input, select { width: 100%; background: #1e293b; border: 1px solid #475569; color: #fff; padding: 8px 10px; border-radius: 6px; font-size: 14px; font-weight: 600; }
  .val { font-size: 20px; font-weight: 800; color: #38bdf8; }
  .bar-wrap { height: 14px; background: #0f172a; border-radius: 7px; overflow: hidden; border: 1px solid #334155; margin: 10px 0; }
  .bar { height: 100%; background: linear-gradient(90deg, #4f46e5, #10b981); width: 45%; transition: .2s; }
</style>
</head>
<body>
  <div class="card">
    <h2>💾 Drive Partition & ISO Capacity Calculator</h2>
    <p>Calculate real formatted drive capacity (GiB vs GB) and how many ISOs, images, or games fit on your storage.</p>
    <div class="row">
      <div class="box">
        <label>Drive Size (Advertised GB / TB)</label>
        <select id="drivePreset">
          <option value="120">120 GB SSD / HDD</option>
          <option value="250">250 GB HDD</option>
          <option value="500" selected>500 GB HDD / SSD</option>
          <option value="1000">1 TB (1000 GB) Drive</option>
          <option value="2000">2 TB (2000 GB) Drive</option>
          <option value="4000">4 TB Drive</option>
        </select>
      </div>
      <div class="box">
        <label>Average App / ISO Size (GB)</label>
        <input type="number" id="isoSize" value="3.8" step="0.1" min="0.1">
      </div>
      <div class="box">
        <label>Real Usable Space (GiB)</label>
        <div class="val" id="realGib">465.7 GiB</div>
      </div>
      <div class="box">
        <label>Total Items That Fit</label>
        <div class="val" id="fitCount" style="color:#34d399;">~122 ISOs</div>
      </div>
    </div>
  </div>
  <div class="card">
    <h2>💿 Disc & Sector Unit Converter</h2>
    <p>Type in any field to convert between Megabytes, Gigabytes, Bytes, and 2048-byte DVD/ISO sectors.</p>
    <div class="row">
      <div class="box"><label>Gigabytes (GiB)</label><input type="number" id="uGib" value="4.37" step="0.01"></div>
      <div class="box"><label>Megabytes (MiB)</label><input type="number" id="uMib" value="4474.88" step="1"></div>
      <div class="box"><label>ISO Sectors (2048 B)</label><input type="number" id="uSec" value="2291138" step="100"></div>
      <div class="box"><label>Exact Bytes</label><input type="number" id="uBytes" value="4692251443" step="1024"></div>
    </div>
  </div>
<script>
  const drivePreset = document.getElementById('drivePreset');
  const isoSize = document.getElementById('isoSize');
  function calcDrive() {
    const gb = parseFloat(drivePreset.value) || 500;
    const avg = Math.max(0.05, parseFloat(isoSize.value) || 3.8);
    const gib = (gb * 1e9) / Math.pow(1024, 3);
    document.getElementById('realGib').textContent = gib.toFixed(1) + ' GiB';
    document.getElementById('fitCount').textContent = '~' + Math.floor(gib / avg).toLocaleString() + ' items';
  }
  drivePreset.onchange = calcDrive;
  isoSize.oninput = calcDrive;
  calcDrive();

  const uGib = document.getElementById('uGib'), uMib = document.getElementById('uMib'), uSec = document.getElementById('uSec'), uBytes = document.getElementById('uBytes');
  function fromBytes(b, skip) {
    if (skip !== 'gib') uGib.value = (b / Math.pow(1024, 3)).toFixed(3);
    if (skip !== 'mib') uMib.value = (b / Math.pow(1024, 2)).toFixed(2);
    if (skip !== 'sec') uSec.value = Math.round(b / 2048);
    if (skip !== 'bytes') uBytes.value = Math.round(b);
  }
  uGib.oninput = () => fromBytes((parseFloat(uGib.value) || 0) * Math.pow(1024, 3), 'gib');
  uMib.oninput = () => fromBytes((parseFloat(uMib.value) || 0) * Math.pow(1024, 2), 'mib');
  uSec.oninput = () => fromBytes((parseFloat(uSec.value) || 0) * 2048, 'sec');
  uBytes.oninput = () => fromBytes(parseFloat(uBytes.value) || 0, 'bytes');
</script>
</body>
</html>`
  },

  'image-resizer': {
    title: 'Cover Art & Image Resizer',
    icon: '🖼️',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cover Art & Image Resizer</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px; font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
  .wrap { max-width: 720px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
  h2 { margin: 0 0 4px; font-size: 18px; }
  p { margin: 0 0 14px; font-size: 12.5px; color: #94a3b8; }
  .presets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .presets button { background: #334155; color: #e2e8f0; border: 0; padding: 6px 10px; border-radius: 6px; font-size: 11.5px; cursor: pointer; font-weight: 600; }
  .presets button:hover { background: #4f46e5; color: #fff; }
  .inputs { display: flex; gap: 10px; margin-bottom: 12px; }
  .inputs div { flex: 1; }
  label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  input[type=number], input[type=file] { width: 100%; background: #0f172a; border: 1px solid #475569; color: #fff; padding: 8px; border-radius: 6px; }
  canvas { width: 100%; max-height: 240px; object-fit: contain; background: #090d16; border: 1px solid #334155; border-radius: 8px; display: block; margin-bottom: 12px; }
  .dl { width: 100%; background: #10b981; color: #fff; border: 0; padding: 11px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; }
</style>
</head>
<body>
  <div class="wrap">
    <h2>🖼️ Cover Art & Quick Image Resizer</h2>
    <p>Resize box art, thumbnails, icons, and photos 100% locally in your browser.</p>
    <input type="file" id="f" accept="image/*" style="margin-bottom:12px;">
    <div class="presets">
      <button data-w="512" data-h="512">Icon (512×512)</button>
      <button data-w="600" data-h="850">Box Cover Art (600×850)</button>
      <button data-w="1280" data-h="720">HD Thumbnail (1280×720)</button>
      <button data-w="256" data-h="256">Small Avatar (256×256)</button>
    </div>
    <div class="inputs">
      <div><label>Width (px)</label><input type="number" id="w" value="600"></div>
      <div><label>Height (px)</label><input type="number" id="h" value="850"></div>
    </div>
    <canvas id="c" width="600" height="360"></canvas>
    <button class="dl" id="dl">⬇ Download Resized PNG</button>
  </div>
<script>
  const f = document.getElementById('f'), c = document.getElementById('c'), w = document.getElementById('w'), h = document.getElementById('h');
  const ctx = c.getContext('2d');
  let img = null;
  function drawPlaceholder() {
    ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#64748b'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Choose an image above to preview & resize (' + w.value + '×' + h.value + ')', c.width / 2, c.height / 2);
  }
  drawPlaceholder();
  function render() {
    c.width = Math.max(16, +w.value || 600);
    c.height = Math.max(16, +h.value || 400);
    if (!img) { drawPlaceholder(); return; }
    ctx.drawImage(img, 0, 0, c.width, c.height);
  }
  f.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      img = new Image();
      img.onload = () => { w.value = img.width; h.value = img.height; render(); };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  };
  w.oninput = render; h.oninput = render;
  document.querySelectorAll('[data-w]').forEach(b => {
    b.onclick = () => { w.value = b.dataset.w; h.value = b.dataset.h; render(); };
  });
  document.getElementById('dl').onclick = () => {
    const a = document.createElement('a');
    a.download = 'resized-' + w.value + 'x' + h.value + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };
</script>
</body>
</html>`
  }
};

/**
 * Seeds a project's assets/apps/ directory with built-in utility apps
 * AND automatically imports C:\Users\adria\Desktop\dist (XISO Tool) if present on disk!
 */
function ensureStarterApps(projectDir) {
  const appsBase = path.join(projectDir, 'assets', 'apps');
  fs.mkdirSync(appsBase, { recursive: true });

  // 1. If the user's XISO Tool folder exists on Desktop, auto-bundle it if not yet present!
  const desktopDist = 'C:\\Users\\adria\\Desktop\\dist';
  if (fs.existsSync(path.join(desktopDist, 'index.html')) && !fs.existsSync(path.join(appsBase, 'xiso-tool', 'index.html'))) {
    try {
      importAppFromDir(desktopDist, projectDir, 'index.html', 'XISO Tool');
    } catch {}
  }

  // 2. Write the built-in utility tools if not yet present
  for (const [slug, app] of Object.entries(BUILTIN_APPS)) {
    const dir = path.join(appsBase, slug);
    const idx = path.join(dir, 'index.html');
    if (!fs.existsSync(idx)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(idx, app.html, 'utf8');
    }
  }

  // 3. Sync any user-imported .html apps from the persistent _Shared_Hub_Apps library!
  try {
    const sharedBase = getSharedAppsDir(projectDir);
    if (fs.existsSync(sharedBase)) {
      const sharedEntries = fs.readdirSync(sharedBase, { withFileTypes: true });
      for (const ent of sharedEntries) {
        if (!ent.isDirectory()) continue;
        const srcAppDir = path.join(sharedBase, ent.name);
        const destAppDir = path.join(appsBase, ent.name);
        if (fs.existsSync(path.join(srcAppDir, 'index.html')) && !fs.existsSync(path.join(destAppDir, 'index.html'))) {
          fs.mkdirSync(destAppDir, { recursive: true });
          fs.cpSync(srcAppDir, destAppDir, { recursive: true, force: true });
        }
      }
    }
  } catch (e) {
    console.warn('Shared hub apps sync warning:', e.message);
  }
}

/**
 * Applies (or resets) universal Font & Color overrides directly into the .html files
 * of apps inside <projectDir>/assets/apps/ (and mirrors to _Shared_Hub_Apps).
 */
function styleHtmlAppsInProject(projectDir, { relPath, gfontUrl, fontCss, palCss, reset } = {}) {
  if (!projectDir) return false;
  const appsBase = path.join(projectDir, 'assets', 'apps');
  if (!fs.existsSync(appsBase)) return false;

  const targetFiles = [];
  if (relPath) {
    const full = path.join(projectDir, relPath.replace(/\//g, path.sep));
    if (fs.existsSync(full)) targetFiles.push(full);
  }
  // Also apply to all installed apps in this project so switching apps in the Hub keeps the same vibe!
  try {
    for (const ent of fs.readdirSync(appsBase, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const idx = path.join(appsBase, ent.name, 'index.html');
      if (fs.existsSync(idx) && !targetFiles.includes(idx)) targetFiles.push(idx);
    }
  } catch {}

  for (const file of targetFiles) {
    try {
      let html = fs.readFileSync(file, 'utf8');
      // Strip previous overrides first
      html = html
        .replace(/<link[^>]*id=["']__mh_gfont_override["'][^>]*>\s*/gi, '')
        .replace(/<style[^>]*id=["']__mh_font_override["'][^>]*>[\s\S]*?<\/style>\s*/gi, '')
        .replace(/<style[^>]*id=["']__mh_pal_override["'][^>]*>[\s\S]*?<\/style>\s*/gi, '');

      if (!reset) {
        let inject = '';
        if (gfontUrl) {
          inject += `<link id="__mh_gfont_override" rel="stylesheet" href="${gfontUrl}">\n`;
        }
        if (fontCss) {
          inject += `<style id="__mh_font_override">${fontCss}</style>\n`;
        }
        if (palCss) {
          inject += `<style id="__mh_pal_override">${palCss}</style>\n`;
        }
        if (inject) {
          if (/<\/head>/i.test(html)) {
            html = html.replace(/<\/head>/i, `${inject}</head>`);
          } else if (/<body[^>]*>/i.test(html)) {
            html = html.replace(/<body[^>]*>/i, (m) => `${inject}${m}`);
          } else {
            html = inject + html;
          }
        }
      }
      fs.writeFileSync(file, html, 'utf8');
      mirrorAppToSharedLibrary(path.dirname(file), projectDir);
    } catch {}
  }
  return true;
}

/**
 * Creates or updates a standalone .html app inside <projectDir>/assets/apps/<slug>/index.html
 * and mirrors it to the persistent _Shared_Hub_Apps library.
 */
function saveCustomHtmlApp(projectDir, { title, slug, html, icon }) {
  if (!projectDir || !html) return null;
  const cleanTitle = (title || extractTitleFromHtml(html, 'Custom HTML App')).trim();
  const finalSlug = safeSlug(slug || cleanTitle);
  const appsBase = path.join(projectDir, 'assets', 'apps');
  const targetDir = path.join(appsBase, finalSlug);
  fs.mkdirSync(targetDir, { recursive: true });
  let finalHtml = html;
  if (!/<title[^>]*>/i.test(finalHtml) && /<head[^>]*>/i.test(finalHtml)) {
    finalHtml = finalHtml.replace(/<head[^>]*>/i, (m) => `${m}\n<title>${cleanTitle}</title>`);
  }
  fs.writeFileSync(path.join(targetDir, 'index.html'), finalHtml, 'utf8');
  normalizeAppDirectory(targetDir);
  mirrorAppToSharedLibrary(targetDir, projectDir);
  return {
    success: true,
    name: finalSlug,
    slug: finalSlug,
    title: cleanTitle,
    icon: icon || guessIcon(cleanTitle, finalSlug),
    relPath: `assets/apps/${finalSlug}/index.html`,
    fullDir: targetDir
  };
}

function readHtmlAppCode(projectDir, relPath) {
  if (!projectDir || !relPath) return '';
  const full = path.join(projectDir, relPath.replace(/\//g, path.sep));
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function deleteHtmlApp(projectDir, relPath) {
  if (!projectDir || !relPath) return false;
  const full = path.join(projectDir, relPath.replace(/\//g, path.sep));
  const appDir = path.dirname(full);
  const slug = path.basename(appDir);
  // Don't delete built-in starter apps from disk unless it's a user app, or remove from shared library too
  try {
    if (!BUILTIN_APPS[slug] && fs.existsSync(appDir) && appDir.includes(path.join('assets', 'apps'))) {
      fs.rmSync(appDir, { recursive: true, force: true });
    }
    const sharedDir = path.join(getSharedAppsDir(projectDir), slug);
    if (!BUILTIN_APPS[slug] && fs.existsSync(sharedDir)) {
      fs.rmSync(sharedDir, { recursive: true, force: true });
    }
  } catch {}
  return true;
}

function listProjectApps(projectDir) {
  const appsBase = path.join(projectDir, 'assets', 'apps');
  if (!fs.existsSync(appsBase)) return [];
  const list = [];
  try {
    const entries = fs.readdirSync(appsBase, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const appDir = path.join(appsBase, ent.name);
      const idx = path.join(appDir, 'index.html');
      if (fs.existsSync(idx)) {
        let title = ent.name;
        let hasWasm = false;
        try {
          const html = fs.readFileSync(idx, 'utf8');
          title = extractTitleFromHtml(html, ent.name);
          const files = fs.readdirSync(appDir);
          hasWasm = files.some((f) => f.toLowerCase().endsWith('.wasm'));
        } catch {}
        list.push({
          name: ent.name,
          slug: ent.name,
          title,
          hasWasm,
          icon: guessIcon(title, ent.name),
          relPath: `assets/apps/${ent.name}/index.html`,
          fullDir: appDir
        });
      }
    }
  } catch {}
  // Sort so xiso-tool or user-imported apps appear first
  return list.sort((a, b) => {
    if (a.slug === 'xiso-tool') return -1;
    if (b.slug === 'xiso-tool') return 1;
    const aBuilt = !!BUILTIN_APPS[a.slug];
    const bBuilt = !!BUILTIN_APPS[b.slug];
    if (aBuilt !== bBuilt) return aBuilt ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

module.exports = {
  normalizeAppDirectory,
  importAppFromDir,
  importSingleHtmlFile,
  importBulkAppsFromFolder,
  ensureStarterApps,
  listProjectApps,
  guessIcon,
  mirrorAppToSharedLibrary,
  styleHtmlAppsInProject,
  saveCustomHtmlApp,
  readHtmlAppCode,
  deleteHtmlApp
};
