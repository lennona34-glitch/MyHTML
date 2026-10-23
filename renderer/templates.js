// Block library + starter templates + interactive mini-apps. Works in both Node and browser.
(function (root) {
  const ph = (w, h, label, c1 = '#c7d2fe', c2 = '#a5b4fc') =>
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="#fff" font-family="Segoe UI,Arial" font-size="${Math.round(h / 10)}" text-anchor="middle" dominant-baseline="middle" opacity=".85">${label}</text></svg>`);

  const SEC = 'padding:64px 6%;';
  const WRAP = 'max-width:1100px;margin:0 auto;';
  const BTN = 'display:inline-block;padding:12px 26px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;';

  const APP_HUB_HTML = `<div class="myhtml-app-hub" data-app-hub="1" style="background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.35);margin:18px auto;max-width:1360px;height:85vh;min-height:620px;display:flex;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif;">
  <div class="myhtml-hub-topbar" style="background:#090d16;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #1e293b;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:18px;">🧰</span>
      <strong class="myhtml-hub-title" style="font-size:15px;color:#ffffff;letter-spacing:0.2px;">All-in-One App Hub</strong>
      <span class="myhtml-hub-count" style="background:rgba(99,102,241,0.2);color:#818cf8;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">4 Apps</span>
    </div>
    <div style="flex:1;max-width:280px;min-width:160px;">
      <input type="text" class="myhtml-hub-search" placeholder="🔍 Filter apps in hub…" style="width:100%;background:#1e293b;border:1px solid #334155;color:#f8fafc;padding:6px 11px;border-radius:8px;font-size:12px;outline:none;">
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <button type="button" class="myhtml-hub-view-btn" data-hub-view="dock" style="background:#334155;color:#fff;border:0;border-radius:6px;padding:6px 10px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Sidebar Dock + Single Screen">▤ Dock View</button>
      <button type="button" class="myhtml-hub-view-btn" data-hub-view="grid" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Show all apps as a launcher grid">▦ All Apps Grid</button>
      <button type="button" class="myhtml-hub-btn-add" style="background:#4f46e5;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Add a Web App folder (like XISO dist)">📂 + App Folder</button>
      <button type="button" class="myhtml-hub-btn-bulk" style="background:#7c3aed;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Bung a whole folder of 10 or 30 apps into this hub at once">📚 + Bulk Folder</button>
      <button type="button" class="myhtml-hub-btn-file" style="background:#2563eb;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Add standalone .html app files">📄 + .html File</button>
      <button type="button" class="myhtml-hub-btn-wasm" style="background:#059669;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Browse 150+ free WebAssembly (.wasm) & HTML5 apps to bung into this Hub!">⚡ + Free WASM Apps</button>
      <button type="button" class="myhtml-hub-btn-create" style="background:#ec4899;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;" title="Create a brand-new standalone .html app or paste HTML code right into the Hub!">✨ + New .html App</button>
      <button type="button" class="myhtml-app-btn-test" style="background:#10b981;color:#ffffff;border:0;border-radius:6px;padding:6px 11px;font-size:11.5px;font-weight:700;cursor:pointer;" title="Run and switch between apps live">▶ Test Live</button>
    </div>
  </div>
  <div class="myhtml-hub-body" style="flex:1;display:flex;min-height:0;position:relative;overflow:hidden;">
    <aside class="myhtml-hub-sidebar" style="width:230px;background:#0b1120;border-right:1px solid #1e293b;display:flex;flex-direction:column;min-height:0;flex-shrink:0;">
      <div style="padding:10px 12px 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;display:flex;justify-content:space-between;align-items:center;">
        <span>Installed Apps</span>
        <span>Click to switch</span>
      </div>
      <div class="myhtml-hub-nav" style="flex:1;overflow-y:auto;padding:6px 8px;display:flex;flex-direction:column;gap:4px;">
        <button type="button" class="myhtml-hub-item active" data-app-src="assets/apps/xiso-tool/index.html" data-app-title="XISO Tool" data-app-icon="💿" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid #4f46e5;background:rgba(79,70,229,0.22);color:#ffffff;font-size:12.5px;font-weight:600;cursor:pointer;">
          <span style="font-size:15px;">💿</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">XISO Tool</span>
        </button>
        <button type="button" class="myhtml-hub-item" data-app-src="assets/apps/wasm-studio/index.html" data-app-title="WASM Fractal &amp; Binary Studio" data-app-icon="⚡" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid transparent;background:transparent;color:#cbd5e1;font-size:12.5px;font-weight:500;cursor:pointer;">
          <span style="font-size:15px;">⚡</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">WASM Fractal &amp; Binary Studio</span>
        </button>
        <button type="button" class="myhtml-hub-item" data-app-src="assets/apps/hex-inspector/index.html" data-app-title="Hex &amp; Binary Inspector" data-app-icon="🔬" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid transparent;background:transparent;color:#cbd5e1;font-size:12.5px;font-weight:500;cursor:pointer;">
          <span style="font-size:15px;">🔬</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">Hex &amp; Binary Inspector</span>
        </button>
        <button type="button" class="myhtml-hub-item" data-app-src="assets/apps/storage-calc/index.html" data-app-title="Drive &amp; ISO Size Calculator" data-app-icon="💾" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid transparent;background:transparent;color:#cbd5e1;font-size:12.5px;font-weight:500;cursor:pointer;">
          <span style="font-size:15px;">💾</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">Drive &amp; ISO Size Calculator</span>
        </button>
        <button type="button" class="myhtml-hub-item" data-app-src="assets/apps/image-resizer/index.html" data-app-title="Cover Art &amp; Image Resizer" data-app-icon="🖼️" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:8px;border:1px solid transparent;background:transparent;color:#cbd5e1;font-size:12.5px;font-weight:500;cursor:pointer;">
          <span style="font-size:15px;">🖼️</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">Cover Art &amp; Image Resizer</span>
        </button>
      </div>
    </aside>
    <div class="myhtml-hub-stage" style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;position:relative;background:#0f172a;">
      <div class="myhtml-hub-stagebar" style="background:#1e293b;padding:6px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;font-size:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#10b981;font-size:10px;">● ACTIVE SCREEN</span>
          <strong class="myhtml-hub-active-title" style="color:#f8fafc;">💿 XISO Tool</strong>
          <span class="myhtml-hub-wasm-badge" style="background:rgba(16,185,129,0.18);color:#34d399;border:1px solid rgba(16,185,129,0.4);padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700;font-family:monospace;">⚡ WASM NATIVE</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="myhtml-hub-edit-app" style="background:#334155;color:#e2e8f0;border:0;border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;" title="View or edit the HTML code of this active app">✎ Edit App .html</button>
          <button type="button" class="myhtml-hub-reload" style="background:#334155;color:#e2e8f0;border:0;border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;">↻ Reload App</button>
          <button type="button" class="myhtml-hub-remove-app" style="background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid rgba(239,68,68,0.35);border-radius:5px;padding:3px 9px;font-size:11px;cursor:pointer;" title="Remove this app from the Hub">✕ Remove</button>
          <a href="assets/apps/xiso-tool/index.html" target="_blank" class="myhtml-hub-pop myhtml-app-btn-pop" style="color:#94a3b8;text-decoration:none;font-size:11.5px;padding:2px 6px;">↗ Open Separate</a>
        </div>
      </div>
      <iframe class="myhtml-hub-frame" src="assets/apps/xiso-tool/index.html" style="flex:1;width:100%;height:100%;border:0;background:#ffffff;display:block;" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
      <div class="myhtml-hub-grid" style="display:none;position:absolute;inset:0;background:#0f172a;padding:24px;overflow-y:auto;z-index:5;">
        <div style="max-width:1000px;margin:0 auto;">
          <h3 style="margin:0 0 6px;font-size:18px;color:#fff;">▦ All Apps &amp; Utilities Launcher</h3>
          <p style="margin:0 0 18px;font-size:13px;color:#94a3b8;">Click any tool below to open it right inside this single screen space.</p>
          <div class="myhtml-hub-grid-items" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;"></div>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function(){
      document.querySelectorAll('.myhtml-app-hub').forEach(function(hub){
        if(hub.dataset.hubBound) return;
        hub.dataset.hubBound = '1';
        var nav = hub.querySelector('.myhtml-hub-nav');
        var frame = hub.querySelector('.myhtml-hub-frame');
        var activeTitle = hub.querySelector('.myhtml-hub-active-title');
        var pop = hub.querySelector('.myhtml-hub-pop');
        var gridWrap = hub.querySelector('.myhtml-hub-grid');
        var gridItems = hub.querySelector('.myhtml-hub-grid-items');
        var search = hub.querySelector('.myhtml-hub-search');
        var countEl = hub.querySelector('.myhtml-hub-count');

        function selectApp(btn){
          if(!btn) return;
          var src = btn.getAttribute('data-app-src');
          var title = btn.getAttribute('data-app-title') || btn.textContent.trim();
          var icon = btn.getAttribute('data-app-icon') || '📦';
          hub.querySelectorAll('.myhtml-hub-item').forEach(function(b){
            var on = b === btn;
            b.classList.toggle('active', on);
            b.style.border = on ? '1px solid #4f46e5' : '1px solid transparent';
            b.style.background = on ? 'rgba(79,70,229,0.22)' : 'transparent';
            b.style.color = on ? '#ffffff' : '#cbd5e1';
            b.style.fontWeight = on ? '600' : '500';
          });
          if(frame && src) frame.src = src;
          if(activeTitle) activeTitle.textContent = icon + ' ' + title;
          if(pop && src) pop.href = src;
          setView('dock');
        }

        function buildGrid(){
          if(!gridItems || !nav) return;
          var items = Array.from(nav.querySelectorAll('.myhtml-hub-item'));
          if(countEl) countEl.textContent = items.length + (items.length === 1 ? ' App' : ' Apps');
          gridItems.innerHTML = '';
          items.forEach(function(btn){
            if(btn.style.display === 'none') return;
            var icon = btn.getAttribute('data-app-icon') || '📦';
            var title = btn.getAttribute('data-app-title') || btn.textContent.trim();
            var card = document.createElement('div');
            card.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px;cursor:pointer;transition:.15s;display:flex;flex-direction:column;gap:8px;';
            card.innerHTML = '<div style="font-size:28px;">' + icon + '</div><div style="font-weight:700;font-size:14px;color:#fff;">' + title + '</div><div style="font-size:11px;color:#34d399;font-weight:600;">▶ Launch in Screen</div>';
            card.onclick = function(){ selectApp(btn); };
            gridItems.appendChild(card);
          });
        }

        function setView(mode){
          if(!gridWrap) return;
          gridWrap.style.display = mode === 'grid' ? 'block' : 'none';
          hub.querySelectorAll('.myhtml-hub-view-btn').forEach(function(b){
            var on = b.getAttribute('data-hub-view') === mode;
            b.style.background = on ? '#334155' : '#1e293b';
            b.style.color = on ? '#fff' : '#94a3b8';
          });
          if(mode === 'grid') buildGrid();
        }

        if(nav) nav.addEventListener('click', function(e){
          var btn = e.target.closest('.myhtml-hub-item');
          if(btn) selectApp(btn);
        });

        hub.querySelectorAll('.myhtml-hub-view-btn').forEach(function(b){
          b.addEventListener('click', function(){ setView(b.getAttribute('data-hub-view')); });
        });

        var reloadBtn = hub.querySelector('.myhtml-hub-reload');
        if(reloadBtn && frame) reloadBtn.addEventListener('click', function(){ frame.src = frame.src; });

        if(search) search.addEventListener('input', function(){
          var q = search.value.toLowerCase().trim();
          hub.querySelectorAll('.myhtml-hub-item').forEach(function(btn){
            var t = (btn.getAttribute('data-app-title') || btn.textContent).toLowerCase();
            btn.style.display = (!q || t.indexOf(q) !== -1) ? 'flex' : 'none';
          });
          if(gridWrap && gridWrap.style.display === 'block') buildGrid();
        });

        buildGrid();
      });
    })();
  <\/script>
