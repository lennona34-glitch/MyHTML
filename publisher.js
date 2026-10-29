// Website & .html File Publisher: Supports 1-Click GitHub Pages + Instant Gist Preview (zero-setup if GitHub is signed in) AND Netlify.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const NETLIFY_API = 'https://api.netlify.com/api/v1';
const GH_API = 'https://api.github.com';
const META = '.myhtml.json';

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
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === META) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (filterFn && !filterFn(s, ent)) continue;
    if (ent.isDirectory()) copyDirFiltered(s, d, filterFn);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Prepares a clean directory containing an index.html ready to be uploaded,
 * whether the user chose:
 *  - 'file': any standalone .html file from any folder on their PC
 *  - 'hubApp': one specific app/page inside the Multi-App Hub (e.g. assets/apps/my-app/index.html)
 *  - 'singlePage': the currently open page (e.g. index.html or about.html) without unrelated apps
 *  - 'wholeSite': the entire project folder
 */
function prepareTargetStage({ mode, projectDir, filePath, appRelPath, pageName }) {
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myhtml-pub-'));
  let metaDir = projectDir || null;
  let defaultSlug = 'my-web-page';

  if (mode === 'file' && filePath && fs.existsSync(filePath)) {
    const baseName = path.basename(filePath, path.extname(filePath));
    defaultSlug = baseName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-page';
    fs.copyFileSync(filePath, path.join(stageDir, 'index.html'));
    // Also copy sibling local assets if the HTML references relative files in the same folder (up to 15MB)
    const parentDir = path.dirname(filePath);
    const htmlText = fs.readFileSync(filePath, 'utf8');
    for (const ent of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (ent.name === path.basename(filePath) || ent.name.startsWith('.')) continue;
      if (htmlText.includes(ent.name)) {
        const s = path.join(parentDir, ent.name);
        const d = path.join(stageDir, ent.name);
        try {
          if (ent.isDirectory()) copyDirFiltered(s, d);
          else if (fs.statSync(s).size < 15 * 1024 * 1024) fs.copyFileSync(s, d);
        } catch {}
      }
    }
    metaDir = null;
    return { stageDir, metaDir, defaultSlug, cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
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
    metaDir = appFolder;
    return { stageDir, metaDir, defaultSlug, cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
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
        else fs.copyFileSync(s, d);
      }
    }
    return { stageDir, metaDir: projectDir, defaultSlug, cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
  }

  // Default: 'wholeSite'
  if (!projectDir || !fs.existsSync(projectDir)) {
    throw new Error('Please open a page or pick a .html file from your computer first.');
  }
  defaultSlug = path.basename(projectDir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-website';
  copyDirFiltered(projectDir, stageDir);
  return { stageDir, metaDir: projectDir, defaultSlug, cleanup: () => { try { fs.rmSync(stageDir, { recursive: true, force: true }); } catch {} } };
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

  const { stageDir, metaDir, defaultSlug, cleanup } = prepareTargetStage(opts);
  try {
    const indexPath = path.join(stageDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('No index.html found to publish.');
    }

    const cleanName = (opts.name || defaultSlug || 'my-web-page')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-web-page';
    const repoName = cleanName.startsWith('myhtml-') ? cleanName : cleanName;

    // 1. Create an Instant Live Gist Preview (<1 second live URL!) if index.html is reasonably sized
    let instantUrl = null;
    try {
      const htmlContent = fs.readFileSync(indexPath, 'utf8');
      if (htmlContent.length > 0 && htmlContent.length < 900 * 1024) {
        log('⚡ Creating instant live preview link…');
        const gistRes = await ghCall(token, 'POST', '/gists', {
          description: `Published with MyHTML (${cleanName})`,
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

    log('🚀 Uploading HTML, styles & assets to GitHub…');
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
  zip.addLocalFolder(dir, '', (f) => !/(^|[\\/])(\.|node_modules)/.test(f));
  return zip.toBuffer();
}

async function publishViaNetlify(token, opts = {}, log = () => {}) {
  const { stageDir, metaDir, defaultSlug, cleanup } = prepareTargetStage(opts);
  try {
    if (!fs.existsSync(path.join(stageDir, 'index.html'))) {
      throw new Error('Your site needs an index.html page to be published.');
    }
    const meta = metaDir ? readMeta(metaDir) : {};
    let siteId = meta.netlifySiteId, site;
    if (siteId) {
      try { site = await netlifyCall(token, 'GET', '/sites/' + siteId); }
      catch (e) { if (e.status === 404) siteId = null; else throw e; }
    }
    if (!siteId) {
      log('Creating your site on Netlify…');
      const name = (opts.name || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      site = await netlifyCall(token, 'POST', '/sites', JSON.stringify(name ? { name } : {}), { 'Content-Type': 'application/json' });
      siteId = site.id;
    }
    log('Packing your files…');
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
