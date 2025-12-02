// scripts/remap-and-report.cjs
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libSourceMaps = require('istanbul-lib-source-maps');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const out = libCoverage.createCoverageMap({});
const dir = path.join(process.cwd(), '.nyc_output');
if (!fs.existsSync(dir)) {
  console.error('.nyc_output not found');
  process.exit(2);
}
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  out.merge(data);
}

// Remap using source maps
const sourceMapStore = libSourceMaps.createSourceMapStore();
const transformed = sourceMapStore.transformCoverage(out);
const remapped = transformed.map;

// Write reports
const outDir = path.join(process.cwd(), 'coverage-reports', 'e2e');
fs.mkdirSync(outDir, { recursive: true });
const context = libReport.createContext({ dir: outDir, coverageMap: remapped });

// lcov + html
reports.create('lcovonly', {}).execute(context);
reports.create('html', {}).execute(context);

console.log('Wrote remapped e2e coverage to', outDir);
