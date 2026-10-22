const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function cleanFontName(name) {
  return name.replace(/^['"]|['"]$/g, '').trim();
}

function parseFontFaces(cssContent, cssDir, projectRoot) {
  const fontFaces = [];
  const ffRegex = /@font-face\s*\{([^}]+)\}/gi;
  let match;

  while ((match = ffRegex.exec(cssContent)) !== null) {
    const block = match[1];
    const familyMatch = /font-family\s*:\s*([^;]+)/i.exec(block);
    if (!familyMatch) continue;
    const family = cleanFontName(familyMatch[1]);

    const weightMatch = /font-weight\s*:\s*([^;]+)/i.exec(block);
    const weight = weightMatch ? weightMatch[1].trim() : '400';

    const styleMatch = /font-style\s*:\s*([^;]+)/i.exec(block);
    const style = styleMatch ? styleMatch[1].trim() : 'normal';

    const displayMatch = /font-display\s*:\s*([^;]+)/i.exec(block);
    const display = displayMatch ? displayMatch[1].trim() : 'swap';

    // Find src urls
    const srcUrls = [];
    const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)(?:\s*format\((['"]?)([^'")]+)\3\))?/gi;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(block)) !== null) {
      const rawUrl = urlMatch[2].trim();
      const format = urlMatch[4] ? urlMatch[4].trim().toLowerCase() : '';
      if (!rawUrl.startsWith('data:')) {
        srcUrls.push({ url: rawUrl, format });
      }
    }

    if (srcUrls.length > 0) {
      fontFaces.push({
        family,
        weight,
        style,
        display,
        srcUrls,
        rawCss: `@font-face {\n  font-family: '${family}';\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: ${display};\n  src: ${srcUrls.map(s => `url('${s.url}')${s.format ? ` format('${s.format}')` : ''}`).join(', ')};\n}`
      });
    }
  }

  return fontFaces;
}

function scanProjectFonts(projectDir) {
  const families = new Map(); // family name -> { family, variants: [], files: [] }
  const fontExts = new Set(['.woff2', '.woff', '.ttf', '.otf', '.eot']);
  const registeredFiles = new Set();

  // 1. Scan all CSS files for @font-face
  const cssDir = path.join(projectDir, 'assets', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    for (const file of cssFiles) {
      try {
        const full = path.join(cssDir, file);
        const content = fs.readFileSync(full, 'utf8');
        const faces = parseFontFaces(content, cssDir, projectDir);
        for (const face of faces) {
          let fam = families.get(face.family);
          if (!fam) {
            fam = { family: face.family, variants: [], css: [] };
            families.set(face.family, fam);
          }
          fam.css.push(face.rawCss);

          for (const s of face.srcUrls) {
            // resolve local path
            let rel = s.url.replace(/^\.\.\//, 'assets/');
            if (!rel.startsWith('assets/')) rel = 'assets/css/' + rel;
            const diskPath = path.join(projectDir, rel.replace(/\//g, path.sep));
            let sizeStr = '';
            let exists = false;
            if (fs.existsSync(diskPath)) {
              exists = true;
              registeredFiles.add(path.resolve(diskPath));
              try {
                sizeStr = formatBytes(fs.statSync(diskPath).size);
              } catch {}
            }
            const ext = path.extname(s.url).toLowerCase().replace('.', '');
            fam.variants.push({
              weight: face.weight,
              style: face.style,
              format: s.format || ext || 'woff2',
              url: rel,
              diskPath: exists ? diskPath : null,
              size: sizeStr
            });
          }
        }
      } catch (err) {
        console.error('Error reading CSS file for fonts:', file, err);
      }
    }
  }

  // 2. Scan assets/fonts and assets/files for any font files that weren't detected via CSS
  const assetFolders = ['fonts', 'files'];
  for (const folder of assetFolders) {
    const dir = path.join(projectDir, 'assets', folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!fontExts.has(ext)) continue;

      const diskPath = path.join(dir, f);
      if (registeredFiles.has(path.resolve(diskPath))) continue; // already accounted for

      // Derive font family name from filename
      let baseName = path.basename(f, ext);
      // Remove hash if any
      baseName = baseName.replace(/-[a-f0-9]{8}$/i, '');
      // Clean up separators
      let cleanFam = baseName.replace(/[-_]+/g, ' ').trim();
      // Capitalize
      cleanFam = cleanFam.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Captured Font';

      let sizeStr = '';
      try {
        sizeStr = formatBytes(fs.statSync(diskPath).size);
      } catch {}

      const rel = `assets/${folder}/${f}`;
      let fam = families.get(cleanFam);
      if (!fam) {
        fam = { family: cleanFam, variants: [], css: [] };
        families.set(cleanFam, fam);
      }
      const rawCss = `@font-face {\n  font-family: '${cleanFam}';\n  src: url('${rel}') format('${ext.slice(1)}');\n  font-display: swap;\n}`;
      fam.css.push(rawCss);
      fam.variants.push({
        weight: '400',
        style: 'normal',
        format: ext.slice(1),
        url: rel,
        diskPath,
        size: sizeStr
      });
    }
  }

  // Deduplicate variants
  const result = [];
  for (const [family, data] of families.entries()) {
    const seen = new Set();
    const uniqueVariants = [];
    for (const v of data.variants) {
      const key = `${v.weight}-${v.style}-${v.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVariants.push(v);
      }
    }
    result.push({
      family,
      variants: uniqueVariants,
      css: [...new Set(data.css)].join('\n\n')
    });
  }

  return result.sort((a, b) => a.family.localeCompare(b.family));
}

module.exports = { scanProjectFonts };
