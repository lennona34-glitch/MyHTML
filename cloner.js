// MyHTML website cloner: downloads a page (and optionally same-site pages),
// saves every stylesheet, image, font (and optionally script) locally and rewrites
// all references so the copy works offline and is fully editable.
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MIME_EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg',
  'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico', 'image/avif': '.avif', 'font/woff2': '.woff2',
  'font/woff': '.woff', 'font/ttf': '.ttf', 'font/otf': '.otf', 'text/css': '.css', 'application/javascript': '.js',
  'text/javascript': '.js', 'application/wasm': '.wasm', 'application/json': '.json',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3'
};

async function mapLimit(items, limit, fn) {
  const queue = items.slice();
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

function abs(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}
const skipRef = (v) => !v || /^(data:|blob:|about:|javascript:|mailto:|tel:|#)/i.test(v.trim());

async function cloneSite(startUrl, outDir, opts = {}, log = () => {}) {
  const maxPages = Math.max(1, opts.maxPages || 1);
  const stripScripts = opts.stripScripts !== false;
  const origin = new URL(startUrl).origin;
  const assets = new Map(); // abs url -> local path (relative to project root)
  const pages = new Map();  // abs url (no hash) -> filename
  const failed = [];
  fs.mkdirSync(path.join(outDir, 'assets', 'css'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets', 'fonts'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets', 'files'), { recursive: true });

  async function get(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { buf: Buffer.from(await res.arrayBuffer()), type: (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), finalUrl: res.url };
  }

  function localName(url, type, kind) {
    const u = new URL(url);
    let base = decodeURIComponent(path.posix.basename(u.pathname)) || 'file';
    let ext = path.extname(base).toLowerCase();
    base = base.slice(0, base.length - ext.length).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) || 'file';
    if (!ext || ext.length > 6) ext = MIME_EXT[type] || (kind === 'css' ? '.css' : '');
    const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
    const isFont = kind === 'font' || /\.(woff2?|ttf|otf|eot)$/i.test(ext) || /font/i.test(type);
    const folder = kind === 'css' ? 'css' : (isFont ? 'fonts' : 'files');
    return `assets/${folder}/${base}-${hash}${ext}`;
  }

  // Download one asset; returns its local root-relative path (or null).
  async function download(url, kind = 'file') {
    if (assets.has(url)) return assets.get(url);
    let local = localName(url, '', kind);
    assets.set(url, local);
    try {
      const { buf, type, finalUrl } = await get(url);
      if (!path.extname(local)) { local += MIME_EXT[type] || ''; assets.set(url, local); }
      const file = path.join(outDir, local);
      if (kind === 'css' || type === 'text/css') {
        const css = await processCss(buf.toString('utf8'), finalUrl, local);
        fs.writeFileSync(file, css);
      } else if (!stripScripts && (kind === 'js' || /javascript/i.test(type) || /\.m?js$/i.test(local))) {
        const js = await processJs(buf.toString('utf8'), finalUrl, local, false);
        fs.writeFileSync(file, js);
      } else fs.writeFileSync(file, buf);
      log('Saved ' + path.posix.basename(local));
      return local;
    } catch (e) {
      assets.delete(url);
      failed.push(url);
      return null;
    }
  }

  async function replaceAsync(str, regex, fn) {
    const matches = [...str.matchAll(regex)];
    const results = await Promise.all(matches.map((m) => fn(...m)));
    let i = 0;
    return str.replace(regex, () => results[i++]);
  }

  // Rewrite url(...) and @import inside CSS. `fromLocal` is where the CSS will live.
  async function processCss(css, cssUrl, fromLocal, rootRelative = false) {
    const fromDir = path.posix.dirname(fromLocal);
    const rel = (local) => (rootRelative ? local : path.posix.relative(fromDir, local));
    css = await replaceAsync(css, /@import\s+(?:url\()?\s*(['"]?)([^'")\s;]+)\1\s*\)?([^;]*);/gi, async (m, q, ref, rest) => {
      const u = abs(ref, cssUrl);
      if (!u) return m;
      const local = await download(u, 'css');
      return local ? `@import url("${rel(local)}")${rest};` : m;
    });
    css = await replaceAsync(css, /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, async (m, q, ref) => {
      if (skipRef(ref)) return m;
      const u = abs(ref.trim(), cssUrl);
      if (!u) return m;
      const isFont = /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(u);
      const local = await download(u, isFont ? 'font' : 'file');
      return local ? `url("${rel(local)}")` : m;
    });
    return css;
  }

  // Rewrite ES module imports, wasm module_or_path, and .wasm URLs inside JS / inline scripts
  async function processJs(js, jsUrl, fromLocal, rootRelative = false) {
    const fromDir = path.posix.dirname(fromLocal);
    const rel = (local) => {
      if (rootRelative) return './' + local;
      const r = path.posix.relative(fromDir, local);
      return r.startsWith('.') ? r : './' + r;
    };
    // 1. static imports: from '...'
    js = await replaceAsync(js, /(\bfrom\s+)(['"])([^'"]+)\2/g, async (m, pre, q, ref) => {
      if (!ref.startsWith('.') && !ref.startsWith('/') && !/^https?:/i.test(ref)) return m;
      const u = abs(ref, jsUrl);
      if (!u) return m;
      const local = await download(u, 'js');
      return local ? `${pre}"${rel(local)}"` : m;
    });
    // 2. dynamic imports: import('...')
    js = await replaceAsync(js, /(\bimport\s*\(\s*)(['"])([^'"]+)\2(\s*\))/g, async (m, pre, q, ref, post) => {
      if (!ref.startsWith('.') && !ref.startsWith('/') && !/^https?:/i.test(ref)) return m;
      const u = abs(ref, jsUrl);
      if (!u) return m;
      const local = await download(u, 'js');
      return local ? `${pre}"${rel(local)}"${post}` : m;
    });
    // 3. Trunk / wasm-bindgen module_or_path or direct .wasm references
    js = await replaceAsync(js, /(['"])([^'"]+\.wasm(?:\?[^'"]*)?)\1/gi, async (m, q, ref) => {
      const u = abs(ref, jsUrl);
      if (!u) return m;
      const local = await download(u, 'file');
      return local ? `"${rel(local)}"` : m;
    });
    return js;
  }

  function pageFile(url) {
    const u = new URL(url);
    u.hash = '';
    const key = u.href;
    if (pages.has(key)) return pages.get(key);
    let name;
    if (pages.size === 0) name = 'index.html';
    else {
      let slug = (u.pathname.replace(/\/+$/, '').split('/').pop() || 'page').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '-') || 'page';
      name = slug + '.html';
      let n = 2;
      while ([...pages.values()].includes(name)) name = `${slug}-${n++}.html`;
    }
    pages.set(key, name);
    return name;
  }

  const queue = [startUrl];
  pageFile(startUrl);
  const done = new Set();

  while (queue.length) {
    const pageUrl = queue.shift();
    const key = (() => { const u = new URL(pageUrl); u.hash = ''; return u.href; })();
    if (done.has(key)) continue;
    done.add(key);
    log('Downloading page ' + pageUrl);
    let html, finalUrl;
    try {
      const r = await get(pageUrl);
      html = r.buf.toString('utf8');
      finalUrl = r.finalUrl;
    } catch (e) {
      log('Could not load ' + pageUrl + ' (' + e.message + ')');
      if (done.size === 1) throw new Error('Could not download ' + pageUrl + ': ' + e.message);
      continue;
    }
    const $ = cheerio.load(html);
    const tasks = [];
    const set = (el, attr, kind) => {
      const v = $(el).attr(attr);
      if (skipRef(v)) return;
      const u = abs(v, finalUrl);
      if (!u) return;
      tasks.push(async () => { const l = await download(u, kind); if (l) $(el).attr(attr, l); });
    };

    $('base').remove();
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    $('[integrity]').removeAttr('integrity');
    $('[crossorigin]').removeAttr('crossorigin');
    $('body').removeClass('is-preload is-loading preload loading');
    if (stripScripts) {
      $('noscript').each((_, el) => {
        const inner = $(el).html() || '';
        if (/<(link|img|style)\b/i.test(inner)) $(el).replaceWith(inner);
      });
      $('script').remove();
      $('link[rel=modulepreload]').remove();
    } else {
      $('script[src]').each((_, el) => set(el, 'src', 'js'));
      $('link[rel=modulepreload]').each((_, el) => set(el, 'href', 'js'));
      $('script:not([src])').each((_, el) => {
        const st = $(el).html();
        if (!st) return;
        tasks.push(async () => $(el).html(await processJs(st, finalUrl, 'index.html', true)));
      });
    }
    $('link[rel~=preload], link[rel~=prefetch], link[rel~=dns-prefetch], link[rel~=preconnect]').remove();
    $('link[rel~=stylesheet]').each((_, el) => set(el, 'href', 'css'));
    $('link[rel~=icon], link[rel=apple-touch-icon], link[rel~=shortcut]').each((_, el) => set(el, 'href', 'file'));

    // lazy-loaded images
    $('img').each((_, el) => {
      for (const a of ['data-src', 'data-lazy-src', 'data-original']) {
        const v = $(el).attr(a);
        if (v && !skipRef(v)) { $(el).attr('src', v); $(el).removeAttr(a); break; }
      }
      $(el).removeAttr('loading');
      const ds = $(el).attr('data-srcset');
      if (ds) { $(el).attr('srcset', ds); $(el).removeAttr('data-srcset'); }
    });
    $('img, video, audio, source, track, embed, input[type=image]').each((_, el) => set(el, 'src', 'file'));
    $('video').each((_, el) => set(el, 'poster', 'file'));
    $('img[srcset], source[srcset]').each((_, el) => {
      const parts = $(el).attr('srcset').split(',').map((s) => s.trim()).filter(Boolean);
      tasks.push(async () => {
        const out = await Promise.all(parts.map(async (p) => {
          const [ref, ...d] = p.split(/\s+/);
          if (skipRef(ref)) return p;
          const u = abs(ref, finalUrl);
          const l = u && (await download(u, 'file'));
          return l ? [l, ...d].join(' ') : p;
        }));
        $(el).attr('srcset', out.join(', '));
      });
    });
    $('[style]').each((_, el) => {
      const st = $(el).attr('style');
      if (!/url\(/i.test(st)) return;
      tasks.push(async () => $(el).attr('style', await processCss(st, finalUrl, 'index.html', true)));
    });
    $('style').each((_, el) => {
      const st = $(el).html();
      if (!st) return;
      tasks.push(async () => $(el).html(await processCss(st, finalUrl, 'index.html', true)));
    });

    // links to other pages on the same site
    $('a[href]').each((_, el) => {
      const v = $(el).attr('href');
      if (skipRef(v)) return;
      const u = abs(v, finalUrl);
      if (!u) return;
      const parsed = new URL(u);
      const isHtmlish = !/\.(pdf|zip|png|jpe?g|gif|svg|webp|mp4|mp3|docx?|xlsx?)$/i.test(parsed.pathname);
      if (parsed.origin === origin && isHtmlish && /^https?:$/.test(parsed.protocol) && (pages.size < maxPages || pages.has((parsed.hash = '', parsed.href)))) {
        const hash = new URL(u).hash;
        const name = pageFile(u);
        if (!done.has(parsed.href)) queue.push(u);
        $(el).attr('href', name + hash);
      } else $(el).attr('href', u);
    });
    $('form[action]').each((_, el) => { const u = abs($(el).attr('action'), finalUrl); if (u) $(el).attr('action', u); });

    await mapLimit(tasks, 8, (t) => t());
    // Promote .tiles > article > .image > img[src] to inline background-image so HTML5 UP tiles render without JS
    $('.tiles > article').each((_, el) => {
      const $el = $(el);
      const imgSrc = $el.find('.image img').first().attr('src');
      if (imgSrc && !/background-image/i.test($el.attr('style') || '')) {
        const curStyle = $el.attr('style') ? $el.attr('style').replace(/;?\s*$/, '; ') : '';
        $el.attr('style', `${curStyle}background-image: url("${imgSrc}");`);
      }
    });
    const out = $.html();
    fs.writeFileSync(path.join(outDir, pages.get(key)), out);
    log('Finished ' + pages.get(key));
  }
  return { pages: [...pages.values()], assetCount: assets.size, failed };
}

module.exports = { cloneSite };
