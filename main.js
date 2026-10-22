const { app, BrowserWindow, ipcMain, dialog, shell, Menu, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { TEMPLATES } = require('./renderer/templates.js');
const { cloneSite } = require('./cloner');
const { scanProjectFonts } = require('./font-scanner');
const {
  normalizeAppDirectory,
  importAppFromDir,
  importSingleHtmlFile,
  importBulkAppsFromFolder,
  ensureStarterApps,
  listProjectApps,
  guessIcon
} = require('./builtin-apps');
const {
  CURATED_LIVE_TEMPLATES,
  ARCHETYPES,
  COLOR_PALETTES,
  FONT_PAIRINGS,
  fetchNeocitiesCommunity,
  searchGithubTemplates,
  generateFreshWebsite
} = require('./community-templates');

let win;
app.disableHardwareAcceleration();
function createWindow() {
  win = new BrowserWindow({
    width: 1560, height: 940, minWidth: 1100, minHeight: 640,
    backgroundColor: '#12141c', title: 'MyHTML', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });
  Menu.setApplicationMenu(null);
  win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.handle('win:fullscreen', (_, on) => { win.setFullScreen(on === undefined ? !win.isFullScreen() : !!on); return win.isFullScreen(); });
ipcMain.handle('dialog:folder', async (_, title, defaultPath) => {
  const r = await dialog.showOpenDialog(win, { title, defaultPath, properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Choose this folder' });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('clone:defaultDir', (_, url) => {
  let host = 'website';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
  const base = path.join(app.getPath('documents'), 'MyHTML Sites');
  let dir = path.join(base, host), n = 2;
  while (fs.existsSync(dir) && fs.readdirSync(dir).length) dir = path.join(base, `${host}-${n++}`);
  return dir;
});

const safeName = (n) => path.basename(String(n)).replace(/[<>:"/\\|?*]+/g, '-');
const info = (dir) => ({
  dir,
  name: path.basename(dir),
  base: pathToFileURL(dir).href + '/',
  pages: fs.readdirSync(dir).filter((f) => /\.html?$/i.test(f)).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)))
});

async function pickFolder(title) {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Choose this folder' });
  return r.canceled ? null : r.filePaths[0];
}

ipcMain.handle('project:create', async (_, { template, customDir }) => {
  let dir = customDir;
  if (!dir) {
    const base = path.join(app.getPath('documents'), 'MyHTML Sites');
    fs.mkdirSync(base, { recursive: true });
    let name = template === 'blank' ? 'new-site' : `${template}-site`;
    dir = path.join(base, name);
    let n = 2;
    while (fs.existsSync(dir) && fs.readdirSync(dir).length) dir = path.join(base, `${name}-${n++}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets', 'images'), { recursive: true });
  ensureStarterApps(dir);
  const t = TEMPLATES[template] || TEMPLATES.blank;
  fs.writeFileSync(path.join(dir, 'index.html'), t.html());
  return info(dir);
});


ipcMain.handle('project:open', async () => {
  const dir = await pickFolder('Open a website folder');
  if (!dir) return null;
  const i = info(dir);
  if (!i.pages.length) { dialog.showErrorBox('No pages found', 'That folder has no .html files.'); return null; }
  return i;
});
ipcMain.handle('project:info', (_, dir) => info(dir));
ipcMain.handle('page:read', (_, dir, name) => fs.readFileSync(path.join(dir, safeName(name)), 'utf8'));
ipcMain.handle('page:write', (_, dir, name, html) => { fs.writeFileSync(path.join(dir, safeName(name)), html); return true; });
ipcMain.handle('page:create', (_, dir, name, html) => {
  name = safeName(name).replace(/\.html?$/i, '') + '.html';
  const f = path.join(dir, name);
  if (fs.existsSync(f)) throw new Error('A page called ' + name + ' already exists.');
  fs.writeFileSync(f, html);
  return name;
});
ipcMain.handle('page:delete', async (_, dir, name) => {
  const { response } = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Delete', 'Cancel'], defaultId: 1, message: `Delete ${name}?`, detail: 'This removes the file from your project folder.' });
  if (response !== 0) return false;
  await shell.trashItem(path.join(dir, safeName(name)));
  return true;
});

ipcMain.handle('asset:import', async (_, dir) => {
  const r = await dialog.showOpenDialog(win, { title: 'Choose an image', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico'] }] });
  if (r.canceled) return null;
  const dest = path.join(dir, 'assets', 'images');
  fs.mkdirSync(dest, { recursive: true });
  const src = r.filePaths[0];
  let name = safeName(path.basename(src)), n = 1;
  while (fs.existsSync(path.join(dest, name))) name = path.basename(src, path.extname(src)) + '-' + n++ + path.extname(src);
  fs.copyFileSync(src, path.join(dest, name));
  return 'assets/images/' + name;
});

ipcMain.handle('app:import', async (_, projectDir) => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose Web App Folder (or a Folder of Multiple Apps)',
    properties: ['openDirectory'],
    buttonLabel: 'Import App(s)'
  });
  if (r.canceled || !r.filePaths.length) return null;

  let srcDir = r.filePaths[0];
  // Check if srcDir directly has dist/build/public/out with index.html
  if (!fs.existsSync(path.join(srcDir, 'index.html'))) {
    for (const sub of ['dist', 'build', 'public', 'out']) {
      if (fs.existsSync(path.join(srcDir, sub, 'index.html'))) {
        const res = importAppFromDir(path.join(srcDir, sub), projectDir, 'index.html', path.basename(srcDir));
        return res ? { ...res, apps: [res], bulkCount: 1 } : null;
      }
    }
  }

  const apps = importBulkAppsFromFolder(srcDir, projectDir);
  if (!apps.length) {
    await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'No HTML apps found',
      message: 'Could not find any .html files in that folder.',
      detail: 'Please pick a folder containing an index.html file, a dist/build folder, or a parent folder of HTML apps.'
    });
    return null;
  }
  return { ...apps[0], apps, bulkCount: apps.length };
});

ipcMain.handle('app:importBulk', async (_, projectDir) => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose Folder of Apps (Imports all app subfolders & .html tools inside)',
    properties: ['openDirectory'],
    buttonLabel: 'Bulk Import All Apps'
  });
  if (r.canceled || !r.filePaths.length) return null;

  const apps = importBulkAppsFromFolder(r.filePaths[0], projectDir);
  if (!apps.length) {
    await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'No apps found',
      message: 'Could not find any app subfolders or .html files in that folder.',
      detail: 'Select a folder that contains one or more app subfolders or .html files.'
    });
    return null;
  }
  return { ...apps[0], apps, bulkCount: apps.length };
});

ipcMain.handle('app:importFile', async (_, projectDir) => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose one or more .html App Files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'HTML Apps & Pages', extensions: ['html', 'htm'] }],
    buttonLabel: 'Import .html App(s)'
  });
  if (r.canceled || !r.filePaths.length) return null;

  const apps = [];
  for (const filePath of r.filePaths) {
    const imported = importSingleHtmlFile(filePath, projectDir);
    if (imported) apps.push(imported);
  }
  if (!apps.length) return null;
  return { ...apps[0], apps, bulkCount: apps.length };
});

ipcMain.handle('app:cloneUrl', async (e, { projectDir, url, customTitle }) => {
  try { new URL(url); } catch { throw new Error('Please enter a full web address, like https://example.com'); }
  const u = new URL(url);
  let baseSlug = (customTitle || u.hostname.replace(/^www\./, '') + '-' + (u.pathname.split('/').filter(Boolean).pop() || 'app'))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'web-app';

  const appsBase = path.join(projectDir, 'assets', 'apps');
  fs.mkdirSync(appsBase, { recursive: true });
  let targetDir = path.join(appsBase, baseSlug), n = 2;
  while (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length) {
    targetDir = path.join(appsBase, `${baseSlug}-${n++}`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const send = (m) => e.sender.send('clone:progress', m);
  await cloneSite(url, targetDir, { maxPages: 1, stripScripts: false }, send);
  normalizeAppDirectory(targetDir);

  let title = customTitle || '';
  try {
    const html = fs.readFileSync(path.join(targetDir, 'index.html'), 'utf8');
    const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (!title && m) title = m[1].trim();
  } catch {}
  if (!title) title = u.hostname.replace(/^www\./, '');

  const slug = path.basename(targetDir);
  const appObj = {
    success: true,
    name: slug,
    slug,
    title,
    icon: guessIcon(title, slug),
    relPath: `assets/apps/${slug}/index.html`,
    fullDir: targetDir
  };
  return { ...appObj, apps: [appObj], bulkCount: 1 };
});

ipcMain.handle('apps:list', (_, projectDir) => {
  if (!projectDir) return [];
  ensureStarterApps(projectDir);
  return listProjectApps(projectDir);
});

ipcMain.handle('clone:run', async (e, { url, dir, maxPages, stripScripts, confirmed }) => {
  try { new URL(url); } catch { throw new Error('Please enter a full web address, like https://example.com'); }
  if (!dir) {
    let host = 'website';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
    const base = path.join(app.getPath('documents'), 'MyHTML Sites');
    dir = path.join(base, host);
    let n = 2;
    while (fs.existsSync(dir) && fs.readdirSync(dir).length) dir = path.join(base, `${host}-${n++}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  if (!confirmed && fs.readdirSync(dir).length) return { needsConfirm: true, targetDir: dir };
  const send = (m) => e.sender.send('clone:progress', m);
  const res = await cloneSite(url, dir, { maxPages, stripScripts }, send);
  return { ...info(dir), result: res };
});



ipcMain.handle('shell:folder', (_, dir) => shell.openPath(dir));
ipcMain.handle('shell:browser', (_, dir, name) => shell.openPath(path.join(dir, safeName(name))));
ipcMain.handle('shell:external', (_, url) => /^https?:/.test(url) && shell.openExternal(url));
ipcMain.handle('shell:showItem', (_, filePath) => {
  if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
  else if (filePath) shell.openPath(path.dirname(filePath));
});

ipcMain.handle('fonts:list', (_, dir) => scanProjectFonts(dir));

ipcMain.handle('project:recent', () => {
  const base = path.join(app.getPath('documents'), 'MyHTML Sites');
  if (!fs.existsSync(base)) return [];
  const entries = fs.readdirSync(base, { withFileTypes: true });
  const list = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const full = path.join(base, ent.name);
    try {
      const files = fs.readdirSync(full);
      const pages = files.filter(f => /\.html?$/i.test(f));
      if (!pages.length) continue;
      const stat = fs.statSync(full);
      let fontCount = 0;
      for (const sub of ['fonts', 'files']) {
        const subP = path.join(full, 'assets', sub);
        if (fs.existsSync(subP)) {
          fontCount += fs.readdirSync(subP).filter(f => /\.(woff2?|ttf|otf|eot)$/i.test(f)).length;
        }
      }
      list.push({
        dir: full,
        name: ent.name,
        pages: pages.length,
        fontCount,
        mtime: stat.mtimeMs
      });
    } catch {}
  }
  return list.sort((a, b) => b.mtime - a.mtime).slice(0, 20);
});

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

ipcMain.handle('assets:list', (_, dir) => {
  const res = { images: [], fonts: [], css: [], other: [] };
  const root = path.join(dir, 'assets');
  if (!fs.existsSync(root)) return res;
  function walk(current) {
    const list = fs.readdirSync(current, { withFileTypes: true });
    for (const item of list) {
      const p = path.join(current, item.name);
      if (item.isDirectory()) walk(p);
      else {
        const ext = path.extname(item.name).toLowerCase();
        const rel = path.relative(dir, p).replace(/\\/g, '/');
        const stat = fs.statSync(p);
        const entry = { name: item.name, path: rel, fullPath: p, size: formatBytes(stat.size), ext };
        if (/\.(png|jpe?g|gif|webp|svg|ico|avif)$/i.test(ext)) res.images.push(entry);
        else if (/\.(woff2?|ttf|otf|eot)$/i.test(ext)) res.fonts.push(entry);
        else if (/\.css$/i.test(ext)) res.css.push(entry);
        else res.other.push(entry);
      }
    }
  }
  walk(root);
  return res;
});

/* ---------- publishing (Netlify) ---------- */
const { publish, checkToken, readMeta } = require('./publisher');
const tokenFile = () => path.join(app.getPath('userData'), 'netlify-token.bin');
function loadToken() {
  try {
    const raw = fs.readFileSync(tokenFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch { return null; }
}
ipcMain.handle('publish:info', (_, dir) => {
  const m = readMeta(dir);
  return { hasToken: !!loadToken(), url: m.url || null, adminUrl: m.adminUrl || null };
});
ipcMain.handle('publish:setToken', async (_, token) => {
  token = String(token || '').trim();
  if (!token) throw new Error('Please paste your Netlify token.');
  await checkToken(token);
  fs.writeFileSync(tokenFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(token) : token);
  return true;
});
ipcMain.handle('publish:forget', () => { try { fs.unlinkSync(tokenFile()); } catch {} return true; });
ipcMain.handle('publish:run', async (e, dir, opts) => {
  const token = loadToken();
  if (!token) throw new Error('Not connected to Netlify yet.');
  return publish(dir, token, opts, (m) => e.sender.send('publish:progress', m));
});

/* ---------- Community Templates & Instant Generator ---------- */
const ghTokenFile = () => path.join(app.getPath('userData'), 'github-token.bin');
function loadGhToken() {
  try {
    const raw = fs.readFileSync(ghTokenFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8');
  } catch { return ''; }
}

ipcMain.handle('templates:catalog', () => ({
  curated: CURATED_LIVE_TEMPLATES,
  archetypes: ARCHETYPES.map((a) => ({ id: a.id, name: a.name, badge: a.badge })),
  palettes: COLOR_PALETTES,
  fonts: FONT_PAIRINGS,
  hasGithubToken: !!loadGhToken()
}));

ipcMain.handle('templates:neocities', async (_, opts) => {
  return fetchNeocitiesCommunity(opts || {});
});

ipcMain.handle('templates:github', async (_, opts) => {
  const token = loadGhToken();
  return searchGithubTemplates({ ...(opts || {}), token });
});

ipcMain.handle('templates:setGithubToken', async (_, token) => {
  token = String(token || '').trim();
  if (!token) {
    try { fs.unlinkSync(ghTokenFile()); } catch {}
    return { hasGithubToken: false };
  }
  fs.writeFileSync(ghTokenFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(token) : token);
  return { hasGithubToken: true };
});

ipcMain.handle('templates:rollFresh', async (_, opts = {}) => {
  const { html, meta } = generateFreshWebsite(opts);
  const base = path.join(app.getPath('documents'), 'MyHTML Sites');
  fs.mkdirSync(base, { recursive: true });
  const dir = path.join(base, 'Surprise-Studio');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets', 'images'), { recursive: true });
  ensureStarterApps(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  return { ...info(dir), meta };
});

ipcMain.handle('templates:cloneCommunity', async (e, { url, title, slug }) => {
  const base = path.join(app.getPath('documents'), 'MyHTML Sites');
  fs.mkdirSync(base, { recursive: true });
  let folderName = (slug || title || 'community-site')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'community-site';
  let dir = path.join(base, folderName), n = 2;
  while (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    dir = path.join(base, `${folderName}-${n++}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  ensureStarterApps(dir);
  const send = (m) => e.sender.send('clone:progress', m);
  const res = await cloneSite(url, dir, { maxPages: 1, stripScripts: true }, send);
  return { ...info(dir), result: res };
});
