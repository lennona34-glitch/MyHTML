// Website & .html File Publisher: Supports 1-Click GitHub Pages + Instant Gist Preview (zero-setup if GitHub is signed in) AND Netlify.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const GH_API = 'https://api.github.com';
const META = '.myhtml.json';

// Strict web-safe extensions. Only legitimate web formats are EVER uploaded to the web server.
const ALLOWED_WEB_EXTS = new Set([
  '.html', '.htm',
  '.css',
  '.js', '.mjs', '.cjs',
  '.json',
  '.wasm',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.wav', '.ogg', '.aac', '.flac',
  '.mp4', '.webm',
  '.txt', '.xml', '.csv', '.webmanifest'
]);

// Non-web source code and binary formats that must NEVER be uploaded as website assets.
const FORBIDDEN_EXTS = new Set([
  '.cpp', '.c', '.cc', '.cxx', '.h', '.hpp', '.hxx', '.inl',
  '.cs', '.py', '.rs', '.go', '.java', '.kt', '.swift',
  '.exe', '.dll', '.so', '.dylib', '.obj', '.o', '.a', '.lib', '.pdb',
  '.sh', '.bat', '.ps1', '.cmd', '.reg',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.7za'
]);

function isWebAsset(fileName) {
  if (!fileName || typeof fileName !== 'string') return false;
  const ext = path.extname(fileName).toLowerCase();
  if (FORBIDDEN_EXTS.has(ext)) return false;
  return ALLOWED_WEB_EXTS.has(ext);
}

function isReferencedInHtml(html, fileName) {
  if (!html || !fileName) return false;
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Must be in a resource attribute like src="...", href="...", url(...), or quoted import
  const re = new RegExp(`(?:src|href|action|poster|data-[a-z0-9_-]+)\\s*=\\s*["'][^"']*${escaped}[^"']*["']|url\\(\\s*["']?[^"')]*${escaped}[^"')]*["']?\\)|(?:import|fetch|load)\\s*\\(\\s*["']${escaped}["']\\)|["'\`]\\s*[^"'\`]*\\/${escaped}[^"'\`]*["'\`]`, 'i');
  return re.test(html);
}

const GLOBAL_META_FILE = path.join(os.homedir(), '.myhtml-pub-meta.json');
function readFileMeta(key) {
  if (!key) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(GLOBAL_META_FILE, 'utf8'));
    return raw[key] || {};
  } catch { return {}; }
}
function writeFileMeta(key, data) {
  if (!key) return;
  try {
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(GLOBAL_META_FILE, 'utf8')); } catch {}
    raw[key] = { ...(raw[key] || {}), ...data };
    fs.writeFileSync(GLOBAL_META_FILE, JSON.stringify(raw, null, 2));
  } catch {}
}

function readMeta(dir) {
  if (!dir) return {};
  try { return JSON.parse(fs.readFileSync(path.join(dir, META), 'utf8')); } catch { return {}; }
}

function writeMeta(dir, data) {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    fs.writeFileSync(path.join(dir, META), JSON.stringify({ ...readMeta(dir), ...data }, null, 2));
  } catch {}
}

function copyDirFiltered(src, dest, filterFn) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === META || ent.name.startsWith('.')) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      // Skip build / compiler artifact directories that may contain object or source files
      if (/^(build|dist|obj|bin|out|\.vs|\.vscode)$/i.test(ent.name)) continue;
      if (filterFn && !filterFn(s, ent)) continue;
      copyDirFiltered(s, d, filterFn);
    } else {
      if (!isWebAsset(ent.name)) continue; // STRICTLY block all .cpp, .c, .h, .cs, .exe, etc.
      if (filterFn && !filterFn(s, ent)) continue;
      fs.copyFileSync(s, d);
    }
  }
}

