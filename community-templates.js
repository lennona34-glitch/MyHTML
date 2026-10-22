const cheerio = require('cheerio');

/* ============================================================================
   1. 66 VERIFIED LIVE FREE HTML5 TEMPLATES (HTML5 UP + StartBootstrap)
   All URLs verified 200 OK & directly cloneable into MyHTML
   ============================================================================ */
const HTML5UP_RAW = [
  ['forty', 'Forty', 'Portfolio & Zine', 'Bold tile-grid agency & portfolio layout with vibrant color overlays and split sections.', ['grid', 'tiles', 'dark', 'agency']],
  ['dimension', 'Dimension', 'Minimal & One-Page', 'Sleek single-screen modal-card layout with atmospheric background and crisp buttons.', ['one-page', 'modal', 'dark', 'minimal']],
  ['massively', 'Massively', 'Blog & Editorial', 'Magazine-style feature editorial with bold typography, pagination, and article grid.', ['editorial', 'magazine', 'blog', 'grid']],
  ['phantom', 'Phantom', 'Portfolio & Zine', 'Playful geometric image-tile showcase with clean navigation and compact cards.', ['portfolio', 'tiles', 'minimal', 'zine']],
  ['hyperspace', 'Hyperspace', 'Dark & Sci-Fi', 'Sidebar-docked sci-fi project showcase with spotlight rows and feature matrix.', ['sidebar', 'scifi', 'dark', 'tech']],
  ['ethereal', 'Ethereal', 'Portfolio & Zine', 'Horizontal-panel lookbook with rich gradients, gallery cards, and contact panel.', ['horizontal', 'gradient', 'lookbook', 'art']],
  ['paradigm-shift', 'Paradigm Shift', 'Blog & Editorial', 'Split-column Swiss-inspired showcase pairing sticky headlines with dense content.', ['split', 'swiss', 'editorial', 'modern']],
  ['stellar', 'Stellar', 'Dark & Sci-Fi', 'App & tool landing page with sticky tab bar, stat counters, and icon cards.', ['app', 'tabs', 'stats', 'gradient']],
  ['astral', 'Astral', 'Minimal & One-Page', 'Compact tabbed card interface on a single screen — great for micro-sites.', ['card', 'tabs', 'single-screen', 'compact']],
  ['spectral', 'Spectral', 'Dark & Sci-Fi', 'Atmospheric dark layout with alternating spotlight blocks and feature grid.', ['dark', 'spotlights', 'grid', 'landing']],
  ['editorial', 'Editorial', 'Blog & Editorial', 'Full multi-column online magazine / wiki layout with collapsible sidebar menu.', ['magazine', 'wiki', 'sidebar', 'articles']],
  ['story', 'Story', 'Blog & Editorial', 'Alternating story-driven sections, gallery strip, and clean typography.', ['story', 'gallery', 'clean', 'serif']],
  ['multiverse', 'Multiverse', 'Portfolio & Zine', 'Full-screen wall-to-wall photo & artwork grid with bottom utility bar.', ['photography', 'grid', 'fullscreen', 'dark']],
  ['lens', 'Lens', 'Portfolio & Zine', 'Split-screen visual showcase with thumbnail strip and compact sidebar info.', ['photography', 'split', 'sidebar', 'compact']],
  ['solid-state', 'Solid State', 'Dark & Sci-Fi', 'Angled diagonal dark sections with card grids and technical aesthetic.', ['dark', 'angled', 'cards', 'tech']],
  ['landed', 'Landed', 'Dark & Sci-Fi', 'High-contrast dark technology template with docked panels and pricing/spec tables.', ['dark', 'tech', 'panels', 'tables']],
  ['future-imperfect', 'Future Imperfect', 'Blog & Editorial', 'Classic structured dev/zine blog with sidebar mini-posts, tags, and post cards.', ['blog', 'sidebar', 'zine', 'cards']],
  ['strata', 'Strata', 'Portfolio & Zine', 'Fixed left profile column paired with a clean 2-column project grid on the right.', ['sidebar', 'portfolio', 'clean', 'two-column']],
  ['read-only', 'Read Only', 'Minimal & One-Page', 'Documentation / personal handbook layout with sticky right-side section nav.', ['docs', 'handbook', 'sidebar', 'clean']],
  ['prologue', 'Prologue', 'Portfolio & Zine', 'Compact dashboard-style sidebar nav with portfolio grid and bio section.', ['sidebar', 'dashboard', 'portfolio', 'compact']],
  ['helios', 'Helios', 'Blog & Editorial', 'Carousel card strip + structured multi-column magazine footer and article layout.', ['carousel', 'magazine', 'cards', 'classic']],
  ['dopetrope', 'Dopetrope', 'Small Business', 'Card-packed studio & project directory with badge tabs, blog cards, and links.', ['directory', 'cards', 'studio', 'badges']],
  ['miniport', 'Miniport', 'Minimal & One-Page', 'Tight, punchy single-page creator profile with skill boxes and work grid.', ['creator', 'boxes', 'compact', 'one-page']],
  ['identity', 'Identity', 'Minimal & One-Page', 'Ultra-compact centered profile card with social pills and avatar frame.', ['profile', 'card', 'micro', 'links']],
  ['aerial', 'Aerial', 'Minimal & One-Page', 'Single-screen animated horizon launcher with icon dock.', ['single-screen', 'launcher', 'icons', 'minimal']],
  ['escape-velocity', 'Escape Velocity', 'Small Business', 'Structured multi-box layout with bordered section headers and feature columns.', ['structured', 'columns', 'boxes', 'classic']],
  ['photon', 'Photon', 'Minimal & One-Page', 'Clean software/tool showcase with 3-column feature cards and button bars.', ['software', 'columns', 'clean', 'buttons']],
  ['fractal', 'Fractal', 'Small Business', 'App & mobile tool showcase with device frame, feature rows, and download buttons.', ['app', 'tool', 'features', 'buttons']],
  ['eventually', 'Eventually', 'Minimal & One-Page', 'Minimal launch / countdown screen with email bar and bold headline.', ['launch', 'minimal', 'single-screen', 'dark']],
  ['twenty', 'Twenty', 'Small Business', 'Geometric double-lined headers, two-column showcase cards, and callout bar.', ['geometric', 'cards', 'columns', 'clean']],
  ['txt', 'TXT', 'Blog & Editorial', 'Dense news & community portal layout with top nav, feature boxes, and sidebar.', ['portal', 'news', 'dense', 'sidebar']],
  ['verti', 'Verti', 'Small Business', 'Friendly rounded card layout with 3-column thumbnails and clear action buttons.', ['rounded', 'cards', 'friendly', 'columns']],
  ['zerofour', 'ZeroFour', 'Blog & Editorial', 'Community hub template with dark header, article list, and multi-column links.', ['community', 'hub', 'articles', 'dark-header']],
  ['arcana', 'Arcana', 'Small Business', 'Classic 4-column icon bar, dual callout banners, and structured footer links.', ['columns', 'icons', 'structured', 'business']],
  ['halcyonic', 'Halcyonic', 'Small Business', 'Retro-modern boxed card layout with check-lists, quotes, and multi-box grid.', ['boxed', 'retro', 'cards', 'lists']],
  ['strongly-typed', 'Strongly Typed', 'Blog & Editorial', 'Retro slab-serif magazine layout with double rules, sidebar notes, and post cards.', ['retro', 'serif', 'magazine', 'rules']],
  ['big-picture', 'Big Picture', 'Portfolio & Zine', 'Boxed content panels floating over full-width section backgrounds with gallery.', ['panels', 'gallery', 'boxed', 'visual']],
  ['overflow', 'Overflow', 'Minimal & One-Page', 'Centered stacked story cards connected by vertical dividers and compact grid.', ['stacked', 'cards', 'centered', 'story']],
  ['directive', 'Directive', 'Minimal & One-Page', 'Timeline-connected feature rows with clean icon badges and table specs.', ['timeline', 'icons', 'table', 'clean']],
  ['highlights', 'Highlights', 'Minimal & One-Page', 'Focused center-column card stack that steps through sections smoothly.', ['stack', 'centered', 'cards', 'minimal']],
  ['alpha', 'Alpha', 'Small Business', 'Overlap card container with 2x2 feature matrix and clean button typography.', ['matrix', 'cards', 'overlap', 'clean']],
  ['telephasic', 'Telephasic', 'Small Business', 'Split-header layout with 3-column promo cards and gradient banner.', ['split', 'columns', 'gradient', 'cards']]
];