</div>`;

  const BLOCKS = [
    /* ========================================================
       INTERACTIVE MINI-APPS & TOOLS (No code needed!)
       ======================================================== */
    {
      id: 'app-hub',
      name: 'Multi-App Hub (1 Screen)',
      cat: 'Apps & Games',
      icon: '🧰',
      desc: 'Bung 10 or 30 web apps & tools into a single-screen switcher with sidebar dock, search & grid launcher',
      html: APP_HUB_HTML
    },
    {
      id: 'app-imported',
      name: 'Single App (Folder / .html)',
      cat: 'Apps & Games',
      icon: '📦',
      desc: 'Embed any offline web app folder or standalone .html file (WASM tools, games, calculators)',
      html: `<div class="myhtml-app-embed" data-app-container="1" data-app-src="" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);margin:32px auto;max-width:960px;font-family:system-ui,sans-serif;">
  <div class="myhtml-app-header" style="background:#0f172a;color:#ffffff;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:16px;">📦</span>
      <strong class="myhtml-app-title" style="font-size:14px;letter-spacing:0.2px;">Embedded Web App</strong>
      <span class="myhtml-app-badge" style="background:rgba(16,185,129,0.2);color:#34d399;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">OFFLINE READY</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button type="button" class="myhtml-app-btn-test" style="background:#10b981;color:#ffffff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;" title="Run this tool live">▶ Test Live</button>
      <button type="button" class="myhtml-app-btn-pick" style="background:#4f46e5;color:#ffffff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">📂 App Folder…</button>
      <button type="button" class="myhtml-app-btn-file" style="background:#2563eb;color:#ffffff;border:0;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">📄 .html File…</button>
      <a href="#" target="_blank" class="myhtml-app-btn-pop" style="color:#94a3b8;text-decoration:none;font-size:12px;display:none;align-items:center;padding:4px 8px;border-radius:6px;" title="Open in separate tab">↗ Open</a>
    </div>
  </div>
  <div class="myhtml-app-viewport" style="position:relative;background:#f8fafc;height:600px;width:100%;">
    <div class="myhtml-app-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;position:absolute;inset:0;padding:32px;text-align:center;background:#f8fafc;color:#475569;z-index:2;">
      <div style="width:64px;height:64px;border-radius:16px;background:#e0e7ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:16px;">📦</div>
      <h3 style="margin:0 0 8px;font-size:20px;color:#0f172a;font-weight:700;">No App Loaded Yet</h3>
      <p style="margin:0 0 20px;font-size:14px;max-width:460px;line-height:1.5;color:#64748b;">
        Load any folder containing an <code>index.html</code> (like XISO Tool, WASM utilities, or games) or pick any standalone <code>.html</code> file.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
        <button type="button" class="myhtml-app-btn-pick" style="background:#4f46e5;color:#ffffff;border:0;border-radius:8px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.3);">
          📂 Choose App Folder…
        </button>
        <button type="button" class="myhtml-app-btn-file" style="background:#2563eb;color:#ffffff;border:0;border-radius:8px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
          📄 Choose .html File…
        </button>
      </div>
    </div>
    <iframe class="myhtml-app-frame" src="about:blank" style="width:100%;height:100%;border:0;display:none;" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
  </div>