function injectSocialMetaTags(html, title, description) {
  if (!html || !/<head>/i.test(html)) return html;
  const cleanTitle = title || 'Website';
  const cleanDesc = description || 'Published with MyHTML';
  let tags = '';
  if (!/<meta[^>]+property=["']og:title["']/i.test(html)) {
    tags += `\n  <meta property="og:title" content="${cleanTitle.replace(/"/g, '&quot;')}">`;
  }
  if (!/<meta[^>]+property=["']og:description["']/i.test(html)) {
    tags += `\n  <meta property="og:description" content="${cleanDesc.replace(/"/g, '&quot;')}">`;
  }
  if (!/<meta[^>]+property=["']og:type["']/i.test(html)) {
    tags += `\n  <meta property="og:type" content="website">`;
  }
  if (tags) {
    return html.replace(/<head>/i, `<head>${tags}`);
  }
  return html;
}

/**
 * Prepares a clean directory containing an index.html ready to be uploaded,
 * ensuring ONLY valid HTML and web assets (.css, .js, .wasm, images, fonts) are included.
 */
function prepareTargetStage({ mode, projectDir, filePath, appRelPath, pageName }, log = () => {}) {
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myhtml-pub-'));
  let metaDir = projectDir || null;
  let defaultSlug = 'my-web-page';
  const stagedFiles = [];

  const finalizeStage = () => {
    const stageIndex = path.join(stageDir, 'index.html');
    if (fs.existsSync(stageIndex)) {
      try {
        let content = fs.readFileSync(stageIndex, 'utf8');
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : (defaultSlug || 'My Website');
        content = injectSocialMetaTags(content, pageTitle);
        fs.writeFileSync(stageIndex, content, 'utf8');
      } catch {}
    }
    // Netlify & hosting headers file to guarantee correct MIME types and public web serving
    try {
      const headersContent = `/*
  X-Content-Type-Options: nosniff
/
  Content-Type: text/html; charset=utf-8
/index.html
  Content-Type: text/html; charset=utf-8
/*.html
  Content-Type: text/html; charset=utf-8
/*.css
  Content-Type: text/css; charset=utf-8
/*.js
  Content-Type: application/javascript; charset=utf-8
/*.mjs
  Content-Type: application/javascript; charset=utf-8
/*.wasm
  Content-Type: application/wasm
/*.json
  Content-Type: application/json; charset=utf-8
`;
      fs.writeFileSync(path.join(stageDir, '_headers'), headersContent, 'utf8');
    } catch {}
  };

  if (mode === 'file') {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Please choose a .html file to upload.');
    }
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.html' && ext !== '.htm') {
      throw new Error(`Cannot upload "${path.basename(filePath)}" (${ext || 'no extension'}). MyHTML only publishes HTML web pages (.html or .htm). Non-web files (like C++ or executables) are blocked.`);
    }

    const baseName = path.basename(filePath, path.extname(filePath));
    defaultSlug = baseName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-page';
    fs.copyFileSync(filePath, path.join(stageDir, 'index.html'));
    stagedFiles.push('index.html');

    // Also copy sibling local assets ONLY if they are valid web assets AND referenced by the HTML
    const parentDir = path.dirname(filePath);
    let htmlText = '';
    try { htmlText = fs.readFileSync(filePath, 'utf8'); } catch {}

    for (const ent of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (ent.name === path.basename(filePath) || ent.name.startsWith('.')) continue;
      if (ent.isDirectory()) {
        // Only consider common web asset folders
        if (/^(assets|css|js|images|img|fonts|wasm|media)$/i.test(ent.name)) {
          const s = path.join(parentDir, ent.name);
          const d = path.join(stageDir, ent.name);
          copyDirFiltered(s, d);
        }
      } else {
        // Enforce strict web asset filtering: NEVER copy .cpp, .c, .h, .exe, etc.
        if (!isWebAsset(ent.name)) continue;
        if (isReferencedInHtml(htmlText, ent.name)) {
          const s = path.join(parentDir, ent.name);
          const d = path.join(stageDir, ent.name);
          try {
            if (fs.statSync(s).size < 15 * 1024 * 1024) {
              fs.copyFileSync(s, d);
              stagedFiles.push(ent.name);
            }
          } catch {}
        }
      }
    }
    finalizeStage();
    log(`Staged ${stagedFiles.length} web file${stagedFiles.length === 1 ? '' : 's'}: ${stagedFiles.slice(0, 5).join(', ')}${stagedFiles.length > 5 ? '…' : ''} (all non-web/C++ files excluded)`);
    metaDir = null;
    return { stageDir, metaDir, defaultSlug, stagedFiles, cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
  }

  if (mode === 'hubApp' && projectDir && appRelPath) {
    const cleanRel = appRelPath.replace(/\//g, path.sep);
    const fullIndex = path.join(projectDir, cleanRel);
    const appFolder = fs.existsSync(fullIndex) && fs.statSync(fullIndex).isDirectory()
      ? fullIndex
      : path.dirname(fullIndex);
    if (!fs.existsSync(appFolder)) throw new Error('Could not find that Hub app folder on disk.');
    defaultSlug = path.basename(appFolder).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'web-app';
    copyDirFiltered(appFolder, stageDir);
    if (!fs.existsSync(path.join(stageDir, 'index.html'))) {
      const htmls = fs.readdirSync(stageDir).filter((f) => /\.html?$/i.test(f));
      if (htmls.length) fs.copyFileSync(path.join(stageDir, htmls[0]), path.join(stageDir, 'index.html'));
    }
    finalizeStage();
    metaDir = appFolder;
    return { stageDir, metaDir, defaultSlug, stagedFiles: fs.readdirSync(stageDir), cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
  }

  if (mode === 'singlePage' && projectDir && pageName) {
    const srcPage = path.join(projectDir, pageName);
    if (!fs.existsSync(srcPage)) throw new Error(`Page "${pageName}" not found.`);
    const rawSlug = pageName.replace(/\.html?$/i, '');
    defaultSlug = (rawSlug === 'index' ? path.basename(projectDir) : rawSlug)
      .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-site';
    fs.copyFileSync(srcPage, path.join(stageDir, 'index.html'));
    // Copy assets/images, assets/css, assets/fonts, assets/js (skipping unrelated Hub apps unless referenced)
    const htmlContent = fs.readFileSync(srcPage, 'utf8');
    const assetsDir = path.join(projectDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      for (const ent of fs.readdirSync(assetsDir, { withFileTypes: true })) {
        if (ent.name === 'apps' && !htmlContent.includes('assets/apps/')) continue;
        const s = path.join(assetsDir, ent.name);
        const d = path.join(stageDir, 'assets', ent.name);
        if (ent.isDirectory()) copyDirFiltered(s, d);
        else if (isWebAsset(ent.name)) fs.copyFileSync(s, d);
      }
    }
    finalizeStage();
    return { stageDir, metaDir: projectDir, defaultSlug, stagedFiles: fs.readdirSync(stageDir), cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
  }

  // Default: 'wholeSite'
  if (!projectDir || !fs.existsSync(projectDir)) {
    throw new Error('Please open a page or pick a .html file from your computer first.');
  }
  defaultSlug = path.basename(projectDir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-website';
  copyDirFiltered(projectDir, stageDir);
  finalizeStage();
  return { stageDir, metaDir: projectDir, defaultSlug, stagedFiles: fs.readdirSync(stageDir), cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
}

/* ============================================================================
   GITHUB INSTANT PUBLISHER (GitHub Pages + Instant Gist Live Link)
   ============================================================================ */
async function ghCall(token, method, endpoint, body) {
  const res = await fetch(GH_API + endpoint, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MyHTML-Desktop-Publisher',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, data: json, text };
}

async function getGithubUser(token) {
  if (!token) return null;
  try {
    const r = await ghCall(token, 'GET', '/user');
    if (r.ok && r.data && r.data.login) return r.data.login;
  } catch {}
  return null;
}

async function publishViaGithub(token, opts = {}, log = () => {}) {
  const username = await getGithubUser(token);
  if (!username) {
    throw new Error('GitHub is not connected yet. Paste a GitHub token or use Netlify.');
  }

  const { stageDir, metaDir, defaultSlug, stagedFiles, cleanup } = prepareTargetStage(opts, log);
  try {
    const indexPath = path.join(stageDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('No index.html found to publish.');
    }

    const baseSlug = (opts.name || defaultSlug || 'my-web-page')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-web-page';
    let repoName = baseSlug.startsWith('myhtml-') ? baseSlug : `myhtml-${baseSlug}`;

    // 1. Create an Instant Live Gist Preview (<1 second live URL!) if index.html is reasonably sized
    let instantUrl = null;
    try {
      const htmlContent = fs.readFileSync(indexPath, 'utf8');
      if (htmlContent.length > 0 && htmlContent.length < 900 * 1024) {
        log('⚡ Creating instant live preview link…');
        const gistRes = await ghCall(token, 'POST', '/gists', {
          description: `Website published with MyHTML (${repoName})`,
          public: true,
          files: {
            'index.html': { content: htmlContent }
          }
        });
        if (gistRes.ok && gistRes.data && gistRes.data.id) {
          instantUrl = `https://gistpreview.github.io/?${gistRes.data.id}`;
          log(`✓ Instant Live Link ready: ${instantUrl}`);
        }
      }
    } catch {}

    // 2. Create or update public GitHub repository & enable GitHub Pages for full multi-file / WASM support
    log(`📦 Preparing GitHub Pages site (${username}/${repoName})…`);
    let repoCheck = await ghCall(token, 'GET', `/repos/${username}/${repoName}`);
    if (repoCheck.ok) {
      const isMyHtmlRepo = repoCheck.data && (
        repoCheck.data.description === 'Website published with MyHTML' ||
        (repoCheck.data.homepage && repoCheck.data.homepage.includes('.github.io/'))
      );
      if (!isMyHtmlRepo) {
        // Guard: never force push over an existing unrelated project repository (e.g. C++/game repo)
        repoName = `myhtml-${baseSlug}-${Date.now().toString(36).slice(-4)}`;
        log(`Using dedicated website repo: ${repoName}`);
        repoCheck = await ghCall(token, 'GET', `/repos/${username}/${repoName}`);
      }
    }

    if (!repoCheck.ok) {
      log(`Creating public repository ${username}/${repoName}…`);
      const createRes = await ghCall(token, 'POST', '/user/repos', {
        name: repoName,
        description: 'Website published with MyHTML',
        homepage: `https://${username}.github.io/${repoName}/`,
        private: false,
        has_issues: false,
        has_projects: false,
        has_wiki: false
      });
      if (!createRes.ok && createRes.status !== 422) {
        if (instantUrl) {
          return { url: instantUrl, instantUrl, provider: 'github', username };
        }
        throw new Error('Could not create GitHub repo: ' + ((createRes.data && createRes.data.message) || createRes.status));
      }
    }

    // Add .nojekyll so GitHub Pages serves all folders and underscores cleanly
    fs.writeFileSync(path.join(stageDir, '.nojekyll'), '');

    log(`🚀 Uploading ${stagedFiles ? stagedFiles.length : 'web'} HTML & asset files to GitHub Pages…`);
    const remoteUrl = `https://${encodeURIComponent(username)}:${encodeURIComponent(token)}@github.com/${username}/${repoName}.git`;
    execSync('git init -b main', { cwd: stageDir, stdio: 'ignore', timeout: 10000 });
    execSync('git config user.name "MyHTML Publisher"', { cwd: stageDir, stdio: 'ignore', timeout: 5000 });
    execSync('git config user.email "publisher@myhtml.local"', { cwd: stageDir, stdio: 'ignore', timeout: 5000 });
    execSync('git add -A', { cwd: stageDir, stdio: 'ignore', timeout: 20000 });
    execSync('git commit -m "Published via MyHTML"', { cwd: stageDir, stdio: 'ignore', timeout: 15000 });
    execSync(`git push --force "${remoteUrl}" main`, { cwd: stageDir, stdio: 'ignore', timeout: 60000 });

    log('🌍 Activating GitHub Pages HTTPS hosting…');
    await ghCall(token, 'POST', `/repos/${username}/${repoName}/pages`, {
      source: { branch: 'main', path: '/' }
    });

    const pagesUrl = `https://${username}.github.io/${repoName}/`;
    const repoUrl = `https://github.com/${username}/${repoName}`;
    if (metaDir) {
      writeMeta(metaDir, { url: pagesUrl, instantUrl, repoUrl, provider: 'github', repoName });
    }
    log(`🎉 Done! Live at ${pagesUrl}`);
    return {
      url: pagesUrl,
      instantUrl,
      repoUrl,
      provider: 'github',
      username
    };
  } finally {
    cleanup();
  }
}

/* ============================================================================
   NETLIFY PUBLISHER
   ============================================================================ */
async function netlifyCall(token, method, url, body, headers = {}) {
  const res = await fetch(NETLIFY_API + url, {
    method,
    headers: { Authorization: 'Bearer ' + token, ...headers },
    body,
    signal: AbortSignal.timeout(120000)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text.slice(0, 200) || 'HTTP ' + res.status;
    const err = new Error(
      res.status === 401
        ? 'Netlify did not accept that token. Please create a new one and try again.'
        : res.status === 422 && /name/i.test(msg)
          ? 'That site name is already taken on Netlify. Try a different name.'
          : 'Netlify said: ' + msg
    );
    err.status = res.status;
    throw err;
  }
  return json;
}

function zipDirectory(dir) {
  const zip = new AdmZip();
  const addFolder = (folder, zipBase = '') => {
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === '.git' || ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      const full = path.join(folder, ent.name);
      if (ent.isDirectory()) {
        const subBase = zipBase ? `${zipBase}/${ent.name}` : ent.name;
        addFolder(full, subBase);
      } else {
        zip.addLocalFile(full, zipBase);
      }
    }
  };
  addFolder(dir);
  return zip.toBuffer();
}

async function publishViaNetlify(token, opts = {}, log = () => {}) {
  const { stageDir, metaDir, defaultSlug, stagedFiles, cleanup } = prepareTargetStage(opts, log);
  try {
    if (!fs.existsSync(path.join(stageDir, 'index.html'))) {
      throw new Error('Your site needs an index.html page to be published.');
    }

    const baseSlug = (opts.name || defaultSlug || 'my-web-page')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-web-page';

    // 1. Check if we already have a siteId stored for this project folder or standalone file
    const fileKey = opts.filePath ? path.resolve(opts.filePath) : null;
    const meta = metaDir ? readMeta(metaDir) : (fileKey ? readFileMeta(fileKey) : {});
    let siteId = meta.netlifySiteId, site;

    if (siteId) {
      try {
        site = await netlifyCall(token, 'GET', '/sites/' + siteId);
        log(`✓ Found existing Netlify site "${site.name}.netlify.app" — updating…`);
      } catch (e) {
        if (e.status === 404) siteId = null;
        else throw e;
      }
    }

    // 2. If no cached siteId, check if a site matching this name already exists in the user's Netlify account
    if (!siteId && baseSlug) {
      try {
        log('Checking existing sites in your Netlify account…');
        const userSites = await netlifyCall(token, 'GET', '/sites?filter=all');
        if (Array.isArray(userSites)) {
          const match = userSites.find(
            (s) => s && s.name && s.name.toLowerCase() === baseSlug
          );
          if (match) {
            site = match;
            siteId = match.id;
            log(`✓ Found existing site "${match.name}.netlify.app" in your account — updating live version…`);
          }
        }
      } catch {}
    }

    // 3. If site still doesn't exist, create it with automatic collision recovery
    if (!siteId) {
      log('Creating your site on Netlify…');
      let targetName = baseSlug.slice(0, 36);
      let created = false;
      let attempt = 0;

      while (!created && attempt < 4) {
        attempt++;
        try {
          const bodyPayload = targetName ? JSON.stringify({ name: targetName }) : '{}';
          site = await netlifyCall(token, 'POST', '/sites', bodyPayload, { 'Content-Type': 'application/json' });
          siteId = site.id;
          created = true;
          log(`✓ Netlify site created: ${site.name}.netlify.app`);
        } catch (err) {
          const errMsg = String((err.data && JSON.stringify(err.data)) || err.message || '');
          const isConflict = err.status === 422 || /must be unique|subdomain.*unique|already taken|is taken/i.test(errMsg);
          if (isConflict) {
            if (attempt === 1 && targetName) {
              const suffix = Math.random().toString(36).slice(2, 6);
              targetName = `${baseSlug.slice(0, 29)}-${suffix}`;
              log(`Subdomain "${baseSlug}.netlify.app" is already taken. Retrying with unique name: "${targetName}"…`);
            } else if (attempt === 2 && targetName) {
              const timeSuffix = Date.now().toString(36).slice(-4);
              targetName = `${baseSlug.slice(0, 25)}-${timeSuffix}`;
              log(`Retrying with: "${targetName}"…`);
            } else {
              log('Letting Netlify assign a guaranteed unique subdomain name…');
              targetName = '';
            }
          } else {
            throw err;
          }
        }
      }

      if (!siteId) {
        throw new Error('Could not create site on Netlify. Please try again.');
      }
    }

    // Guarantee site is publicly accessible without login locks (disables Edge SSO lock)
    try {
      await netlifyCall(token, 'PATCH', '/sites/' + siteId, JSON.stringify({ sso_login: false, password: '' }), { 'Content-Type': 'application/json' });
    } catch {}

    log(`Packing ${stagedFiles ? stagedFiles.length : 'web'} HTML & asset files (non-web/C++ files excluded)…`);
    const buf = zipDirectory(stageDir);
    log(`Uploading ${(buf.length / 1024 / 1024).toFixed(2)} MB to Netlify…`);
    let deploy = await netlifyCall(token, 'POST', `/sites/${siteId}/deploys`, buf, { 'Content-Type': 'application/zip' });
    log('Going live…');
    for (let i = 0; i < 60 && deploy.state !== 'ready'; i++) {
      if (deploy.state === 'error') throw new Error('Netlify could not publish the site: ' + (deploy.error_message || 'unknown error'));
      await new Promise((r) => setTimeout(r, 1500));
      deploy = await netlifyCall(token, 'GET', '/deploys/' + deploy.id);
    }
    const url = (site && (site.ssl_url || site.url)) || deploy.ssl_url || deploy.url;
    const adminUrl = (site && site.admin_url) || deploy.admin_url;
    if (metaDir) writeMeta(metaDir, { netlifySiteId: siteId, url, adminUrl, provider: 'netlify' });
    if (fileKey) writeFileMeta(fileKey, { netlifySiteId: siteId, url, adminUrl, provider: 'netlify' });
    return { url, adminUrl, ready: deploy.state === 'ready', provider: 'netlify' };
  } finally {
    cleanup();
  }
}

async function checkToken(token) {
  await netlifyCall(token, 'GET', '/user');
  return true;
}

module.exports = {
  publish: (dir, token, opts, log) => publishViaNetlify(token, { mode: 'wholeSite', projectDir: dir, ...(opts || {}) }, log),
  publishViaNetlify,
  publishViaGithub,
  getGithubUser,
  checkToken,
  readMeta
};
