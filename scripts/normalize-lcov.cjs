#!/usr/bin/env node
// scripts/normalize-lcov.cjs
// Usage: node scripts/normalize-lcov.cjs input.lcov [output.lcov]

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const inFile = process.argv[2] || 'coverage-reports/merged/merged.lcov';
const outFile = process.argv[3] || inFile.replace(/\.lcov$/, '.normalized.lcov');

if (!fs.existsSync(inFile)) {
  console.error('Input file not found:', inFile);
  process.exit(2);
}

const content = fs.readFileSync(inFile, 'utf8');
const lines = content.split(/\r?\n/);

// split into records separated by "end_of_record"
const records = [];
let cur = [];
for (const L of lines) {
  cur.push(L);
  if (L.trim() === 'end_of_record') {
    records.push(cur.join('\n'));
    cur = [];
  }
}
// if file didn't end with end_of_record, push remainder
if (cur.length) records.push(cur.join('\n'));

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function findInSrc(basename) {
  const srcRoot = path.join(repoRoot, 'src');
  if (!fs.existsSync(srcRoot)) return null;
  // recursive search (stop when found)
  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isFile() && it.name === basename) return full;
      if (it.isDirectory() && it.name !== 'node_modules' && it.name !== '.git') {
        const found = walk(full);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(srcRoot);
}

function normalizeSF(sfLine) {
  // sfLine is the part after 'SF:'
  let sf = sfLine.trim();

  // Skip clearly virtual / query-string entries
  if (sf.startsWith('@') || sf.includes('?v=') || sf === '@react-refresh') {
    return null;
  }

  // If it's an absolute path that exists, make it repo-relative.
  if (path.isAbsolute(sf)) {
    if (exists(sf)) return path.relative(repoRoot, sf);
    // Try chopping off any leading workspace prefix and look again
    const repoName = path.basename(repoRoot);
    const idx = sf.indexOf(`/${repoName}/`);
    if (idx !== -1) {
      const candidate = sf.slice(idx + repoName.length + 2); // after /repoName/
      if (exists(path.join(repoRoot, candidate))) return candidate;
      if (exists(path.join(repoRoot, 'src', candidate))) return path.posix.join('src', candidate);
    }
  }

  // If it's already relative, check relative to repo root
  if (!path.isAbsolute(sf)) {
    if (exists(path.join(repoRoot, sf))) return sf;
    // If it looks like "stockfill/..." or "<repoName>/..." try to strip the repo prefix
    const repoName = path.basename(repoRoot);
    if (sf.startsWith(`${repoName}/`) || sf.startsWith('stockfill/')) {
      const candidate = sf.replace(new RegExp(`^(${repoName}|stockfill)/`), '');
      if (exists(path.join(repoRoot, candidate))) return candidate;
      if (exists(path.join(repoRoot, 'src', candidate))) return path.posix.join('src', candidate);
    }
    // If it is a bare filename "DBProvider.tsx" try src/
    if (!sf.includes('/') && exists(path.join(repoRoot, 'src', sf))) {
      return path.posix.join('src', sf);
    }
  }

  // If it contains '/src/' somewhere, try to extract the src/... suffix
  const srcIdx = sf.indexOf('/src/');
  if (srcIdx !== -1) {
    const candidate = sf.slice(srcIdx + 1); // remove leading slash
    if (exists(path.join(repoRoot, candidate))) return candidate;
  }

  // Finally, try finding by basename under src
  const base = path.basename(sf);
  const found = findInSrc(base);
  if (found) return path.relative(repoRoot, found);

  // give up
  return null;
}

let kept = 0, dropped = 0;

const outRecords = records.map(rec => {
  // find SF line
  const m = rec.match(/^SF:(.*)$/m);
  if (!m) {
    // no SF line? keep it (unlikely)
    kept++;
    return rec;
  }
  const sfRaw = m[1].trim();
  const normalized = normalizeSF(sfRaw);
  if (!normalized) {
    dropped++;
    return null; // drop entire record
  }
  // replace SF:... with normalized relative path using posix separators
  const normalizedPosix = normalized.split(path.sep).join(path.posix.sep);
  const newRec = rec.replace(/^SF:.*$/m, `SF:${normalizedPosix}`);
  kept++;
  return newRec;
}).filter(Boolean);

fs.writeFileSync(outFile, outRecords.join('\n') + '\n');
console.log(`Wrote ${outFile}  (kept ${kept}, dropped ${dropped} records)`);
