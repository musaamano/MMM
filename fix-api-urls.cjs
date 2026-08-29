/**
 * fix-api-urls.cjs
 * Replaces every inline VITE_API_URL || localhost fallback with an import
 * from src/config.js, which is the single source of truth.
 * Run: node fix-api-urls.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');

// Patterns to replace and their correct replacements
// Pattern A: const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");
// Pattern B: const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Pattern C: const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Pattern D: const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const BASE_PATTERN = /const (BASE|BASE_URL)\s*=\s*\(?\s*import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"`]http:\/\/localhost:\d+\/api['"`]\s*\)?;/g;

// Inline fetch patterns in auth pages:
// fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/...`)
const INLINE_PATTERN = /\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"`]http:\/\/localhost:\d+\/api['"`]\}/g;

function getRelativePath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function walkDir(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      walkDir(full, callback);
    } else if (entry.isFile() && /\.(js|jsx)$/.test(entry.name)) {
      callback(full);
    }
  }
}

const configFile = path.join(SRC, 'config.js');
let fixed = 0;

walkDir(SRC, (filePath) => {
  // Skip config.js itself, api/api.js (already fixed), services/api.js
  if (filePath === configFile) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const relToConfig = getRelativePath(filePath, configFile);
  const importLine = `import API_BASE_URL from '${relToConfig}';`;

  let hasBasePat = BASE_PATTERN.test(content);
  BASE_PATTERN.lastIndex = 0;
  let hasInlinePat = INLINE_PATTERN.test(content);
  INLINE_PATTERN.lastIndex = 0;

  if (!hasBasePat && !hasInlinePat) return;

  // Replace BASE/BASE_URL declarations
  if (hasBasePat) {
    content = content.replace(BASE_PATTERN, (match, varName) => {
      return `${varName === 'BASE_URL' ? 'const BASE_URL' : 'const BASE'} = API_BASE_URL;`;
    });
  }

  // Replace inline fetch patterns
  if (hasInlinePat) {
    content = content.replace(INLINE_PATTERN, '${API_BASE_URL}');
  }

  // Add import if not already present
  if (!content.includes(`import API_BASE_URL from '${relToConfig}'`)) {
    // Insert after last import line
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith('import ')) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    content = lines.join('\n');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', path.relative(SRC, filePath));
    fixed++;
  }
});

console.log(`\nDone. Fixed ${fixed} files.`);