</div>`
    },
    {
      id: 'app-snake',
      name: 'Retro Snake Game',
      cat: 'Apps & Games',
      icon: '🕹️',
      desc: 'Playable arcade game right on your website',
      html: `<div style="background:#111827;color:#fff;border-radius:14px;padding:24px;max-width:440px;margin:28px auto;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <h3 style="margin:0;font-size:18px;">🕹️ Retro Snake</h3>
    <span style="font-weight:700;color:#10b981;font-size:16px;">Score: <span id="snakeScore">0</span></span>
  </div>
  <canvas id="snakeCanvas" width="380" height="260" style="background:#0f172a;border-radius:8px;border:2px solid #334155;display:block;margin:0 auto;max-width:100%;"></canvas>
  <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
    <button id="snakeStartBtn" style="background:#10b981;color:#fff;border:0;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">▶ Start Game</button>
  </div>
  <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">Click "▶ Test App" in MyHTML, then use Arrow keys to play!</p>
  <script>
    (function(){
      const cv = document.getElementById('snakeCanvas');
      if(!cv) return;
      const ctx = cv.getContext('2d');
      const scoreEl = document.getElementById('snakeScore');
      const startBtn = document.getElementById('snakeStartBtn');
      let snake = [{x:8, y:6}], food = {x:12, y:8}, dir = {x:1, y:0}, nextDir = {x:1, y:0}, score = 0, loop = null;
      const grid = 20, cols = 19, rows = 13;
      function placeFood(){ food = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows) }; }
      function draw(){
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(food.x*grid+2, food.y*grid+2, grid-4, grid-4);
        snake.forEach((s, idx) => {
          ctx.fillStyle = idx === 0 ? '#34d399' : '#10b981';
          ctx.fillRect(s.x*grid+1, s.y*grid+1, grid-2, grid-2);
        });
      }
      function step(){
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if(head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(s=>s.x===head.x && s.y===head.y)){
          clearInterval(loop); loop = null; startBtn.textContent = '🔄 Play Again';
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0,0,cv.width,cv.height);
          ctx.fillStyle = '#f87171'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('Game Over! Score: ' + score, cv.width/2, cv.height/2);
          return;
        }
        snake.unshift(head);
        if(head.x === food.x && head.y === food.y){
          score += 10; if(scoreEl) scoreEl.textContent = score; placeFood();
        } else { snake.pop(); }
        draw();
      }
      function start(){
        snake = [{x:8, y:6}, {x:7, y:6}]; dir = {x:1,y:0}; nextDir = {x:1,y:0}; score = 0;
        if(scoreEl) scoreEl.textContent = '0';
        placeFood();
        if(loop) clearInterval(loop);
        loop = setInterval(step, 110);
        startBtn.textContent = 'Restart';
      }
      if(startBtn) startBtn.onclick = start;
      window.addEventListener('keydown', e => {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
        if(e.key === 'ArrowUp' && dir.y === 0) nextDir = {x:0, y:-1};
        if(e.key === 'ArrowDown' && dir.y === 0) nextDir = {x:0, y:1};
        if(e.key === 'ArrowLeft' && dir.x === 0) nextDir = {x:-1, y:0};
        if(e.key === 'ArrowRight' && dir.x === 0) nextDir = {x:1, y:0};
      });
      draw();
    })();
  <\/script>