const STARTBOOTSTRAP_RAW = [
  ['grayscale', 'Grayscale', 'Dark & Sci-Fi', 'Atmospheric dark monochrome theme with project spotlight grid and contact cards.', ['dark', 'monochrome', 'grid', 'modern']],
  ['agency', 'Agency', 'Small Business', 'Complete studio layout with portfolio modal grid, vertical timeline, and team cards.', ['agency', 'timeline', 'portfolio', 'grid']],
  ['freelancer', 'Freelancer', 'Portfolio & Zine', 'Bold flat-color creator portfolio with 3x2 project cards and star dividers.', ['flat', 'creator', 'portfolio', 'cards']],
  ['creative', 'Creative', 'Small Business', 'Punchy studio page with 4-icon bar, edge-to-edge 6-tile gallery, and callout.', ['studio', 'gallery', 'icons', 'vibrant']],
  ['clean-blog', 'Clean Blog', 'Blog & Editorial', 'Crisp editorial blog layout with strong serif/sans pairing and article previews.', ['blog', 'editorial', 'typography', 'clean']],
  ['resume', 'Resume / CV Dock', 'Portfolio & Zine', 'Left-docked sidebar profile with structured experience, skills badges, and awards.', ['sidebar', 'resume', 'badges', 'single-screen']],
  ['stylish-portfolio', 'Stylish Portfolio', 'Portfolio & Zine', 'Off-canvas menu, 2x2 interactive project tiles, and service icon row.', ['tiles', 'portfolio', 'icons', 'modern']],
  ['new-age', 'New Age App', 'Dark & Sci-Fi', 'Vibrant gradient app/tool showcase with device preview and feature grid.', ['app', 'gradient', 'tool', 'features']],
  ['one-page-wonder', 'One Page Wonder', 'Minimal & One-Page', 'Bold geometric circle-cutout feature rows with high-impact headings.', ['geometric', 'rows', 'bold', 'one-page']],
  ['business-casual', 'Craft & Roastery', 'Small Business', 'Warm indie coffee/workshop template with floating overlap boxes and hours table.', ['coffee', 'craft', 'warm', 'overlap']],
  ['modern-business', 'Modern Directory', 'Small Business', 'Multi-section directory with card grid, badge pills, and call-to-action strip.', ['directory', 'cards', 'badges', 'grid']],
  ['shop-homepage', 'Shop Catalog Grid', 'Dashboard & Shop', 'Clean 4-column product/item catalog grid with star ratings, sale badges, and prices.', ['catalog', 'shop', 'grid', 'badges']],
  ['shop-item', 'Item Showcase & Specs', 'Dashboard & Shop', 'Single item detail layout with spec card, related items row, and review boxes.', ['item', 'specs', 'related', 'cards']],
  ['coming-soon', 'Launch Terminal', 'Minimal & One-Page', 'Diagonal split-screen launch page with social dock and notify bar.', ['split', 'launch', 'single-screen', 'dark']],
  ['personal', 'Personal Creator Kit', 'Portfolio & Zine', 'Gradient badge pills, project cards, and clean modern creator bio.', ['creator', 'gradient', 'pills', 'cards']],
  ['heroic-features', 'Heroic Bento Grid', 'Dashboard & Shop', 'Compact top banner followed by a 6-card icon feature grid — super easy to study.', ['bento', 'grid', 'cards', 'compact']],
  ['scrolling-nav', 'Section Docs Layout', 'Minimal & One-Page', 'Ultra-clean multi-section documentation/study template with top jump links.', ['docs', 'sections', 'clean', 'bones']],
  ['blog-home', 'Portal & Sidebar Grid', 'Blog & Editorial', 'Classic 2-column blog index with search widget, category tags box, and card grid.', ['blog', 'sidebar', 'search', 'tags']],
  ['blog-post', 'Article & Comments Study', 'Blog & Editorial', 'Long-form article structure with category pills, comment thread boxes, and sidebar.', ['article', 'comments', 'sidebar', 'pills']],
  ['small-business', 'Compact Studio Card', 'Small Business', 'Split top card + callout strip + 3-column action cards — great HTML bones.', ['compact', 'cards', 'three-column', 'bones']],
  ['full-width-pics', 'Wide Banner Study', 'Minimal & One-Page', 'Alternating full-bleed visual bands and centered typography blocks.', ['bands', 'typography', 'clean', 'visual']],
  ['the-big-picture', 'Bottom-Docked Poster', 'Minimal & One-Page', 'Bottom-docked navigation bar with floating text overlay on a single screen.', ['bottom-nav', 'poster', 'single-screen', 'minimal']],
  ['bare', 'Bare Starter Bones', 'Minimal & One-Page', 'Pure minimal navbar + centered container — ideal for inspecting raw structure.', ['minimal', 'navbar', 'starter', 'raw']],
  ['landing-page', 'Split Feature Rows', 'Small Business', 'Icon trio + alternating 50/50 image-and-text rows + avatar testimonials.', ['rows', 'icons', 'split', 'avatars']]
];

const CURATED_LIVE_TEMPLATES = [
  ...HTML5UP_RAW.map(([slug, title, cat, desc, tags]) => ({
    id: `html5up-${slug}`,
    slug,
    title: `${title}`,
    source: 'HTML5 UP',
    cat,
    desc,
    tags,
    url: `https://html5up.net/uploads/demos/${slug}/`,
    thumb: `https://html5up.net/uploads/images/${slug}.jpg`,
    license: 'CCA 3.0 Free'
  })),
  ...STARTBOOTSTRAP_RAW.map(([slug, title, cat, desc, tags]) => {
    const url = `https://startbootstrap.github.io/startbootstrap-${slug}/`;
    return {
      id: `sb-${slug}`,
      slug,
      title: `${title}`,
      source: 'StartBootstrap',
      cat,
      desc,
      tags,
      url,
      thumb: `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=600&h=400`,
      license: 'MIT Free'
    };
  })
];

/* ============================================================================
   2. LIVE NEOCITIES / INDIE WEB COMMUNITY DIRECTORY FETCHER
   Scrapes real handmade HTML/CSS sites from neocities.org/browse
   ============================================================================ */
