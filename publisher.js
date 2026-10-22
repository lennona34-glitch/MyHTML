// Netlify publishing: zips the project folder and deploys it via the Netlify API.
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const API = 'https://api.netlify.com/api/v1';
const META = '.myhtml.json';

function readMeta(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, META), 'utf8')); } catch { return {}; }
}
function writeMeta(dir, data) {
  fs.writeFileSync(path.join(dir, META), JSON.stringify({ ...readMeta(dir), ...data }, null, 2));
}

async function call(token, method, url, body, headers = {}) {
  const res = await fetch(API + url, {
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
    const err = new Error(res.status === 401 ? 'Netlify did not accept that token. Please create a new one and try again.' : res.status === 422 && /name/i.test(msg) ? 'That site name is already taken. Try a different one.' : 'Netlify said: ' + msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

function zipProject(dir) {
  const zip = new AdmZip();
  zip.addLocalFolder(dir, '', (f) => !/(^|[\\/])(\.|node_modules)/.test(f));
  return zip.toBuffer();
}

async function publish(dir, token, opts = {}, log = () => {}) {
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error('Your site needs a page called index.html to be published.');
  const meta = readMeta(dir);
  let siteId = meta.netlifySiteId, site;
  if (siteId) {
    try { site = await call(token, 'GET', '/sites/' + siteId); }
    catch (e) { if (e.status === 404) siteId = null; else throw e; }
  }
  if (!siteId) {
    log('Creating your site on Netlify…');
    const name = (opts.name || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    site = await call(token, 'POST', '/sites', JSON.stringify(name ? { name } : {}), { 'Content-Type': 'application/json' });
    siteId = site.id;
  }
  log('Packing your files…');
  const buf = zipProject(dir);
  log(`Uploading ${(buf.length / 1024 / 1024).toFixed(1)} MB…`);
  let deploy = await call(token, 'POST', `/sites/${siteId}/deploys`, buf, { 'Content-Type': 'application/zip' });
  log('Going live…');
  for (let i = 0; i < 60 && deploy.state !== 'ready'; i++) {
    if (deploy.state === 'error') throw new Error('Netlify could not publish the site: ' + (deploy.error_message || 'unknown error'));
    await new Promise((r) => setTimeout(r, 1500));
    deploy = await call(token, 'GET', '/deploys/' + deploy.id);
  }
  const url = (site && (site.ssl_url || site.url)) || deploy.ssl_url || deploy.url;
  const adminUrl = (site && site.admin_url) || deploy.admin_url;
  writeMeta(dir, { netlifySiteId: siteId, url, adminUrl });
  return { url, adminUrl, ready: deploy.state === 'ready' };
}

async function checkToken(token) {
  await call(token, 'GET', '/user');
  return true;
}

module.exports = { publish, checkToken, readMeta };