</div>`
    },
    {
      id: 'app-calc',
      name: 'Interactive Calculator',
      cat: 'Apps & Games',
      icon: '🧮',
      desc: 'Interactive price & cost calculator with live sliders',
      html: `<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px 28px;max-width:540px;margin:30px auto;box-shadow:0 8px 30px rgba(0,0,0,0.06);font-family:system-ui,sans-serif;color:#111827;">
  <h3 style="margin:0 0 6px;font-size:22px;">🧮 Price Estimator</h3>
  <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Slide the bars to see your live estimated cost.</p>
  <div style="margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;font-weight:600;font-size:13px;margin-bottom:6px;">
      <span>Number of Pages:</span><span id="calcPagesVal" style="color:#4f46e5;font-size:15px;">5 pages</span>
    </div>
    <input type="range" id="calcPages" min="1" max="25" value="5" style="width:100%;accent-color:#4f46e5;">
  </div>
  <div style="margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;font-weight:600;font-size:13px;margin-bottom:6px;">
      <span>Design Polish:</span><span id="calcLevelVal" style="color:#4f46e5;font-size:15px;">Standard</span>
    </div>
    <input type="range" id="calcLevel" min="1" max="3" value="2" style="width:100%;accent-color:#4f46e5;">
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;">
    <span style="font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.05em;font-weight:700;">Estimated Cost</span>
    <div id="calcTotal" style="font-size:38px;font-weight:800;color:#4f46e5;margin:4px 0;">£450</div>
    <span style="font-size:12px;color:#10b981;font-weight:600;">✓ Instant live calculation</span>
  </div>
  <script>
    (function(){
      const p = document.getElementById('calcPages');
      const l = document.getElementById('calcLevel');
      const pVal = document.getElementById('calcPagesVal');
      const lVal = document.getElementById('calcLevelVal');
      const total = document.getElementById('calcTotal');
      if(!p || !l) return;
      const levels = { 1: { name: 'Simple', mult: 50 }, 2: { name: 'Standard', mult: 90 }, 3: { name: 'Pro & Custom', mult: 150 } };
      function update(){
        const pages = +p.value;
        const level = levels[l.value] || levels[2];
        if(pVal) pVal.textContent = pages + (pages === 1 ? ' page' : ' pages');
        if(lVal) lVal.textContent = level.name;
        if(total) total.textContent = '£' + (pages * level.mult);
      }
      p.oninput = update; l.oninput = update; update();
    })();
  <\/script>
