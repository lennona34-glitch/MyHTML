/* MyHTML editor */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { BLOCKS, TEMPLATES, page: makePage } = window.MyTpl;
  const S = {
    dir: null,
    base: '',
    name: '',
    pages: [],
    page: null,
    dirty: false,
    sel: null,
    hist: [],
    hi: -1,
    live: false,
    bonesMode: false,
    fonts: [],
    assets: { images: [], fonts: [], css: [], other: [] }
  };
  const frame = $('#frame');
  let doc = null;

  /* ---------- helpers ---------- */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rgbToHex = (c) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c || '');
    if (!m || (m[4] !== undefined && +m[4] === 0)) return null;
    return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  };
  const cleanErr = (e) => (e.message || String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const normUrl = (v) => { v = (v || '').trim(); return v && !/^https?:\/\//i.test(v) ? 'https://' + v : v; };

  /* ---------- On-Demand Left / Right Drawers & Remix Bar ---------- */
  function setLeftDrawerOpen(open) {
    const el = $('#leftDrawer');
    const btn = $('#bToggleLeft');
    if (!el) return;
    const isNow = open !== undefined ? !!open : el.hidden;
    el.hidden = !isNow;
    if (btn) btn.classList.toggle('on', isNow);
  }

  function setRightDrawerOpen(open) {
    const el = $('#rightDrawer');
    const btn = $('#bToggleRight');
    const foot = $('#stageFooter');
    if (!el) return;
    const isNow = open !== undefined ? !!open : el.hidden;
    el.hidden = !isNow;
    if (btn) btn.classList.toggle('on', isNow);
    if (foot) foot.hidden = !isNow;
    if (isNow) {
      renderInspector();
      renderComputed();
      showElHtml();
    }
  }

  function setRemixBarOpen(open) {
    const el = $('#remixBar');
    const btn = $('#bToggleRemix');
    if (!el) return;
    const isNow = open !== undefined ? !!open : el.hidden;
    el.hidden = !isNow;
    if (btn) btn.classList.toggle('on', isNow);
  }

  if ($('#bToggleLeft')) $('#bToggleLeft').onclick = () => setLeftDrawerOpen();
  if ($('#bToggleRight')) $('#bToggleRight').onclick = () => setRightDrawerOpen();
  if ($('#bToggleRemix')) $('#bToggleRemix').onclick = () => setRemixBarOpen();
  if ($('#closeLeftDrawerBtn')) $('#closeLeftDrawerBtn').onclick = () => setLeftDrawerOpen(false);
  if ($('#closeRightDrawerBtn')) $('#closeRightDrawerBtn').onclick = () => setRightDrawerOpen(false);
  if ($('#openFullCodeBtn')) $('#openFullCodeBtn').onclick = () => $('#bCode').click();

  async function openStandaloneAppHub() {
    await autosave();
    const info = await api.createProject({ template: 'apphub' });
    if (info) await enter(info, { forceLive: true });
  }

  async function openStandaloneHtmlFile() {
    await autosave();
    const info = await api.openHtmlFile();
    if (info) {
      await enter(info, { forceLive: false });
      toast(`📄 Opened "${info.name}" — double-click text to edit, or click "🚀 Put Online"!`);
    }
  }

  /* ---------- welcome & recent sites ---------- */
  async function initWelcome() {
    $('#tplGrid').innerHTML = Object.entries(TEMPLATES).map(([k, t]) =>
      `<button class="tpl" data-k="${k}"><div class="e">${t.emoji}</div><b>${t.name}</b><small>${t.desc}</small></button>`
    ).join('');
    $$('#tplGrid .tpl').forEach((b) => (b.onclick = async () => {
      const k = b.dataset.k;
      const info = await api.createProject({ template: k });
      await enter(info, { forceLive: k === 'apphub' });
    }));
    $('#wOpen').onclick = $('#bOpen').onclick = async () => { await autosave(); enter(await api.openProject()); };
    if ($('#bOpenHtmlFile')) $('#bOpenHtmlFile').onclick = openStandaloneHtmlFile;
    if ($('#wOpenFileBtn')) $('#wOpenFileBtn').onclick = openStandaloneHtmlFile;
    if ($('#wOpenHtml')) $('#wOpenHtml').onclick = openStandaloneHtmlFile;
    if ($('#bOpenHub')) $('#bOpenHub').onclick = openStandaloneAppHub;
    if ($('#wOpenHubBtn')) $('#wOpenHubBtn').onclick = openStandaloneAppHub;
    if ($('#wPublishFileBtn')) {
      $('#wPublishFileBtn').onclick = async () => {
        const picked = await api.pickHtmlFileForPublish();
        if (picked) openPublish({ mode: 'file', pickedFile: picked });
      };
    }

    $('#wGoClone').onclick = () => {
      const url = $('#wUrl').value.trim();
      if (!url) { toast('Please enter a website address to copy'); $('#wUrl').focus(); return; }
      openClone(url);
    };
    $('#wUrl').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#wGoClone').click(); });
    $('#bClone').onclick = () => openClone();
    $('#bHome').onclick = async () => { await autosave(); $('#welcome').hidden = false; loadRecentSites(); };

    // Default startup mode to OFF unless user explicitly turns it on
    if (localStorage.getItem('myhtml-auto-roll-v2') === null) {
      localStorage.setItem('myhtml-auto-roll-v2', 'false');
    }
    const autoRollOn = localStorage.getItem('myhtml-auto-roll-v2') === 'true';
    const wCheck = $('#wAutoRollStartup');
    const ctCheck = $('#ctAutoStartupCheck');
    const syncAutoCheck = (val) => {
      localStorage.setItem('myhtml-auto-roll-v2', val ? 'true' : 'false');
      if (wCheck) wCheck.checked = val;
      if (ctCheck) ctCheck.checked = val;
      toast(val ? '🚀 Startup Mode: Will open a surprise template on launch!' : '🏠 Startup Mode: Will show Welcome screen on launch');
    };
    if (wCheck) { wCheck.checked = autoRollOn; wCheck.onchange = (e) => syncAutoCheck(e.target.checked); }
    if (ctCheck) { ctCheck.checked = autoRollOn; ctCheck.onchange = (e) => syncAutoCheck(e.target.checked); }

    loadRecentSites();

    if (autoRollOn) {
      await rollFreshSite();
    }
  }

  async function loadRecentSites() {
    const grid = $('#recentGrid');
    try {
      const recents = await api.getRecentProjects();
      if (!recents || !recents.length) {
        grid.innerHTML = '<div class="muted small" style="padding:10px;">No saved websites yet. Open a .html file or paste an address above!</div>';
        return;
      }
      grid.innerHTML = recents.map((r) => {
        const dateStr = new Date(r.mtime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const fontBadge = r.fontCount > 0 ? `<span class="badge">Aa ${r.fontCount} fonts</span>` : '';
        return `<div class="recent-item" data-dir="${esc(r.dir)}">
          <div class="name">🌐 ${esc(r.name)}</div>
          <div class="meta">${fontBadge} <span>${r.pages} pg</span> <span>${dateStr}</span></div>
        </div>`;
      }).join('');
      $$('.recent-item', grid).forEach((el) => {
        el.onclick = async () => {
          await autosave();
          const info = await api.projectInfo(el.dataset.dir);
          enter(info);
        };
      });
    } catch (e) {
      grid.innerHTML = '<div class="muted small" style="padding:10px;">Ready to create or copy sites.</div>';
    }
  }

  /* ---------- enter project ---------- */
  async function enter(info, opts = {}) {
    if (!info) return;
    Object.assign(S, { dir: info.dir, base: info.base, name: info.name, pages: info.pages, hist: [], hi: -1 });
    $('#welcome').hidden = true;
    $('#app').hidden = false;
    $('#projName').textContent = info.name;

    // Keep Left, Right, and Remix panels closed unless requested by the user!
    setLeftDrawerOpen(false);
    setRightDrawerOpen(false);
    setRemixBarOpen(!!opts.showRemix);

    renderPages();
    renderAddPanel();
    await refreshFontsAndAssets();
    const targetPage = info.pages.includes('index.html') ? 'index.html' : info.pages[0];
    const isHubProject = opts.forceLive || /multi-app-hub|apphub/i.test(info.name);
    await loadPage(targetPage, { startLive: isHubProject });
  }

  async function refreshFontsAndAssets() {
    try {
      S.fonts = await api.listFonts(S.dir) || [];
      $('#fontCountBadge').textContent = S.fonts.length;
      renderFonts();
    } catch (e) { console.error('Error fetching fonts:', e); }

    try {
      S.assets = await api.listAssets(S.dir) || { images: [], fonts: [], css: [], other: [] };
      renderAssets();
    } catch (e) { console.error('Error fetching assets:', e); }
  }

  /* ---------- clone dialog ---------- */
  let dirEdited = false, confirmDir = null;
  const resetConfirm = () => { confirmDir = null; $('#cGo').textContent = 'Copy Website'; $('#cErr').textContent = ''; };
  async function suggestDir() {
    if (!dirEdited) $('#cDir').value = await api.defaultCloneDir(normUrl($('#cUrl').value) || 'website');
    resetConfirm();
  }
  function openClone(initialUrl = '') {
    $('#cloneModal').hidden = false;
    $('#cLog').hidden = true;
    $('#cLog').textContent = '';
    $('#cErr').textContent = '';
    dirEdited = false;
    if (initialUrl) $('#cUrl').value = initialUrl;
    suggestDir();
    $('#cUrl').focus();
  }
  $('#cCancel').onclick = () => ($('#cloneModal').hidden = true);
  $('#cUrl').oninput = suggestDir;
  $('#cDir').oninput = () => { dirEdited = true; resetConfirm(); };
  $('#cBrowse').onclick = async () => {
    const d = await api.pickFolder('Choose where to save the website', $('#cDir').value);
    if (d) { $('#cDir').value = d; dirEdited = true; resetConfirm(); }
  };
  api.onCloneProgress((m) => {
    const l = $('#cLog');
    l.hidden = false;
    l.textContent += m + '\n';
    l.scrollTop = l.scrollHeight;
  });
  $('#cGo').onclick = async () => {
    let url = normUrl($('#cUrl').value);
    let dir = $('#cDir').value.trim();
    const err = $('#cErr');
    err.textContent = '';
    if (!url) { err.textContent = 'Please type or paste a web address (e.g. apple.com)'; $('#cUrl').focus(); return; }

    const btn = $('#cGo');
    btn.disabled = true;
    btn.textContent = '⏳ Copying website & fonts…';
    const lg = $('#cLog');
    lg.hidden = false;
    lg.textContent = `Connecting to ${url}…\nDownloading pages, layouts, images and fonts…\n`;

    try {
      const confirmed = confirmDir === dir;
      const info = await api.clone({ url, dir, confirmed, maxPages: +$('#cPages').value, stripScripts: $('#cStrip').checked });
      if (info && info.needsConfirm) {
        confirmDir = info.targetDir || dir;
        err.textContent = 'That folder already has files. Click "Copy anyway" to overwrite, or choose another folder.';
        btn.disabled = false;
        btn.textContent = 'Copy anyway';
        return;
      }
      if (info) {
        $('#cloneModal').hidden = true;
        await enter(info);
        toast(`Copied ${info.result.pages.length} page(s) and captured ${S.fonts.length} fonts!`);
      }
    } catch (e) {
      err.textContent = cleanErr(e);
      lg.textContent += `\nError: ${cleanErr(e)}\n`;
    }
    btn.disabled = false;
    btn.textContent = 'Copy Website';
  };
  ['#cUrl', '#cDir'].forEach((s) => $(s).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#cGo').click(); } }));

  /* ---------- theme & full screen ---------- */
  const setTheme = (t) => { document.documentElement.dataset.theme = t; localStorage.setItem('myhtml-theme', t); };
  setTheme(localStorage.getItem('myhtml-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  $$('.themeBtn').forEach((b) => (b.onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
  $$('.fsBtn').forEach((b) => (b.onclick = () => api.fullscreen()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') { e.preventDefault(); api.fullscreen(); }
    else if (e.key === 'Escape' && !$('#cloneModal').hidden) $('#cloneModal').hidden = true;
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleBonesMode(); }
  });

  /* ---------- canvas / document & layout boxes ---------- */
  const BASE_EDIT_CSS = `
    .__mh-hover { outline: 2px dashed #818cf8 !important; outline-offset: -2px; cursor: pointer; }
    .__mh-sel { outline: 2px solid #6366f1 !important; outline-offset: -2px; }
    [contenteditable=true] { outline: 2px solid #10b981 !important; cursor: text; }
    #__mh_drop { height: 4px; background: #6366f1; border-radius: 2px; margin: -2px 0; position: relative; z-index: 99999; }
    html { scroll-behavior: auto !important; }
  `;

  const BONES_CSS = `
    header, nav, main, section, article, footer, aside {
      outline: 1px dashed rgba(139, 92, 246, 0.45) !important;
      position: relative;
    }
    header::before, nav::before, main::before, section::before, article::before, footer::before, aside::before {
      content: attr(data-bone-tag);
      position: absolute;
      top: 0; left: 0;
      background: #8b5cf6;
      color: #fff;
      font-size: 9px;
      font-family: Consolas, monospace;
      padding: 1px 4px;
      border-radius: 0 0 3px 0;
      opacity: 0.85;
      z-index: 1000;
      pointer-events: none;
    }
    .__mh-bone-flex {
      outline: 1px dashed rgba(245, 158, 11, 0.6) !important;
      position: relative;
    }
    .__mh-bone-flex::before {
      content: 'row (flex)';
      position: absolute;
      top: 0; right: 0;
      background: #f59e0b;
      color: #000;
      font-size: 8.5px;
      font-weight: 700;
      font-family: Consolas, monospace;
      padding: 1px 4px;
      border-radius: 0 0 0 3px;
      z-index: 1000;
      pointer-events: none;
    }
    .__mh-bone-grid {
      outline: 1px dashed rgba(6, 182, 212, 0.6) !important;
      position: relative;
    }
    .__mh-bone-grid::before {
      content: 'grid';
      position: absolute;
      top: 0; right: 0;
      background: #06b6d4;
      color: #000;
      font-size: 8.5px;
      font-weight: 700;
      font-family: Consolas, monospace;
      padding: 1px 4px;
      border-radius: 0 0 0 3px;
      z-index: 1000;
      pointer-events: none;
    }
  `;

  function toggleBonesMode() {
    S.bonesMode = !S.bonesMode;
    $('#bBones').classList.toggle('on', S.bonesMode);
    applyBonesToDoc();
    renderBonesPanel();
    toast(S.bonesMode ? '🩻 Showing layout boxes & grids' : 'Layout boxes hidden');
  }
  $('#bBones').onclick = toggleBonesMode;
  $('#bFontsPill').onclick = () => {
    $$('#leftTabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === 'fonts'));
    ['add', 'pages', 'fonts', 'assets', 'layers', 'bones'].forEach((t) => ($('#p-' + t).hidden = t !== 'fonts'));
  };

  function applyBonesToDoc() {
    if (!doc) return;
    let bStyle = doc.getElementById('__mh_bones');
    if (S.bonesMode) {
      if (!bStyle) {
        bStyle = doc.createElement('style');
        bStyle.id = '__mh_bones';
        doc.head.appendChild(bStyle);
      }
      bStyle.textContent = BONES_CSS;

      $$('header, nav, main, section, article, footer, aside', doc).forEach((el) => {
        el.setAttribute('data-bone-tag', el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
      });
      $$('*', doc.body).forEach((el) => {
        const comp = doc.defaultView.getComputedStyle(el);
        if (comp.display === 'flex' || comp.display === 'inline-flex') el.classList.add('__mh-bone-flex');
        if (comp.display === 'grid' || comp.display === 'inline-grid') el.classList.add('__mh-bone-grid');
      });
    } else {
      if (bStyle) bStyle.remove();
      $$('.__mh-bone-flex', doc).forEach((el) => el.classList.remove('__mh-bone-flex'));
      $$('.__mh-bone-grid', doc).forEach((el) => el.classList.remove('__mh-bone-grid'));
    }
  }

  async function loadPage(name, opts = {}) {
    S.page = name; S.dirty = false; S.hist = []; S.hi = -1; S.sel = null;
    const html = await api.readPage(S.dir, name);
    const hasHub = /class=["'][^"']*myhtml-app-hub/i.test(html);
    const goLive = opts.startLive !== undefined ? !!opts.startLive : hasHub;
    S.live = goLive;
    const prevBtn = $('#bPreview');
    if (prevBtn) {
      prevBtn.textContent = goLive ? '✎ Edit Page' : '▶ Live View';
      prevBtn.classList.toggle('live-on', goLive);
      prevBtn.classList.toggle('on', goLive);
    }
    renderHtml(html, goLive);
    renderPages();
    updateUi();
    $('#codeView').hidden = true;
  }

  function renderHtml(html, live = false) {
    html = html.replace(/<base\b[^>]*>/gi, '');
    const inject = `<base id="__mh_base" href="${S.base}">` + (live ? '' : `<style id="__mh_style">${BASE_EDIT_CSS}</style>`);
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inject) : inject + html;
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads');
    frame.onload = () => {
      try {
        doc = frame.contentDocument;
        if (!live) {
          attach();
          if (S.bonesMode) applyBonesToDoc();
        } else {
          attachLiveBridge();
        }
        syncAllHubsInDoc();
        bindNestedAppFrames();
      } catch (err) {
        console.error('Frame initialization error:', err);
      }
    };
    frame.srcdoc = html;
  }

  async function syncAllHubsInDoc() {
    if (!doc || !S.dir) return;
    let hubs = [...doc.querySelectorAll('.myhtml-app-hub')];
    if (!hubs.length) return;
    let diskApps = [];
    try { diskApps = (await api.listApps(S.dir)) || []; } catch {}

    for (let i = 0; i < hubs.length; i++) {
      let hub = hubs[i];
      // Upgrade any legacy Hub with cluttered topbar/stagebar to the clean Side-Panel + Highlighted-Page layout
      if (hub.querySelector('.myhtml-hub-topbar') || !hub.querySelector('.myhtml-hub-publish-app')) {
        const prevApps = getHubApps(hub);
        const prevRemoved = hub.getAttribute('data-removed-apps') || '';
        const cleanHubBlock = BLOCKS.find((x) => x.id === 'app-hub');
        if (cleanHubBlock) {
          const tpl = doc.createElement('template');
          tpl.innerHTML = cleanHubBlock.html.trim();
          const newHub = tpl.content.firstElementChild;
          if (prevRemoved) newHub.setAttribute('data-removed-apps', prevRemoved);
          hub.replaceWith(newHub);
          hub = newHub;
          hubs[i] = newHub;
          if (prevApps.length) {
            const actIdx = Math.max(0, prevApps.findIndex((a) => a.active));
            setHubApps(hub, prevApps, actIdx, true);
          }
        }
      }

      if (!diskApps.length) continue;
      const removedRaw = (hub.getAttribute('data-removed-apps') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const existing = getHubApps(hub);
      let changed = false;
      for (const da of diskApps) {
        if (removedRaw.includes(da.relPath)) continue;
        if (!existing.some((x) => x.src === da.relPath)) {
          existing.push({
            title: da.title,
            src: da.relPath,
            icon: da.icon || '📦',
            active: false
          });
          changed = true;
        }
      }
      if (changed) {
        const activeIdx = Math.max(0, existing.findIndex((a) => a.active));
        setHubApps(hub, existing, activeIdx, true);
      }
    }
  }

  function serialize() {
    if (!doc) return '';
    const c = doc.documentElement.cloneNode(true);
    $$('#__mh_base, #__mh_style, #__mh_bones, #__mh_drop', c).forEach((n) => n.remove());
    const sd = c.querySelector('#siteDrawerBackdrop');
    if (sd) sd.setAttribute('hidden', '');
    $$('[contenteditable]', c).forEach((n) => n.removeAttribute('contenteditable'));
    $$('[data-bone-tag], [data-hub-bound]', c).forEach((n) => {
      n.removeAttribute('data-bone-tag');
      n.removeAttribute('data-hub-bound');
    });
    $$('.__mh-hover, .__mh-sel, .__mh-bone-flex, .__mh-bone-grid', c).forEach((n) => {
      n.classList.remove('__mh-hover', '__mh-sel', '__mh-bone-flex', '__mh-bone-grid');
      if (!n.getAttribute('class')) n.removeAttribute('class');
    });
    const dt = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '<!DOCTYPE html>';
    return dt + '\n' + c.outerHTML + '\n';
  }

  function commitFromLiveOrEdit(skipLiveReload = false) {
    if (!doc) return;
    const snap = serialize();
    if (snap !== S.hist[S.hi]) {
      S.hist = S.hist.slice(0, S.hi + 1);
      S.hist.push(snap);
      if (S.hist.length > 80) S.hist.shift();
      S.hi = S.hist.length - 1;
    }
    if (S.dir && S.page) {
      api.writePage(S.dir, S.page, snap);
      S.dirty = false;
    } else {
      S.dirty = true;
    }
    updateUi();
    if (S.live && !skipLiveReload) {
      bindNestedAppFrames();
    } else if (!S.live) {
      renderLayers();
      renderBonesPanel();
      renderInspector();
      renderComputed();
      bindNestedAppFrames();
    }
  }

  /* ---------- Single App & Multi-App Hub helpers ---------- */
  async function chooseAppForContainer(container, mode = 'folder') {
    if (!S.dir) { toast('Please open or create a website first'); return; }
    try {
      const res = mode === 'file' ? await api.importAppFile(S.dir) : await api.importApp(S.dir);
      if (!res || !res.success) return;
      applyAppToContainer(container, res);
      toast(`🚀 Loaded "${res.title}"! Click "▶ Test App" at the top to run it live.`);
    } catch (e) {
      toast('Import error: ' + cleanErr(e));
    }
  }

  function applyAppToContainer(container, appData) {
    container.setAttribute('data-app-src', appData.relPath);
    container.setAttribute('data-app-title', appData.title);
    const titleEl = container.querySelector('.myhtml-app-title');
    if (titleEl) titleEl.textContent = appData.title;
    const ph = container.querySelector('.myhtml-app-placeholder');
    if (ph) ph.style.display = 'none';
    const fr = container.querySelector('.myhtml-app-frame');
    if (fr) {
      fr.setAttribute('src', appData.relPath);
      fr.style.display = 'block';
    }
    const pop = container.querySelector('.myhtml-app-btn-pop');
    if (pop) {
      pop.setAttribute('href', appData.relPath);
      pop.style.display = 'inline-flex';
    }
    commitFromLiveOrEdit();
    if (!S.live) select(container);
    refreshFontsAndAssets();
  }

  function getHubApps(hub) {
    if (!hub) return [];
    return [...hub.querySelectorAll('.myhtml-hub-nav .myhtml-hub-item')].map((btn) => ({
      title: btn.getAttribute('data-app-title') || btn.textContent.trim(),
      src: btn.getAttribute('data-app-src') || '',
      icon: btn.getAttribute('data-app-icon') || '📦',
      active: btn.classList.contains('active')
    }));
  }

  function setHubApps(hub, apps, activeIndex = 0, skipLiveReload = false) {
    if (!hub) return;
    const nav = hub.querySelector('.myhtml-hub-nav');
    if (!nav) return;
    const idx = apps.length ? Math.max(0, Math.min(activeIndex, apps.length - 1)) : -1;
    nav.innerHTML = apps.map((a, i) => {
      const on = i === idx;
      const icon = a.icon || '📦';
      const title = a.title || 'Web App';
      const src = a.src || a.relPath || '';
      return `<button type="button" class="myhtml-hub-item${on ? ' active' : ''}" data-app-src="${esc(src)}" data-app-title="${esc(title)}" data-app-icon="${esc(icon)}" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid ${on ? '#4f46e5' : 'transparent'};background:${on ? 'rgba(79,70,229,0.22)' : 'transparent'};color:${on ? '#ffffff' : '#cbd5e1'};font-size:12.5px;font-weight:${on ? '600' : '500'};cursor:pointer;">
        <span style="font-size:15px;">${esc(icon)}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${esc(title)}</span>
      </button>`;
    }).join('');

    const countEl = hub.querySelector('.myhtml-hub-count');
    if (countEl) countEl.textContent = `${apps.length} App${apps.length === 1 ? '' : 's'}`;

    const cur = idx >= 0 ? apps[idx] : null;
    const fr = hub.querySelector('.myhtml-hub-frame');
    const actTitle = hub.querySelector('.myhtml-hub-active-title');
    const pop = hub.querySelector('.myhtml-hub-pop');
    const wasmBadge = hub.querySelector('.myhtml-hub-wasm-badge');
    if (cur) {
      const curSrc = cur.src || cur.relPath || 'about:blank';
      if (fr && fr.getAttribute('src') !== curSrc) fr.setAttribute('src', curSrc);
      if (actTitle) actTitle.textContent = `${cur.icon || '📦'} ${cur.title}`;
      if (pop) pop.setAttribute('href', curSrc);
      if (wasmBadge) {
        const isWasm = /(xiso-tool|wasm-studio|\/w4-|wasm)/i.test(curSrc + ' ' + (cur.title || ''));
        wasmBadge.style.display = isWasm ? 'inline-block' : 'none';
      }
    } else {
      if (fr) fr.setAttribute('src', 'about:blank');
      if (actTitle) actTitle.textContent = 'No apps loaded yet';
      if (wasmBadge) wasmBadge.style.display = 'none';
    }

    const gridItems = hub.querySelector('.myhtml-hub-grid-items');
    if (gridItems) {
      gridItems.innerHTML = apps.map((a, i) => `
        <div class="myhtml-hub-card" data-hub-idx="${i}" style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:28px;">${esc(a.icon || '📦')}</div>
          <div style="font-weight:700;font-size:14px;color:#fff;">${esc(a.title)}</div>
          <div style="font-size:11px;color:#34d399;font-weight:600;">▶ Launch in Screen</div>
        </div>
      `).join('');
    }

    commitFromLiveOrEdit(skipLiveReload);
  }

  function unmarkRemovedFromHub(hub, relPath) {
    if (!hub || !relPath) return;
    const list = (hub.getAttribute('data-removed-apps') || '').split(',').map((s) => s.trim()).filter((s) => s && s !== relPath);
    if (list.length) hub.setAttribute('data-removed-apps', list.join(','));
    else hub.removeAttribute('data-removed-apps');
  }

  async function addAppsToHub(hub, mode = 'folder') {
    if (!S.dir || !hub) return;
    try {
      let res = null;
      if (mode === 'bulk') res = await api.importAppBulk(S.dir);
      else if (mode === 'file') res = await api.importAppFile(S.dir);
      else if (mode === 'url') {
        const v = await ask('🌐 Grab Web App from URL', [
          { label: 'Web App Address (URL)', placeholder: 'https://example.com/tool' },
          { label: 'App Display Name (optional)', placeholder: 'My Web Tool' }
        ]);
        if (!v || !v[0]) return;
        toast('⏳ Downloading web app & WASM/JS files…');
        res = await api.cloneAppUrl({ projectDir: S.dir, url: normUrl(v[0]), customTitle: v[1] || '' });
      } else {
        res = await api.importApp(S.dir);
      }

      if (!res || !res.success) return;
      const incoming = res.apps && res.apps.length ? res.apps : [res];
      const existing = getHubApps(hub);
      let activeIdx = existing.length;

      for (const item of incoming) {
        unmarkRemovedFromHub(hub, item.relPath);
        const foundIdx = existing.findIndex((x) => x.src === item.relPath);
        const entry = {
          title: item.title,
          src: item.relPath,
          icon: item.icon || '📦'
        };
        if (foundIdx >= 0) {
          existing[foundIdx] = entry;
          activeIdx = foundIdx;
        } else {
          existing.push(entry);
          activeIdx = existing.length - 1;
        }
      }

      setHubApps(hub, existing, activeIdx, true);
      if (!S.live) select(hub);
      refreshFontsAndAssets();

      if (incoming.length > 1) {
        toast(`📚 Bunged ${incoming.length} apps into your single-screen Hub!`);
      } else {
        toast(`🧰 Added "${incoming[0].title}" to your App Hub!`);
      }
    } catch (e) {
      toast('Import error: ' + cleanErr(e));
    }
  }

  function addAppObjectToPageOrHub(app) {
    if (!doc) return;
    // If there is an App Hub on the page, add it to the Hub and switch to it!
    const hub = (S.sel && S.sel.closest && S.sel.closest('.myhtml-app-hub')) || doc.querySelector('.myhtml-app-hub');
    if (hub) {
      unmarkRemovedFromHub(hub, app.relPath);
      const existing = getHubApps(hub);
      let idx = existing.findIndex((x) => x.src === app.relPath);
      if (idx >= 0) {
        existing[idx].title = app.title;
      } else {
        existing.push({ title: app.title, src: app.relPath, icon: app.icon || '📦' });
        idx = existing.length - 1;
      }
      setHubApps(hub, existing, idx, true);
      if (!S.live) select(hub);
      hub.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`🧰 Added "${app.title}" into your Single-Screen App Hub!`);
      return;
    }
    insertImportedApp(app);
  }

  function insertImportedApp(app) {
    if (!doc || S.live) return;
    const b = BLOCKS.find((x) => x.id === 'app-imported');
    const tpl = doc.createElement('template');
    tpl.innerHTML = b.html.trim();
    const node = tpl.content.firstElementChild;
    const anchor = S.sel && S.sel !== doc.body ? topLevel(S.sel) : null;
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else doc.body.appendChild(node);
    applyAppToContainer(node, app);
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`📦 Added "${app.title}" to page! Click "▶ Test App" at the top to try it live.`);
  }

  let editorAudioCtx = null;
  function playEditorSynthTone(type = 'brass') {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!editorAudioCtx) editorAudioCtx = new Ctx();
      if (editorAudioCtx.state === 'suspended') editorAudioCtx.resume();
      const now = editorAudioCtx.currentTime;
      const notes = type === 'acid' ? [110, 110, 220, 110, 164.8, 146.8]
                  : type === 'bell' ? [523.25, 659.25, 783.99, 1046.5]
                  : type === 'pad'  ? [220, 277.18, 329.63, 440]
                  : [130.81, 196.00, 246.94, 329.63];
      notes.forEach((freq, i) => {
        const osc = editorAudioCtx.createOscillator();
        const gain = editorAudioCtx.createGain();
        osc.type = type === 'acid' ? 'sawtooth' : type === 'bell' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + (type === 'acid' ? i * 0.11 : 0));
        gain.gain.setValueAtTime(0.08, now + (type === 'acid' ? i * 0.11 : 0));
        gain.gain.exponentialRampToValueAtTime(0.0008, now + (type === 'acid' ? (i + 1) * 0.11 : 1.1));
        osc.connect(gain);
        gain.connect(editorAudioCtx.destination);
        osc.start(now + (type === 'acid' ? i * 0.11 : 0));
        osc.stop(now + (type === 'acid' ? (i + 1) * 0.12 : 1.15));
      });
    } catch {}
  }

  function runEditorTemplateButton(btn) {
    if (!doc || !btn) return;
    const label = (btn.textContent || '').trim();
    if (btn.classList.contains('side-btn') && btn.parentElement) {
      btn.parentElement.querySelectorAll('.side-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }
    if (/toggle compact/i.test(label)) {
      doc.body.classList.toggle('alt-grid');
      toast('Toggled compact grid layout');
      return;
    }
    if (/tap tempo/i.test(label)) {
      const b = doc.getElementById('bpmVal');
      if (b) b.textContent = String((parseInt(b.textContent, 10) + 4) % 180 || 120);
      playEditorSynthTone('bell');
      return;
    }
    if (/subscribe/i.test(label)) {
      btn.textContent = '✓ Subscribed!';
      playEditorSynthTone('bell');
      toast('✓ Subscribed!');
      return;
    }

    const card = btn.closest('article, .card, tr, .hero-compact, .side-card, section') || doc.body;
    const cardTitleEl = card.querySelector('h3, h2, h1, td:nth-child(2), b');
    const cardTitle = cardTitleEl ? cardTitleEl.textContent.trim() : label;
    let backdrop = doc.getElementById('siteDrawerBackdrop');
    if (!backdrop) {
      let st = doc.getElementById('__mh_drawer_css');
      if (!st) {
        st = doc.createElement('style');
        st.id = '__mh_drawer_css';
        st.textContent = `
          .site-drawer-backdrop { position:fixed; inset:0; background:rgba(5,7,14,0.78); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:99990; padding:20px; }
          .site-drawer-backdrop[hidden] { display:none !important; }
          .site-drawer { background:var(--surf, #131722); color:var(--text, #f1f5f9); border:2px solid var(--acc, #6366f1); border-radius:12px; width:680px; max-width:94vw; max-height:84vh; display:flex; flex-direction:column; box-shadow:0 24px 64px rgba(0,0,0,0.65); overflow:hidden; font-family:var(--font-body, system-ui, sans-serif); }
          .site-drawer-head { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:var(--surf2, #1c2230); border-bottom:1px solid var(--border, #262f42); }
          .site-drawer-body { padding:18px 20px; overflow-y:auto; font-size:14px; line-height:1.65; }
          .site-drawer-body pre { background:var(--bg, #0b0d12); color:var(--acc, #a3e635); border:1px solid var(--border, #262f42); padding:12px; border-radius:8px; overflow-x:auto; font-family:var(--font-mono, monospace); font-size:12px; }
        `;
        doc.head.appendChild(st);
      }
      backdrop = doc.createElement('div');
      backdrop.id = 'siteDrawerBackdrop';
      backdrop.className = 'site-drawer-backdrop';
      backdrop.hidden = true;
      backdrop.innerHTML = `
        <div class="site-drawer">
          <div class="site-drawer-head">
            <div>
              <span class="badge" id="sdBadge">INTERACTIVE VIEW</span>
              <strong id="sdTitle" style="margin-left:8px;font-size:16px;">Details</strong>
            </div>
            <button class="btn-sm acc" id="sdCloseBtn" onclick="document.getElementById('siteDrawerBackdrop').hidden=true">✕ Close</button>
          </div>
          <div class="site-drawer-body" id="sdBody"></div>
        </div>
      `;
      doc.body.appendChild(backdrop);
    }
    const sdBadge = doc.getElementById('sdBadge');
    const sdTitle = doc.getElementById('sdTitle');
    const sdBody = doc.getElementById('sdBody');
    if (!backdrop || !sdBody) return;

    if (/essay|manifesto|changelog|discography/i.test(label)) {
      sdBadge.textContent = 'ESSAY & FIELD NOTES';
      sdTitle.textContent = cardTitle;
      sdBody.innerHTML =
        `<p style="font-size:15px;color:var(--text);font-weight:600;">“When you put real buttons, tables, and controls above the fold, a website stops being a poster and becomes an instrument.”</p>` +
        `<p>Modern corporate web design hides everything behind giant empty hero banners and three-word slogans. By contrast, the best personal sites, hardware archives, and zines treat the screen like a workbench.</p>` +
        `<p><b>Key Structural Principles:</b></p>` +
        `<ul>` +
          `<li><b>Visible Bones:</b> Expose grid borders, table headers, and metadata badges so the reader can scan the whole page in two seconds.</li>` +
          `<li><b>High-Contrast Typography:</b> Pair an expressive display header font with a crisp monospace font for numbers, hex offsets, and tags.</li>` +
          `<li><b>Zero-Bloat Interactivity:</b> Self-contained HTML + CSS + vanilla JS tools that run instantaneously offline.</li>` +
        `</ul>` +
        `<div style="margin-top:14px;padding:12px;background:var(--surf2);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">` +
          `💡 <b>Tip:</b> Click <b>🩻 Show Boxes</b> in the top toolbar to see the exact HTML container structure of this layout!` +
        `</div>`;
      backdrop.hidden = false;
    } else if (/font|glyph|specimen|typography/i.test(label)) {
      const comp = doc.defaultView.getComputedStyle(doc.documentElement);
      const headFont = comp.getPropertyValue('--font-head') || 'sans-serif';
      const bodyFont = comp.getPropertyValue('--font-body') || 'sans-serif';
      const monoFont = comp.getPropertyValue('--font-mono') || 'monospace';
      sdBadge.textContent = 'LIVE FONT INSPECTOR';
      sdTitle.textContent = 'Live Type Specimen & Playground';
      sdBody.innerHTML =
        `<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">` +
          `<div style="font-size:10px;font-family:var(--font-mono);color:var(--acc);margin-bottom:4px;">DISPLAY HEADER FONT: ${esc(headFont.replace(/"/g, ''))}</div>` +
          `<div style="font-family:var(--font-head);font-size:28px;font-weight:800;line-height:1.15;color:var(--text);">Small websites with sharp bones — 0123456789</div>` +
        `</div>` +
        `<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">` +
          `<div style="font-size:10px;font-family:var(--font-mono);color:var(--acc);margin-bottom:4px;">BODY & UI FONT: ${esc(bodyFont.replace(/"/g, ''))}</div>` +
          `<div style="font-family:var(--font-body);font-size:15px;color:var(--text);">Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs.</div>` +
        `</div>` +
        `<div style="padding:12px;background:var(--surf2);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">` +
          `MONO / METADATA FONT: ${esc(monoFont.replace(/"/g, ''))} · 0x7F4A · 128 BPM` +
        `</div>`;
      backdrop.hidden = false;
      // Also switch the left sidebar to the Fonts tab so the user can steal/apply them!
      $('#bFontsPill').click();
    } else if (/code|source|blueprint|tree|spec|csv|pdf/i.test(label)) {
      sdBadge.textContent = 'HTML / CSS BONES';
      sdTitle.textContent = 'Clean Component Markup: ' + cardTitle;
      const snippet = (card.outerHTML || '')
        .replace(/\s*class="__mh-[^"]*"/g, '')
        .replace(/__mh-[a-z-]+/g, '')
        .replace(/>\s*</g, '>\n<')
        .trim();
      sdBody.innerHTML =
        `<p>Exact HTML structure for <b>${esc(cardTitle)}</b>:</p>` +
        `<pre id="sdCodePre">${esc(snippet)}</pre>` +
        `<button class="btn-sm acc">📋 Copy Component HTML</button>`;
      backdrop.hidden = false;
      select(card);
      $$('#rightTabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === 'code'));
      $('#inspector').hidden = true;
      $('#codePanel').hidden = false;
      $('#computedPanel').hidden = true;
      showElHtml();
    } else if (/patch|audition|solo|trigger|play|sampler|cutoff|wet|stream|chiptune/i.test(label)) {
      const mode = /303|acid|bass/i.test(cardTitle) ? 'acid' : /bell|dx|glass/i.test(cardTitle) ? 'bell' : /pad|ambient|drift/i.test(cardTitle) ? 'pad' : 'brass';
      playEditorSynthTone(mode);
      sdBadge.textContent = '🔊 WEBAUDIO SYNTH ENGINE';
      sdTitle.textContent = 'Now Playing: ' + cardTitle;
      sdBody.innerHTML =
        `<p style="color:var(--text);">Synthesizing real-time WebAudio oscillator voice (<b>${mode.toUpperCase()}</b>) direct from the browser:</p>` +
        `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0;">` +
          `<button class="btn acc" id="synthBtnBrass">🎹 Play CS-80 Brass Chord</button>` +
          `<button class="btn acc" id="synthBtnAcid">🧪 Play 303 Acid Sequence</button>` +
          `<button class="btn acc" id="synthBtnBell">🔔 Play FM Crystal Bell</button>` +
          `<button class="btn acc" id="synthBtnPad">🌊 Play Warm Drift Pad</button>` +
        `</div>` +
        `<pre>Oscillator: Polyphonic WebAudio API\nFilter: 24dB/oct Lowpass · Resonance Q=0.72\nStatus: Active (Zero external audio files required)</pre>`;
      backdrop.hidden = false;
    } else {
      playEditorSynthTone('bell');
      sdBadge.textContent = 'INTERACTIVE MODULE';
      sdTitle.textContent = cardTitle;
      sdBody.innerHTML =
        `<p style="color:var(--text);font-weight:600;">Interactive Module: ${esc(cardTitle)}</p>` +
        `<p>Triggered action: <code>${esc(label)}</code></p>` +
        `<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">` +
          `STATUS: ONLINE · READY FOR CUSTOMIZATION<br>` +
          `Click <b>🖥 Full Page</b> in the top bar to experience this page edge-to-edge!` +
        `</div>`;
      backdrop.hidden = false;
    }
  }

  function handleAppAndHubButtons(e) {
    const t = e.target;
    if (!t || !t.closest) return false;

    const testBtn = t.closest('.myhtml-app-btn-test');
    if (testBtn) {
      e.preventDefault();
      if (!S.live) $('#bPreview').click();
      else toast('▶ Already in Live Test Mode! Click apps in the sidebar to switch.');
      return true;
    }

    const hubAddBtn = t.closest('.myhtml-hub-btn-add');
    if (hubAddBtn) {
      e.preventDefault();
      addAppsToHub(hubAddBtn.closest('.myhtml-app-hub'), 'folder');
      return true;
    }
    const hubBulkBtn = t.closest('.myhtml-hub-btn-bulk');
    if (hubBulkBtn) {
      e.preventDefault();
      addAppsToHub(hubBulkBtn.closest('.myhtml-app-hub'), 'bulk');
      return true;
    }
    const hubFileBtn = t.closest('.myhtml-hub-btn-file');
    if (hubFileBtn) {
      e.preventDefault();
      addAppsToHub(hubFileBtn.closest('.myhtml-app-hub'), 'file');
      return true;
    }
    const hubCreateBtn = t.closest('.myhtml-hub-btn-create');
    if (hubCreateBtn) {
      e.preventDefault();
      openHtmlAppStudioModal(hubCreateBtn.closest('.myhtml-app-hub'), null);
      return true;
    }
    const hubWasmBtn = t.closest('.myhtml-hub-btn-wasm');
    if (hubWasmBtn) {
      e.preventDefault();
      openCommunityHub('wasm');
      return true;
    }
    const hubPublishBtn = t.closest('.myhtml-hub-publish-app');
    if (hubPublishBtn) {
      e.preventDefault();
      const hub = hubPublishBtn.closest('.myhtml-app-hub');
      const apps = hub ? getHubApps(hub) : [];
      const cur = apps.find((a) => a.active) || apps[0] || null;
      openPublish(cur ? { mode: 'hubApp', hubApp: cur } : { mode: 'wholeSite' });
      return true;
    }
    const hubEditBtn = t.closest('.myhtml-hub-edit-app');
    if (hubEditBtn) {
      e.preventDefault();
      const hub = hubEditBtn.closest('.myhtml-app-hub');
      if (hub) {
        const apps = getHubApps(hub);
        const cur = apps.find((a) => a.active) || apps[0];
        if (cur) openHtmlAppStudioModal(hub, cur);
        else openHtmlAppStudioModal(hub, null);
      }
      return true;
    }
    const hubRemoveBtn = t.closest('.myhtml-hub-remove-app');
    if (hubRemoveBtn) {
      e.preventDefault();
      const hub = hubRemoveBtn.closest('.myhtml-app-hub');
      if (hub) {
        const apps = getHubApps(hub);
        const activeIdx = Math.max(0, apps.findIndex((a) => a.active));
        const removed = apps[activeIdx];
        if (removed) {
          const prevRem = (hub.getAttribute('data-removed-apps') || '').split(',').map((s) => s.trim()).filter(Boolean);
          if (!prevRem.includes(removed.src)) prevRem.push(removed.src);
          hub.setAttribute('data-removed-apps', prevRem.join(','));
          apps.splice(activeIdx, 1);
          setHubApps(hub, apps, Math.max(0, activeIdx - 1), true);
          toast(`✕ Removed "${removed.title}" from Hub`);
        }
      }
      return true;
    }
    const hubReloadBtn = t.closest('.myhtml-hub-reload');
    if (hubReloadBtn) {
      e.preventDefault();
      const hub = hubReloadBtn.closest('.myhtml-app-hub');
      const fr = hub && hub.querySelector('.myhtml-hub-frame');
      if (fr && fr.contentWindow) {
        try { fr.contentWindow.location.reload(); } catch { fr.src = fr.src; }
        toast('↻ Reloaded app');
      }
      return true;
    }
    const hubItem = t.closest('.myhtml-hub-item');
    if (hubItem) {
      e.preventDefault();
      const hub = hubItem.closest('.myhtml-app-hub');
      if (hub) {
        const gridWrap = hub.querySelector('.myhtml-hub-grid');
        if (gridWrap) gridWrap.style.display = 'none';
        const allBtns = [...hub.querySelectorAll('.myhtml-hub-nav .myhtml-hub-item')];
        const idx = allBtns.indexOf(hubItem);
        setHubApps(hub, getHubApps(hub), idx >= 0 ? idx : 0, true);
        if (!S.live) select(hub);
        return true;
      }
    }
    const hubCard = t.closest('.myhtml-hub-card');
    if (hubCard) {
      e.preventDefault();
      const hub = hubCard.closest('.myhtml-app-hub');
      if (hub) {
        const gridWrap = hub.querySelector('.myhtml-hub-grid');
        if (gridWrap) gridWrap.style.display = 'none';
        hub.querySelectorAll('.myhtml-hub-view-btn').forEach((b) => {
          const on = b.getAttribute('data-hub-view') === 'dock';
          b.style.background = on ? '#334155' : '#1e293b';
          b.style.color = on ? '#fff' : '#94a3b8';
        });
        const allCards = [...hub.querySelectorAll('.myhtml-hub-grid-items .myhtml-hub-card')];
        const idx = allCards.indexOf(hubCard);
        setHubApps(hub, getHubApps(hub), idx >= 0 ? idx : 0, true);
        if (!S.live) select(hub);
        return true;
      }
    }
    const viewBtn = t.closest('.myhtml-hub-view-btn');
    if (viewBtn) {
      e.preventDefault();
      const hub = viewBtn.closest('.myhtml-app-hub');
      const mode = viewBtn.getAttribute('data-hub-view');
      if (hub) {
        const gridWrap = hub.querySelector('.myhtml-hub-grid');
        if (gridWrap) gridWrap.style.display = mode === 'grid' ? 'block' : 'none';
        hub.querySelectorAll('.myhtml-hub-view-btn').forEach((b) => {
          const on = b.getAttribute('data-hub-view') === mode;
          b.style.background = on ? '#334155' : '#1e293b';
          b.style.color = on ? '#fff' : '#94a3b8';
        });
        setHubApps(hub, getHubApps(hub), Math.max(0, getHubApps(hub).findIndex(a => a.active)), true);
        if (!S.live) select(hub);
        return true;
      }
    }

    const pickBtn = t.closest('.myhtml-app-btn-pick');
    if (pickBtn) {
      e.preventDefault();
      const container = pickBtn.closest('.myhtml-app-embed');
      if (container) chooseAppForContainer(container, 'folder');
      return true;
    }
    const fileBtn = t.closest('.myhtml-app-btn-file');
    if (fileBtn) {
      e.preventDefault();
      const container = fileBtn.closest('.myhtml-app-embed');
      if (container) chooseAppForContainer(container, 'file');
      return true;
    }

    const popBtn = t.closest('.myhtml-app-btn-pop');
    if (popBtn) {
      e.preventDefault();
      const rel = popBtn.getAttribute('href');
      if (rel && rel !== '#' && rel !== 'about:blank') {
        api.openInBrowser(S.dir, rel);
      }
      return true;
    }

    if (!S.live) {
      // Handle interactive template drawer & buttons even in Editor Mode!
      const sdClose = t.closest('#sdCloseBtn');
      if (sdClose || t.id === 'siteDrawerBackdrop') {
        e.preventDefault();
        const bd = doc.getElementById('siteDrawerBackdrop');
        if (bd) bd.hidden = true;
        return true;
      }
      if (t.closest('#siteDrawerBackdrop')) {
        const synthBtn = t.closest('#synthBtnBrass, #synthBtnAcid, #synthBtnBell, #synthBtnPad');
        if (synthBtn) {
          e.preventDefault();
          const mode = synthBtn.id === 'synthBtnAcid' ? 'acid' : synthBtn.id === 'synthBtnBell' ? 'bell' : synthBtn.id === 'synthBtnPad' ? 'pad' : 'brass';
          playEditorSynthTone(mode);
          return true;
        }
        const copyBtn = t.closest('button');
        if (copyBtn && /copy/i.test(copyBtn.textContent)) {
          e.preventDefault();
          const pre = doc.getElementById('sdCodePre');
          if (pre) {
            navigator.clipboard.writeText(pre.textContent);
            copyBtn.textContent = '✓ Copied to Clipboard!';
            toast('Component HTML copied!');
          }
          return true;
        }
        return true;
      }

      const tplBtn = t.closest('button, a.btn, a.btn-sm, .side-btn');
      if (tplBtn && !tplBtn.closest('.myhtml-app-hub, .myhtml-app-embed')) {
        e.preventDefault();
        select(tplBtn);
        runEditorTemplateButton(tplBtn);
        return true;
      }
    }
    return false;
  }

  function attachLiveBridge() {
    if (!doc) return;
    doc.addEventListener('click', (e) => {
      handleAppAndHubButtons(e);
    }, true);
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('fullpage-mode')) {
        e.preventDefault();
        toggleFullPageMode(false);
      } else if (e.key === 'F5') {
        e.preventDefault();
        toggleFullPageMode();
      } else if (e.key === 'F11') {
        e.preventDefault();
        api.fullscreen();
      }
    });
  }

  function attach() {
    S.hist = [serialize()]; S.hi = 0; updateUi(); renderLayers(); renderInspector(); renderBonesPanel();
    const root = doc.documentElement;
    doc.addEventListener('click', (e) => {
      if (handleAppAndHubButtons(e)) return;
      e.preventDefault();
      if (e.target.isContentEditable && e.target === editing) return;
      select(e.target === root ? doc.body : e.target);
    }, true);
    doc.addEventListener('submit', (e) => e.preventDefault(), true);
    doc.addEventListener('dblclick', (e) => startEdit(e.target));
    doc.addEventListener('mouseover', (e) => {
      $$('.__mh-hover', doc).forEach((n) => n.classList.remove('__mh-hover'));
      if (e.target !== doc.body && e.target !== root) e.target.classList.add('__mh-hover');
    });
    doc.addEventListener('mouseout', (e) => e.target.classList && e.target.classList.remove('__mh-hover'));
    doc.addEventListener('keydown', onKey);
    doc.addEventListener('dragover', onDragOver);
    doc.addEventListener('drop', onDrop);
    doc.addEventListener('dragleave', (e) => { if (!e.relatedTarget) clearDrop(); });
  }
  document.addEventListener('keydown', onKey);

  let editing = null;
  function startEdit(el) {
    if (!el || el === doc.body || /^(IMG|VIDEO|IFRAME|HR|INPUT|SELECT|CANVAS)$/.test(el.tagName)) return;
    editing = el; el.setAttribute('contenteditable', 'true'); el.focus();
    const end = () => { el.removeAttribute('contenteditable'); el.removeEventListener('blur', end); editing = null; commit(); };
    el.addEventListener('blur', end);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') el.blur();
      e.stopPropagation();
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    });
  }

  function select(el) {
    if (S.sel) S.sel.classList.remove('__mh-sel');
    S.sel = el && el !== doc.documentElement ? el : null;
    if (S.sel && S.sel !== doc.body) S.sel.classList.add('__mh-sel');
    renderInspector();
    renderLayers();
    renderBreadcrumbs();
    renderComputed();
    showElHtml();
  }

  const FRIENDLY_NAMES = {
    'H1': 'Main Title',
    'H2': 'Heading',
    'H3': 'Subheading',
    'IFRAME': 'App Viewport',
    'H4': 'Small Heading',
    'P': 'Paragraph Text',
    'A': 'Button / Link',
    'BUTTON': 'Button',
    'IMG': 'Photo / Image',
    'CANVAS': 'Arcade / Tool Canvas',
    'HEADER': 'Header Section',
    'NAV': 'Menu Bar',
    'SECTION': 'Page Section',
    'ARTICLE': 'Article Box',
    'FOOTER': 'Footer Section',
    'DIV': 'Container Box',
    'SPAN': 'Text Clip',
    'INPUT': 'Input Field',
    'TEXTAREA': 'Text Box',
    'FORM': 'Form'
  };

  function renderBreadcrumbs() {
    const bar = $('#crumbs');
    if (!S.sel || S.sel === doc.body) {
      bar.innerHTML = '<span class="crumb current">Page Body</span>';
      return;
    }
    const stack = [];
    let cur = S.sel;
    while (cur && cur !== doc.documentElement) {
      stack.unshift(cur);
      cur = cur.parentElement;
    }
    bar.innerHTML = stack.map((node, i) => {
      const isCur = i === stack.length - 1;
      const tag = node.tagName.toUpperCase();
      const friendly = FRIENDLY_NAMES[tag] || node.tagName.toLowerCase();
      const id = node.id ? '#' + node.id : '';
      return `<span class="crumb ${isCur ? 'current' : ''}" data-i="${i}" title="${tag}">${esc(friendly)}${esc(id)}</span>`;
    }).join(' <span class="muted">›</span> ');

    $$('.crumb', bar).forEach((c, idx) => {
      c.onclick = () => select(stack[idx]);
    });
  }

  /* ---------- history ---------- */
  function commit() {
    if (!doc) return;
    const snap = serialize();
    if (snap === S.hist[S.hi]) return;
    S.hist = S.hist.slice(0, S.hi + 1);
    S.hist.push(snap);
    if (S.hist.length > 80) S.hist.shift();
    S.hi = S.hist.length - 1;
    if (S.dir && S.page) {
      api.writePage(S.dir, S.page, snap);
      S.dirty = false;
    } else {
      S.dirty = true;
    }
    updateUi();
    renderLayers();
    renderBonesPanel();
    renderComputed();
  }
  function go(i) {
    if (i < 0 || i >= S.hist.length) return;
    S.hi = i; S.sel = null; S.dirty = true;
    renderHtml(S.hist[i]);
    const keep = S.hist.slice(), idx = i;
    frame.addEventListener('load', () => {
      S.hist = keep; S.hi = idx;
      if (S.dir && S.page) { api.writePage(S.dir, S.page, S.hist[idx]); S.dirty = false; }
      updateUi(); renderInspector(); renderLayers(); renderBonesPanel();
    }, { once: true });
  }
  $('#bUndo').onclick = () => go(S.hi - 1);
  $('#bRedo').onclick = () => go(S.hi + 1);

  function updateUi() {
    $('#bUndo').disabled = S.hi <= 0;
    $('#bRedo').disabled = S.hi >= S.hist.length - 1;
    $('#bSave').textContent = S.dirty ? '💾 Save •' : '💾 Save';
    document.title = `${S.page || ''}${S.dirty ? ' •' : ''} — MyHTML`;
  }
  async function save() {
    if (!doc || !S.dir || !S.page) return;
    await api.writePage(S.dir, S.page, serialize());
    S.dirty = false;
    updateUi();
    toast('Saved ✓');
  }
  async function autosave() {
    if (doc && S.dir && S.page) await api.writePage(S.dir, S.page, serialize());
    S.dirty = false;
  }
  $('#bSave').onclick = save;

  function onKey(e) {
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 's') { e.preventDefault(); save(); }
    else if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); go(S.hi - 1); }
    else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); go(S.hi + 1); }
    else if (ctrl && k === 'd') { e.preventDefault(); act('dup'); }
    else if (k === 'delete' || k === 'backspace') { if (S.sel && S.sel !== doc.body) { e.preventDefault(); act('del'); } }
    else if (k === 'escape') act('parent');
    else if (k === 'enter' && S.sel) startEdit(S.sel);
  }

  /* ---------- device & modes ---------- */
  $$('#devices button').forEach((b) => (b.onclick = () => {
    $$('#devices button').forEach((x) => x.classList.toggle('on', x === b));
    $('#canvas').className = 'canvas ' + (b.dataset.d === 'desktop' ? '' : b.dataset.d);
  }));

  $('#bPreview').onclick = async () => {
    if (!S.live) {
      const html = serialize();
      if (S.dir && S.page) await api.writePage(S.dir, S.page, html);
      S.live = true;
      $('#bPreview').textContent = '✎ Back to Editor';
      $('#bPreview').classList.add('live-on');
      frame.onload = null;
      renderHtml(html, true);
      toast('▶ Test Mode active: Mini-apps and buttons are live!');
    } else {
      const html = serialize() || S.hist[S.hi];
      if (S.dir && S.page && html) await api.writePage(S.dir, S.page, html);
      S.live = false;
      $('#bPreview').textContent = '▶ Test App';
      $('#bPreview').classList.remove('live-on');
      renderHtml(html, false);
      toast('✎ Returned to Editor mode.');
    }
  };

  $('#bBrowser').onclick = async () => { await save(); api.openInBrowser(S.dir, S.page); };
  $('#bFolder').onclick = () => api.openFolder(S.dir);
  $('#bCode').onclick = () => {
    if (S.live) return;
    $('#codeText').value = serialize();
    $('#codeView').hidden = false;
  };
  $('#codeCancel').onclick = () => ($('#codeView').hidden = true);
  $('#codeApply').onclick = () => {
    const html = $('#codeText').value;
    $('#codeView').hidden = true;
    const keep = S.hist.slice(0, S.hi + 1);
    S.sel = null;
    renderHtml(html);
    frame.addEventListener('load', () => {
      S.hist = keep; S.hi = keep.length - 1; commit(); S.dirty = true; updateUi();
    }, { once: true });
  };

  /* ---------- navigation tabs ---------- */
  const ALL_LEFT_TABS = ['add', 'pages', 'fonts', 'assets', 'layers', 'bones'];
  $$('#leftTabs button').forEach((b) => (b.onclick = () => {
    $$('#leftTabs button').forEach((x) => x.classList.toggle('on', x === b));
    ALL_LEFT_TABS.forEach((t) => {
      const el = $('#p-' + t);
      if (el) el.hidden = t !== b.dataset.t;
    });
  }));
  $$('#rightTabs button').forEach((b) => (b.onclick = () => {
    $$('#rightTabs button').forEach((x) => x.classList.toggle('on', x === b));
    $('#inspector').hidden = b.dataset.t !== 'design';
    $('#codePanel').hidden = b.dataset.t !== 'code';
    $('#computedPanel').hidden = b.dataset.t !== 'computed';
    if (b.dataset.t === 'code') showElHtml();
    if (b.dataset.t === 'computed') renderComputed();
  }));

  /* ---------- blocks (Add Tab) ---------- */
  function renderAddPanel() {
    let h = '';
    const cats = ['Apps & Games', 'Sections', 'Elements'];
    for (const cat of cats) {
      const list = BLOCKS.filter((b) => b.cat === cat);
      if (!list.length) continue;
      const catHeader = cat === 'Apps & Games' ? '🕹️ Live Mini-Apps & Tools' : cat === 'Sections' ? '📄 Page Sections' : '✏️ Basic Text & Elements';
      h += `<div class="cat">${catHeader}</div><div class="blocks">` +
        list.map((b) => `<div class="block ${cat === 'Apps & Games' ? 'app-block' : ''}" draggable="true" data-id="${b.id}" title="${esc(b.desc || b.name)}"><i>${b.icon}</i><span>${b.name}</span></div>`).join('') +
        '</div>';
    }
    $('#p-add').innerHTML = h;
    $$('#p-add .block').forEach((el) => {
      el.onclick = () => insertBlock(el.dataset.id);
      el.ondragstart = (e) => { e.dataTransfer.setData('text/plain', 'block:' + el.dataset.id); e.dataTransfer.effectAllowed = 'copy'; };
    });
  }

  function topLevel(el) { while (el && el.parentElement !== doc.body) el = el.parentElement; return el; }
  function insertBlock(id, ref, after = true) {
    if (id === 'app-hub') {
      openStandaloneAppHub();
      return;
    }
    if (!doc) return;
    if (S.live) {
      // Automatically switch to Edit mode if adding a block
      S.live = false;
      const prevBtn = $('#bPreview');
      if (prevBtn) {
        prevBtn.textContent = '▶ Live View';
        prevBtn.classList.remove('live-on', 'on');
      }
    }
    const b = BLOCKS.find((x) => x.id === id);
    if (!b) return;
    const tpl = doc.createElement('template');
    tpl.innerHTML = b.html.trim();
    const node = tpl.content.firstElementChild;
    const anchor = ref || (S.sel && S.sel !== doc.body ? topLevel(S.sel) : null);
    if (anchor) anchor.insertAdjacentElement(after ? 'afterend' : 'beforebegin', node);
    else doc.body.appendChild(node);
    commit();
    select(node);
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (b.cat === 'Apps & Games') {
      toast(`🎮 Added ${b.name}! Click "▶ Live View" at the top to try it live.`);
    } else {
      toast(b.name + ' added');
    }
  }
  function dropTarget(e) {
    const kids = [...doc.body.children].filter((n) => n.id !== '__mh_drop' && !/^(SCRIPT|STYLE)$/.test(n.tagName));
    if (!kids.length) return { ref: null };
    for (const k of kids) { const r = k.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) return { ref: k, after: false }; }
    return { ref: kids[kids.length - 1], after: true };
  }
  function clearDrop() { const d = doc.getElementById('__mh_drop'); if (d) d.remove(); }
  function onDragOver(e) {
    e.preventDefault(); clearDrop();
    const t = dropTarget(e), bar = doc.createElement('div'); bar.id = '__mh_drop';
    if (!t.ref) doc.body.appendChild(bar); else t.ref.insertAdjacentElement(t.after ? 'afterend' : 'beforebegin', bar);
  }
  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      clearDrop();
      handleExternalHtmlFileDrop(e);
      return;
    }
    const data = e.dataTransfer.getData('text/plain');
    const t = dropTarget(e);
    clearDrop();
    if (data.startsWith('block:')) insertBlock(data.slice(6), t.ref, t.after);
  }

  /* ---------- outline (Layers) ---------- */
  function renderLayers() {
    const p = $('#p-layers');
    if (!doc) return;
    const rows = [];
    (function walk(el, d) {
      for (const c of el.children) {
        if (/^(SCRIPT|STYLE|LINK|META|BR|TEMPLATE|NOSCRIPT)$/.test(c.tagName) || c.id === '__mh_drop') continue;
        const tag = c.tagName.toUpperCase();
        const friendly = FRIENDLY_NAMES[tag] || c.tagName.toLowerCase();
        const txt = (c.children.length === 0 ? c.textContent.trim().slice(0, 22) : '');
        rows.push({ c, d, html: `${'&nbsp;'.repeat(d * 2)}<b>${friendly}</b>${c.id ? ' #' + esc(c.id) : ''} <small>${esc(txt)}</small>` });
        if (d < 7) walk(c, d + 1);
      }
    })(doc.body, 0);
    p.innerHTML = rows.length ? rows.map((r, i) => `<div class="row ${r.c === S.sel ? 'on' : ''}" data-i="${i}">${r.html}</div>`).join('') : '<div class="muted small" style="padding:10px;text-align:center;">Empty page</div>';
    $$('.row', p).forEach((el) => (el.onclick = () => { const c = rows[+el.dataset.i].c; select(c); c.scrollIntoView({ block: 'center' }); }));
  }

  /* ---------- bones panel (Layout) ---------- */
  function renderBonesPanel() {
    const p = $('#p-bones');
    if (!doc) { p.innerHTML = '<div class="muted small">Open a page to inspect layout boxes.</div>'; return; }

    const flexNodes = [], gridNodes = [], landmarkNodes = [];
    $$('*', doc.body).forEach((el) => {
      if (/^(SCRIPT|STYLE|BR|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
      const comp = doc.defaultView.getComputedStyle(el);
      if (comp.display === 'flex' || comp.display === 'inline-flex') flexNodes.push(el);
      else if (comp.display === 'grid' || comp.display === 'inline-grid') gridNodes.push(el);
      if (/^(HEADER|NAV|MAIN|SECTION|ARTICLE|FOOTER|ASIDE)$/.test(el.tagName)) landmarkNodes.push(el);
    });

    let h = `
      <div style="margin-bottom:8px;">
        <button class="btn full ${S.bonesMode ? 'primary' : ''}" id="btnToggleBonesInner">
          ${S.bonesMode ? '🩻 Hide Layout Boxes' : '🩻 Show Layout Boxes'}
        </button>
      </div>
      <div class="bones-summary">
        <div class="bone-metric"><div class="val">${flexNodes.length}</div><div class="lbl">Side-by-Side (Flex)</div></div>
        <div class="bone-metric"><div class="val">${gridNodes.length}</div><div class="lbl">Grids</div></div>
        <div class="bone-metric"><div class="val">${landmarkNodes.length}</div><div class="lbl">Sections</div></div>
        <div class="bone-metric"><div class="val">${doc.body.querySelectorAll('*').length}</div><div class="lbl">Items</div></div>
      </div>
      <div class="sec-title">Click Any Box to Style It</div>
    `;

    const allBones = [
      ...landmarkNodes.map(el => ({ el, type: 'container', badge: el.tagName.toLowerCase() })),
      ...flexNodes.map(el => ({ el, type: 'flex', badge: 'row' })),
      ...gridNodes.map(el => ({ el, type: 'grid', badge: 'grid' }))
    ];

    if (!allBones.length) {
      h += '<div class="muted small" style="padding:10px;">No complex layout boxes found.</div>';
    } else {
      h += allBones.map((b, i) => {
        const idCls = (b.el.id ? '#' + b.el.id : '') + (b.el.className && typeof b.el.className === 'string' ? '.' + b.el.className.replace(/__mh-[a-z-]+/g, '').trim().split(/\s+/)[0] : '');
        const tag = b.el.tagName.toUpperCase();
        const friendly = FRIENDLY_NAMES[tag] || b.el.tagName.toLowerCase();
        return `<div class="bone-tree-item ${b.type}" data-bi="${i}">
          <span class="bone-badge ${b.type === 'container' ? 'box' : b.type}">${b.badge}</span>
          <span style="font-weight:600;font-size:11px;">${friendly}</span>
          <span class="muted small" style="overflow:hidden;text-overflow:ellipsis;">${esc(idCls)}</span>
        </div>`;
      }).join('');
    }

    p.innerHTML = h;
    const btn = $('#btnToggleBonesInner');
    if (btn) btn.onclick = toggleBonesMode;
    $$('.bone-tree-item', p).forEach((item) => {
      item.onclick = () => {
        const idx = +item.dataset.bi;
        const target = allBones[idx].el;
        select(target);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    });
  }

  /* ---------- fonts panel (The Font Vault) ---------- */
  function renderFonts() {
    const p = $('#p-fonts');
    if (!S.fonts || !S.fonts.length) {
      p.innerHTML = `
        <div class="muted small" style="padding:16px;text-align:center;line-height:1.6;">
          <strong>No custom fonts captured yet.</strong><br><br>
          When you copy a website with custom web fonts (like BBC, Apple, or Google), all its fonts appear right here for you to use!
        </div>
      `;
      return;
    }

    let h = `
      <div class="font-vault-header">
        <span style="font-weight:700;font-size:12px;">Captured Fonts (${S.fonts.length})</span>
        <button class="btn small ghost" id="bRefreshFonts">↻ Refresh</button>
      </div>
    `;

    h += S.fonts.map((f, i) => {
      const formats = [...new Set(f.variants.map(v => v.format.toUpperCase()))].join(', ');
      const weights = [...new Set(f.variants.map(v => v.weight))].sort().join(' · ');
      const totalSize = f.variants.reduce((acc, v) => acc + (parseFloat(v.size) || 0), 0);
      const sizeStr = totalSize > 0 ? `${totalSize.toFixed(1)} KB` : '';
      const firstDisk = f.variants.find(v => v.diskPath)?.diskPath || '';

      return `
        <div class="font-card" data-fi="${i}">
          <div class="font-header">
            <div>
              <div class="font-name">${esc(f.family)}</div>
              <div class="font-meta-pills" style="margin-top:4px;">
                <span class="font-pill">${formats || 'WOFF2'}</span>
                <span class="font-pill">${weights ? 'Weights: ' + weights : 'Regular'}</span>
                ${sizeStr ? `<span class="font-pill">${sizeStr}</span>` : ''}
              </div>
            </div>
          </div>
          <input class="font-specimen-input" value="The quick brown fox jumps over the lazy dog" style="font-family:'${esc(f.family)}', sans-serif;" spellcheck="false">
          <div class="font-actions">
            <button class="btn small" data-fa="apply" title="Apply font to selected element">Aa ➜ Element</button>
            <button class="btn small" data-fa="body" title="Set as whole page font">Aa ➜ Page</button>
            <button class="btn small" data-fa="css" title="Copy @font-face CSS">📋 Copy CSS</button>
            ${firstDisk ? `<button class="btn small" data-fa="folder" data-path="${esc(firstDisk)}" title="Show font file in Windows Explorer">📂 Font File</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    p.innerHTML = h;

    const rf = $('#bRefreshFonts');
    if (rf) rf.onclick = refreshFontsAndAssets;

    $$('#p-fonts .font-card').forEach((card) => {
      const f = S.fonts[+card.dataset.fi];
      $('[data-fa="apply"]', card).onclick = () => {
        if (!S.sel) { toast('Select something on the page first'); return; }
        setStyle('font-family', `'${f.family}', sans-serif`);
        renderInspector();
        toast(`Applied font: ${f.family}`);
      };
      $('[data-fa="body"]', card).onclick = () => {
        if (!doc) return;
        applyFontPairToAnyPage({
          name: f.family,
          head: f.family,
          body: f.family,
          mono: 'JetBrains Mono',
          gurl: `${encodeURIComponent(f.family)}:wght@400;600;700`
        });
        renderInspector();
        toast(`Set page & Hub apps font: ${f.family}`);
      };
      $('[data-fa="css"]', card).onclick = () => {
        navigator.clipboard.writeText(f.css || `font-family: '${f.family}', sans-serif;`);
        toast('Font code copied to clipboard');
      };
      const fBtn = $('[data-fa="folder"]', card);
      if (fBtn) {
        fBtn.onclick = () => api.showItem(fBtn.dataset.path);
      }
    });
  }

  /* ---------- assets panel (Images & Apps) ---------- */
  async function renderAssets() {
    const p = $('#p-assets');
    const images = (S.assets && S.assets.images) || [];
    let apps = [];
    try { apps = await api.listApps(S.dir) || []; } catch {}

    let h = `
      <div style="margin-bottom:14px;">
        <div class="sec-title" style="margin-top:0;">🧰 Web Apps &amp; Tools (${apps.length})</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
          <button class="btn primary small" id="bImportNewApp" title="Import an app folder (like XISO dist)">📂 + App Folder</button>
          <button class="btn primary small" id="bImportBulkApps" style="background:#7c3aed;border-color:#7c3aed;" title="Import a whole folder of 10 or 30 apps at once">📚 + Bulk Folder</button>
          <button class="btn small" id="bImportHtmlFile" title="Import one or more standalone .html files">📄 + .html File</button>
          <button class="btn small" id="bImportUrlApp" title="Grab a live web app from a URL">🌐 + From URL</button>
        </div>
    `;

    if (!apps.length) {
      h += `
        <div class="muted small" style="padding:10px;text-align:center;background:var(--card);border:1px dashed var(--line);border-radius:8px;line-height:1.5;">
          No web tools imported yet.<br>Click any button above to load WASM or HTML5 apps.
        </div>
      `;
    } else {
      h += apps.map((app, i) => `
        <div class="app-item-card" data-ai="${i}">
          <div class="app-item-header">
            <div class="app-item-title">${esc(app.icon || '📦')} ${esc(app.title)}</div>
            <span class="badge" style="background:#10b981;color:#fff;font-size:9px;padding:1px 5px;">READY</span>
          </div>
          <div class="muted small" style="font-size:10px;word-break:break-all;">${esc(app.relPath)}</div>
          <div class="app-item-actions">
            <button class="btn small primary" data-act="hub" style="flex:1;" title="Add into Multi-App Hub">+ Hub</button>
            <button class="btn small" data-act="pub" style="background:#10b981;color:#04130d;border-color:#10b981;font-weight:700;" title="Put this app online on the internet!">🚀 Put Online</button>
            <button class="btn small ghost" data-act="folder" title="Open files in Windows Explorer">📂</button>
          </div>
        </div>
      `).join('');
    }

    h += `</div>
      <div class="sec-title flex-title">
        <span>🖼️ Pictures (${images.length})</span>
        <button class="btn small ghost" id="bOpenAssetDir" style="padding:2px 6px;font-size:10px;">📂 Pictures Folder</button>
      </div>
      <div style="margin-bottom:8px;">
        <button class="btn primary small full" id="bImportImg">+ Add Picture</button>
      </div>
    `;

    if (!images.length) {
      h += `
        <div class="muted small" style="padding:16px;text-align:center;line-height:1.6;">
          No pictures saved yet.<br>Click "+ Add Picture" or copy a website with photos.
        </div>
      `;
    } else {
      h += `<div class="asset-grid">` +
        images.map((img) => `
          <div class="asset-card" data-path="${esc(img.path)}">
            <div class="asset-thumb"><img src="${S.base}${esc(img.path)}" alt=""></div>
            <div class="asset-name" title="${esc(img.name)}">${esc(img.name)}</div>
            <div class="asset-size">${esc(img.size)}</div>
          </div>
        `).join('') + `</div>`;
    }

    p.innerHTML = h;

    const handleQuickImport = async (mode) => {
      const hub = doc && ((S.sel && S.sel.closest && S.sel.closest('.myhtml-app-hub')) || doc.querySelector('.myhtml-app-hub'));
      if (hub) {
        await addAppsToHub(hub, mode);
        renderAssets();
        return;
      }
      let res = null;
      if (mode === 'bulk') res = await api.importAppBulk(S.dir);
      else if (mode === 'file') res = await api.importAppFile(S.dir);
      else if (mode === 'url') {
        const v = await ask('🌐 Grab Web App from URL', [
          { label: 'Web App Address (URL)', placeholder: 'https://example.com/tool' },
          { label: 'App Display Name (optional)', placeholder: 'My Web Tool' }
        ]);
        if (!v || !v[0]) return;
        toast('⏳ Downloading web app…');
        res = await api.cloneAppUrl({ projectDir: S.dir, url: normUrl(v[0]), customTitle: v[1] || '' });
      } else {
        res = await api.importApp(S.dir);
      }
      if (res && res.success) {
        renderAssets();
        const incoming = res.apps && res.apps.length ? res.apps : [res];
        if (incoming.length > 1) {
          // If importing multiple apps and no Hub exists yet, drop a Multi-App Hub and load all of them into it!
          insertBlock('app-hub');
          const newHub = doc.querySelector('.myhtml-app-hub');
          if (newHub) {
            const combined = [...getHubApps(newHub), ...incoming.map(a => ({ title: a.title, src: a.relPath, icon: a.icon || '📦' }))];
            setHubApps(newHub, combined, combined.length - 1);
          }
          toast(`📚 Created Multi-App Hub with ${incoming.length} imported apps!`);
        } else {
          addAppObjectToPageOrHub(incoming[0]);
        }
      }
    };

    const newAppBtn = $('#bImportNewApp');
    if (newAppBtn) newAppBtn.onclick = () => handleQuickImport('folder');
    const bulkBtn = $('#bImportBulkApps');
    if (bulkBtn) bulkBtn.onclick = () => handleQuickImport('bulk');
    const fileBtn = $('#bImportHtmlFile');
    if (fileBtn) fileBtn.onclick = () => handleQuickImport('file');
    const urlBtn = $('#bImportUrlApp');
    if (urlBtn) urlBtn.onclick = () => handleQuickImport('url');

    $$('.app-item-card', p).forEach((card) => {
      const app = apps[+card.dataset.ai];
      const hubBtn = $('[data-act="hub"]', card);
      if (hubBtn) hubBtn.onclick = () => addAppObjectToPageOrHub(app);
      const pubBtn = $('[data-act="pub"]', card);
      if (pubBtn) pubBtn.onclick = () => openPublish({ mode: 'hubApp', hubApp: { title: app.title, src: app.relPath, icon: app.icon || '📦' } });
      const fldBtn = $('[data-act="folder"]', card);
      if (fldBtn) fldBtn.onclick = () => api.openFolder(app.fullDir);
    });

    const imgBtn = $('#bImportImg');
    if (imgBtn) {
      imgBtn.onclick = async () => {
        const r = await api.importImage(S.dir);
        if (r) { refreshFontsAndAssets(); toast('Picture added'); }
      };
    }

    const dirBtn = $('#bOpenAssetDir');
    if (dirBtn) dirBtn.onclick = () => api.openFolder(S.dir + '/assets');

    $$('.asset-card', p).forEach((card) => {
      card.onclick = () => {
        const path = card.dataset.path;
        if (S.sel && S.sel.tagName === 'IMG') {
          S.sel.setAttribute('src', path);
          commit();
          renderInspector();
          toast('Picture replaced');
        } else {
          navigator.clipboard.writeText(path);
          toast('Copied picture link');
        }
      };
    });
  }

  /* ---------- pages ---------- */
  function renderPages() {
    $('#p-pages').innerHTML =
      S.pages.map((p) => `
        <div class="row ${p === S.page ? 'on' : ''}" data-p="${esc(p)}" style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ${esc(p)}</span>
          <span style="display:flex;align-items:center;gap:4px;">
            <button type="button" class="btn small" data-pub="1" style="padding:1px 6px;font-size:10px;background:#10b981;color:#04130d;border:0;font-weight:700;" title="Put this page online">🚀</button>
            ${p !== 'index.html' ? '<span class="x" data-del="1" title="Delete">✕</span>' : ''}
          </span>
        </div>`).join('') +
      '<button class="btn primary full" id="newPage">+ Add Clean Page</button>' +
      '<button class="btn full" id="openHtmlPageBtn" style="margin-top:6px;">📄 Open .html File from PC</button>';
    $$('#p-pages .row').forEach((r) => (r.onclick = async (e) => {
      if (e.target.dataset.pub) {
        e.stopPropagation();
        openPublish({ mode: 'singlePage', pageName: r.dataset.p });
        return;
      }
      if (e.target.dataset.del) {
        e.stopPropagation();
        if (await api.deletePage(S.dir, r.dataset.p)) {
          S.pages = (await api.projectInfo(S.dir)).pages;
          renderPages();
          if (S.page === r.dataset.p) loadPage(S.pages[0]);
        }
        return;
      }
      if (r.dataset.p !== S.page) { await autosave(); loadPage(r.dataset.p); }
    }));
    const openHtmlBtn = $('#openHtmlPageBtn');
    if (openHtmlBtn) openHtmlBtn.onclick = openStandaloneHtmlFile;
    $('#newPage').onclick = async () => {
      const v = await ask('Add a Clean New Page', [{ label: 'Page name (e.g. about or contact)', placeholder: 'about' }]);
      if (!v || !v[0]) return;
      try {
        const html = TEMPLATES.blank.html();
        const name = await api.createPage(S.dir, v[0], html);
        S.pages = (await api.projectInfo(S.dir)).pages;
        await autosave();
        await loadPage(name, { startLive: false });
      } catch (e) { toast(cleanErr(e)); }
    };
  }

  /* ---------- actions ---------- */
  function act(a) {
    const el = S.sel;
    if (!el || (el === doc.body && a !== 'parent')) return;
    if (a === 'del') {
      const nxt = el.nextElementSibling || el.previousElementSibling || el.parentElement;
      el.remove();
      S.sel = null;
      commit();
      select(nxt === doc.body ? null : nxt);
    }
    if (a === 'dup') {
      const c = el.cloneNode(true);
      c.classList.remove('__mh-sel');
      el.insertAdjacentElement('afterend', c);
      commit();
      select(c);
    }
    if (a === 'up' && el.previousElementSibling) {
      el.parentElement.insertBefore(el, el.previousElementSibling);
      commit();
      el.scrollIntoView({ block: 'center' });
    }
    if (a === 'down' && el.nextElementSibling) {
      el.parentElement.insertBefore(el.nextElementSibling, el);
      commit();
      el.scrollIntoView({ block: 'center' });
    }
    if (a === 'parent' && el.parentElement && el.parentElement !== doc.documentElement) select(el.parentElement);
    if (a === 'child' && el.firstElementChild) select(el.firstElementChild);
    if (a === 'wrap') {
      const wrapper = doc.createElement('div');
      wrapper.style.display = 'block';
      el.parentElement.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      commit();
      select(wrapper);
      toast('Wrapped in a container box');
    }
    if (a === 'edit') startEdit(el);
  }

  /* ---------- inspector ---------- */
  const SYSTEM_FONTS = [
    '',
    "'Segoe UI', system-ui, sans-serif",
    "Arial, sans-serif",
    "'Helvetica Neue', Helvetica, sans-serif",
    "Georgia, serif",
    "'Times New Roman', serif",
    "'Trebuchet MS', sans-serif",
    "Verdana, sans-serif",
    "'Cascadia Code', Consolas, monospace",
    "Impact, sans-serif"
  ];

  function getFontOptions() {
    let opts = [];
    if (S.fonts && S.fonts.length) {
      opts.push({ group: '⭐ Captured Website Fonts', items: S.fonts.map(f => [`'${f.family}', sans-serif`, f.family]) });
    }
    opts.push({
      group: 'Standard System Fonts',
      items: SYSTEM_FONTS.map(f => [f, f ? f.split(',')[0].replace(/'/g, '') : '(Default font)'])
    });
    return opts;
  }

  const cs = () => doc.defaultView.getComputedStyle(S.sel);
  function setStyle(prop, val) {
    if (!S.sel) return;
    if (val === '' || val == null) S.sel.style.removeProperty(prop);
    else S.sel.style.setProperty(prop, val);
    if (!S.sel.getAttribute('style')) S.sel.removeAttribute('style');
    commit();
  }

  function fText(label, prop, ph = '') {
    return `<div class="f"><label>${label}</label><input type="text" data-style="${prop}" value="${esc(S.sel.style.getPropertyValue(prop))}" placeholder="${esc(ph || cs().getPropertyValue(prop))}"></div>`;
  }
  function fColor(label, prop) {
    const own = S.sel.style.getPropertyValue(prop), hex = rgbToHex(own) || (own && own[0] === '#' ? own : null) || rgbToHex(cs().getPropertyValue(prop)) || '#ffffff';
    return `<div class="f"><label>${label}</label><input type="color" data-color="${prop}" value="${hex.length === 7 ? hex : '#ffffff'}"><input type="text" data-style="${prop}" value="${esc(own)}" placeholder="${esc(cs().getPropertyValue(prop))}"><button class="clr" data-clear="${prop}" title="Reset">✕</button></div>`;
  }
  function fSelect(label, prop, optGroups) {
    const cur = S.sel.style.getPropertyValue(prop);
    let optionsHtml = '';
    for (const grp of optGroups) {
      optionsHtml += `<optgroup label="${esc(grp.group)}">`;
      for (const [v, t] of grp.items) {
        optionsHtml += `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(t)}</option>`;
      }
      optionsHtml += `</optgroup>`;
    }
    return `<div class="f"><label>${label}</label><select data-style="${prop}">${optionsHtml}</select></div>`;
  }
  function fFlatSelect(label, prop, opts) {
    const cur = S.sel.style.getPropertyValue(prop);
    return `<div class="f"><label>${label}</label><select data-style="${prop}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  }

  function renderInspector() {
    const p = $('#inspector');
    if (!doc) return;
    if (!S.sel || S.sel === doc.body) { pageSettings(p); return; }
    const el = S.sel, tag = el.tagName, isImg = tag === 'IMG', isLink = tag === 'A', isForm = /^(INPUT|TEXTAREA|BUTTON)$/.test(tag);
    const friendlyTag = FRIENDLY_NAMES[tag] || el.tagName.toLowerCase();
    let h = `
      <div class="ins-head">
        <b>${friendlyTag}</b>
        <span class="muted small">${esc(el.id ? '#' + el.id : '')}</span>
      </div>
      <div class="tools">
        <button data-a="parent" title="Select surrounding box">⬆ Parent Box</button>
        <button data-a="up" title="Move element up">↑ Move Up</button>
        <button data-a="down" title="Move element down">↓ Move Down</button>
        <button data-a="dup" title="Duplicate (Ctrl+D)">⧉ Copy</button>
        <button data-a="edit" title="Edit text (Enter)">✎ Edit Text</button>
        <button class="danger" data-a="del" title="Delete (Del)">🗑 Delete</button>
      </div>
    `;

    const hubContainer = el.closest ? el.closest('.myhtml-app-hub') : null;
    if (hubContainer) {
      const apps = getHubApps(hubContainer);
      const activeIdx = parseInt(hubContainer.getAttribute('data-active-idx') || '0', 10) || 0;
      const hubTitleEl = hubContainer.querySelector('.hub-title');
      const hubTitle = hubTitleEl ? hubTitleEl.textContent : 'App Workbench';
      h += `
        <div class="sec" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.28);border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h4 style="margin:0;color:#10b981;font-size:12px;display:flex;align-items:center;gap:6px;">🧰 Multi-App Hub (1 Screen)</h4>
            <span style="background:rgba(16,185,129,0.2);color:#10b981;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:6px;">${apps.length} APPS</span>
          </div>
          <p class="muted small" style="margin:0 0 8px;">Bung 5, 10, or 30+ apps into one single-screen workbench.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
            <button class="btn small primary" id="insHubAddFolder" title="Add a folder containing index.html + .wasm/.js">📂 + App Folder</button>
            <button class="btn small primary" id="insHubAddBulk" title="Pick a parent folder of many apps to import all at once">📚 + Bulk Folder</button>
            <button class="btn small" id="insHubAddFile" title="Pick one or more .html files">📄 + .html File</button>
            <button class="btn small" id="insHubAddUrl" title="Clone a live web app URL into the Hub">🌐 + Web URL</button>
          </div>
          <div class="f">
            <label>Hub Name</label>
            <input type="text" id="insHubTitle" value="${esc(hubTitle)}" placeholder="App Workbench">
          </div>
          <div style="margin-top:8px;margin-bottom:6px;font-size:11px;font-weight:700;color:var(--muted);display:flex;justify-content:space-between;align-items:center;">
            <span>Apps in this Hub (${apps.length})</span>
            <button class="btn small ghost" id="insHubFullHeight" style="font-size:10px;padding:2px 6px;">⛶ Full Screen Height</button>
          </div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding-right:2px;">
            ${apps.map((a, idx) => `
              <div style="display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:6px;background:${idx === activeIdx ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)'};border:1px solid ${idx === activeIdx ? 'rgba(99,102,241,0.4)' : 'var(--border)'};">
                <button class="btn small ghost" data-hub-select="${idx}" style="padding:2px 5px;flex:1;text-align:left;justify-content:flex-start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;" title="Switch to ${esc(a.title)}">
                  ${esc(a.icon || '⚡')} ${esc(a.title)}
                </button>
                <button class="btn small ghost" data-hub-up="${idx}" title="Move up" style="padding:2px 5px;font-size:10px;" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn small ghost" data-hub-down="${idx}" title="Move down" style="padding:2px 5px;font-size:10px;" ${idx === apps.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn small ghost" data-hub-del="${idx}" title="Remove from Hub" style="padding:2px 5px;font-size:10px;color:#ef4444;">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const appContainer = el.closest ? el.closest('.myhtml-app-embed') : null;
    if (appContainer) {
      const appTitle = appContainer.getAttribute('data-app-title') || (appContainer.querySelector('.myhtml-app-title') ? appContainer.querySelector('.myhtml-app-title').textContent : 'Embedded Web App');
      const appSrc = appContainer.getAttribute('data-app-src') || '';
      const vp = appContainer.querySelector('.myhtml-app-viewport');
      const curH = vp ? parseInt(vp.style.height || '600', 10) : 600;
      const hdr = appContainer.querySelector('.myhtml-app-header');
      const hasHdr = !hdr || hdr.style.display !== 'none';

      h += `
        <div class="sec" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h4 style="margin:0;color:#6366f1;font-size:12px;display:flex;align-items:center;gap:6px;">📦 Web App Controls</h4>
            <span style="background:rgba(16,185,129,0.2);color:#10b981;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:6px;">OFFLINE</span>
          </div>
          <div style="margin-bottom:10px;font-size:11.5px;line-height:1.4;">
            <div style="font-weight:700;color:var(--text);">${esc(appTitle)}</div>
            <div class="muted small" style="word-break:break-all;">${esc(appSrc || 'No folder chosen yet')}</div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            <button class="btn primary" id="insAppPickBtn" style="flex:1;font-size:11px;">📂 App Folder…</button>
            <button class="btn" id="insAppPickFileBtn" style="flex:1;font-size:11px;">📄 .html File…</button>
          </div>
          <div class="f">
            <label>App Height</label>
            <input type="range" id="insAppHSlider" min="300" max="1200" step="25" value="${curH}" style="flex:1;">
            <span id="insAppHVal" style="font-size:11px;font-weight:600;min-width:44px;text-align:right;">${curH}px</span>
          </div>
          <div class="f">
            <label>App Title</label>
            <input type="text" id="insAppTitleInput" value="${esc(appTitle)}" placeholder="App title">
          </div>
          <div class="f">
            <label>Show Header</label>
            <input type="checkbox" id="insAppHeaderToggle" ${hasHdr ? 'checked' : ''}>
          </div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            ${appSrc ? `<button class="btn small" id="insAppOpenBtn" style="flex:1;">↗ Open in Browser</button>` : ''}
            <button class="btn small ghost" id="insAppDirBtn" style="flex:1;">📂 Apps Folder</button>
          </div>
        </div>
      `;
    }

    if (isImg) {
      h += `<div class="sec"><h4>Picture Settings</h4>
        <div class="f"><label>Image link</label><input type="text" data-attr="src" value="${esc(el.getAttribute('src') || '')}"></div>
        <button class="btn full primary" id="pickImg">📷 Choose Picture File…</button>
        <div class="f" style="margin-top:6px"><label>Description</label><input type="text" data-attr="alt" value="${esc(el.getAttribute('alt') || '')}" placeholder="For accessibility"></div>
      </div>`;
    }
    if (isLink) {
      h += `<div class="sec"><h4>Link Settings</h4>
        <div class="f"><label>Goes to</label><input type="text" data-attr="href" list="pgs" value="${esc(el.getAttribute('href') || '')}" placeholder="https:// or page.html"><datalist id="pgs">${S.pages.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div class="f"><label>New Tab</label><input type="checkbox" id="newTab" ${el.target === '_blank' ? 'checked' : ''}></div>
      </div>`;
    }
    if (isForm) {
      h += `<div class="sec"><h4>Input Field</h4><div class="f"><label>Hint text</label><input type="text" data-attr="placeholder" value="${esc(el.getAttribute('placeholder') || '')}"></div></div>`;
    }

    // Text & Fonts
    if (!el.querySelector('*') || /^(H[1-6]|P|A|SPAN|BUTTON|LI|LABEL|STRONG|EM|B|I)$/.test(tag)) {
      h += `<div class="sec"><h4>Text & Fonts</h4>` +
        fSelect('Font', 'font-family', getFontOptions()) +
        fText('Size', 'font-size', 'e.g. 18px') +
        fFlatSelect('Boldness', 'font-weight', [['', '(Normal)'], ['300', 'Light'], ['400', 'Normal'], ['500', 'Medium'], ['600', 'Semi-Bold'], ['700', 'Bold'], ['800', 'Extra Bold']]) +
        fColor('Text Colour', 'color') +
        `<div class="f"><label>Align</label><div class="al">${['left', 'center', 'right'].map((a) => `<button data-align="${a}" class="${el.style.textAlign === a ? 'on' : ''}">${{ left: '⇤ Left', center: '↔ Centre', right: '⇥ Right' }[a]}</button>`).join('')}</div></div>` +
        fText('Line Spacing', 'line-height', 'e.g. 1.5') +
        '</div>';
    }

    // Appearance & Colors
    h += `<div class="sec"><h4>Colors & Look</h4>` +
      fColor('Background', 'background-color') +
      fText('Bg Image', 'background-image', 'url(...)') +
      fText('Round Corners', 'border-radius', 'e.g. 12px or 50%') +
      fText('Border', 'border', 'e.g. 1px solid #ccc') +
      fText('Drop Shadow', 'box-shadow', 'e.g. 0 8px 24px rgba(0,0,0,0.1)') +
      fText('Opacity', 'opacity', '1.0') +
      '</div>';

    // Layout
    h += `<div class="sec"><h4>Arrangement (Layout)</h4>` +
      fFlatSelect('Flow', 'display', [['', '(Default)'], ['block', 'Stacked (Block)'], ['flex', 'Side-by-Side (Row)'], ['grid', 'Grid Columns'], ['none', 'Hidden']]) +
      fText('Item Gap', 'gap', 'e.g. 16px') +
      fFlatSelect('Positioning', 'justify-content', [['', '(Default)'], ['flex-start', 'Left / Start'], ['center', 'Centre'], ['space-between', 'Spread Evenly'], ['flex-end', 'Right / End']]) +
      fFlatSelect('Alignment', 'align-items', [['', '(Default)'], ['flex-start', 'Top'], ['center', 'Middle'], ['flex-end', 'Bottom']]) +
      '</div>';

    // Size & Spacing
    h += `<div class="sec"><h4>Size & Spacing</h4>` +
      fText('Inside space', 'padding', 'e.g. 20px') +
      fText('Outside space', 'margin', 'e.g. 10px auto') +
      fText('Width', 'width', 'e.g. 100% or 400px') +
      fText('Max Width', 'max-width', 'e.g. 800px') +
      fText('Height', 'height', 'auto') +
      '</div>';

    p.innerHTML = h;
    bindInspector(p);
  }

  function pageSettings(p) {
    const d = doc, title = d.title || '', desc = (d.querySelector('meta[name=description]') || {}).content || '';
    const b = d.body, bcs = d.defaultView.getComputedStyle(b);
    let fontOptsHtml = '';
    for (const grp of getFontOptions()) {
      fontOptsHtml += `<optgroup label="${esc(grp.group)}">`;
      for (const [v, t] of grp.items) fontOptsHtml += `<option value="${esc(v)}">${esc(t)}</option>`;
      fontOptsHtml += `</optgroup>`;
    }

    p.innerHTML = `
      <div class="ins-head"><b>Page Settings</b></div>
      <p class="muted small">Click any element on the page to change its words, colors, or fonts.</p>
      <div class="sec"><h4>Page Information</h4>
        <div class="f"><label>Page Title</label><input type="text" id="pgTitle" value="${esc(title)}"></div>
        <div class="f"><label>Description</label><input type="text" id="pgDesc" value="${esc(desc)}"></div>
      </div>
      <div class="sec"><h4>Whole Page Look</h4>
        <div class="f"><label>Background</label><input type="color" id="pgBg" value="${rgbToHex(bcs.backgroundColor) || '#ffffff'}"></div>
        <div class="f"><label>Text Colour</label><input type="color" id="pgFg" value="${rgbToHex(bcs.color) || '#111827'}"></div>
        <div class="f"><label>Page Font</label><select id="pgFont">${fontOptsHtml}</select></div>
      </div>
      <div class="sec"><h4>Custom Styling (Optional)</h4>
        <div class="f"><textarea id="pgCss" rows="5" class="mono" placeholder="/* CSS styles */">${esc((d.getElementById('__mh_custom') || {}).textContent || '')}</textarea></div>
        <button class="btn full" id="pgCssApply">Apply Styles</button>
      </div>
    `;

    $('#pgTitle').onchange = (e) => { d.title = e.target.value; commit(); };
    $('#pgDesc').onchange = (e) => {
      let m = d.querySelector('meta[name=description]');
      if (!m) { m = d.createElement('meta'); m.name = 'description'; d.head.appendChild(m); }
      m.content = e.target.value; commit();
    };
    $('#pgBg').onchange = (e) => { b.style.backgroundColor = e.target.value; commit(); };
    $('#pgFg').onchange = (e) => { b.style.color = e.target.value; commit(); };
    $('#pgFont').onchange = (e) => {
      if (e.target.value) b.style.fontFamily = e.target.value; else b.style.removeProperty('font-family');
      commit();
    };
    $('#pgCssApply').onclick = () => {
      let s = d.getElementById('__mh_custom');
      if (!s) { s = d.createElement('style'); s.id = '__mh_custom'; d.head.appendChild(s); }
      s.textContent = $('#pgCss').value;
      commit();
      toast('Custom styling applied');
    };
  }

  function bindInspector(p) {
    $$('[data-a]', p).forEach((b) => (b.onclick = () => act(b.dataset.a)));
    $$('[data-style]', p).forEach((i) => (i.onchange = () => {
      setStyle(i.dataset.style, i.value.trim());
      const c = $(`[data-color="${i.dataset.style}"]`, p);
      if (c && rgbToHex(S.sel.style.getPropertyValue(i.dataset.style))) c.value = rgbToHex(S.sel.style.getPropertyValue(i.dataset.style));
    }));
    $$('[data-color]', p).forEach((i) => (i.oninput = () => {
      S.sel.style.setProperty(i.dataset.color, i.value);
      const t = $(`[data-style="${i.dataset.color}"]`, p);
      if (t) t.value = i.value;
    }, i.onchange = () => commit()));
    $$('[data-clear]', p).forEach((b) => (b.onclick = () => { setStyle(b.dataset.clear, ''); renderInspector(); }));
    $$('[data-align]', p).forEach((b) => (b.onclick = () => { setStyle('text-align', S.sel.style.textAlign === b.dataset.align ? '' : b.dataset.align); renderInspector(); }));
    $$('[data-attr]', p).forEach((i) => (i.onchange = () => {
      if (i.value) S.sel.setAttribute(i.dataset.attr, i.value.trim());
      else S.sel.removeAttribute(i.dataset.attr);
      commit();
      renderLayers();
    }));
    const nt = $('#newTab');
    if (nt) nt.onchange = () => {
      if (nt.checked) { S.sel.target = '_blank'; S.sel.rel = 'noopener'; }
      else { S.sel.removeAttribute('target'); S.sel.removeAttribute('rel'); }
      commit();
    };
    const pi = $('#pickImg');
    if (pi) pi.onclick = async () => {
      const r = await api.importImage(S.dir);
      if (r) { S.sel.setAttribute('src', r); S.sel.removeAttribute('srcset'); commit(); renderInspector(); refreshFontsAndAssets(); }
    };

    const hubContainer = S.sel && S.sel.closest ? S.sel.closest('.myhtml-app-hub') : null;
    if (hubContainer) {
      const addFolderBtn = $('#insHubAddFolder', p);
      if (addFolderBtn) addFolderBtn.onclick = () => addAppsToHub(hubContainer, 'folder');
      const addBulkBtn = $('#insHubAddBulk', p);
      if (addBulkBtn) addBulkBtn.onclick = () => addAppsToHub(hubContainer, 'bulk');
      const addFileBtn = $('#insHubAddFile', p);
      if (addFileBtn) addFileBtn.onclick = () => addAppsToHub(hubContainer, 'file');
      const addUrlBtn = $('#insHubAddUrl', p);
      if (addUrlBtn) addUrlBtn.onclick = async () => {
        const res = await ask('Add Web App from URL to Hub', [
          { label: 'Web App Address (URL)', value: '', placeholder: 'https://example.com/tool' },
        ]);
        if (!res || !res[0]) return;
        toast('Downloading web app into Hub…');
        const r = await api.cloneAppUrl(S.dir, res[0]);
        if (!r || !r.ok) { alert(r ? r.error : 'Could not clone web app'); return; }
        const apps = getHubApps(hubContainer);
        apps.push({
          id: r.appName,
          title: r.title,
          icon: r.hasWasm ? '🎮' : '🌐',
          cat: r.hasWasm ? 'WASM App' : 'Web App',
          src: r.relPath,
          desc: 'Cloned from ' + res[0],
        });
        setHubApps(hubContainer, apps, apps.length - 1);
        await refreshFontsAndAssets();
        toast(`✓ Added "${r.title}" to Hub!`);
      };

      const titleInp = $('#insHubTitle', p);
      if (titleInp) {
        titleInp.onchange = (e) => {
          const tEl = hubContainer.querySelector('.hub-title');
          if (tEl) tEl.textContent = e.target.value.trim() || 'App Workbench';
          commit();
        };
      }

      const fullHBtn = $('#insHubFullHeight', p);
      if (fullHBtn) {
        fullHBtn.onclick = () => {
          hubContainer.style.height = '100vh';
          hubContainer.style.minHeight = '640px';
          hubContainer.style.borderRadius = '0';
          commit();
          renderInspector();
          toast('Hub set to Full Screen (100vh)');
        };
      }

      $$('[data-hub-select]', p).forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.dataset.hubSelect, 10);
          setHubApps(hubContainer, getHubApps(hubContainer), idx);
        };
      });
      $$('[data-hub-up]', p).forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.dataset.hubUp, 10);
          const apps = getHubApps(hubContainer);
          if (idx > 0) {
            const tmp = apps[idx - 1];
            apps[idx - 1] = apps[idx];
            apps[idx] = tmp;
            setHubApps(hubContainer, apps, idx - 1);
          }
        };
      });
      $$('[data-hub-down]', p).forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.dataset.hubDown, 10);
          const apps = getHubApps(hubContainer);
          if (idx < apps.length - 1) {
            const tmp = apps[idx + 1];
            apps[idx + 1] = apps[idx];
            apps[idx] = tmp;
            setHubApps(hubContainer, apps, idx + 1);
          }
        };
      });
      $$('[data-hub-del]', p).forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.dataset.hubDel, 10);
          const apps = getHubApps(hubContainer);
          apps.splice(idx, 1);
          setHubApps(hubContainer, apps, Math.max(0, idx - 1));
        };
      });
    }

    const appContainer = S.sel && S.sel.closest ? S.sel.closest('.myhtml-app-embed') : null;
    if (appContainer) {
      const pickBtn = $('#insAppPickBtn', p);
      if (pickBtn) pickBtn.onclick = () => chooseAppForContainer(appContainer, 'folder');

      const pickFileBtn = $('#insAppPickFileBtn', p);
      if (pickFileBtn) pickFileBtn.onclick = () => chooseAppForContainer(appContainer, 'file');

      const hSlider = $('#insAppHSlider', p);
      if (hSlider) {
        hSlider.oninput = (e) => {
          const v = e.target.value;
          const vp = appContainer.querySelector('.myhtml-app-viewport');
          if (vp) vp.style.height = v + 'px';
          const hVal = $('#insAppHVal', p);
          if (hVal) hVal.textContent = v + 'px';
        };
        hSlider.onchange = () => commit();
      }

      const titleInp = $('#insAppTitleInput', p);
      if (titleInp) {
        titleInp.onchange = (e) => {
          const v = e.target.value.trim();
          appContainer.setAttribute('data-app-title', v);
          const t = appContainer.querySelector('.myhtml-app-title');
          if (t) t.textContent = v;
          commit();
        };
      }

      const hdrToggle = $('#insAppHeaderToggle', p);
      if (hdrToggle) {
        hdrToggle.onchange = (e) => {
          const hdr = appContainer.querySelector('.myhtml-app-header');
          if (hdr) hdr.style.display = e.target.checked ? 'flex' : 'none';
          commit();
        };
      }

      const openBtn = $('#insAppOpenBtn', p);
      if (openBtn) {
        const src = appContainer.getAttribute('data-app-src');
        openBtn.onclick = () => {
          if (src) api.openInBrowser(S.dir, src);
        };
      }

      const dirBtn = $('#insAppDirBtn', p);
      if (dirBtn) {
        dirBtn.onclick = () => api.openFolder(S.dir + '/assets/apps');
      }
    }
  }

  /* ---------- code tab ---------- */
  function showElHtml() {
    const t = $('#elHtml');
    if (!t) return;
    t.value = S.sel && S.sel !== doc.body
      ? S.sel.outerHTML.replace(/\s*class="__mh-[^"]*"/g, '').replace(/__mh-[a-z-]+/g, '').trim()
      : '';
    t.disabled = !S.sel;
  }
  $('#elHtmlApply').onclick = () => {
    if (!S.sel || S.sel === doc.body) return;
    const tpl = doc.createElement('template');
    tpl.innerHTML = $('#elHtml').value.trim();
    const n = tpl.content.firstElementChild;
    if (!n) return;
    S.sel.replaceWith(n);
    S.sel = null;
    commit();
    select(n);
    toast('Element updated');
  };
  $('#copyElHtml').onclick = () => {
    const t = $('#elHtml').value;
    if (t) { navigator.clipboard.writeText(t); toast('HTML copied'); }
  };

  /* ---------- metrics tab ---------- */
  function renderComputed() {
    const p = $('#computedStyles');
    if (!p) return;
    if (!S.sel || !doc) {
      p.innerHTML = '<div class="muted small" style="padding:10px;">Select an element to view metrics.</div>';
      return;
    }
    const c = doc.defaultView.getComputedStyle(S.sel);
    const rect = S.sel.getBoundingClientRect();
    const props = [
      ['Size on Screen', `${Math.round(rect.width)} × ${Math.round(rect.height)} px`],
      ['Arrangement', c.display],
      ['Font Family', c.fontFamily.split(',')[0].replace(/'/g, '')],
      ['Font Size', c.fontSize],
      ['Boldness', c.fontWeight],
      ['Line Spacing', c.lineHeight],
      ['Text Color', rgbToHex(c.color) || c.color],
      ['Background', rgbToHex(c.backgroundColor) || c.backgroundColor],
      ['Inside Space (Padding)', `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}`],
      ['Outside Space (Margin)', `${c.marginTop} ${c.marginRight} ${c.marginBottom} ${c.marginLeft}`],
      ['Corner Roundness', c.borderRadius]
    ];

    p.innerHTML = `<table class="computed-table"><tbody>` +
      props.map(([k, v]) => `<tr><td>${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('') +
      `</tbody></table>`;
  }

  /* ---------- generic ask dialog ---------- */
  function ask(title, fields) {
    return new Promise((res) => {
      $('#askTitle').textContent = title;
      $('#askBody').innerHTML = fields.map((f, i) => `<div class="f"><label>${esc(f.label)}<input type="text" data-i="${i}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}"></label></div>`).join('');
      $('#askModal').hidden = false;
      const first = $('#askBody input'); first.focus(); first.select();
      const done = (ok) => {
        $('#askModal').hidden = true;
        $('#askOk').onclick = $('#askCancel').onclick = null;
        res(ok ? $$('#askBody input').map((i) => i.value.trim()) : null);
      };
      $('#askOk').onclick = () => done(true);
      $('#askCancel').onclick = () => done(false);
      $('#askBody').onkeydown = (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
    });
  }

  /* ---------- 1-Click Web Publisher (Any .html File, Any Hub Page, or Whole Site) ---------- */
  let pub = {
    info: null,
    provider: 'github',
    targetMode: 'wholeSite', // 'hubApp' | 'file' | 'singlePage' | 'wholeSite'
    hubApps: [],
    selectedHubSrc: '',
    pickedFile: null, // { filePath, fileName, defaultName }
    selectedPage: '',
    customName: '',
    step: 'ready' // 'ready' | 'connectNetlify' | 'done'
  };

  async function openPublish(initOpts = {}) {
    if (S.dir) await autosave();
    pub.info = await api.publishInfo(S.dir);
    pub.provider = pub.info.hasGithubToken ? 'github' : (pub.info.hasNetlifyToken ? 'netlify' : 'github');

    // Detect if current page has a Multi-App Hub and gather its apps
    const hub = doc && doc.querySelector('.myhtml-app-hub');
    pub.hubApps = hub ? getHubApps(hub) : [];
    const activeHubApp = (initOpts.hubApp) || pub.hubApps.find((a) => a.active) || pub.hubApps[0] || null;
    pub.selectedHubSrc = activeHubApp ? activeHubApp.src : '';

    if (initOpts.pickedFile) {
      pub.pickedFile = initOpts.pickedFile;
      pub.targetMode = 'file';
      pub.customName = initOpts.pickedFile.defaultName || '';
    } else if (initOpts.mode === 'file') {
      pub.targetMode = 'file';
    } else if (initOpts.mode === 'hubApp' && pub.hubApps.length) {
      pub.targetMode = 'hubApp';
      pub.customName = (activeHubApp ? activeHubApp.title : 'my-app').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    } else if (initOpts.mode === 'singlePage' && initOpts.pageName) {
      pub.targetMode = 'singlePage';
      pub.selectedPage = initOpts.pageName;
      pub.customName = initOpts.pageName.replace(/\.html?$/i, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    } else if (pub.hubApps.length) {
      // If user is in the Multi-App Hub, default to publishing their currently highlighted page!
      pub.targetMode = 'hubApp';
      pub.customName = (activeHubApp ? activeHubApp.title : 'my-app').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    } else if (S.dir) {
      pub.targetMode = 'singlePage';
      pub.selectedPage = S.page || 'index.html';
      pub.customName = (S.name || 'my-page').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    } else {
      pub.targetMode = 'file';
    }

    pub.step = (pub.provider === 'netlify' && !pub.info.hasNetlifyToken) ? 'connectNetlify' : 'ready';
    $('#pubModal').hidden = false;
    renderPublish();
  }

  function renderPublish(result) {
    const body = $('#pubBody'), go = $('#pubGo'), i = pub.info || {};
    $('#pubErr').textContent = '';
    $('#pubLog').hidden = true;
    $('#pubLog').textContent = '';
    go.hidden = false;
    go.disabled = false;

    if (pub.step === 'done' && result) {
      body.innerHTML = `
        <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:800;color:#34d399;margin-bottom:6px;">🎉 Your HTML Page is Live on the Internet!</div>

          ${result.url ? `
            <div style="background:var(--panel);border:1.5px solid #10b981;border-radius:9px;padding:12px;margin:10px 0;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                <span style="font-weight:800;font-size:12.5px;color:#f8fafc;">🌍 Official Web Link (Share on Facebook, Twitter & Mobile):</span>
                <span style="background:#10b981;color:#04130d;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;">RECOMMENDED FOR SHARING</span>
              </div>
              <div class="liveurl" style="margin-bottom:8px;font-size:13px;word-break:break-all;color:#34d399;background:var(--bg);padding:7px 10px;border-radius:6px;border:1px solid var(--line);">${esc(result.url)}</div>
              <div class="tools" style="display:flex;gap:7px;">
                <button class="btn primary" id="pubCopyPerm" style="flex:1;background:#10b981;border-color:#10b981;color:#04130d;font-weight:800;">📋 Copy Link for Facebook / Web</button>
                <button class="btn" id="pubOpenPerm">🌍 Open Website</button>
              </div>
              <div class="muted small" style="margin-top:6px;font-size:10.5px;">✓ Fully compatible with Facebook tracking links (<code>fbclid</code>), social previews, and all mobile browsers.</div>
            </div>
          ` : ''}

          ${result.instantUrl ? `
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:8px;padding:10px;margin-top:8px;">
              <div class="muted small" style="margin-bottom:4px;font-weight:600;">⚡ <b>Instant Dev Preview (Quick Local Testing):</b></div>
              <div class="liveurl" style="margin-bottom:6px;font-size:11.5px;color:var(--text);word-break:break-all;">${esc(result.instantUrl)}</div>
              <div class="tools" style="display:flex;gap:6px;">
                <button class="btn small" id="pubOpenInstant">⚡ Open Dev Preview</button>
                <button class="btn small ghost" id="pubCopyInstant">📋 Copy Preview Link</button>
              </div>
              <div class="muted small" style="margin-top:5px;font-size:10px;color:#f59e0b;">⚠ Note: For Facebook posts, always use the Official Web Link above. Facebook's click tracking can break Gist preview URLs.</div>
            </div>
          ` : ''}
        </div>
      `;
      go.hidden = true;
      if ($('#pubOpenInstant')) $('#pubOpenInstant').onclick = () => api.openExternal(result.instantUrl);
      if ($('#pubCopyInstant')) $('#pubCopyInstant').onclick = () => { navigator.clipboard.writeText(result.instantUrl); toast('Dev preview link copied!'); };
      if ($('#pubOpenPerm')) $('#pubOpenPerm').onclick = () => api.openExternal(result.url);
      if ($('#pubCopyPerm')) $('#pubCopyPerm').onclick = () => { navigator.clipboard.writeText(result.url); toast('✓ Copied official Facebook & web link!'); };
      return;
    }

    if (pub.step === 'connectNetlify') {
      body.innerHTML = `
        <p class="muted small">Connect a free <b>Netlify</b> account, or switch back to <b>1-Click GitHub Hosting</b>:</p>
        <ol class="steps small">
          <li>Log in at Netlify and click <b>Get Token</b> below.</li>
          <li>Press <b>New access token</b>, copy it, and paste it below.</li>
        </ol>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button class="btn" id="pubGet">🔑 Get Token (opens Netlify)</button>
          ${i.hasGithubToken ? `<button class="btn primary" id="pubSwitchGh">⚡ Use Instant GitHub Hosting Instead</button>` : ''}
        </div>
        <label>Paste Netlify token<input id="pubToken" type="password" placeholder="Netlify personal access token" spellcheck="false"></label>
      `;
      go.textContent = 'Connect Netlify';
      $('#pubGet').onclick = () => api.openExternal('https://app.netlify.com/user/applications#personal-access-tokens');
      if ($('#pubSwitchGh')) {
        $('#pubSwitchGh').onclick = () => { pub.provider = 'github'; pub.step = 'ready'; renderPublish(); };
      }
      return;
    }

    const cardStyle = (active) =>
      `display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:9px;border:1.5px solid ${active ? '#10b981' : 'var(--line)'};background:${active ? 'rgba(16,185,129,0.11)' : 'var(--card)'};cursor:pointer;margin-bottom:7px;transition:0.12s;`;

    body.innerHTML = `
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:7px;">1. Choose What to Put Online:</div>

        ${pub.hubApps.length ? `
          <div data-pub-mode="hubApp" style="${cardStyle(pub.targetMode === 'hubApp')}">
            <input type="radio" name="pubMode" ${pub.targetMode === 'hubApp' ? 'checked' : ''} style="margin-top:3px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:12.5px;color:var(--text);">🎯 A Single Page / App from Your Multi-App Hub</div>
              <div class="muted small" style="margin-bottom:6px;">Uploads just the selected page/app as its own standalone website:</div>
              <select id="pubHubAppSelect" style="width:100%;padding:6px 8px;border-radius:6px;background:var(--panel);border:1px solid var(--line);font-size:12px;">
                ${pub.hubApps.map((a) => `<option value="${esc(a.src)}" ${a.src === pub.selectedHubSrc ? 'selected' : ''}>${esc(a.icon || '📦')} ${esc(a.title)} (${esc(a.src)})</option>`).join('')}
              </select>
            </div>
          </div>
        ` : ''}

        <div data-pub-mode="file" style="${cardStyle(pub.targetMode === 'file')}">
          <input type="radio" name="pubMode" ${pub.targetMode === 'file' ? 'checked' : ''} style="margin-top:3px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:12.5px;color:var(--text);">📄 Any .html File from a Folder on Your PC</div>
            <div class="muted small" style="margin-bottom:6px;">Pick any <code>.html</code> file sitting in any folder on your computer and put it straight onto the internet:</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn primary small" id="pubBrowseFileBtn" style="padding:5px 10px;">📂 Choose .html File from PC…</button>
              <span class="small" style="font-family:monospace;color:${pub.pickedFile ? '#34d399' : 'var(--muted)'};">
                ${pub.pickedFile ? `✓ ${esc(pub.pickedFile.fileName)} (HTML Web Page)` : 'No file selected yet'}
              </span>
            </div>
            <div style="font-size:10.5px;color:#94a3b8;margin-top:5px;display:flex;align-items:center;gap:5px;">
              <span>🛡️</span> <span><b>Web-Safe Filter:</b> Excludes all non-web files (.cpp, .c, .exe, scripts) automatically.</span>
            </div>
          </div>
        </div>

        ${S.dir ? `
          <div data-pub-mode="singlePage" style="${cardStyle(pub.targetMode === 'singlePage')}">
            <input type="radio" name="pubMode" ${pub.targetMode === 'singlePage' ? 'checked' : ''} style="margin-top:3px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:12.5px;color:var(--text);">📃 Current Open Page (${esc(S.page || 'index.html')})</div>
              <div class="muted small">Publishes the page currently open in the editor.</div>
            </div>
          </div>
          <div data-pub-mode="wholeSite" style="${cardStyle(pub.targetMode === 'wholeSite')}">
            <input type="radio" name="pubMode" ${pub.targetMode === 'wholeSite' ? 'checked' : ''} style="margin-top:3px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:12.5px;color:var(--text);">🌐 Entire Website / Full Multi-App Hub (${esc(S.name)})</div>
              <div class="muted small">Uploads all pages and apps in this project together as one complete website.</div>
            </div>
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom:10px;">
        <label style="margin:0;">2. Webpage Name (optional)
          <div class="path">
            <input id="pubName" type="text" value="${esc(pub.customName)}" placeholder="my-cool-page" spellcheck="false">
            <span class="suffix">${pub.provider === 'github' ? `.github.io` : `.netlify.app`}</span>
          </div>
        </label>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--bg);border:1px solid var(--line);border-radius:8px;font-size:11px;">
        <span>
          ${pub.provider === 'github' && i.hasGithubToken
            ? `⚡ <b>Instant Hosting Ready</b> (Connected to GitHub as <b>${esc(i.githubUser || 'your account')}</b>)`
            : `🌐 Hosting via <b>Netlify</b>`}
        </span>
        <a href="#" id="pubSwitchProvider" style="color:var(--accent);text-decoration:none;font-weight:600;">
          ${pub.provider === 'github' ? 'Switch to Netlify' : 'Switch to GitHub'}
        </a>
      </div>
    `;

    go.textContent = '🚀 Put Online Now';

    $$('[data-pub-mode]', body).forEach((card) => {
      card.onclick = (e) => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
        const m = card.getAttribute('data-pub-mode');
        pub.targetMode = m;
        if (m === 'hubApp') {
          const found = pub.hubApps.find((a) => a.src === pub.selectedHubSrc) || pub.hubApps[0];
          if (found) pub.customName = found.title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        } else if (m === 'file' && pub.pickedFile) {
          pub.customName = pub.pickedFile.defaultName;
        } else if (m === 'singlePage' || m === 'wholeSite') {
          pub.customName = (S.name || 'my-site').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        }
        renderPublish();
      };
    });

    const hubSel = $('#pubHubAppSelect', body);
    if (hubSel) {
      hubSel.onchange = (e) => {
        pub.targetMode = 'hubApp';
        pub.selectedHubSrc = e.target.value;
        const found = pub.hubApps.find((a) => a.src === pub.selectedHubSrc);
        if (found) pub.customName = found.title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        renderPublish();
      };
    }

    const browseBtn = $('#pubBrowseFileBtn', body);
    if (browseBtn) {
      browseBtn.onclick = async (e) => {
        e.stopPropagation();
        const picked = await api.pickHtmlFileForPublish();
        if (picked) {
          pub.pickedFile = picked;
          pub.targetMode = 'file';
          pub.customName = picked.defaultName;
          renderPublish();
        }
      };
    }

    const nameInp = $('#pubName', body);
    if (nameInp) {
      nameInp.oninput = (e) => { pub.customName = e.target.value.trim(); };
    }

    const sw = $('#pubSwitchProvider', body);
    if (sw) {
      sw.onclick = (e) => {
        e.preventDefault();
        if (pub.provider === 'github') {
          pub.provider = 'netlify';
          pub.step = i.hasNetlifyToken ? 'ready' : 'connectNetlify';
        } else {
          pub.provider = 'github';
          pub.step = 'ready';
        }
        renderPublish();
      };
    }
  }

  $('#bPublish').onclick = () => openPublish();
  $('#pubClose').onclick = () => ($('#pubModal').hidden = true);
  api.onPublishProgress((m) => { const l = $('#pubLog'); l.hidden = false; l.textContent += m + '\n'; l.scrollTop = l.scrollHeight; });
  $('#pubGo').onclick = async () => {
    const go = $('#pubGo'), err = $('#pubErr');
    err.textContent = '';
    go.disabled = true;
    try {
      if (pub.step === 'connectNetlify') {
        go.textContent = 'Checking…';
        await api.publishSetToken($('#pubToken').value);
        pub.info = await api.publishInfo(S.dir);
        pub.provider = 'netlify';
        pub.step = 'ready';
        renderPublish();
      } else {
        if (pub.targetMode === 'file' && !pub.pickedFile) {
          const picked = await api.pickHtmlFileForPublish();
          if (!picked) {
            go.disabled = false;
            return;
          }
          pub.pickedFile = picked;
          if (!pub.customName) pub.customName = picked.defaultName;
        }
        go.textContent = '⏳ Uploading to the internet…';
        const nameEl = $('#pubName');
        const nameVal = nameEl ? nameEl.value.trim() : pub.customName;
        const r = await api.publishRun(S.dir, {
          provider: pub.provider,
          mode: pub.targetMode,
          projectDir: S.dir,
          filePath: pub.pickedFile ? pub.pickedFile.filePath : null,
          appRelPath: pub.selectedHubSrc || null,
          pageName: pub.selectedPage || S.page || 'index.html',
          name: nameVal
        });
        pub.step = 'done';
        renderPublish(r);
      }
    } catch (e) {
      err.textContent = cleanErr(e);
      go.disabled = false;
      go.textContent = pub.step === 'connectNetlify' ? 'Connect Netlify' : '🚀 Put Online Now';
    }
  };

  /* ---------- Community Templates Hub & Fresh Website Generator ---------- */
  let ctCatalog = null;
  let lastRollMeta = null;
  const ctState = {
    tab: 'curated',
    curatedCat: 'All',
    curatedSearch: '',
    neoSort: 'special_sauce',
    neoTag: '',
    ghFilter: 'verified',
    ghQuery: '',
    wasmFilter: 'curated',
    wasmQuery: '',
    remixArch: '',
    remixFont: '',
    remixPal: ''
  };

  async function ensureCatalog() {
    if (!ctCatalog) {
      ctCatalog = await api.getTemplateCatalog();
    }
    return ctCatalog;
  }

  async function rollFreshSite(opts = {}) {
    await autosave();
    const res = await api.rollFreshTemplate(opts);
    if (!res) return;
    lastRollMeta = res.meta;
    await enter(res);
    const bar = $('#remixBar');
    if (bar && res.meta) {
      bar.hidden = false;
      $('#remixBadge').textContent = res.meta.badge || 'FRESH TEMPLATE';
      $('#remixTitle').textContent = res.meta.archetypeName || 'Surprise Studio';
      $('#remixMeta').textContent = `· Fonts: ${res.meta.fontPairName} · Palette: ${res.meta.paletteName}`;
    }
    toast(`🎲 Rolled: ${res.meta.archetypeName} (${res.meta.fontPairName})`);
  }

  async function bungItemIntoMultiAppHub(item) {
    if (!item) return;
    const statusEl = $('#ctStatusText');
    if (statusEl) statusEl.textContent = `⏳ Bunging "${item.title}" into your Multi-App Hub…`;
    toast(`⏳ Downloading "${item.title}" into your Multi-App Hub…`);
    try {
      await autosave();
      // Always open the standalone Multi-App Hub if not already inside it so apps never blend into another template!
      if (!S.dir || !doc || !doc.querySelector('.myhtml-app-hub')) {
        await openStandaloneAppHub();
      }
      let res = null;
      if (item.wasm4Slug) {
        res = await api.importWasm4Cart({
          projectDir: S.dir,
          cartSlug: item.wasm4Slug,
          cartTitle: item.title
        });
      } else {
        res = await api.cloneAppUrl({
          projectDir: S.dir,
          url: item.url,
          customTitle: item.title
        });
      }
      if (res && res.success) {
        $('#communityModal').hidden = true;
        addAppObjectToPageOrHub(res);
        refreshFontsAndAssets();
        toast(`⚡ Bunged "${res.title}" into your Multi-App Hub!`);
      }
    } catch (e) {
      const msg = cleanErr(e);
      if (statusEl) statusEl.textContent = `⚠ Error: ${msg}`;
      toast(`Could not bung app: ${msg}`);
    }
  }

  async function cloneCommunitySite(item) {
    if (!item || !item.url) return;
    // WASM-4 binary cartridges run best inside the Multi-App Hub with the offline WASM-4 runtime
    if (item.wasm4Slug) {
      return bungItemIntoMultiAppHub(item);
    }
    const statusEl = $('#ctStatusText');
    if (statusEl) statusEl.textContent = `⏳ Fast-cloning "${item.title}" (${item.url}) — grabbing HTML, CSS, images & WASM/JS…`;
    toast(`⏳ Cloning "${item.title}" from ${item.source || 'web'}…`);
    try {
      await autosave();
      const res = await api.cloneCommunityTemplate({
        url: item.url,
        title: item.title,
        slug: item.slug || item.id
      });
      if (res) {
        $('#communityModal').hidden = true;
        const bar = $('#remixBar');
        if (bar) {
          bar.hidden = false;
          $('#remixBadge').textContent = (item.source || 'COMMUNITY').toUpperCase();
          $('#remixTitle').textContent = item.title;
          $('#remixMeta').textContent = `· Cloned from ${item.url}`;
        }
        await enter(res);
        toast(`✓ Opened "${item.title}" (${S.fonts.length} fonts ready in Aa Fonts!)`);
      }
    } catch (e) {
      const msg = cleanErr(e);
      if (statusEl) statusEl.textContent = `⚠ Error: ${msg}`;
      alert(`Could not clone ${item.url}:\n${msg}`);
    }
  }

  async function rollRandomLiveTemplate() {
    const cat = await ensureCatalog();
    if (!cat || !cat.curated || !cat.curated.length) return;
    const picked = cat.curated[Math.floor(Math.random() * cat.curated.length)];
    await cloneCommunitySite(picked);
  }

  /* ---------- Universal Font Swap, Color Swap, Vibe Stealer & Full Page Mode ---------- */
  let curFontIdx = -1;
  let curPalIdx = -1;
  let curVibeIdx = -1;

  const DEFAULT_VIBES = [
    { name: 'Cyberpunk 2077 Yellow & Cyan', bg: '#fcee0a', surf: '#111111', surf2: '#1d1d22', text: '#00f0ff', muted: '#fcee0a', acc: '#ff003c', accText: '#ffffff', border: '#00f0ff', head: 'Chakra Petch', body: 'Rajdhani', mono: 'Share Tech Mono', gurl: 'Chakra+Petch:wght@700&family=Rajdhani:wght@600;700&family=Share+Tech+Mono' },
    { name: 'ASOS Editorial Monochrome', bg: '#ffffff', surf: '#f8f8f8', surf2: '#eeeeee', text: '#2d2d2d', muted: '#666666', acc: '#008849', accText: '#ffffff', border: '#dddddd', head: 'Syne', body: 'DM Sans', mono: 'JetBrains Mono', gurl: 'Syne:wght@700;800&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400' },
    { name: 'Teenage Engineering Industrial', bg: '#e5e3dc', surf: '#f4f2ec', surf2: '#d5d2c8', text: '#161616', muted: '#5c5a54', acc: '#ff4f00', accText: '#ffffff', border: '#b8b5ab', head: 'Space Grotesk', body: 'IBM Plex Sans', mono: 'IBM Plex Mono', gurl: 'Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;600' },
    { name: 'Matrix Terminal Phosphor', bg: '#050805', surf: '#0a120a', surf2: '#112211', text: '#4ade80', muted: '#16a34a', acc: '#22c55e', accText: '#030703', border: '#15803d', head: 'VT323', body: 'Space Mono', mono: 'Space Mono', gurl: 'VT323&family=Space+Mono:wght@400;700' }
  ];

  function getSavedVibes() {
    try {
      const raw = JSON.parse(localStorage.getItem('myhtml-stolen-vibes') || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch {}
    return DEFAULT_VIBES;
  }

  function saveVibesList(list) {
    localStorage.setItem('myhtml-stolen-vibes', JSON.stringify(list));
  }

  let activeFontOverride = null;
  let activePalOverride = null;

  function buildFontOverrideCss(fnt) {
    const h = fnt.head || 'sans-serif';
    const b = fnt.body || h;
    const m = fnt.mono || 'monospace';
    return `
      :root {
        --font-head: '${h}', system-ui, sans-serif !important;
        --font-body: '${b}', system-ui, sans-serif !important;
        --font-mono: '${m}', monospace !important;
      }
      html, body, p, li, td, th, label, input, select, textarea, button, a, div, section, article, main, aside, nav, header, footer, span:not(.fa):not(.icon) {
        font-family: '${b}', system-ui, sans-serif !important;
      }
      h1, h2, h3, h4, h5, h6, strong, .logo, .brand b, header b, .title, .zine-giant, .stat-chip b, .myhtml-hub-title, .myhtml-hub-active-title {
        font-family: '${h}', system-ui, sans-serif !important;
      }
      code, pre, .mono, .mono-sm, .badge, .tag, .pill, .kicker, .ticker, .myhtml-hub-count {
        font-family: '${m}', monospace !important;
      }
    `;
  }

  function buildPalOverrideCss(pal) {
    return `
      :root {
        --bg: ${pal.bg} !important;
        --surf: ${pal.surf} !important;
        --surf2: ${pal.surf2 || pal.surf} !important;
        --text: ${pal.text} !important;
        --muted: ${pal.muted} !important;
        --acc: ${pal.acc} !important;
        --acc-text: ${pal.accText || '#000000'} !important;
        --border: ${pal.border || pal.muted} !important;
      }
      html, body, #wrapper, #page-wrapper, main, #app, #root, .app, .myhtml-app-hub, .myhtml-hub-stage, .myhtml-hub-grid {
        background-color: ${pal.bg} !important;
        background: ${pal.bg} !important;
        color: ${pal.text} !important;
      }
      header, nav, footer, section, article, aside, .card, .side-card, .table-card, .hero-compact, .box, .panel, .inner, .container, .wrapper, .spotlights > section, .features section, .zine-banner, .myhtml-hub-topbar, .myhtml-hub-sidebar, .myhtml-hub-stagebar, .myhtml-hub-card, fieldset, form, table {
        background-color: ${pal.surf} !important;
        background: ${pal.surf} !important;
        color: ${pal.text} !important;
        border-color: ${pal.border || pal.muted} !important;
      }
      th, tr:nth-child(even), .ticker, .calc-box, .stat-chip, .tag, input, select, textarea, .myhtml-hub-search {
        background-color: ${pal.surf2 || pal.surf} !important;
        color: ${pal.text} !important;
        border-color: ${pal.border || pal.muted} !important;
      }
      h1, h2, h3, h4, h5, h6, b, strong, th, label, legend, .myhtml-hub-title, .myhtml-hub-active-title, .myhtml-hub-item, a:not(.btn):not(.button):not(.acc) {
        color: ${pal.text} !important;
      }
      p, small, .muted, .sub, td, li, span {
        color: ${pal.muted} !important;
      }
      button, .btn, .button, input[type="button"], input[type="submit"], .myhtml-hub-item.active {
        background-color: ${pal.acc} !important;
        background: ${pal.acc} !important;
        color: ${pal.accText || '#000000'} !important;
        border-color: ${pal.acc} !important;
      }
      .badge, .pill, .stat-chip b, .calc-res, .myhtml-hub-count {
        color: ${pal.acc} !important;
      }
    `;
  }

  function injectOverridesIntoTargetDoc(targetDoc) {
    if (!targetDoc || !targetDoc.head) return;
    const gfontLink = doc && doc.getElementById('__mh_gfont_override');
    const fontStyle = doc && doc.getElementById('__mh_font_override');
    const palStyle = doc && doc.getElementById('__mh_pal_override');

    const gHref = (activeFontOverride && activeFontOverride.gurl)
      ? `https://fonts.googleapis.com/css2?family=${activeFontOverride.gurl}&display=swap`
      : (gfontLink ? gfontLink.getAttribute('href') : '');
    const fCss = activeFontOverride ? buildFontOverrideCss(activeFontOverride) : (fontStyle ? fontStyle.textContent : '');
    const pCss = activePalOverride ? buildPalOverrideCss(activePalOverride) : (palStyle ? palStyle.textContent : '');

    if (gHref) {
      let l = targetDoc.getElementById('__mh_gfont_override');
      if (!l) {
        l = targetDoc.createElement('link');
        l.id = '__mh_gfont_override';
        l.rel = 'stylesheet';
        targetDoc.head.appendChild(l);
      }
      l.href = gHref;
    }
    if (fCss) {
      let s = targetDoc.getElementById('__mh_font_override');
      if (!s) {
        s = targetDoc.createElement('style');
        s.id = '__mh_font_override';
        targetDoc.head.appendChild(s);
      }
      s.textContent = fCss;
    }
    if (pCss) {
      let p = targetDoc.getElementById('__mh_pal_override');
      if (!p) {
        p = targetDoc.createElement('style');
        p.id = '__mh_pal_override';
        targetDoc.head.appendChild(p);
      }
      p.textContent = pCss;
    }
  }

  function syncOverridesToNestedAppFrames(reset = false) {
    if (!doc) return;
    const subFrames = [...doc.querySelectorAll('iframe.myhtml-hub-frame, iframe.myhtml-app-frame')];
    for (const sf of subFrames) {
      try {
        const subDoc = sf.contentDocument;
        if (!subDoc || !subDoc.head) continue;
        if (reset) {
          ['__mh_font_override', '__mh_gfont_override', '__mh_pal_override'].forEach((id) => {
            const el = subDoc.getElementById(id);
            if (el) el.remove();
          });
        } else {
          injectOverridesIntoTargetDoc(subDoc);
        }
      } catch {}
    }

    // Also persist to the .html app files on disk so reloads and separate browser windows keep the Fonts & Colors!
    if (S.dir && api.styleProjectApps) {
      const gfontLink = doc.getElementById('__mh_gfont_override');
      const fontStyle = doc.getElementById('__mh_font_override');
      const palStyle = doc.getElementById('__mh_pal_override');
      api.styleProjectApps(S.dir, {
        gfontUrl: gfontLink ? gfontLink.getAttribute('href') : '',
        fontCss: fontStyle ? fontStyle.textContent : '',
        palCss: palStyle ? palStyle.textContent : '',
        reset
      });
    }
  }

  function bindNestedAppFrames() {
    if (!doc) return;
    const subFrames = [...doc.querySelectorAll('iframe.myhtml-hub-frame, iframe.myhtml-app-frame')];
    for (const sf of subFrames) {
      if (!sf.dataset.mhStyleBound) {
        sf.dataset.mhStyleBound = '1';
        sf.addEventListener('load', () => {
          try {
            if (sf.contentDocument) injectOverridesIntoTargetDoc(sf.contentDocument);
          } catch {}
        });
      }
      try {
        if (sf.contentDocument) injectOverridesIntoTargetDoc(sf.contentDocument);
      } catch {}
    }
  }

  function applyFontPairToAnyPage(fnt) {
    if (!doc || !fnt) return;
    activeFontOverride = fnt;
    if (fnt.gurl) {
      let link = doc.getElementById('__mh_gfont_override');
      if (!link) {
        link = doc.createElement('link');
        link.id = '__mh_gfont_override';
        link.rel = 'stylesheet';
        doc.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${fnt.gurl}&display=swap`;
    }
    let st = doc.getElementById('__mh_font_override');
    if (!st) {
      st = doc.createElement('style');
      st.id = '__mh_font_override';
      doc.head.appendChild(st);
    }
    const h = fnt.head || 'sans-serif';
    const b = fnt.body || h;
    st.textContent = buildFontOverrideCss(fnt);
    syncOverridesToNestedAppFrames(false);
    if (lastRollMeta) lastRollMeta.fontPairId = fnt.id;
    const metaEl = $('#remixMeta');
    if (metaEl) metaEl.textContent = `· Fonts: ${fnt.name || (h + ' + ' + b)}`;
    if (!S.live) commit();
    else if (S.dir && S.page) api.writePage(S.dir, S.page, serialize()).then(() => refreshFontsAndAssets());
  }

  function applyPaletteToAnyPage(pal) {
    if (!doc || !pal) return;
    activePalOverride = pal;
    let st = doc.getElementById('__mh_pal_override');
    if (!st) {
      st = doc.createElement('style');
      st.id = '__mh_pal_override';
      doc.head.appendChild(st);
    }
    st.textContent = buildPalOverrideCss(pal);
    syncOverridesToNestedAppFrames(false);
    if (lastRollMeta) lastRollMeta.paletteId = pal.id;
    const metaEl = $('#remixMeta');
    if (metaEl) metaEl.textContent = `· Colors: ${pal.name}`;
    if (!S.live) commit();
    else if (S.dir && S.page) api.writePage(S.dir, S.page, serialize());
  }

  async function swapFontsOnCurrentPage() {
    const cat = await ensureCatalog();
    if (!cat || !cat.fonts.length) return;
    curFontIdx = (curFontIdx + 1) % cat.fonts.length;
    const fnt = cat.fonts[curFontIdx];
    applyFontPairToAnyPage(fnt);
    toast(`🔤 Applied Fonts to Page & Hub Apps: ${fnt.name}`);
  }

  async function swapColorsOnCurrentPage() {
    const cat = await ensureCatalog();
    if (!cat || !cat.palettes.length) return;
    curPalIdx = (curPalIdx + 1) % cat.palettes.length;
    const pal = cat.palettes[curPalIdx];
    applyPaletteToAnyPage(pal);
    toast(`🎨 Applied Colors to Page & Hub Apps: ${pal.name}`);
  }

  function resetOriginalLookOnCurrentPage() {
    if (!doc) return;
    activeFontOverride = null;
    activePalOverride = null;
    ['__mh_font_override', '__mh_gfont_override', '__mh_pal_override'].forEach((id) => {
      const el = doc.getElementById(id);
      if (el) el.remove();
    });
    syncOverridesToNestedAppFrames(true);
    if (!S.live) commit();
    else if (S.dir && S.page) api.writePage(S.dir, S.page, serialize());
    toast('↺ Restored original page & Hub app fonts & colors');
  }

  function stealCurrentSiteVibe() {
    if (!doc || !doc.body) return;
    const win = doc.defaultView;
    const bComp = win.getComputedStyle(doc.body);
    const bg = rgbToHex(bComp.backgroundColor) || '#0f172a';
    const text = rgbToHex(bComp.color) || '#f8fafc';

    const surfEl = doc.querySelector('header, section, article, .card, .inner, nav, aside') || doc.body;
    const sComp = win.getComputedStyle(surfEl);
    const surf = rgbToHex(sComp.backgroundColor) || bg;
    const border = rgbToHex(sComp.borderColor) || '#334155';

    const pEl = doc.querySelector('p, small, td, li') || doc.body;
    const muted = rgbToHex(win.getComputedStyle(pEl).color) || text;

    const accEl = doc.querySelector('button.acc, .btn.acc, .button.primary, button, a.btn, .badge, h1') || doc.body;
    const aComp = win.getComputedStyle(accEl);
    const acc = rgbToHex(aComp.backgroundColor) || rgbToHex(aComp.color) || '#6366f1';
    const accText = rgbToHex(aComp.color) || '#ffffff';

    const hEl = doc.querySelector('h1, h2, h3') || doc.body;
    const headFont = win.getComputedStyle(hEl).fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Space Grotesk';
    const bodyFont = bComp.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Inter';

    const vibeName = `Stolen from ${S.name || doc.title || 'Site'}`;
    const newVibe = {
      name: vibeName,
      bg,
      surf,
      surf2: surf,
      text,
      muted,
      acc,
      accText: accText === acc ? bg : accText,
      border,
      head: headFont,
      body: bodyFont,
      mono: 'JetBrains Mono',
      gurl: `${encodeURIComponent(headFont)}:wght@600;800&family=${encodeURIComponent(bodyFont)}:wght@400;600`
    };

    const list = getSavedVibes().filter((v) => v.name !== vibeName);
    list.unshift(newVibe);
    saveVibesList(list.slice(0, 20));
    curVibeIdx = 0;
    playEditorSynthTone('bell');
    toast(`🪄 Stole Vibe "${vibeName}" (${headFont} + ${bg} / ${acc})! Open any site & click "✨ Apply Stolen Vibe".`);
  }

  function applyNextStolenVibe() {
    if (!doc) return;
    const vibes = getSavedVibes();
    if (!vibes.length) return;
    curVibeIdx = (curVibeIdx + 1) % vibes.length;
    const v = vibes[curVibeIdx];
    applyPaletteToAnyPage(v);
    applyFontPairToAnyPage(v);
    const metaEl = $('#remixMeta');
    if (metaEl) metaEl.textContent = `· 🪄 Vibe: ${v.name} (${v.head} + ${v.body})`;
    playEditorSynthTone('pad');
    toast(`🪄 Applied Vibe: ${v.name}`);
  }

  function toggleFullPageMode(force) {
    const isNow = force !== undefined ? !!force : !document.body.classList.contains('fullpage-mode');
    document.body.classList.toggle('fullpage-mode', isNow);
    const hud = $('#fullpageHud');
    if (hud) hud.hidden = !isNow;
    if (isNow) {
      if (!S.live) {
        S.live = true;
        $('#bPreview').classList.add('on');
        $('#bPreview').textContent = '✎ Edit Page';
        renderHtml(serialize(), true);
      }
      toast('🖥 Full Page Mode — Press Esc or click "✎ Back to Editor" in bottom-right to exit');
    } else {
      if (S.live) {
        S.live = false;
        $('#bPreview').classList.remove('on');
        $('#bPreview').textContent = '▶ Test App';
        renderHtml(S.hist[S.hi] || serialize(), false);
      }
      toast('✎ Returned to Visual Editor');
    }
  }

  // Bind Topbar, Welcome, Remix Bar & Full Page HUD buttons
  if ($('#bRollSite')) $('#bRollSite').onclick = () => rollFreshSite();
  if ($('#wRollFresh')) $('#wRollFresh').onclick = () => rollFreshSite();
  if ($('#bCommunity')) $('#bCommunity').onclick = () => openCommunityHub();
  if ($('#wOpenCommunity')) $('#wOpenCommunity').onclick = () => openCommunityHub();
  if ($('#bWasmApps')) $('#bWasmApps').onclick = () => openCommunityHub('wasm');
  if ($('#wOpenWasmApps')) $('#wOpenWasmApps').onclick = () => openCommunityHub('wasm');
  if ($('#bFullPage')) $('#bFullPage').onclick = () => toggleFullPageMode();
  if ($('#remixFullPageBtn')) $('#remixFullPageBtn').onclick = () => toggleFullPageMode(true);

  if ($('#fpExitBtn')) $('#fpExitBtn').onclick = () => toggleFullPageMode(false);
  if ($('#fpFontBtn')) $('#fpFontBtn').onclick = () => swapFontsOnCurrentPage();
  if ($('#fpColorBtn')) $('#fpColorBtn').onclick = () => swapColorsOnCurrentPage();
  if ($('#fpVibeBtn')) $('#fpVibeBtn').onclick = () => applyNextStolenVibe();
  if ($('#fpRollBtn')) $('#fpRollBtn').onclick = () => rollFreshSite();
  if ($('#fpOsFsBtn')) $('#fpOsFsBtn').onclick = () => api.fullscreen();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      toggleFullPageMode();
    } else if (e.key === 'Escape' && document.body.classList.contains('fullpage-mode')) {
      e.preventDefault();
      toggleFullPageMode(false);
    }
  });

  if ($('#remixRollBtn')) $('#remixRollBtn').onclick = () => rollFreshSite();
  if ($('#remixArchBtn')) $('#remixArchBtn').onclick = async () => {
    const cat = await ensureCatalog();
    if (!cat || !cat.archetypes.length) return;
    const curIdx = cat.archetypes.findIndex((a) => a.id === (lastRollMeta && lastRollMeta.archetypeId));
    const next = cat.archetypes[(curIdx + 1) % cat.archetypes.length];
    await rollFreshSite({
      archetypeId: next.id,
      paletteId: lastRollMeta && lastRollMeta.paletteId,
      fontPairId: lastRollMeta && lastRollMeta.fontPairId
    });
  };
  if ($('#remixFontBtn')) $('#remixFontBtn').onclick = () => swapFontsOnCurrentPage();
  if ($('#remixPalBtn')) $('#remixPalBtn').onclick = () => swapColorsOnCurrentPage();
  if ($('#remixStealVibeBtn')) $('#remixStealVibeBtn').onclick = () => stealCurrentSiteVibe();
  if ($('#remixApplyVibeBtn')) $('#remixApplyVibeBtn').onclick = () => applyNextStolenVibe();
  if ($('#remixResetBtn')) $('#remixResetBtn').onclick = () => resetOriginalLookOnCurrentPage();
  if ($('#remixCloseBtn')) $('#remixCloseBtn').onclick = () => ($('#remixBar').hidden = true);

  async function openCommunityHub(initialTab) {
    await ensureCatalog();
    if (initialTab) ctState.tab = initialTab;
    $('#communityModal').hidden = false;
    updateGhTokenButton();
    renderCommunityHub();
  }

  function updateGhTokenButton() {
    const btn = $('#ctGhTokenBtn');
    if (!btn || !ctCatalog) return;
    btn.textContent = ctCatalog.hasGithubToken ? '🔑 GitHub API: Connected ✓' : '🔑 GitHub API Key (Optional)';
  }

  if ($('#ctCloseBtn')) $('#ctCloseBtn').onclick = () => ($('#communityModal').hidden = true);
  if ($('#ctRandomLiveBtn')) $('#ctRandomLiveBtn').onclick = () => rollRandomLiveTemplate();
  if ($('#ctGhTokenBtn')) {
    $('#ctGhTokenBtn').onclick = async () => {
      await ensureCatalog();
      const res = await ask('Connect GitHub Personal Access Token (Optional)', [
        {
          label: 'Paste a free GitHub Token (unlocks 5,000 community searches/hr — leave blank to disconnect)',
          value: '',
          placeholder: 'ghp_... or github_pat_...'
        }
      ]);
      if (res === null) return;
      const r = await api.setGithubToken(res[0]);
      ctCatalog.hasGithubToken = r.hasGithubToken;
      updateGhTokenButton();
      toast(r.hasGithubToken ? '✓ GitHub API Token saved!' : 'GitHub API Token cleared');
      if (ctState.tab === 'github') renderCommunityHub();
    };
  }

  $$('#ctTabs .ct-tab').forEach((b) => {
    b.onclick = () => {
      ctState.tab = b.dataset.ctTab;
      $$('#ctTabs .ct-tab').forEach((x) => x.classList.toggle('on', x === b));
      renderCommunityHub();
    };
  });

  function renderTemplateCards(items, bodyEl, isWasmTab = false, headerBannerHtml = '') {
    if (!items || !items.length) {
      bodyEl.innerHTML = headerBannerHtml + `<div style="padding:40px;text-align:center;" class="muted">No items matched that filter. Try another category or search term!</div>`;
      return;
    }
    bodyEl.innerHTML = headerBannerHtml + `<div class="ct-grid">` + items.map((item, idx) => {
      const isCart = !!item.wasm4Slug;
      return `
      <div class="ct-card">
        <div class="ct-thumb">
          <img src="${esc(item.thumb)}" alt="${esc(item.title)}" loading="lazy" onerror="this.style.display='none'">
          <span class="ct-source-badge">${esc(item.source || 'Community')}</span>
          <span class="ct-cat-badge">${esc(item.cat || 'HTML5')}</span>
        </div>
        <div class="ct-card-info">
          <div>
            <div class="ct-card-title">
              <span>${esc(item.title)}</span>
              ${item.stars ? `<span class="badge">★ ${item.stars}</span>` : item.views ? `<span class="badge">👁 ${esc(item.views)}</span>` : ''}
            </div>
            <div class="ct-card-desc" style="margin-top:4px;">${esc(item.desc || '')}</div>
          </div>
          <div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
              ${(item.tags || []).slice(0, 4).map((t) => `<span style="font-size:9.5px;padding:1px 5px;border-radius:4px;background:var(--card);border:1px solid var(--line);color:var(--muted);">#${esc(t)}</span>`).join('')}
            </div>
            <div class="ct-card-actions" style="display:flex;gap:5px;flex-wrap:wrap;">
              ${isWasmTab
                ? `<button class="btn primary" data-ct-hub="${idx}" style="flex:1;justify-content:center;background:#10b981;border-color:#10b981;color:#050b14;font-weight:800;" title="Download &amp; bung this app straight into your Multi-App Hub">🧰 + Bung in Hub</button>
                   ${!isCart ? `<button class="btn" data-ct-clone="${idx}" title="Open as a standalone website project">⚡ Open Site</button>` : ''}`
                : `<button class="btn primary" data-ct-clone="${idx}" style="flex:1;justify-content:center;">⚡ Clone &amp; Edit</button>
                   <button class="btn" data-ct-hub="${idx}" title="Bung this live page/app into your Multi-App Hub">🧰 + Hub</button>`
              }
              <button class="btn" data-ct-preview="${idx}" title="Open live site in browser">👁</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('') + `</div>`;

    $$('[data-ct-clone]', bodyEl).forEach((btn) => {
      btn.onclick = () => {
        const item = items[parseInt(btn.dataset.ctClone, 10)];
        cloneCommunitySite(item);
      };
    });
    $$('[data-ct-hub]', bodyEl).forEach((btn) => {
      btn.onclick = () => {
        const item = items[parseInt(btn.dataset.ctHub, 10)];
        bungItemIntoMultiAppHub(item);
      };
    });
    $$('[data-ct-preview]', bodyEl).forEach((btn) => {
      btn.onclick = () => {
        const item = items[parseInt(btn.dataset.ctPreview, 10)];
        if (item && item.url) api.openExternal(item.url);
      };
    });
  }

  async function renderCommunityHub() {
    const cat = await ensureCatalog();
    const pillsEl = $('#ctPills');
    const searchWrap = $('#ctSearchWrap');
    const searchInp = $('#ctSearchInput');
    const searchBtn = $('#ctSearchBtn');
    const bodyEl = $('#ctBody');
    const statusEl = $('#ctStatusText');

    $$('#ctTabs .ct-tab').forEach((x) => x.classList.toggle('on', x.dataset.ctTab === ctState.tab));

    if (ctState.tab === 'curated') {
      searchWrap.hidden = false;
      searchInp.placeholder = 'Filter 66 free templates (e.g. dark, blog, grid, shop)…';
      searchInp.value = ctState.curatedSearch;

      const cats = ['All', 'Dark & Sci-Fi', 'Portfolio & Zine', 'Blog & Editorial', 'Minimal & One-Page', 'Small Business', 'Dashboard & Shop', 'HTML5 UP', 'StartBootstrap'];
      pillsEl.innerHTML = cats.map((c) => `<button class="ct-pill ${ctState.curatedCat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
      $$('.ct-pill', pillsEl).forEach((b) => {
        b.onclick = () => { ctState.curatedCat = b.dataset.c; renderCommunityHub(); };
      });

      const doFilter = () => {
        ctState.curatedSearch = searchInp.value.trim().toLowerCase();
        const filtered = (cat.curated || []).filter((item) => {
          if (ctState.curatedCat === 'HTML5 UP' && item.source !== 'HTML5 UP') return false;
          if (ctState.curatedCat === 'StartBootstrap' && item.source !== 'StartBootstrap') return false;
          if (ctState.curatedCat !== 'All' && ctState.curatedCat !== 'HTML5 UP' && ctState.curatedCat !== 'StartBootstrap' && item.cat !== ctState.curatedCat) return false;
          if (ctState.curatedSearch) {
            const hay = `${item.title} ${item.desc} ${item.cat} ${item.source} ${(item.tags || []).join(' ')}`.toLowerCase();
            if (!hay.includes(ctState.curatedSearch)) return false;
          }
          return true;
        });
        statusEl.textContent = `Showing ${filtered.length} verified free HTML5 templates — click "⚡ Clone & Edit" to open any site in MyHTML`;
        renderTemplateCards(filtered, bodyEl, false);
      };

      searchBtn.onclick = doFilter;
      searchInp.oninput = doFilter;
      searchInp.onkeydown = (e) => { if (e.key === 'Enter') doFilter(); };
      doFilter();
    } else if (ctState.tab === 'wasm') {
      searchWrap.hidden = false;
      searchInp.placeholder = 'Search WASM apps, Rust/C++ tools, emulators, synths, or 151 WASM-4 .wasm cartridges…';
      searchInp.value = ctState.wasmQuery;

      const wasmPills = [
        { k: 'curated', label: '⭐ Top Verified WASM & HTML5 Apps (22)' },
        { k: 'wasm4', label: '🕹️ All 151 WASM-4 .wasm Cartridges' },
        { k: 'rustwasm', label: '🦀 Rust + C++ WebAssembly Demos' },
        { k: 'emulators', label: '🖥️ Emulators & Virtual Hardware' },
        { k: 'synths', label: '🎹 Audio Synths & Trackers' },
        { k: 'webgl', label: '🌊 WebGL & Physics Shaders' }
      ];
      pillsEl.innerHTML = wasmPills.map((p) => `<button class="ct-pill ${!ctState.wasmQuery && ctState.wasmFilter === p.k ? 'on' : ''}" data-wf="${esc(p.k)}">${esc(p.label)}</button>`).join('');

      const wasmExplainer = `
        <div style="margin-bottom:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(245,158,11,0.13),rgba(16,185,129,0.11));border:1px solid rgba(245,158,11,0.35);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div style="font-size:12px;line-height:1.5;color:var(--text);">
            <b style="color:#fbbf24;">⚡ What is WASM (WebAssembly)?</b> It's a binary <code>.wasm</code> engine that lets real desktop apps, C++/Rust programs, Xbox ISO tools (like <b>extract-xiso</b>), synthesizers, and retro game cartridges run <b>inside a normal .html page</b> at native speed — zero installs or <code>.exe</code> files needed!
          </div>
          <span style="font-size:11px;font-family:monospace;background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.35);padding:4px 9px;border-radius:6px;white-space:nowrap;">Click "🧰 + Bung in Hub" on any app!</span>
        </div>`;

      const loadWasm = async () => {
        bodyEl.innerHTML = wasmExplainer + `<div style="padding:40px;text-align:center;" class="muted">⚡ Loading verified WebAssembly (.wasm) apps &amp; cartridges…</div>`;
        statusEl.textContent = `Fetching verified WebAssembly & HTML5 apps…`;
        try {
          const r = await api.searchWasmApps({ query: ctState.wasmQuery, filter: ctState.wasmFilter });
          statusEl.textContent = `Showing ${r.sites.length} live WebAssembly (.wasm) & HTML5 apps — click "🧰 + Bung in Hub" to add any app to your Multi-App Hub`;
          renderTemplateCards(r.sites, bodyEl, true, wasmExplainer);
        } catch (e) {
          bodyEl.innerHTML = wasmExplainer + `<div style="padding:40px;text-align:center;color:#f87171;">${esc(cleanErr(e))}</div>`;
        }
      };

      $$('.ct-pill', pillsEl).forEach((b) => {
        b.onclick = () => {
          ctState.wasmFilter = b.dataset.wf;
          ctState.wasmQuery = '';
          searchInp.value = '';
          renderCommunityHub();
        };
      });

      searchInp.oninput = null;
      searchBtn.onclick = () => { ctState.wasmQuery = searchInp.value.trim(); renderCommunityHub(); };
      searchInp.onkeydown = (e) => { if (e.key === 'Enter') { ctState.wasmQuery = searchInp.value.trim(); renderCommunityHub(); } };
      await loadWasm();
    } else if (ctState.tab === 'neocities') {
      searchWrap.hidden = false;
      searchInp.placeholder = 'Type any Neocities tag (e.g. retro, games, cyberpunk, music, pixel, zine)…';
      searchInp.value = ctState.neoTag;

      const neoPills = [
        { k: 'sort:special_sauce', label: '✨ Special Sauce' },
        { k: 'sort:random', label: '🎲 Random Indie Sites!' },
        { k: 'sort:views', label: '🔥 Most Viewed' },
        { k: 'sort:last_updated', label: '🆕 Recently Updated' },
        { k: 'tag:retro', label: '#retro' },
        { k: 'tag:games', label: '#games' },
        { k: 'tag:computers', label: '#computers' },
        { k: 'tag:cyberpunk', label: '#cyberpunk' },
        { k: 'tag:music', label: '#music' },
        { k: 'tag:pixel', label: '#pixel' },
        { k: 'tag:art', label: '#art' },
        { k: 'tag:zine', label: '#zine' },
        { k: 'tag:shrine', label: '#shrine' }
      ];
      pillsEl.innerHTML = neoPills.map((p) => {
        const isOn = p.k.startsWith('sort:') ? (!ctState.neoTag && ctState.neoSort === p.k.slice(5)) : (ctState.neoTag === p.k.slice(4));
        return `<button class="ct-pill ${isOn ? 'on' : ''}" data-np="${esc(p.k)}">${esc(p.label)}</button>`;
      }).join('');

      const loadNeo = async () => {
        bodyEl.innerHTML = `<div style="padding:40px;text-align:center;" class="muted">📡 Fetching live handmade community websites from Neocities.org…</div>`;
        statusEl.textContent = `Connecting to Neocities Indie Web directory…`;
        try {
          const r = await api.fetchNeocities({ sort: ctState.neoSort, tag: ctState.neoTag });
          statusEl.textContent = `Loaded ${r.sites.length} live indie websites from Neocities — click "⚡ Clone & Edit" to inspect their HTML bones & fonts!`;
          renderTemplateCards(r.sites, bodyEl, false);
        } catch (e) {
          bodyEl.innerHTML = `<div style="padding:40px;text-align:center;color:#f87171;">Could not load Neocities directory: ${esc(cleanErr(e))}</div>`;
        }
      };

      $$('.ct-pill', pillsEl).forEach((b) => {
        b.onclick = () => {
          const v = b.dataset.np;
          if (v.startsWith('sort:')) {
            ctState.neoSort = v.slice(5);
            ctState.neoTag = '';
            searchInp.value = '';
          } else {
            ctState.neoTag = v.slice(4);
            searchInp.value = ctState.neoTag;
          }
          renderCommunityHub();
        };
      });

      searchInp.oninput = null;
      searchBtn.onclick = () => { ctState.neoTag = searchInp.value.trim(); renderCommunityHub(); };
      searchInp.onkeydown = (e) => { if (e.key === 'Enter') { ctState.neoTag = searchInp.value.trim(); renderCommunityHub(); } };
      await loadNeo();
    } else if (ctState.tab === 'github') {
      searchWrap.hidden = false;
      searchInp.placeholder = 'Search verified GitHub HTML websites (filters out README docs & broken 404s)…';
      searchInp.value = ctState.ghQuery;

      const ghPills = [
        { k: 'verified', label: '⭐ Verified Instant Picks (12)' },
        { k: 'trending', label: '🔥 Trending HTML Templates' },
        { k: 'retro', label: '🕹️ Retro OS & Brutalist UI' },
        { k: 'portfolio', label: '🎨 Portfolios & Personal' },
        { k: 'tools', label: '🛠️ Calculators & Web Apps' },
        { k: 'games', label: '🎮 HTML5 Canvas Games' },
        { k: 'landing', label: '🚀 Clean Landing Pages' }
      ];
      pillsEl.innerHTML = ghPills.map((p) => `<button class="ct-pill ${!ctState.ghQuery && ctState.ghFilter === p.k ? 'on' : ''}" data-gf="${esc(p.k)}">${esc(p.label)}</button>`).join('');

      const loadGh = async () => {
        bodyEl.innerHTML = `<div style="padding:40px;text-align:center;" class="muted">🐙 Verifying live GitHub Pages HTML websites (filtering out README docs &amp; dead links)…</div>`;
        statusEl.textContent = `Verifying live GitHub Pages HTML websites…`;
        try {
          const r = await api.searchGithubTemplates({ query: ctState.ghQuery, filter: ctState.ghFilter });
          statusEl.textContent = `Showing ${r.sites.length} live-verified GitHub HTML templates (all README dumps & 404s filtered out)`;
          renderTemplateCards(r.sites, bodyEl, false);
        } catch (e) {
          bodyEl.innerHTML = `<div style="padding:40px;text-align:center;color:#f87171;">${esc(cleanErr(e))}<br><br><button class="btn" onclick="document.getElementById('ctGhTokenBtn').click()">🔑 Connect Free GitHub Token (Optional)</button></div>`;
        }
      };

      $$('.ct-pill', pillsEl).forEach((b) => {
        b.onclick = () => {
          ctState.ghFilter = b.dataset.gf;
          ctState.ghQuery = '';
          searchInp.value = '';
          renderCommunityHub();
        };
      });

      searchInp.oninput = null;
      searchBtn.onclick = () => { ctState.ghQuery = searchInp.value.trim(); renderCommunityHub(); };
      searchInp.onkeydown = (e) => { if (e.key === 'Enter') { ctState.ghQuery = searchInp.value.trim(); renderCommunityHub(); } };
      await loadGh();
    } else if (ctState.tab === 'remix') {
      searchWrap.hidden = true;
      pillsEl.innerHTML = `<span class="muted small">Mix &amp; match any compact layout structure, Google Font pairing, and color theme — or roll a random combination!</span>`;

      const archs = cat.archetypes || [];
      const fonts = cat.fonts || [];
      const pals = cat.palettes || [];

      if (!ctState.remixArch && archs.length) ctState.remixArch = archs[0].id;
      if (!ctState.remixFont && fonts.length) ctState.remixFont = fonts[0].id;
      if (!ctState.remixPal && pals.length) ctState.remixPal = pals[0].id;

      bodyEl.innerHTML = `
        <div style="max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:16px;">
          <div style="background:linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.14));border:1px solid rgba(99,102,241,0.35);border-radius:12px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
            <div>
              <h3 style="margin:0 0 4px;font-size:16px;">🎲 Instant Procedural Website Studio</h3>
              <p class="muted small" style="margin:0;">Generates compact, button-rich websites with real Google Fonts and clean HTML boxes ready to inspect.</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn juice" id="ctSurpriseRollBtn" style="padding:8px 16px;font-size:13px;">🎲 Roll Total Surprise Site</button>
              <button class="btn primary" id="ctCustomBuildBtn" style="padding:8px 16px;font-size:13px;">⚡ Open Selected Combination</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:14px;">
            <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;">
              <div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--accent);">1. Choose Website Structure (${archs.length})</div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                ${archs.map((a) => `
                  <button class="btn" data-rm-arch="${esc(a.id)}" style="justify-content:space-between;text-align:left;padding:7px 10px;${ctState.remixArch === a.id ? 'border-color:var(--accent);background:var(--hover);' : ''}">
                    <span>${esc(a.name)}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;">
              <div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--accent);">2. Choose Google Font Pairing (${fonts.length})</div>
              <div style="display:flex;flex-direction:column;gap:5px;max-height:310px;overflow-y:auto;padding-right:4px;">
                ${fonts.map((f) => `
                  <button class="btn" data-rm-font="${esc(f.id)}" style="justify-content:space-between;text-align:left;padding:6px 10px;${ctState.remixFont === f.id ? 'border-color:var(--accent);background:var(--hover);' : ''}">
                    <span>🔤 ${esc(f.name)}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;">
              <div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--accent);">3. Choose Color Palette (${pals.length})</div>
              <div style="display:flex;flex-direction:column;gap:5px;max-height:310px;overflow-y:auto;padding-right:4px;">
                ${pals.map((p) => `
                  <button class="btn" data-rm-pal="${esc(p.id)}" style="justify-content:flex-start;gap:8px;text-align:left;padding:6px 10px;${ctState.remixPal === p.id ? 'border-color:var(--accent);background:var(--hover);' : ''}">
                    <span style="display:inline-flex;gap:2px;shrink:0;">
                      <span style="width:12px;height:12px;border-radius:3px;background:${p.bg};border:1px solid #555;"></span>
                      <span style="width:12px;height:12px;border-radius:3px;background:${p.acc};"></span>
                    </span>
                    <span style="overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      $$('[data-rm-arch]', bodyEl).forEach((b) => (b.onclick = () => { ctState.remixArch = b.dataset.rmArch; renderCommunityHub(); }));
      $$('[data-rm-font]', bodyEl).forEach((b) => (b.onclick = () => { ctState.remixFont = b.dataset.rmFont; renderCommunityHub(); }));
      $$('[data-rm-pal]', bodyEl).forEach((b) => (b.onclick = () => { ctState.remixPal = b.dataset.rmPal; renderCommunityHub(); }));

      $('#ctSurpriseRollBtn', bodyEl).onclick = async () => {
        $('#communityModal').hidden = true;
        await rollFreshSite();
      };
      $('#ctCustomBuildBtn', bodyEl).onclick = async () => {
        $('#communityModal').hidden = true;
        await rollFreshSite({
          archetypeId: ctState.remixArch,
          fontPairId: ctState.remixFont,
          paletteId: ctState.remixPal
        });
      };
    }
  }

  /* ---------- Instant .html Mini-App Studio (Unexpected Bonus!) ---------- */
  const HTML_MINI_APP_PRESETS = {
    synth: {
      title: 'Retro Synth & Drum Pad',
      icon: '🎹',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Retro Synth & Drum Pad</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:24px;background:#0b0f19;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:18px;}
  .panel{background:#131b2e;border:1px solid #2dd4bf;border-radius:14px;padding:20px;width:100%;max-width:680px;box-shadow:0 16px 40px rgba(0,0,0,0.4);}
  h2{margin:0 0 6px;font-size:20px;color:#2dd4bf;}
  p{margin:0 0 16px;font-size:13px;color:#94a3b8;}
  .pads{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
  .pad{padding:22px 10px;border-radius:10px;border:2px solid #334155;background:#1e293b;color:#fff;font-weight:700;font-size:14px;cursor:pointer;transition:.1s;}
  .pad:active,.pad.on{background:#2dd4bf;color:#042f2e;border-color:#fff;transform:scale(0.97);}
  .controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;}
  select,input{background:#0b0f19;color:#fff;border:1px solid #334155;padding:6px 10px;border-radius:6px;}
</style>
</head>
<body>
  <div class="panel">
    <h2>🎹 Polyphonic WebAudio Synth &amp; Chiptune Pad</h2>
    <p>Click any pad or press keys 1–8 on your keyboard to play live synthesizer notes.</p>
    <div class="controls" style="margin-bottom:14px;">
      <label>Waveform: <select id="wave"><option value="sawtooth">Sawtooth (Lead)</option><option value="square">Square (NES Chiptune)</option><option value="triangle">Triangle (Warm Flute)</option><option value="sine">Sine (Sub Bass)</option></select></label>
      <label>Release: <input id="rel" type="range" min="0.1" max="1.5" step="0.1" value="0.5"></label>
    </div>
    <div class="pads" id="pads"></div>
  </div>
<script>
  const notes = [
    { name: 'C4 (1)', f: 261.63 }, { name: 'D4 (2)', f: 293.66 }, { name: 'E4 (3)', f: 329.63 }, { name: 'G4 (4)', f: 392.00 },
    { name: 'A4 (5)', f: 440.00 }, { name: 'C5 (6)', f: 523.25 }, { name: 'D5 (7)', f: 587.33 }, { name: 'E5 (8)', f: 659.25 }
  ];
  let ctx = null;
  function play(freq, btn) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = document.getElementById('wave').value;
    osc.frequency.value = freq;
    const dur = parseFloat(document.getElementById('rel').value) || 0.5;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
    if (btn) { btn.classList.add('on'); setTimeout(() => btn.classList.remove('on'), 140); }
  }
  const wrap = document.getElementById('pads');
  const btns = notes.map((n) => {
    const b = document.createElement('button');
    b.className = 'pad'; b.textContent = n.name;
    b.onclick = () => play(n.f, b);
    wrap.appendChild(b);
    return b;
  });
  window.addEventListener('keydown', (e) => {
    const idx = parseInt(e.key, 10) - 1;
    if (idx >= 0 && idx < notes.length) play(notes[idx].f, btns[idx]);
  });
</script>
</body>
</html>`
    },
    notes: {
      title: 'Sticky Notes & Scratchpad',
      icon: '📝',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sticky Notes & Scratchpad</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:24px;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;}
  .wrap{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}
  .top{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#1e293b;padding:14px 18px;border-radius:12px;border:1px solid #334155;}
  h2{margin:0;font-size:18px;}
  textarea{width:100%;height:340px;background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;resize:vertical;}
  button{background:#6366f1;color:#fff;border:0;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h2>📝 Auto-Saving Scratchpad &amp; Notes</h2>
      <div style="display:flex;gap:8px;">
        <button id="dl">⬇ Export .txt</button>
        <button id="clr" style="background:#ef4444;">Clear</button>
      </div>
    </div>
    <textarea id="pad" placeholder="Type notes, game codes, ideas, or snippets here — automatically saved in local storage!"></textarea>
  </div>
<script>
  const pad = document.getElementById('pad');
  pad.value = localStorage.getItem('myhtml_scratchpad_v1') || '# Quick Scratchpad\\n\\n- Everything typed here saves automatically!';
  pad.oninput = () => localStorage.setItem('myhtml_scratchpad_v1', pad.value);
  document.getElementById('clr').onclick = () => { if(confirm('Clear notes?')){ pad.value=''; localStorage.removeItem('myhtml_scratchpad_v1'); } };
  document.getElementById('dl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([pad.value], {type:'text/plain'}));
    a.download = 'notes.txt'; a.click();
  };
</script>
</body>
</html>`
    },
    pixel: {
      title: '16×16 Pixel Art Maker',
      icon: '🎨',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>16x16 Pixel Art Maker</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#090d16;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:14px;}
  .bar{display:flex;gap:10px;align-items:center;background:#1e293b;padding:10px 16px;border-radius:10px;border:1px solid #334155;}
  .grid{display:grid;grid-template-columns:repeat(16,22px);grid-template-rows:repeat(16,22px);gap:1px;background:#334155;border:2px solid #475569;}
  .cell{background:#0f172a;cursor:crosshair;}
  button{background:#4f46e5;color:#fff;border:0;padding:6px 12px;border-radius:6px;font-weight:600;cursor:pointer;}
</style>
</head>
<body>
  <div class="bar">
    <strong>🎨 16×16 Sprite Studio</strong>
    <input type="color" id="col" value="#38bdf8">
    <button id="clear">Clear</button>
    <button id="export">⬇ Export PNG</button>
  </div>
  <div class="grid" id="grid"></div>
<script>
  const g = document.getElementById('grid'), col = document.getElementById('col');
  let down = false;
  window.onmousedown = () => down = true;
  window.onmouseup = () => down = false;
  const cells = [];
  for(let i=0;i<256;i++){
    const c = document.createElement('div');
    c.className = 'cell';
    c.onmousedown = () => c.style.background = col.value;
    c.onmouseenter = () => { if(down) c.style.background = col.value; };
    g.appendChild(c); cells.push(c);
  }
  document.getElementById('clear').onclick = () => cells.forEach(c => c.style.background = '#0f172a');
  document.getElementById('export').onclick = () => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    cells.forEach((c, i) => {
      ctx.fillStyle = c.style.background || '#0f172a';
      ctx.fillRect((i%16)*16, Math.floor(i/16)*16, 16, 16);
    });
    const a = document.createElement('a'); a.download = 'sprite.png'; a.href = cv.toDataURL(); a.click();
  };
</script>
</body>
</html>`
    },
    pomodoro: {
      title: 'Focus & Task Timer',
      icon: '⏱️',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Focus & Task Timer</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:30px;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;justify-content:center;}
  .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;width:100%;max-width:440px;text-align:center;}
  .time{font-size:64px;font-weight:800;font-family:monospace;margin:16px 0;color:#38bdf8;}
  .btns{display:flex;gap:8px;justify-content:center;}
  button{background:#4f46e5;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;}
</style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0;">⏱️ Focus Sprint Timer</h2>
    <div class="time" id="t">25:00</div>
    <div class="btns">
      <button id="go">▶ Start / Pause</button>
      <button id="rst" style="background:#334155;">↺ Reset 25m</button>
      <button id="brk" style="background:#10b981;">☕ 5m Break</button>
    </div>
  </div>
<script>
  let sec = 1500, tmr = null;
  const el = document.getElementById('t');
  function fmt(){ el.textContent = String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0'); }
  document.getElementById('go').onclick = () => {
    if(tmr){ clearInterval(tmr); tmr = null; }
    else tmr = setInterval(() => { if(sec>0){ sec--; fmt(); } else { clearInterval(tmr); tmr=null; } }, 1000);
  };
  document.getElementById('rst').onclick = () => { clearInterval(tmr); tmr=null; sec=1500; fmt(); };
  document.getElementById('brk').onclick = () => { clearInterval(tmr); tmr=null; sec=300; fmt(); };
</script>
</body>
</html>`
    },
    passgen: {
      title: 'Password & Key Generator',
      icon: '🔐',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Password & Key Generator</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:30px;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;justify-content:center;}
  .card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px;width:100%;max-width:520px;}
  .out{background:#090d16;border:1px solid #334155;padding:14px;border-radius:8px;font-family:monospace;font-size:18px;color:#34d399;word-break:break-all;margin:14px 0;}
  button{background:#4f46e5;color:#fff;border:0;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer;}
</style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0 0 8px;">🔐 High-Entropy Key &amp; Password Generator</h2>
    <label>Length: <input type="number" id="len" value="24" min="8" max="64" style="background:#090d16;color:#fff;border:1px solid #334155;padding:4px 8px;border-radius:6px;width:70px;"></label>
    <div class="out" id="out"></div>
    <div style="display:flex;gap:8px;">
      <button id="gen">🎲 Roll New Key</button>
      <button id="cpy" style="background:#10b981;">📋 Copy</button>
    </div>
  </div>
<script>
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
  function roll(){
    const n = Math.max(8, Math.min(64, +document.getElementById('len').value || 24));
    const arr = new Uint32Array(n); crypto.getRandomValues(arr);
    document.getElementById('out').textContent = Array.from(arr, x => chars[x % chars.length]).join('');
  }
  document.getElementById('gen').onclick = roll;
  document.getElementById('cpy').onclick = () => navigator.clipboard.writeText(document.getElementById('out').textContent);
  roll();
</script>
</body>
</html>`
    },
    blank: {
      title: 'My Custom HTML App',
      icon: '🚀',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My Custom HTML App</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:28px;background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;max-width:640px;margin:0 auto;}
  button{background:#6366f1;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;}
</style>
</head>
<body>
  <div class="card">
    <h1>🚀 Custom .html Mini-App</h1>
    <p>Paste any HTML, CSS, or JavaScript tool here and click Save!</p>
    <button onclick="this.textContent='✓ Working Live!'">Click Me</button>
  </div>
</body>
</html>`
    }
  };

  let studioTargetHub = null;
  let studioEditingSlug = '';

  async function openHtmlAppStudioModal(hub, editApp = null) {
    studioTargetHub = hub || (doc && doc.querySelector('.myhtml-app-hub'));
    studioEditingSlug = '';
    const modal = $('#htmlAppStudioModal');
    if (!modal) return;

    if (editApp && editApp.src) {
      $('#hasTitle').textContent = `✎ Edit .html App: ${editApp.title}`;
      $('#hasAppName').value = editApp.title || 'Web App';
      $('#hasAppIcon').value = editApp.icon || '📦';
      const parts = editApp.src.split('/');
      const appIdx = parts.indexOf('apps');
      if (appIdx >= 0 && parts[appIdx + 1]) studioEditingSlug = parts[appIdx + 1];
      const raw = await api.readAppCode(S.dir, editApp.src);
      $('#hasAppCode').value = raw || HTML_MINI_APP_PRESETS.blank.html;
    } else {
      const p = HTML_MINI_APP_PRESETS.synth;
      $('#hasTitle').textContent = '✨ Instant .html Mini-App Studio';
      $('#hasAppName').value = p.title;
      $('#hasAppIcon').value = p.icon;
      $('#hasAppCode').value = p.html;
    }
    modal.hidden = false;
  }

  $$('#hasPresetBar [data-preset]').forEach((btn) => {
    btn.onclick = () => {
      const p = HTML_MINI_APP_PRESETS[btn.dataset.preset];
      if (!p) return;
      studioEditingSlug = '';
      $('#hasAppName').value = p.title;
      $('#hasAppIcon').value = p.icon;
      $('#hasAppCode').value = p.html;
      toast(`⚡ Loaded "${p.title}" template — click Save & Open in Hub!`);
    };
  });

  if ($('#hasCloseBtn')) $('#hasCloseBtn').onclick = () => ($('#htmlAppStudioModal').hidden = true);
  if ($('#hasCancelBtn')) $('#hasCancelBtn').onclick = () => ($('#htmlAppStudioModal').hidden = true);
  if ($('#hasSaveBtn')) {
    $('#hasSaveBtn').onclick = async () => {
      if (!S.dir) return;
      const title = $('#hasAppName').value.trim() || 'Custom HTML App';
      const icon = $('#hasAppIcon').value.trim() || '🚀';
      const html = $('#hasAppCode').value;
      if (!html.trim()) { toast('Please enter some HTML code'); return; }
      const saved = await api.saveCustomApp(S.dir, {
        title,
        slug: studioEditingSlug || '',
        html,
        icon
      });
      if (!saved || !saved.success) { toast('Could not save app'); return; }
      $('#htmlAppStudioModal').hidden = true;

      const hub = studioTargetHub || (doc && doc.querySelector('.myhtml-app-hub'));
      if (hub) {
        unmarkRemovedFromHub(hub, saved.relPath);
        const existing = getHubApps(hub);
        let idx = existing.findIndex((x) => x.src === saved.relPath);
        const entry = { title: saved.title, src: saved.relPath, icon: saved.icon || icon };
        if (idx >= 0) existing[idx] = entry;
        else { existing.push(entry); idx = existing.length - 1; }
        setHubApps(hub, existing, idx, true);
        const fr = hub.querySelector('.myhtml-hub-frame');
        if (fr) {
          fr.setAttribute('src', saved.relPath);
          try { if (fr.contentWindow) fr.contentWindow.location.reload(); } catch {}
        }
      } else {
        addAppObjectToPageOrHub(saved);
      }
      refreshFontsAndAssets();
      toast(`✨ Saved "${saved.title}" into your Multi-App Hub!`);
    };
  }

  /* ---------- Instant .html Drag & Drop Quick-Launcher (Unexpected Bonus!) ---------- */
  function handleExternalHtmlFileDrop(e) {
    const files = [...(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])];
    const htmlFiles = files.filter((f) => /\.html?$/i.test(f.name || ''));
    if (!htmlFiles.length) {
      if (files.length) {
        e.preventDefault();
        e.stopPropagation();
        const nonHtmlName = files[0].name || 'file';
        toast(`⚠ "${nonHtmlName}" is not an HTML file. MyHTML only opens and publishes .html web pages.`);
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const first = htmlFiles[0];
    const filePath = (api.getPathForFile && api.getPathForFile(first)) || first.path || '';
    if (!filePath) return;
    const allPaths = htmlFiles.map((f) => (api.getPathForFile && api.getPathForFile(f)) || f.path || '').filter(Boolean);
    const defaultName = first.name.replace(/\.html?$/i, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-page';

    let bar = document.getElementById('htmlDropActionBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'htmlDropActionBar';
      bar.style.cssText = 'position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;border:2px solid #10b981;border-radius:14px;padding:14px 18px;box-shadow:0 24px 60px rgba(0,0,0,0.75);display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:94vw;';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">📄</span>
        <div>
          <div style="font-weight:800;font-size:13px;color:#f8fafc;">Dropped: ${esc(htmlFiles.length > 1 ? `${htmlFiles.length} .html files (${first.name}…)` : first.name)}</div>
          <div style="font-size:11px;color:#94a3b8;">What would you like to do with this .html file?</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button type="button" id="dropActPublish" class="btn" style="background:#10b981;border-color:#10b981;color:#04130d;font-weight:800;">🚀 Put Online Now</button>
        <button type="button" id="dropActOpen" class="btn primary" style="font-weight:700;">📄 Open &amp; Edit Full Screen</button>
        <button type="button" id="dropActHub" class="btn" style="background:rgba(16,185,129,0.14);border-color:rgba(16,185,129,0.4);color:#34d399;font-weight:700;">🧰 Bung in Multi-App Hub</button>
        <button type="button" id="dropActClose" class="btn ghost small">✕</button>
      </div>
    `;
    bar.hidden = false;

    $('#dropActClose', bar).onclick = () => { bar.hidden = true; };
    $('#dropActPublish', bar).onclick = () => {
      bar.hidden = true;
      openPublish({
        mode: 'file',
        pickedFile: {
          filePath,
          fileName: first.name,
          defaultName
        }
      });
    };
    $('#dropActOpen', bar).onclick = async () => {
      bar.hidden = true;
      await autosave();
      const p = await api.openHtmlFile(filePath);
      if (p) {
        await enter(p);
        toast(`📄 Opened ${p.name}.html`);
      }
    };
    $('#dropActHub', bar).onclick = async () => {
      bar.hidden = true;
      await autosave();
      if (!S.dir || !doc || !doc.querySelector('.myhtml-app-hub')) {
        await openStandaloneAppHub();
      }
      const res = await api.importAppFile(S.dir, allPaths);
      const hub = doc && doc.querySelector('.myhtml-app-hub');
      if (res && res.success && hub) {
        const incoming = res.apps && res.apps.length ? res.apps : [res];
        const existing = getHubApps(hub);
        let activeIdx = existing.length;
        for (const item of incoming) {
          unmarkRemovedFromHub(hub, item.relPath);
          const foundIdx = existing.findIndex((x) => x.src === item.relPath);
          const entry = { title: item.title, src: item.relPath, icon: item.icon || '📄' };
          if (foundIdx >= 0) { existing[foundIdx] = entry; activeIdx = foundIdx; }
          else { existing.push(entry); activeIdx = existing.length - 1; }
        }
        setHubApps(hub, existing, activeIdx, true);
        refreshFontsAndAssets();
        toast(`🧰 Bunged ${incoming.length} .html file${incoming.length === 1 ? '' : 's'} into your Multi-App Hub!`);
      }
    };
  }

  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer && e.dataTransfer.types && [...e.dataTransfer.types].includes('Files')) {
      e.preventDefault();
    }
  });
  window.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleExternalHtmlFileDrop(e);
    }
  });

  /* ---------- start app ---------- */
  initWelcome();
  window.addEventListener('beforeunload', () => { if (doc && S.dir && S.page) api.writePage(S.dir, S.page, serialize()); });
})();