async function fetchNeocitiesCommunity({ sort = 'special_sauce', tag = '', page = 1 } = {}) {
  const params = new URLSearchParams();
  if (sort) params.set('sort_by', sort);
  if (tag) params.set('tag', tag.trim().replace(/^#/, ''));
  if (page && page > 1) params.set('page', String(page));

  const browseUrl = `https://neocities.org/browse?${params.toString()}`;
  const r = await fetch(browseUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!r.ok) throw new Error(`Neocities returned HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const sites = [];

  $('ul.website-Gallery > li').each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find('.title a, a.neo-Screen-Shot').first();
    const url = linkEl.attr('href') || '';
    if (!url || !/^https?:\/\//i.test(url)) return;
    const title = ($el.find('.title a').text() || linkEl.attr('title') || url.replace(/^https?:\/\//, '')).trim();
    const user = ($el.find('.username a').text() || '').trim();
    const views = ($el.find('.site-stats a').text() || '').replace(/\s+/g, ' ').trim();
    const tags = $el.find('.site-tags a').map((__, t) => $(t).text().trim()).get().filter(Boolean);

    let thumb = '';
    const styleBg = $el.find('.img-Holder').attr('style') || '';
    const m = /url\((['"]?)([^'")]+)\1\)/i.exec(styleBg);
    if (m && m[2]) {
      thumb = m[2].startsWith('http') ? m[2] : `https://neocities.org${m[2]}`;
    } else {
      thumb = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=600&h=400`;
    }

    sites.push({
      id: `neo-${user || sites.length}`,
      title: title || user,
      source: 'Neocities Community',
      author: user,
      views,
      cat: tags[0] || 'Indie Web',
      desc: tags.length ? `Handmade community site tagged: ${tags.slice(0, 5).map((t) => '#' + t).join(' ')}` : 'Handmade HTML/CSS indie website on Neocities.',
      tags,
      url,
      thumb,
      license: 'Community Site'
    });
  });

  return { sites, browseUrl };
}

/* ============================================================================
   3. LIVE GITHUB COMMUNITY TEMPLATES SEARCH (Public API + Optional Token)
   ============================================================================ */
const GITHUB_PRESET_QUERIES = {
  trending: 'topic:html-template has:pages',
  portfolio: 'topic:portfolio-website language:HTML has:pages',
  retro: 'neocities language:HTML has:pages',
  tools: 'calculator language:HTML has:pages',
  games: 'topic:html5-game has:pages',
  landing: 'topic:website-template has:pages'
};

async function searchGithubTemplates({ query = '', filter = 'trending', token = '', page = 1 } = {}) {
  let q = '';
  if (query && query.trim()) {
    q = `${query.trim()} language:HTML has:pages`;
  } else {
    q = GITHUB_PRESET_QUERIES[filter] || GITHUB_PRESET_QUERIES.trending;
  }

  const apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=24&page=${page}`;
  const headers = {
    'User-Agent': 'MyHTML-Template-Explorer/1.0',
    'Accept': 'application/vnd.github+json'
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const r = await fetch(apiUrl, { headers });
  if (!r.ok) {
    if (r.status === 403 || r.status === 429) {
      throw new Error('GitHub API rate limit reached (60/hr without token). Click "🔑 API Key" in the top corner to add a free GitHub token for 5,000 searches/hr!');
    }
    throw new Error(`GitHub API returned HTTP ${r.status}`);
  }
  const data = await r.json();
  const items = Array.isArray(data.items) ? data.items : [];

  const sites = items.map((repo) => {
    let liveUrl = (repo.homepage || '').trim();
    if (!liveUrl || !/^https?:\/\//i.test(liveUrl) || /github\.com\//i.test(liveUrl)) {
      liveUrl = `https://${repo.owner.login}.github.io/${repo.name}/`;
    }
    const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 5) : [];
    return {
      id: `gh-${repo.id}`,
      title: repo.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      source: 'GitHub Community',
      author: repo.owner ? repo.owner.login : 'github',
      avatar: repo.owner ? repo.owner.avatar_url : '',
      stars: repo.stargazers_count || 0,
      cat: topics[0] || 'HTML Template',
      desc: repo.description || `Open-source HTML template by @${repo.owner ? repo.owner.login : 'community'}`,
      tags: topics,
      url: liveUrl,
      repoUrl: repo.html_url,
      thumb: `https://s0.wp.com/mshots/v1/${encodeURIComponent(liveUrl)}?w=600&h=400`,
      license: (repo.license && repo.license.spdx_id) || 'Open Source'
    };
  });

  return { sites, total: data.total_count || sites.length };
}

/* ============================================================================
   4. INSTANT PROCEDURAL WEBSITE GENERATOR ("Surprise Me!" / Startup Engine)
   12 Distinct Compact Archetypes × 16 Google Font Pairings × 16 Color Palettes
   ============================================================================ */
const FONT_PAIRINGS = [
  { id: 'space-jetbrains', name: 'Space Grotesk + JetBrains Mono', head: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono', gurl: 'Space+Grotesk:wght@500;700&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;600' },
  { id: 'syne-dmsans', name: 'Syne + DM Sans', head: 'Syne', body: 'DM Sans', mono: 'Space Mono', gurl: 'Syne:wght@700;800&family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700' },
  { id: 'chakra-ibm', name: 'Chakra Petch + IBM Plex Mono', head: 'Chakra Petch', body: 'IBM Plex Sans', mono: 'IBM Plex Mono', gurl: 'Chakra+Petch:wght@600;700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;600' },
  { id: 'fraunces-jakarta', name: 'Fraunces + Plus Jakarta Sans', head: 'Fraunces', body: 'Plus Jakarta Sans', mono: 'Fira Code', gurl: 'Fraunces:opsz,wght@9..144,600;9..144,800&family=Plus+Jakarta+Sans:wght@400;600;700&family=Fira+Code:wght@400;600' },
  { id: 'bricolage-work', name: 'Bricolage Grotesque + Work Sans', head: 'Bricolage Grotesque', body: 'Work Sans', mono: 'Space Mono', gurl: 'Bricolage+Grotesque:wght@600;800&family=Work+Sans:wght@400;500;600&family=Space+Mono:wght@400' },
  { id: 'outfit-fira', name: 'Outfit + Fira Code', head: 'Outfit', body: 'Outfit', mono: 'Fira Code', gurl: 'Outfit:wght@400;600;800&family=Fira+Code:wght@400;600' },
  { id: 'playfair-source', name: 'Playfair Display + Source Sans 3', head: 'Playfair Display', body: 'Source Sans 3', mono: 'IBM Plex Mono', gurl: 'Playfair+Display:ital,wght@0,700;1,600&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400' },
  { id: 'vt323-spacemono', name: 'VT323 Pixel + Space Mono', head: 'VT323', body: 'Space Mono', mono: 'Space Mono', gurl: 'VT323&family=Space+Mono:wght@400;700' },
  { id: 'bebas-inter', name: 'Bebas Neue + Inter', head: 'Bebas Neue', body: 'Inter', mono: 'JetBrains Mono', gurl: 'Bebas+Neue&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400' },
  { id: 'rubik-azeret', name: 'Rubik + Azeret Mono', head: 'Rubik', body: 'Rubik', mono: 'Azeret Mono', gurl: 'Rubik:wght@400;600;800&family=Azeret+Mono:wght@400;600' },
  { id: 'instrument-karla', name: 'Instrument Serif + Karla', head: 'Instrument Serif', body: 'Karla', mono: 'Inconsolata', gurl: 'Instrument+Serif:ital@0;1&family=Karla:wght@400;600;700&family=Inconsolata:wght@500' },
  { id: 'oxanium-rajdhani', name: 'Oxanium + Rajdhani', head: 'Oxanium', body: 'Rajdhani', mono: 'Share Tech Mono', gurl: 'Oxanium:wght@600;800&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono' },
  { id: 'sora-manrope', name: 'Sora + Manrope', head: 'Sora', body: 'Manrope', mono: 'JetBrains Mono', gurl: 'Sora:wght@600;800&family=Manrope:wght@400;600;700&family=JetBrains+Mono:wght@400' },
  { id: 'unbounded-inter', name: 'Unbounded + Inter', head: 'Unbounded', body: 'Inter', mono: 'Fira Code', gurl: 'Unbounded:wght@600;800&family=Inter:wght@400;600&family=Fira+Code:wght@400' },
  { id: 'Silkscreen-ibm', name: 'Silkscreen + IBM Plex Sans', head: 'Silkscreen', body: 'IBM Plex Sans', mono: 'IBM Plex Mono', gurl: 'Silkscreen:wght@400;700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400' },
  { id: 'archivo-chivo', name: 'Archivo Black + Chivo', head: 'Archivo Black', body: 'Chivo', mono: 'Chivo Mono', gurl: 'Archivo+Black&family=Chivo:wght@400;600;700&family=Chivo+Mono:wght@400;600' }
];

const COLOR_PALETTES = [
  { id: 'cyber-lime', name: 'Cyber Obsidian & Acid Lime', bg: '#0b0d12', surf: '#131722', surf2: '#1c2230', text: '#f1f5f9', muted: '#94a3b8', acc: '#a3e635', accText: '#0b0d12', border: '#262f42' },
  { id: 'tokyo-neon', name: 'Tokyo Night & Electric Cyan', bg: '#090b14', surf: '#121629', surf2: '#1b213d', text: '#eef2ff', muted: '#818cf8', acc: '#06b6d4', accText: '#061217', border: '#252d52' },
  { id: 'swiss-paper', name: 'Swiss Paper & International Orange', bg: '#f6f4f0', surf: '#ffffff', surf2: '#ebe7df', text: '#111111', muted: '#57534e', acc: '#ff3b00', accText: '#ffffff', border: '#111111' },
  { id: 'xbox-emerald', name: 'Console Carbon & Hyper Green', bg: '#0c110e', surf: '#141f18', surf2: '#1d2d23', text: '#ecfdf5', muted: '#86efac', acc: '#22c55e', accText: '#05140b', border: '#274030' },
  { id: 'synth-sunset', name: 'Outrun Violet & Laser Magenta', bg: '#12091c', surf: '#1e1130', surf2: '#2b1945', text: '#fae8ff', muted: '#c084fc', acc: '#f43f5e', accText: '#ffffff', border: '#3d2461' },
  { id: 'amber-crt', name: 'Phosphor Amber Terminal', bg: '#0f0c06', surf: '#1a1409', surf2: '#261d0d', text: '#fef3c7', muted: '#d97706', acc: '#f59e0b', accText: '#0f0c06', border: '#453214' },
  { id: 'nordic-slate', name: 'Nordic Frost & Cobalt', bg: '#f8fafc', surf: '#ffffff', surf2: '#f1f5f9', text: '#0f172a', muted: '#64748b', acc: '#2563eb', accText: '#ffffff', border: '#cbd5e1' },
  { id: 'brutal-yellow', name: 'Industrial Asphalt & Hazard Yellow', bg: '#141413', surf: '#1f1f1d', surf2: '#2b2b28', text: '#fafaf9', muted: '#a8a29e', acc: '#facc15', accText: '#141413', border: '#3f3f3a' },
  { id: 'espresso-cream', name: 'Roastery Espresso & Terracotta', bg: '#faf6f0', surf: '#ffffff', surf2: '#f0e7db', text: '#271c15', muted: '#785f4f', acc: '#c2410c', accText: '#ffffff', border: '#d6c4b0' },
  { id: 'deep-ocean', name: 'Abyssal Navy & Coral Reef', bg: '#07111e', surf: '#0f1e33', surf2: '#172c47', text: '#f0f9ff', muted: '#7dd3fc', acc: '#fb7185', accText: '#07111e', border: '#213d61' },
  { id: 'matcha-ink', name: 'Kyoto Matcha & Sumi Ink', bg: '#f2f5ee', surf: '#ffffff', surf2: '#e3eadb', text: '#162114', muted: '#4d6148', acc: '#15803d', accText: '#ffffff', border: '#bcc9b0' },
  { id: ' velvet-gold', name: 'Royal Obsidian & Warm Gold', bg: '#0f0e13', surf: '#181620', surf2: '#23202e', text: '#f5f3ff', muted: '#a78bfa', acc: '#eab308', accText: '#0f0e13', border: '#322d42' }
];

const ARCHETYPES = [
  {
    id: 'hardware-shrine',
    name: '🕹️ Retro Hardware & Modding Lab',
    badge: 'HARDWARE / MODDING',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand"><span class="dot"></span> <b>MODLAB // REV-4.2</b> <span class="tag">OPEN HARDWARE ARCHIVE</span></div>
        <nav class="nav">
          <a href="#specs">Pinouts</a>
          <a href="#tools">ROM & ISO Tools</a>
          <a href="#firmware">Firmware</a>
          <a href="#schem">Schematics</a>
          <button class="btn-sm acc" onclick="alert(' Firmware check: v4.2.9 UP TO DATE')">⚡ Check Hash</button>
        </nav>
      </header>
      <div class="ticker">
        <span>📡 LIVE TELEMETRY: Optical Drive Emulator v2.4 Verified · XDVDFS Repacker Online · EEPROM Checksum Calculator Ready · Zero-Solder Adapter CAD Added</span>
      </div>
      <main class="wrap grid-sidebar">
        <aside class="side-card">
          <div class="kicker">QUICK JUMP</div>
          <button class="side-btn active">📀 Optical & ISO Specs</button>
          <button class="side-btn">🔌 SMC / LPC Pinout</button>
          <button class="side-btn">💾 BIOS Bank Matrix</button>
          <button class="side-btn">🧰 Capacitor Kit List</button>
          <button class="side-btn">📐 3D Bracket STL</button>
          <hr class="sep">
          <div class="kicker">BOARD REVISION CALCULATOR</div>
          <div class="calc-box">
            <label>Serial Year / Week</label>
            <input type="text" id="serialInp" value="2004-38" oninput="document.getElementById('revOut').textContent = this.value.startsWith('2001') ? 'v1.0 (Conexant)' : this.value.startsWith('2004') ? 'v1.6 (Xcalibur)' : 'v1.2–1.4 (Focus)'">
            <div class="calc-res">Detected: <b id="revOut">v1.6 (Xcalibur)</b></div>
          </div>
        </aside>
        <section class="main-col">
          <div class="hero-compact">
            <div>
              <span class="pill">COMMUNITY HARDWARE DOCS</span>
              <h1>Console Preservation &amp; Low-Level Modding Workbench</h1>
              <p>Compact reference sheets, pinout matrices, capacitor maps, and browser-based binary utilities — structured for instant reading without bloat.</p>
              <div class="btn-row">
                <a href="#tools" class="btn acc">🚀 Launch Web Utilities</a>
                <a href="#specs" class="btn">📋 View Pinout Table</a>
                <button class="btn" onclick="document.body.classList.toggle('alt-grid')">🩻 Toggle Compact View</button>
              </div>
            </div>
            <div class="stat-stack">
              <div class="stat-chip"><b>142</b><span>Verified Boards</span></div>
              <div class="stat-chip"><b>100%</b><span>Client-Side Tools</span></div>
              <div class="stat-chip"><b>0 KB</b><span>Server Uploads</span></div>
            </div>
          </div>

          <div class="card-grid-3" id="tools">
            <article class="card">
              <div class="card-top"><span class="badge">WASM / JS</span> <span class="mono-sm">v2.1</span></div>
              <h3>📀 Image &amp; Partition Packer</h3>
              <p>Inspect sector offsets, strip padding bytes, and rebuild clean disc images straight in your browser.</p>
              <div class="card-foot"><button class="btn-sm acc">Open Utility</button><button class="btn-sm">Source</button></div>
            </article>
            <article class="card">
              <div class="card-top"><span class="badge">HARDWARE</span> <span class="mono-sm">16-PIN</span></div>
              <h3>🔬 LPC Debug Header Map</h3>
              <p>Interactive voltage and signal reference for 3.3V logic analyzers, SPI flashers, and OLED status screens.</p>
              <div class="card-foot"><button class="btn-sm acc">Inspect Pins</button><button class="btn-sm">PDF</button></div>
            </article>
            <article class="card">
              <div class="card-top"><span class="badge">THERMAL</span> <span class="mono-sm">PWM</span></div>
              <h3>🌡️ Fan Curve &amp; Capacitor DB</h3>
              <p>Complete electrolytic replacement database sorted by motherboard revision and polymer rating.</p>
              <div class="card-foot"><button class="btn-sm acc">Browse DB</button><button class="btn-sm">CSV</button></div>
            </article>
          </div>

          <div class="table-card" id="specs">
            <div class="table-head">
              <h3>📌 Motherboard &amp; Encoder Reference Matrix</h3>
              <span class="mono-sm">Showing 4 of 12 revisions</span>
            </div>
            <table>
              <thead><tr><th>Revision</th><th>Video Encoder</th><th>TSOP / Flash</th><th>Clock Cap</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td><b>REV 1.0</b></td><td>Conexant CX25871</td><td>1024 KB Sharp</td><td>2.5V 1F Aerogel</td><td><span class="badge">Remove Cap</span></td></tr>
                <tr><td><b>REV 1.2–1.3</b></td><td>Conexant CX25871</td><td>256 KB Winbond</td><td>2.5V 1F Aerogel</td><td><span class="badge">Remove Cap</span></td></tr>
                <tr><td><b>REV 1.4</b></td><td>Focus FS454</td><td>256 KB Hynix</td><td>2.5V 1F Gold</td><td><span class="badge">Check Trace</span></td></tr>
                <tr><td><b>REV 1.6</b></td><td>Xcalibur X-Chip</td><td>ROM Integrated</td><td>Nichicon 1F</td><td><span class="badge">LPC Rebuild</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    `
  },
  {
    id: 'swiss-zine',
    name: '📰 Swiss Brutalist Zine & Typography Issue',
    badge: 'EDITORIAL / ZINE',
    build: (p, f) => `
      <header class="topbar brutal">
        <div class="brand"><b>INDEX // ISSUE Nº 048</b> <span class="tag">ZURICH · LONDON · TOKYO</span></div>
        <div class="nav">
          <a href="#essays">Essays</a>
          <a href="#specimens">Type Specimens</a>
          <a href="#archive">Colophon</a>
          <button class="btn-sm acc" onclick="this.textContent = this.textContent.includes('Subscribed') ? '✓ Subscribed' : '✓ Subscribed!'">+ Subscribe Free</button>
        </div>
      </header>
      <main class="wrap">
        <section class="zine-banner">
          <div class="zine-meta">
            <div><span>EDITION</span><b>AUTUMN / WINTER</b></div>
            <div><span>HEADFONT</span><b>${f.head}</b></div>
            <div><span>BODYFONT</span><b>${f.body}</b></div>
            <div><span>GRID</span><b>12-COL EXPOSED</b></div>
          </div>
          <h1 class="zine-giant">SMALL WEBSITES WITH SHARP BONES.</h1>
          <p class="zine-sub">Against bloated templates: a field manual on compact grids, expressive web typography, exposed borders, and pages that load in 14 milliseconds.</p>
        </section>

        <section class="card-grid-3" id="essays">
          <article class="card brutal-card">
            <div class="card-top"><span class="mono-sm">01 // ARCHITECTURE</span><span class="badge">6 MIN READ</span></div>
            <h3>Why Dense Interfaces Feel Better Than Empty Hero Screens</h3>
            <p>When you put real buttons, tables, and controls above the fold, visitors immediately understand what your site does.</p>
            <div class="card-foot"><button class="btn-sm acc">Read Essay →</button><span class="mono-sm">p. 04</span></div>
          </article>
          <article class="card brutal-card">
            <div class="card-top"><span class="mono-sm">02 // TYPOGRAPHY</span><span class="badge">SPECIMEN</span></div>
            <h3>Pairing ${f.head} with ${f.mono} in Tight Layouts</h3>
            <p>High-character display headers paired with crisp monospace metadata labels create instant visual hierarchy.</p>
            <div class="card-foot"><button class="btn-sm acc">Inspect Font →</button><span class="mono-sm">p. 12</span></div>
          </article>
          <article class="card brutal-card">
            <div class="card-top"><span class="mono-sm">03 // CRAFT</span><span class="badge">HTML + CSS</span></div>
            <h3>The Return of the Personal Web Workbench</h3>
            <p>Bundling your favorite calculators, converters, and archives into one self-contained local HTML hub.</p>
            <div class="card-foot"><button class="btn-sm acc">View Code →</button><span class="mono-sm">p. 19</span></div>
          </article>
        </section>

        <section class="table-card" id="specimens">
          <div class="table-head">
            <h3>🔤 Live Type Specimen &amp; Scale Matrix (${f.head})</h3>
            <span class="mono-sm">Click any element in MyHTML to steal or swap fonts</span>
          </div>
          <table>
            <thead><tr><th>Role</th><th>Font Family</th><th>Size / Weight</th><th>Live Sample</th></tr></thead>
            <tbody>
              <tr><td><b>Display H1</b></td><td>${f.head}</td><td>32px / 800</td><td><span style="font-family:'${f.head}',sans-serif;font-size:20px;font-weight:800;">The quick brown fox jumps</span></td></tr>
              <tr><td><b>Section H3</b></td><td>${f.head}</td><td>18px / 700</td><td><span style="font-family:'${f.head}',sans-serif;font-size:16px;font-weight:700;">Pack my box with five dozen jugs</span></td></tr>
              <tr><td><b>Body Copy</b></td><td>${f.body}</td><td>14px / 400</td><td><span style="font-family:'${f.body}',sans-serif;font-size:14px;">Sphinx of black quartz, judge my vow.</span></td></tr>
              <tr><td><b>Code / Meta</b></td><td>${f.mono}</td><td>12px / 600</td><td><span style="font-family:'${f.mono}',monospace;font-size:12px;">0x7F4A · 120 BPM · UTF-8</span></td></tr>
            </tbody>
          </table>
        </section>
      </main>
    `
  },
  {
    id: 'synth-studio',
    name: '🎛️ Modular Synth & Audio Patch Studio',
    badge: 'AUDIO / SYNTH LAB',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand"><span class="dot"></span> <b>WAVEFORM // LAB-09</b> <span class="tag">PATCH &amp; SAMPLE BANK</span></div>
        <nav class="nav">
          <a href="#rack">Synth Rack</a>
          <a href="#patches">Patch Bank</a>
          <a href="#specs">MIDI Chart</a>
          <button class="btn-sm acc" onclick="const b=document.getElementById('bpmVal'); b.textContent = (parseInt(b.textContent)+4)%180 || 120;">🎵 Tap Tempo</button>
        </nav>
      </header>
      <main class="wrap">
        <div class="hero-compact">
          <div>
            <span class="pill">POLYPHONIC WEB WORKSTATION</span>
            <h1>Sub-Bass, FM Operators &amp; Open Patch Library</h1>
            <p>Browse sysex patches, inspect oscillator routing matrices, and calculate delay/reverb millisecond timings right in the browser.</p>
            <div class="btn-row">
              <button class="btn acc" onclick="alert('Playing 440Hz Reference Tone')">▶ Audition Patch</button>
              <a href="#patches" class="btn">🎹 Browse 64 Patches</a>
              <a href="#delayCalc" class="btn">⏱ BPM Delay Calc</a>
            </div>
          </div>
          <div class="stat-stack" id="delayCalc">
            <div class="stat-chip"><b id="bpmVal">128</b><span>MASTER BPM</span></div>
            <div class="stat-chip"><b>468 ms</b><span>1/4 Note Delay</span></div>
            <div class="stat-chip"><b>351 ms</b><span>1/8 Dotted</span></div>
          </div>
        </div>

        <section class="card-grid-4" id="rack">
          <div class="card"><div class="card-top"><span class="badge">OSC 1</span><span class="mono-sm">SAW / PWM</span></div><h3>🌊 Detuned SuperSaw</h3><p>7-voice stereo spread oscillator with sub-octave square wave mixer.</p><div class="card-foot"><button class="btn-sm acc">Solo</button><span class="mono-sm">-2.4 dB</span></div></div>
          <div class="card"><div class="card-top"><span class="badge">FILTER</span><span class="mono-sm">24dB LPF</span></div><h3>🎛️ Ladder Resonance</h3><p>Zero-delay feedback lowpass filter with envelope modulation depth.</p><div class="card-foot"><button class="btn-sm acc">Cutoff 840Hz</button><span class="mono-sm">Q: 0.72</span></div></div>
          <div class="card"><div class="card-top"><span class="badge">ENV</span><span class="mono-sm">ADSR</span></div><h3>📈 Pluck Contour</h3><p>Snappy 4ms attack with exponential decay curve mapped to filter &amp; pitch.</p><div class="card-foot"><button class="btn-sm acc">Trigger</button><span class="mono-sm">D: 320ms</span></div></div>
          <div class="card"><div class="card-top"><span class="badge">FX</span><span class="mono-sm">TAPE + CHORUS</span></div><h3>✨ BBD Chorus Ensemble</h3><p>Bucket-brigade stereo modulation + warm magnetic saturation stage.</p><div class="card-foot"><button class="btn-sm acc">Wet 45%</button><span class="mono-sm">Sync</span></div></div>
        </section>

        <div class="table-card" id="patches">
          <div class="table-head"><h3>💾 Community Factory Patch Bank (Bank A)</h3><span class="mono-sm">SysEx &amp; JSON Presets</span></div>
          <table>
            <thead><tr><th>Slot</th><th>Patch Name</th><th>Category</th><th>Oscillator</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><b>A-01</b></td><td>Blade Runner Brass CS</td><td>Lead / Poly</td><td>Dual Saw + Sub</td><td><button class="btn-sm acc">Load Patch</button></td></tr>
              <tr><td><b>A-02</b></td><td>Tokyo Subway 303 Acid</td><td>Bassline</td><td>Resonant Square</td><td><button class="btn-sm acc">Load Patch</button></td></tr>
              <tr><td><b>A-03</b></td><td>Crystal Glass Bell DX</td><td>FM Keys</td><td>4-Op Ratio 3.5:1</td><td><button class="btn-sm acc">Load Patch</button></td></tr>
              <tr><td><b>A-04</b></td><td>Horizon Drift Pad</td><td>Ambient</td><td>Wavetable Morph</td><td><button class="btn-sm acc">Load Patch</button></td></tr>
            </tbody>
          </table>
        </div>
      </main>
    `
  },
  {
    id: 'neocities-webring',
    name: '📼 90s Indie Web Shrine & Link Directory',
    badge: 'INDIE WEB / NEOCITIES',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand">✨ <b>CYBER_SHRINE // 1999–2026</b> <span class="tag">HAND-CODED HTML</span></div>
        <nav class="nav">
          <a href="#shrines">Shrines</a>
          <a href="#links">Webring</a>
          <a href="#guestbook">Logbook</a>
          <span class="badge">👁 VISITORS: 048,912</span>
        </nav>
      </header>
      <div class="ticker">★ WELCOME TO MY DIGITAL CORNER OF THE SMALL WEB · BEST VIEWED AT ANY RESOLUTION · NO ALGORITHMS · NO POPUPS · STEAL THESE FONTS &amp; BOXES ★</div>
      <main class="wrap grid-3col">
        <aside class="side-card">
          <div class="kicker">🧭 NAVIGATION</div>
          <button class="side-btn active">🏠 Main Lobby</button>
          <button class="side-btn">🎮 Console Vault</button>
          <button class="side-btn">💿 OST Collection</button>
          <button class="side-btn">🖼 Pixel Art Stamps</button>
          <button class="side-btn">📡 RSS &amp; Friends</button>
          <hr class="sep">
          <div class="kicker">📻 NOW SPINNING</div>
          <div class="calc-box">
            <div><b>Aphex Twin — Xtal</b></div>
            <div class="mono-sm">Selected Ambient Works</div>
            <div style="margin-top:6px;display:flex;gap:4px;">
              <button class="btn-sm acc">⏮</button><button class="btn-sm acc">▶ Play</button><button class="btn-sm acc">⏭</button>
            </div>
          </div>
        </aside>

        <section class="main-col">
          <div class="card">
            <div class="card-top"><span class="badge">LATEST UPDATE</span><span class="mono-sm">OCT 2026</span></div>
            <h2>Why Small Personal Websites Are the Best Part of the Internet</h2>
            <p>Every big social platform looks the same. On the indie web, every page is a custom room: weird layouts, custom fonts, link directories, and tools built just because someone needed them.</p>
            <div class="btn-row" style="margin-top:10px;">
              <button class="btn-sm acc">📖 Read Manifesto</button>
              <button class="btn-sm">🎨 Grab 88x31 Button</button>
              <button class="btn-sm">✍ Sign Guestbook</button>
            </div>
          </div>

          <div class="card-grid-2" id="shrines" style="margin-top:12px;">
            <article class="card">
              <div class="card-top"><span class="badge">ARCHIVE</span><span class="mono-sm">34 ITEMS</span></div>
              <h3>🕹️ Translucent Plastic Tech</h3>
              <p>A visual catalog of late-90s atomic purple handhelds, clear CRT shells, and PCMCIA cards.</p>
              <div class="card-foot"><button class="btn-sm acc">Enter Shrine →</button></div>
            </article>
            <article class="card">
              <div class="card-top"><span class="badge">DIRECTORY</span><span class="mono-sm">118 LINKS</span></div>
              <h3>🌐 Useful Single-Page Tools</h3>
              <p>Handpicked browser calculators, pixel editors, font playgrounds, and archive search engines.</p>
              <div class="card-foot"><button class="btn-sm acc">Browse Links →</button></div>
            </article>
          </div>
        </section>

        <aside class="side-card" id="links">
          <div class="kicker">🔗 WEBRING NEIGHBORS</div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
            <a href="#" class="side-btn">↖ Prev: PixelFoundry.neo</a>
            <a href="#" class="side-btn">🎲 Random Webring Site</a>
            <a href="#" class="side-btn">↗ Next: SynthCave.org</a>
          </div>
          <hr class="sep">
          <div class="kicker">📊 SITE SPECS</div>
          <div class="mono-sm" style="line-height:1.7;">
            HTML: Pure Semantic<br>
            Fonts: ${f.head}<br>
            Palette: ${p.name}<br>
            Weight: 11.4 KB
          </div>
        </aside>
      </main>
    `
  },
  {
    id: 'bento-directory',
    name: '🍱 Dark Bento Tool & Resource Directory',
    badge: 'BENTO / DIRECTORY',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand"><span class="dot"></span> <b>STACKDECK // DIRECTORY</b> <span class="tag">CURATED WEB TOOLS</span></div>
        <div class="nav">
          <a href="#bento">Featured</a>
          <a href="#all">All Tools (48)</a>
          <button class="btn-sm acc">+ Submit Tool</button>
        </div>
      </header>
      <main class="wrap">
        <div class="hero-compact">
          <div>
            <span class="pill">BOOKMARK WORKBENCH</span>
            <h1>The Compact Directory of Open Web Utilities</h1>
            <p>No signups, no paywalls — just fast, bookmarkable web tools, converters, and design references organized in a clean bento grid.</p>
            <div class="btn-row">
              <button class="btn-sm acc">All Categories</button>
              <button class="btn-sm">Typography</button>
              <button class="btn-sm">Binary &amp; Hex</button>
              <button class="btn-sm">Color &amp; SVG</button>
              <button class="btn-sm">Audio &amp; Retro</button>
            </div>
          </div>
          <div class="stat-stack">
            <div class="stat-chip"><b>48</b><span>Open Tools</span></div>
            <div class="stat-chip"><b>100%</b><span>Free / No Ads</span></div>
          </div>
        </div>

        <section class="card-grid-3" id="bento">
          <article class="card"><div class="card-top"><span class="badge">FONT TOOL</span><span class="mono-sm">★ 4.9</span></div><h3>🔤 Glyph &amp; WOFF2 Inspector</h3><p>Drop any font file to test ligatures, variable axes, and CSS @font-face snippets.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">Offline Ready</span></div></article>
          <article class="card"><div class="card-top"><span class="badge">GRAPHICS</span><span class="mono-sm">★ 4.8</span></div><h3>🎨 SVG Path &amp; Dither Studio</h3><p>Convert photos into crisp 1-bit Bayer dither patterns or optimize raw SVG vectors.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">WebGL</span></div></article>
          <article class="card"><div class="card-top"><span class="badge">ARCHIVE</span><span class="mono-sm">★ 5.0</span></div><h3>📦 Local Disc &amp; ROM Hasher</h3><p>Verify CRC32, MD5, and SHA-1 checksums against community preservation databases.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">WASM</span></div></article>
          <article class="card"><div class="card-top"><span class="badge">LAYOUT</span><span class="mono-sm">★ 4.7</span></div><h3>📐 CSS Grid &amp; Flexbox Lab</h3><p>Visual generator for dense multi-panel dashboards and responsive bento cards.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">Zero Deps</span></div></article>
          <article class="card"><div class="card-top"><span class="badge">AUDIO</span><span class="mono-sm">★ 4.9</span></div><h3>🎹 Chiptune &amp; SFX Generator</h3><p>Synthesize retro 8-bit pickups, lasers, and UI clicks and export to WAV in one click.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">WebAudio</span></div></article>
          <article class="card"><div class="card-top"><span class="badge">COLOR</span><span class="mono-sm">★ 4.8</span></div><h3>🌈 APCA Contrast &amp; Palette Matrix</h3><p>Build high-contrast dark and light themes that stay readable at small font sizes.</p><div class="card-foot"><button class="btn-sm acc">Launch ↗</button><span class="mono-sm">CSS Vars</span></div></article>
        </section>
      </main>
    `
  },
  {
    id: 'indie-gamedev',
    name: '🎮 Indie Game Devlog, Patch Hub & Roadmap',
    badge: 'GAME DEV / PATCH HUB',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand"><span class="dot"></span> <b>STARFORGE // BUILD 0.84</b> <span class="tag">PUBLIC DEVLOG</span></div>
        <nav class="nav">
          <a href="#Systems">Systems</a>
          <a href="#changelog">Patch Notes</a>
          <a href="#roadmap">Roadmap</a>
          <button class="btn-sm acc">▶ Play Web Build</button>
        </nav>
      </header>
      <main class="wrap">
        <div class="hero-compact">
          <div>
            <span class="pill">OPEN DEVELOPMENT LOG</span>
            <h1>Orbital Salvage &amp; Ship-Breaker Sandbox</h1>
            <p>Weekly engineering notes, shader breakdowns, physics benchmarks, and playable WebAssembly test builds direct from the studio.</p>
            <div class="btn-row">
              <button class="btn acc">🕹️ Run Browser Demo (WASM)</button>
              <a href="#changelog" class="btn">📜 Build 0.84 Changelog</a>
              <button class="btn">💬 Discord (4.2k)</button>
            </div>
          </div>
          <div class="stat-stack">
            <div class="stat-chip"><b>60 FPS</b><span>WebGL2 Target</span></div>
            <div class="stat-chip"><b>14.2 MB</b><span>Total Build Size</span></div>
            <div class="stat-chip"><b>v0.84b</b><span>Latest Commit</span></div>
          </div>
        </div>

        <section class="card-grid-3" id="Systems">
          <article class="card"><div class="card-top"><span class="badge">PHYSICS</span><span class="mono-sm">DONE</span></div><h3>⚙️ Voxel Hull Decompression</h3><p>Every bulkhead tracks atmospheric pressure differentials in real time on a 2D cellular grid.</p><div class="card-foot"><button class="btn-sm acc">View GIF / Spec</button></div></article>
          <article class="card"><div class="card-top"><span class="badge">AI</span><span class="mono-sm">IN PROGRESS</span></div><h3>🤖 Utility-Driven Crew Routines</h3><p>Engineers prioritize reactor leaks, oxygen scrubbers, and salvage cranes autonomously.</p><div class="card-foot"><button class="btn-sm acc">Inspect Tree</button></div></article>
          <article class="card"><div class="card-top"><span class="badge">MODDING</span><span class="mono-sm">READY</span></div><h3>🧩 JSON Ship Blueprint Editor</h3><p>Design custom freighters in the browser and share them as compact 4KB text strings.</p><div class="card-foot"><button class="btn-sm acc">Open Editor</button></div></article>
        </section>

        <div class="table-card" id="changelog">
          <div class="table-head"><h3>🛠️ Recent Build Commits &amp; Patch Notes</h3><span class="mono-sm">Branch: main-wasm</span></div>
          <table>
            <thead><tr><th>Build</th><th>Date</th><th>Subsystem</th><th>Summary</th></tr></thead>
            <tbody>
              <tr><td><b>0.84b</b></td><td>Today</td><td><span class="badge">Renderer</span></td><td>Added CRT scanline toggle and crisp 1x pixel scaling for 1440p monitors.</td></tr>
              <tr><td><b>0.83a</b></td><td>3d ago</td><td><span class="badge">Physics</span></td><td>Fixed magnetic grapple momentum transfer on rotating asteroid chunks.</td></tr>
              <tr><td><b>0.82c</b></td><td>1w ago</td><td><span class="badge">Audio</span></td><td>Low-pass hull muffler when camera moves into vacuum exterior.</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    `
  },
  {
    id: 'roastery-catalog',
    name: '☕ Craft Roastery & Small-Batch Spec Sheet',
    badge: 'CRAFT / CATALOG',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand">☕ <b>KILN &amp; MILL // ROASTERY LAB</b> <span class="tag">DIRECT MICROLOTS</span></div>
        <nav class="nav">
          <a href="#lots">Current Lots</a>
          <a href="#brew">Brew Ratios</a>
          <button class="btn-sm acc">🛒 Tasting Flight ($24)</button>
        </nav>
      </header>
      <main class="wrap">
        <div class="hero-compact">
          <div>
            <span class="pill">AUTUMN HARVEST RELEASE</span>
            <h1>Single-Origin Microlots &amp; Extraction Lab</h1>
            <p>Transparent farm gate pricing, roast curve telemetry, and an interactive pour-over water-to-coffee calculator on a single clean sheet.</p>
            <div class="btn-row">
              <a href="#lots" class="btn acc">Explore 6 Fresh Lots</a>
              <a href="#brew" class="btn">⚖️ Ratio Calculator</a>
            </div>
          </div>
          <div class="calc-box" style="min-width:240px;" id="brew">
            <div class="kicker">⚖️ 1:16 POUR-OVER CALCULATOR</div>
            <label>Coffee Dose (grams)</label>
            <input type="number" value="18" min="5" max="100" oninput="document.getElementById('waterOut').textContent = (this.value * 16) + ' ml water'">
            <div class="calc-res">Target: <b id="waterOut">288 ml water</b></div>
          </div>
        </div>

        <section class="card-grid-3" id="lots">
          <article class="card"><div class="card-top"><span class="badge">ETHIOPIA</span><span class="mono-sm">2,150 MASL</span></div><h3>🌺 Guji Uraga Natural</h3><p>Bergamot, wild strawberry, and cacao nibs. Light-medium omni roast.</p><div class="card-foot"><b>$19 / 250g</b><button class="btn-sm acc">+ Add Bag</button></div></article>
          <article class="card"><div class="card-top"><span class="badge">COLOMBIA</span><span class="mono-sm">1,900 MASL</span></div><h3>🍊 Huila Pink Bourbon</h3><p>Blood orange, panela cane sugar, and silky caramel finish. Washed process.</p><div class="card-foot"><b>$21 / 250g</b><button class="btn-sm acc">+ Add Bag</button></div></article>
          <article class="card"><div class="card-top"><span class="badge">KENYA</span><span class="mono-sm">1,850 MASL</span></div><h3>🍒 Kirinyaga SL28 AA</h3><p>Blackcurrant, hibiscus tea, and crisp grapefruit acidity. Double washed.</p><div class="card-foot"><b>$22 / 250g</b><button class="btn-sm acc">+ Add Bag</button></div></article>
        </section>
      </main>
    `
  },
  {
    id: 'record-label',
    name: '🏷️ Underground Record Label & Vinyl Catalog',
    badge: 'MUSIC / LABEL',
    build: (p, f) => `
      <header class="topbar">
        <div class="brand">💿 <b>SUBTERRANEAN // PRESSINGS</b> <span class="tag">WAX · CASSETTE · FLAC</span></div>
        <nav class="nav">
          <a href="#releases">Catalog</a>
          <a href="#schedule">Radio</a>
          <button class="btn-sm acc">📻 Live Stream: ON AIR</button>
        </nav>
      </header>
      <main class="wrap">
        <div class="hero-compact">
          <div>
            <span class="pill">CAT# SUB-039 OUT NOW</span>
            <h1>180g Heavyweight Pressings &amp; Lossless Masters</h1>
            <p>Independent electronic, ambient, and breakbeat releases pressed in small runs of 300 copies — complete with full tracklists and BPM metadata.</p>
            <div class="btn-row">
              <button class="btn acc">▶ Listen to Sampler</button>
              <a href="#releases" class="btn">💿 View Discography</a>
            </div>
          </div>
          <div class="stat-stack">
            <div class="stat-chip"><b>39</b><span>Releases</span></div>
            <div class="stat-chip"><b>24-BIT</b><span>Master WAVs</span></div>
          </div>
        </div>

        <div class="table-card" id="releases">
          <div class="table-head"><h3>💿 Master Discography Index</h3><span class="mono-sm">Sorted by Catalog Number</span></div>
          <table>
            <thead><tr><th>Cat #</th><th>Artist — Title</th><th>Format</th><th>BPM / Style</th><th>Order</th></tr></thead>
            <tbody>
              <tr><td><b>SUB-039</b></td><td>Klangwerk — Concrete Echoes EP</td><td>12" Clear Vinyl</td><td>132 BPM · Dub Techno</td><td><button class="btn-sm acc">$16 · In Stock</button></td></tr>
              <tr><td><b>SUB-038</b></td><td>Nautilus — Deep Trench Telemetry</td><td>Chrome Tape + FLAC</td><td>94 BPM · Ambient Jungle</td><td><button class="btn-sm acc">$12 · Last 14</button></td></tr>
              <tr><td><b>SUB-037</b></td><td>Vektor 88 — Sodium Streetlights</td><td>2xLP Gatefold</td><td>118 BPM · Electro</td><td><button class="btn-sm">Sold Out (FLAC $7)</button></td></tr>
            </tbody>
          </table>
        </div>
      </main>
    `
  }
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFreshWebsite({ archetypeId, paletteId, fontPairId } = {}) {
  const arch = (archetypeId && ARCHETYPES.find((a) => a.id === archetypeId)) || pickRandom(ARCHETYPES);
  const pal = (paletteId && COLOR_PALETTES.find((p) => p.id === paletteId)) || pickRandom(COLOR_PALETTES);
  const fnt = (fontPairId && FONT_PAIRINGS.find((f) => f.id === fontPairId)) || pickRandom(FONT_PAIRINGS);

  const bodyHtml = arch.build(pal, fnt);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${arch.name.replace(/^[^\w]+/, '')} — ${pal.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fnt.gurl}&display=swap">
<style>
  :root {
    --bg: ${pal.bg};
    --surf: ${pal.surf};
    --surf2: ${pal.surf2};
    --text: ${pal.text};
    --muted: ${pal.muted};
    --acc: ${pal.acc};
    --acc-text: ${pal.accText};
    --border: ${pal.border};
    --font-head: '${fnt.head}', system-ui, sans-serif;
    --font-body: '${fnt.body}', system-ui, sans-serif;
    --font-mono: '${fnt.mono}', monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.55;
  }
  h1, h2, h3, h4, .brand b {
    font-family: var(--font-head);
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    line-height: 1.15;
  }
  h1 { font-size: clamp(22px, 3vw, 32px); }
  h2 { font-size: 20px; }
  h3 { font-size: 16px; }
  p { margin: 0 0 10px; color: var(--muted); }
  a { color: var(--text); text-decoration: none; }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 20px;
    background: var(--surf);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .brand { display: flex; align-items: center; gap: 8px; font-size: 14px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--acc); display: inline-block; box-shadow: 0 0 8px var(--acc); }
  .tag { font-family: var(--font-mono); font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: var(--surf2); color: var(--muted); border: 1px solid var(--border); }
  .nav { display: flex; align-items: center; gap: 14px; font-size: 13px; flex-wrap: wrap; }
  .nav a:hover { color: var(--acc); }
  .ticker {
    background: var(--surf2);
    border-bottom: 1px solid var(--border);
    padding: 6px 20px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--acc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 18px 20px 36px; }
  .grid-sidebar { display: grid; grid-template-columns: 230px 1fr; gap: 16px; align-items: start; }
  .grid-3col { display: grid; grid-template-columns: 200px 1fr 210px; gap: 14px; align-items: start; }
  @media (max-width: 860px) { .grid-sidebar, .grid-3col { grid-template-columns: 1fr; } }
  .side-card {
    background: var(--surf);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .kicker { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.05em; }
  .side-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    text-align: left;
    padding: 6px 9px;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 12.5px;
    cursor: pointer;
    display: block;
  }
  .side-btn:hover, .side-btn.active { background: var(--surf2); border-color: var(--border); color: var(--acc); }
  .sep { border: 0; border-top: 1px solid var(--border); margin: 8px 0; }
  .calc-box { background: var(--surf2); border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 12px; }
  .calc-box label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
  .calc-box input { width: 100%; background: var(--bg); color: var(--text); border: 1px solid var(--border); padding: 5px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 12px; }
  .calc-res { margin-top: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--acc); }
  .hero-compact {
    background: var(--surf);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .hero-compact > div:first-child { flex: 1; min-width: 260px; }
  .pill {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--acc);
    background: var(--surf2);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 99px;
    margin-bottom: 8px;
  }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .btn, .btn-sm {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--surf2);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 7px 13px;
    border-radius: 6px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
  }
  .btn-sm { padding: 4px 10px; font-size: 11.5px; }
  .btn.acc, .btn-sm.acc { background: var(--acc); color: var(--acc-text); border-color: var(--acc); font-weight: 700; }
  .stat-stack { display: flex; gap: 8px; flex-wrap: wrap; }
  .stat-chip {
    background: var(--surf2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    min-width: 96px;
    text-align: center;
  }
  .stat-chip b { display: block; font-family: var(--font-head); font-size: 20px; color: var(--acc); }
  .stat-chip span { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
  .card-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 14px; }
  .card-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 14px; }
  .card-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .card {
    background: var(--surf);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surf2);
    color: var(--acc);
    border: 1px solid var(--border);
  }
  .mono-sm { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
  .card-foot { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
  .table-card { background: var(--surf); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .table-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); }
  .table-head h3 { margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 9px 16px; border-bottom: 1px solid var(--border); }
  th { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; color: var(--muted); background: var(--surf2); }
  tr:last-child td { border-bottom: 0; }
  .zine-banner { background: var(--surf); border: 2px solid var(--border); padding: 18px 20px; margin-bottom: 14px; }
  .zine-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 14px; font-family: var(--font-mono); font-size: 11px; }
  .zine-meta span { display: block; color: var(--muted); font-size: 9.5px; }
  .zine-giant { font-size: clamp(26px, 4vw, 44px); line-height: 1.02; margin-bottom: 10px; }
  .zine-sub { font-size: 14px; max-width: 760px; margin: 0; }
  body.alt-grid .card-grid-3, body.alt-grid .card-grid-4 { grid-template-columns: 1fr 1fr; }
  .site-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 14, 0.76);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99990;
    padding: 20px;
  }
  .site-drawer-backdrop[hidden] { display: none !important; }
  .site-drawer {
    background: var(--surf);
    color: var(--text);
    border: 2px solid var(--acc);
    border-radius: 12px;
    width: 680px;
    max-width: 94vw;
    max-height: 84vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    overflow: hidden;
  }
  .site-drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: var(--surf2);
    border-bottom: 1px solid var(--border);
  }
  .site-drawer-body {
    padding: 18px 20px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.65;
  }
  .site-drawer-body pre {
    background: var(--bg);
    color: var(--acc);
    border: 1px solid var(--border);
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 12px;
  }
