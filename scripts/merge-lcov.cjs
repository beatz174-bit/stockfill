#!/usr/bin/env node
'use strict';

const fs = require('fs');

const files = process.argv.slice(2);
if (files.length < 2) {
  console.error('Usage: node merge-lcov.cjs <file1.lcov> <file2.lcov> [<file3.lcov> ...]');
  process.exit(2);
}

function ensureEntry(map, sf) {
  if (!map.has(sf)) map.set(sf, { other: new Set(), da: new Map() });
  return map.get(sf);
}

const combined = new Map();

for (const f of files) {
  let content;
  try {
    content = fs.readFileSync(f, 'utf8');
  } catch (err) {
    console.error('Could not read', f, err.message);
    process.exit(3);
  }
  const lines = content.split(/\r?\n/);
  let currentSF = null;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('SF:')) {
      currentSF = line.slice(3);
      ensureEntry(combined, currentSF);
    } else if (!currentSF) {
      // ignore lines before first SF
    } else if (line.startsWith('DA:')) {
      const parts = line.slice(3).split(',');
      const lnNum = parseInt(parts[0], 10);
      const hitsNum = parseInt(parts[1] || '0', 10);
      const entry = ensureEntry(combined, currentSF);
      entry.da.set(lnNum, (entry.da.get(lnNum) || 0) + hitsNum);
    } else if (line.startsWith('end_of_record')) {
      // ignore
    } else {
      const entry = ensureEntry(combined, currentSF);
      entry.other.add(line);
    }
  }
}

let out = '';
for (const [sf, data] of combined.entries()) {
  out += `SF:${sf}\n`;
  const other = Array.from(data.other).sort();
  for (const l of other) out += l + '\n';
  const daEntries = Array.from(data.da.entries()).sort((a, b) => a[0] - b[0]);
  for (const [ln, hits] of daEntries) out += `DA:${ln},${hits}\n`;
  const lf = daEntries.length;
  const lh = daEntries.reduce((acc, [, hits]) => acc + (hits > 0 ? 1 : 0), 0);
  out += `LF:${lf}\nLH:${lh}\nend_of_record\n`;
}

process.stdout.write(out);