</div>`
    },
    {
      id: 'app-timer',
      name: 'Focus Timer (Pomodoro)',
      cat: 'Apps & Games',
      icon: '⏱️',
      desc: 'Count-down productivity timer with sound alarm',
      html: `<div style="background:linear-gradient(135deg,#1e1b4b,#31104b);border-radius:18px;padding:32px 24px;max-width:420px;margin:28px auto;text-align:center;color:#fff;box-shadow:0 12px 35px rgba(30,15,60,0.35);font-family:system-ui,sans-serif;">
  <span style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#c7d2fe;font-weight:700;">Focus Session</span>
  <div id="timerDisplay" style="font-size:64px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:1px;margin:12px 0;">25:00</div>
  <div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px;">
    <button data-mins="25" class="timer-mode-btn" style="background:rgba(255,255,255,0.2);border:0;color:#fff;padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;">25m Focus</button>
    <button data-mins="5" class="timer-mode-btn" style="background:rgba(255,255,255,0.08);border:0;color:#cbd5e1;padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;">5m Break</button>
    <button data-mins="15" class="timer-mode-btn" style="background:rgba(255,255,255,0.08);border:0;color:#cbd5e1;padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;">15m Long</button>
  </div>
  <div style="display:flex;gap:10px;justify-content:center;">
    <button id="timerToggle" style="background:#6366f1;color:#fff;border:0;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">▶ Start</button>
    <button id="timerReset" style="background:rgba(255,255,255,0.12);color:#fff;border:0;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;">Reset</button>
  </div>
  <script>
    (function(){
      let totalSec = 25 * 60, remain = totalSec, running = false, timer = null;
      const disp = document.getElementById('timerDisplay');
      const toggle = document.getElementById('timerToggle');
      const reset = document.getElementById('timerReset');
      if(!disp || !toggle) return;
      function fmt(s){ const m = Math.floor(s/60), sec = s%60; return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0'); }
      function tick(){
        if(remain > 0){ remain--; disp.textContent = fmt(remain); }
        else { clearInterval(timer); running = false; toggle.textContent = '▶ Start'; alert('Session complete! Time for a break.'); }
      }
      toggle.onclick = () => {
        if(running){ clearInterval(timer); running = false; toggle.textContent = '▶ Resume'; }
        else { running = true; toggle.textContent = '⏸ Pause'; timer = setInterval(tick, 1000); }
      };
      reset.onclick = () => { clearInterval(timer); running = false; remain = totalSec; disp.textContent = fmt(remain); toggle.textContent = '▶ Start'; };
      document.querySelectorAll('.timer-mode-btn').forEach(b => {
        b.onclick = () => {
          document.querySelectorAll('.timer-mode-btn').forEach(x=>x.style.background='rgba(255,255,255,0.08)');
          b.style.background='rgba(255,255,255,0.2)';
          totalSec = +b.dataset.mins * 60;
          reset.onclick();
        };
      });
    })();
  <\/script>
</div>`
    },
    {
      id: 'app-piano',
      name: 'Playable Synth Piano',
      cat: 'Apps & Games',
      icon: '🎹',
      desc: 'Real audio synthesizer piano running 100% in code',
      html: `<div style="background:#0f172a;color:#fff;border-radius:16px;padding:24px;max-width:480px;margin:24px auto;box-shadow:0 10px 30px rgba(0,0,0,0.3);text-align:center;font-family:system-ui,sans-serif;">
  <h3 style="margin:0 0 4px;font-size:18px;">🎹 Playable Synth Keys</h3>
  <p style="color:#94a3b8;font-size:12px;margin:0 0 16px;">Pure browser Web Audio synthesis — click any key to play notes!</p>
  <div style="display:flex;justify-content:center;gap:4px;background:#1e293b;padding:12px;border-radius:12px;">
    <button data-note="261.63" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">C</button>
    <button data-note="293.66" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">D</button>
    <button data-note="329.63" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">E</button>
    <button data-note="349.23" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">F</button>
    <button data-note="392.00" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">G</button>
    <button data-note="440.00" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">A</button>
    <button data-note="493.88" style="width:38px;height:120px;background:#fff;color:#000;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">B</button>
    <button data-note="523.25" style="width:38px;height:120px;background:#4f46e5;color:#fff;border:0;border-radius:0 0 6px 6px;font-weight:700;cursor:pointer;padding-top:80px;font-size:13px;">C</button>
  </div>
  <script>
    (function(){
      let actx = null;
      function playTone(freq){
        if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if(actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(0.3, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + 0.8);
      }
      document.querySelectorAll('[data-note]').forEach(btn => {
        btn.onmousedown = () => { playTone(+btn.dataset.note); btn.style.transform = 'translateY(4px)'; };
        btn.onmouseup = () => { btn.style.transform = 'none'; };
        btn.onmouseleave = () => { btn.style.transform = 'none'; };
      });
    })();
  <\/script>
</div>`
    },
    {
      id: 'app-todo',
      name: 'Interactive To-Do List',
      cat: 'Apps & Games',
      icon: '📝',
      desc: 'Interactive task checklist that remembers items',
      html: `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:26px;max-width:440px;margin:24px auto;box-shadow:0 8px 25px rgba(0,0,0,0.05);color:#111827;font-family:system-ui,sans-serif;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
    <h3 style="margin:0;font-size:18px;">📝 Live Task Board</h3>
    <span style="font-size:11px;color:#10b981;font-weight:600;">● Interactive</span>
  </div>
  <div style="display:flex;gap:6px;margin-bottom:16px;">
    <input type="text" id="todoInput" placeholder="Add a new task or idea…" style="flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;">
    <button id="todoAddBtn" style="background:#4f46e5;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Add</button>
  </div>
  <div id="todoList" style="display:flex;flex-direction:column;gap:6px;">
    <div style="padding:10px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:13px;">
      <span>💡 Study cloned website bones</span>
      <button style="border:0;background:transparent;cursor:pointer;color:#ef4444;font-size:14px;" onclick="this.parentElement.remove()">✕</button>
    </div>
    <div style="padding:10px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:13px;">
      <span>🚀 Test interactive mini-apps</span>
      <button style="border:0;background:transparent;cursor:pointer;color:#ef4444;font-size:14px;" onclick="this.parentElement.remove()">✕</button>
    </div>
  </div>
  <script>
    (function(){
      const inp = document.getElementById('todoInput');
      const add = document.getElementById('todoAddBtn');
      const list = document.getElementById('todoList');
      if(!inp || !add || !list) return;
      function addItem(){
        const txt = inp.value.trim();
        if(!txt) return;
        const row = document.createElement('div');
        row.style.cssText = 'padding:10px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;font-size:13px;';
        row.innerHTML = '<span>' + txt.replace(/[&<>]/g,'') + '</span><button style="border:0;background:transparent;cursor:pointer;color:#ef4444;font-size:14px;">✕</button>';
        row.querySelector('button').onclick = () => row.remove();
        list.appendChild(row);
        inp.value = '';
      }
      add.onclick = addItem;
      inp.onkeydown = e => { if(e.key === 'Enter') addItem(); };
    })();
  <\/script>
</div>`
    },
    {
      id: 'app-imager',
      name: 'Client Image Resizer',
      cat: 'Apps & Games',
      icon: '🖼️',
      desc: 'Local-first photo resizer tool — no server needed',
      html: `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;max-width:520px;margin:24px auto;color:#111827;box-shadow:0 8px 30px rgba(0,0,0,0.06);font-family:system-ui,sans-serif;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
    <span style="font-size:24px;">🖼️</span>
    <div>
      <h3 style="margin:0;font-size:18px;">Quick Image Resizer</h3>
      <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Shrink and resize photos locally without uploading to any server.</p>
    </div>
  </div>
  <input type="file" id="imgAppFile" accept="image/*" style="width:100%;margin-bottom:14px;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;">
  <div style="display:flex;gap:12px;margin-bottom:14px;">
    <div style="flex:1;">
      <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Width (px)</label>
      <input type="number" id="imgAppW" value="600" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    </div>
    <div style="flex:1;">
      <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;">Height (px)</label>
      <input type="number" id="imgAppH" value="400" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    </div>
  </div>
  <canvas id="imgAppCanvas" style="max-width:100%;height:140px;background:#f1f5f9;border-radius:8px;display:block;margin-bottom:14px;object-fit:contain;"></canvas>
  <button id="imgAppDownload" style="width:100%;background:#4f46e5;color:#fff;border:0;padding:12px;border-radius:8px;font-weight:700;cursor:pointer;">⬇ Download Resized Photo</button>
  <script>
    (function(){
      const f = document.getElementById('imgAppFile');
      const cv = document.getElementById('imgAppCanvas');
      const dl = document.getElementById('imgAppDownload');
      const wEl = document.getElementById('imgAppW');
      const hEl = document.getElementById('imgAppH');
      let loadedImg = null;
      if(!f || !cv) return;
      const ctx = cv.getContext('2d');
      f.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          loadedImg = new Image();
          loadedImg.onload = () => {
            wEl.value = loadedImg.width > 1200 ? 1200 : loadedImg.width;
            hEl.value = Math.round(loadedImg.height * (wEl.value / loadedImg.width));
            render();
          };
          loadedImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      };
      function render(){
        if(!loadedImg) return;
        cv.width = +wEl.value; cv.height = +hEl.value;
        ctx.drawImage(loadedImg, 0, 0, cv.width, cv.height);
      }
      wEl.oninput = render; hEl.oninput = render;
      dl.onclick = () => {
        if(!loadedImg){ alert('Pick an image file above first!'); return; }
        const a = document.createElement('a');
        a.download = 'resized-image.png';
        a.href = cv.toDataURL('image/png');
        a.click();
      };
    })();
  <\/script>
</div>`
    },

    /* ========================================================
       PAGE SECTIONS
       ======================================================== */
    { id: 'nav', name: 'Header & Menu', cat: 'Sections', icon: '☰', html: `<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:18px 6%;background:#fff;border-bottom:1px solid #eceef3;"><strong style="font-size:20px;color:#111827;">Your Brand</strong><nav style="display:flex;flex-wrap:wrap;gap:24px;"><a href="index.html" style="color:#374151;text-decoration:none;font-weight:500;">Home</a><a href="#about" style="color:#374151;text-decoration:none;font-weight:500;">About</a><a href="#services" style="color:#374151;text-decoration:none;font-weight:500;">Services</a><a href="#contact" style="color:#374151;text-decoration:none;font-weight:500;">Contact</a></nav></header>` },
    { id: 'hero', name: 'Hero Welcome Banner', cat: 'Sections', icon: '★', html: `<section style="padding:90px 6%;text-align:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;"><div style="max-width:760px;margin:0 auto;"><h1 style="font-size:clamp(32px,5vw,54px);line-height:1.15;margin:0 0 18px;">Build something great</h1><p style="font-size:19px;line-height:1.6;opacity:.9;margin:0 0 32px;">A clean, friendly website to showcase your work and ideas. Double-click any text to edit.</p><a href="#" style="display:inline-block;padding:14px 30px;background:#fff;color:#4f46e5;border-radius:10px;text-decoration:none;font-weight:700;">Get Started</a></div></section>` },
    { id: 'features', name: '3-Column Features', cat: 'Sections', icon: '▦', html: `<section id="services" style="${SEC}background:#fff;"><div style="${WRAP}"><h2 style="text-align:center;font-size:32px;margin:0 0 10px;color:#111827;">What We Do</h2><p style="text-align:center;color:#6b7280;font-size:16px;margin:0 0 40px;">Everything you need, cleanly structured.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;"><div style="padding:28px;border:1px solid #eceef3;border-radius:14px;"><div style="font-size:32px;">⚡</div><h3 style="margin:12px 0 6px;color:#111827;">Super Fast</h3><p style="margin:0;color:#6b7280;line-height:1.6;">Runs completely in your browser without lag.</p></div><div style="padding:28px;border:1px solid #eceef3;border-radius:14px;"><div style="font-size:32px;">🎨</div><h3 style="margin:12px 0 6px;color:#111827;">Beautiful</h3><p style="margin:0;color:#6b7280;line-height:1.6;">Clean typography and modern spacing.</p></div><div style="padding:28px;border:1px solid #eceef3;border-radius:14px;"><div style="font-size:32px;">🔒</div><h3 style="margin:12px 0 6px;color:#111827;">100% Private</h3><p style="margin:0;color:#6b7280;line-height:1.6;">Your files and data stay right on your PC.</p></div></div></div></section>` },
    { id: 'about', name: 'Photo & Story', cat: 'Sections', icon: '◧', html: `<section id="about" style="${SEC}background:#f9fafb;"><div style="${WRAP}display:flex;flex-wrap:wrap;align-items:center;gap:40px;"><img src="${ph(600, 420, 'Your Image')}" alt="Placeholder" style="flex:1 1 300px;max-width:100%;border-radius:14px;"><div style="flex:1 1 300px;"><h2 style="font-size:32px;margin:0 0 14px;color:#111827;">About Us</h2><p style="color:#4b5563;font-size:17px;line-height:1.7;margin:0 0 20px;">Tell your story here. What do you build, and why does it matter? Double-click to type your own text.</p><a href="#" style="${BTN}">Learn More</a></div></div></section>` },
    { id: 'gallery', name: 'Photo Gallery', cat: 'Sections', icon: '▤', html: `<section style="${SEC}background:#fff;"><div style="${WRAP}"><h2 style="text-align:center;font-size:32px;margin:0 0 32px;color:#111827;">Gallery</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;"><img src="${ph(500, 380, 'Photo 1')}" alt="" style="width:100%;border-radius:12px;"><img src="${ph(500, 380, 'Photo 2', '#fbcfe8', '#f472b6')}" alt="" style="width:100%;border-radius:12px;"><img src="${ph(500, 380, 'Photo 3', '#bbf7d0', '#34d399')}" alt="" style="width:100%;border-radius:12px;"></div></div></section>` },
    { id: 'pricing', name: 'Pricing Cards', cat: 'Sections', icon: '$', html: `<section style="${SEC}background:#f9fafb;"><div style="${WRAP}"><h2 style="text-align:center;font-size:32px;margin:0 0 32px;color:#111827;">Simple Pricing</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;"><div style="background:#fff;padding:30px;border-radius:14px;border:1px solid #eceef3;text-align:center;"><h3 style="margin:0;color:#111827;">Starter</h3><p style="font-size:36px;font-weight:700;margin:12px 0;color:#111827;">£9</p><p style="color:#6b7280;line-height:1.8;">Feature one<br>Feature two</p><a href="#" style="${BTN}">Choose</a></div><div style="background:#4f46e5;color:#fff;padding:30px;border-radius:14px;text-align:center;"><h3 style="margin:0;">Pro</h3><p style="font-size:36px;font-weight:700;margin:12px 0;">£29</p><p style="opacity:.9;line-height:1.8;">Everything in Starter<br>Custom tools</p><a href="#" style="display:inline-block;padding:12px 26px;background:#fff;color:#4f46e5;border-radius:8px;text-decoration:none;font-weight:700;">Choose</a></div><div style="background:#fff;padding:30px;border-radius:14px;border:1px solid #eceef3;text-align:center;"><h3 style="margin:0;color:#111827;">Team</h3><p style="font-size:36px;font-weight:700;margin:12px 0;color:#111827;">£79</p><p style="color:#6b7280;line-height:1.8;">Unlimited apps<br>Full access</p><a href="#" style="${BTN}">Choose</a></div></div></div></section>` },
    { id: 'contact', name: 'Contact Form', cat: 'Sections', icon: '✉', html: `<section id="contact" style="${SEC}background:#f9fafb;"><div style="max-width:580px;margin:0 auto;"><h2 style="text-align:center;font-size:32px;margin:0 0 24px;color:#111827;">Get in Touch</h2><form action="#" method="post" style="display:grid;gap:14px;"><input type="text" name="name" placeholder="Your name" style="padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;"><input type="email" name="email" placeholder="Your email" style="padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;"><textarea name="message" rows="4" placeholder="Your message" style="padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-family:inherit;"></textarea><button type="submit" style="padding:14px;background:#4f46e5;color:#fff;border:0;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">Send Message</button></form></div></section>` },
    { id: 'footer', name: 'Page Footer', cat: 'Sections', icon: '▁', html: `<footer style="padding:36px 6%;background:#0b1020;color:#9ca3af;text-align:center;"><p style="margin:0 0 6px;color:#fff;font-weight:600;">Your Brand</p><p style="margin:0;font-size:13px;">© 2026 Your Brand. Built with MyHTML.</p></footer>` },

    /* ========================================================
       BASIC ELEMENTS
       ======================================================== */
    { id: 'heading', name: 'Heading', cat: 'Elements', icon: 'H', html: `<h2 style="font-size:32px;margin:28px 6% 10px;color:#111827;">A New Heading</h2>` },
    { id: 'paragraph', name: 'Text Paragraph', cat: 'Elements', icon: '¶', html: `<p style="font-size:17px;line-height:1.7;margin:10px 6%;color:#4b5563;">Write your story here. Double-click any word to edit text directly.</p>` },
    { id: 'button', name: 'Action Button', cat: 'Elements', icon: '▭', html: `<div style="margin:16px 6%;"><a href="#" style="${BTN}">Click Here</a></div>` },
    { id: 'image', name: 'Photo / Image', cat: 'Elements', icon: '🖼', html: `<div style="margin:16px 6%;"><img src="${ph(800, 420, 'Click, then choose an image')}" alt="" style="max-width:100%;border-radius:10px;"></div>` },
    { id: 'video', name: 'YouTube Video', cat: 'Elements', icon: '▶', html: `<div style="margin:24px auto;max-width:800px;padding:0 6%;"><div style="position:relative;padding-top:56.25%;"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:10px;" allowfullscreen></iframe></div></div>` },
    { id: 'divider', name: 'Divider Line', cat: 'Elements', icon: '—', html: `<hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 6%;">` }
  ];

  const page = (title, body, extra = '') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="">