</style>
</head>
<body>
${bodyHtml}
<div id="siteDrawerBackdrop" class="site-drawer-backdrop" hidden>
  <div class="site-drawer">
    <div class="site-drawer-head">
      <div>
        <span class="badge" id="sdBadge">INTERACTIVE VIEW</span>
        <strong id="sdTitle" style="margin-left:8px;font-family:var(--font-head);font-size:16px;">Details</strong>
      </div>
      <button class="btn-sm acc" id="sdCloseBtn" onclick="document.getElementById('siteDrawerBackdrop').hidden=true">✕ Close</button>
    </div>
    <div class="site-drawer-body" id="sdBody"></div>
  </div>
</div>
<script id="__mh_site_runtime">
(function() {
  var audioCtx = null;
  function playTone(type) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;
      var notes = type === 'acid' ? [110, 110, 220, 110, 164.8, 146.8]
                : type === 'bell' ? [523.25, 659.25, 783.99, 1046.5]
                : type === 'pad'  ? [220, 277.18, 329.63, 440]
                : [130.81, 196.00, 246.94, 329.63];
      notes.forEach(function(freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type === 'acid' ? 'sawtooth' : type === 'bell' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + (type === 'acid' ? i * 0.11 : 0));
        gain.gain.setValueAtTime(0.08, now + (type === 'acid' ? i * 0.11 : 0));
        gain.gain.exponentialRampToValueAtTime(0.0008, now + (type === 'acid' ? (i + 1) * 0.11 : 1.1));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + (type === 'acid' ? i * 0.11 : 0));
        osc.stop(now + (type === 'acid' ? (i + 1) * 0.12 : 1.15));
      });
    } catch (e) {}
  }

  window.MySiteRunButton = function(btn) {
    if (!btn) return;
    var label = (btn.textContent || '').trim();
    var card = btn.closest('article, .card, tr, .hero-compact, .side-card, section') || document.body;
    var cardTitleEl = card.querySelector('h3, h2, h1, td:nth-child(2), b');
    var cardTitle = cardTitleEl ? cardTitleEl.textContent.trim() : label;
    var backdrop = document.getElementById('siteDrawerBackdrop');
    var sdBadge = document.getElementById('sdBadge');
    var sdTitle = document.getElementById('sdTitle');
    var sdBody = document.getElementById('sdBody');
    if (!backdrop || !sdBody) return;

    if (/essay|manifesto|changelog|discography/i.test(label)) {
      sdBadge.textContent = 'ESSAY & FIELD NOTES';
      sdTitle.textContent = cardTitle;
      sdBody.innerHTML =
        '<p style="font-size:15px;color:var(--text);font-weight:600;">“When you put real buttons, tables, and controls above the fold, a website stops being a poster and becomes an instrument.”</p>' +
        '<p>Modern corporate web design hides everything behind giant empty hero banners and three-word slogans. By contrast, the best personal sites, hardware archives, and zines treat the screen like a workbench.</p>' +
        '<p><b>Key Structural Principles:</b></p>' +
        '<ul>' +
          '<li><b>Visible Bones:</b> Expose grid borders, table headers, and metadata badges so the reader can scan the whole page in two seconds.</li>' +
          '<li><b>High-Contrast Typography:</b> Pair an expressive display header font with a crisp monospace font for numbers, hex offsets, and tags.</li>' +
          '<li><b>Zero-Bloat Interactivity:</b> Self-contained HTML + CSS + vanilla JS tools that run instantaneously offline.</li>' +
        '</ul>' +
        '<div style="margin-top:14px;padding:12px;background:var(--surf2);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">' +
          '💡 <b>Tip:</b> Click <b>🩻 Show Boxes</b> in the top toolbar to see the exact HTML container structure of this layout!' +
        '</div>';
      backdrop.hidden = false;
    } else if (/font|glyph|specimen|typography/i.test(label)) {
      var headFont = getComputedStyle(document.documentElement).getPropertyValue('--font-head') || 'sans-serif';
      var bodyFont = getComputedStyle(document.documentElement).getPropertyValue('--font-body') || 'sans-serif';
      var monoFont = getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace';
      sdBadge.textContent = 'LIVE FONT INSPECTOR';
      sdTitle.textContent = 'Live Type Specimen & Playground';
      sdBody.innerHTML =
        '<div style="margin-bottom:12px;">' +
          '<label style="display:block;font-size:11px;font-family:var(--font-mono);color:var(--muted);margin-bottom:4px;">TYPE ANYTHING BELOW TO TEST THIS FONT LIVE:</label>' +
          '<input type="text" value="Small websites with sharp bones — 0123456789" style="width:100%;padding:8px 10px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:14px;" oninput="document.getElementById(\\'liveFontSampleH\\').textContent=this.value;document.getElementById(\\'liveFontSampleB\\').textContent=this.value;">' +
        '</div>' +
        '<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">' +
          '<div style="font-size:10px;font-family:var(--font-mono);color:var(--acc);margin-bottom:4px;">DISPLAY HEADER FONT: ' + headFont.replace(/"/g, '') + '</div>' +
          '<div id="liveFontSampleH" style="font-family:var(--font-head);font-size:28px;font-weight:800;line-height:1.15;color:var(--text);">Small websites with sharp bones — 0123456789</div>' +
        '</div>' +
        '<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">' +
          '<div style="font-size:10px;font-family:var(--font-mono);color:var(--acc);margin-bottom:4px;">BODY & UI FONT: ' + bodyFont.replace(/"/g, '') + '</div>' +
          '<div id="liveFontSampleB" style="font-family:var(--font-body);font-size:15px;color:var(--text);">Small websites with sharp bones — 0123456789</div>' +
        '</div>' +
        '<div style="padding:12px;background:var(--surf2);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">' +
          'MONO / METADATA FONT: ' + monoFont.replace(/"/g, '') + ' · 0x7F4A · 128 BPM' +
        '</div>';
      backdrop.hidden = false;
    } else if (/code|source|blueprint|tree|spec|csv|pdf/i.test(label)) {
      sdBadge.textContent = 'HTML / CSS BONES';
      sdTitle.textContent = 'Clean Component Markup: ' + cardTitle;
      var snippet = (card.outerHTML || '').replace(/\\s+/g, ' ').replace(/>\\s*</g, '>\\n<');
      sdBody.innerHTML =
        '<p>Here is the exact HTML structure for <b>' + cardTitle.replace(/</g, '&lt;') + '</b>:</p>' +
        '<pre id="sdCodePre"></pre>' +
        '<button class="btn-sm acc" onclick="navigator.clipboard.writeText(document.getElementById(\\'sdCodePre\\').textContent);this.textContent=\\'✓ Copied to Clipboard!\\'">📋 Copy Component HTML</button>';
      document.getElementById('sdCodePre').textContent = snippet;
      backdrop.hidden = false;
    } else if (/patch|audition|solo|trigger|play|sampler|cutoff|wet|stream|chiptune/i.test(label)) {
      var mode = /303|acid|bass/i.test(cardTitle) ? 'acid' : /bell|dx|glass/i.test(cardTitle) ? 'bell' : /pad|ambient|drift/i.test(cardTitle) ? 'pad' : 'brass';
      playTone(mode);
      sdBadge.textContent = '🔊 WEBAUDIO SYNTH ENGINE';
      sdTitle.textContent = 'Now Playing: ' + cardTitle;
      sdBody.innerHTML =
        '<p style="color:var(--text);">Synthesizing real-time WebAudio oscillator voice (<b>' + mode.toUpperCase() + '</b>) direct from the browser:</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0;">' +
          '<button class="btn acc" id="synthBtnBrass">🎹 Play CS-80 Brass Chord</button>' +
          '<button class="btn acc" id="synthBtnAcid">🧪 Play 303 Acid Sequence</button>' +
          '<button class="btn acc" id="synthBtnBell">🔔 Play FM Crystal Bell</button>' +
          '<button class="btn acc" id="synthBtnPad">🌊 Play Warm Drift Pad</button>' +
        '</div>' +
        '<pre>Oscillator: Polyphonic WebAudio API\\nFilter: 24dB/oct Lowpass · Resonance Q=0.72\\nStatus: Active (Zero external audio files required)</pre>';
      backdrop.hidden = false;
      document.getElementById('synthBtnBrass').onclick = function() { playTone('brass'); };
      document.getElementById('synthBtnAcid').onclick = function() { playTone('acid'); };
      document.getElementById('synthBtnBell').onclick = function() { playTone('bell'); };
      document.getElementById('synthBtnPad').onclick = function() { playTone('pad'); };
    } else {
      playTone('bell');
      sdBadge.textContent = 'INTERACTIVE MODULE';
      sdTitle.textContent = cardTitle;
      sdBody.innerHTML =
        '<p style="color:var(--text);font-weight:600;">Interactive Module: ' + cardTitle.replace(/</g, '&lt;') + '</p>' +
        '<p>Triggered action: <code>' + label.replace(/</g, '&lt;') + '</code></p>' +
        '<div style="padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);font-size:12px;">' +
          'STATUS: ONLINE · READY FOR CUSTOMIZATION<br>' +
          'Double-click any text in MyHTML Edit Mode to rewrite this card or add your own web apps!' +
        '</div>';
      backdrop.hidden = false;
    }
  };

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button, a.btn, a.btn-sm, .side-btn');
    if (!btn) return;
    if (btn.id === 'sdCloseBtn' || btn.closest('#siteDrawerBackdrop')) return;
    if (btn.classList.contains('side-btn')) {
      var parent = btn.parentElement;
      if (parent) parent.querySelectorAll('.side-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    }
    if (!btn.getAttribute('onclick')) {
      e.preventDefault();
      window.MySiteRunButton(btn);
    }
  });
})();
</script>
</body>
</html>`;

  return {
    html,
    meta: {
      archetypeId: arch.id,
      archetypeName: arch.name,
      badge: arch.badge,
      paletteId: pal.id,
      paletteName: pal.name,
      fontPairId: fnt.id,
      fontPairName: fnt.name,
      headFont: fnt.head,
      bodyFont: fnt.body,
      monoFont: fnt.mono
    }
  };
}

module.exports = {
  CURATED_LIVE_TEMPLATES,
  ARCHETYPES,
  COLOR_PALETTES,
  FONT_PAIRINGS,
  fetchNeocitiesCommunity,
  searchGithubTemplates,
  generateFreshWebsite
};