<style>*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#111827;background:#fff}img{max-width:100%}${extra}</style>
</head>
<body>
${body}
</body>
</html>
`;

  const TEMPLATES = {
    apphub: {
      name: 'Multi-App Hub (1 Screen)',
      desc: 'Bung 10 or 30 web apps & tools (like XISO) into one single-screen workspace',
      emoji: '🧰',
      html: () => page('All-in-One App Hub', APP_HUB_HTML.replace('margin:18px auto;max-width:1360px;height:85vh;', 'margin:0;max-width:100%;height:100vh;border-radius:0;border:0;'), 'body{background:#090d16;overflow:hidden}')
    },
    blank: {
      name: 'Clean Sheet',
      desc: 'Completely empty page — zero pre-filled text or boxes',
      emoji: '📄',
      html: () => page('Clean Sheet', '', 'html,body{min-height:100vh;margin:0;padding:0;background:#ffffff;color:#111827;}')
    },
    document: {
      name: 'Clean Article',
      desc: 'Simple typography and reading layout',
      emoji: '📝',
      html: () => page('Document', `<article style="max-width:740px;margin:50px auto;padding:0 24px;line-height:1.7;color:#374151;"><h1 style="font-size:36px;line-height:1.2;color:#111827;margin-bottom:12px;">Notes & Thoughts</h1><p style="font-size:18px;color:#6b7280;margin-bottom:28px;">A clean reading layout ready for your words.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;"><p>Double-click to start writing. Every element can be clicked and styled easily.</p></article>`)
    }
  };

  const api = { BLOCKS, TEMPLATES, page };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MyTpl = api;
})(typeof window !== 'undefined' ? window : globalThis);
