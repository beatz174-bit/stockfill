// scripts/remap-and-report.cjs
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libSourceMaps = require('istanbul-lib-source-maps');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

async function main() {
  const out = libCoverage.createCoverageMap({});
  const dir = path.join(process.cwd(), 'coverage-reports', 'e2e', '.nyc_output');
  if (!fs.existsSync(dir)) {
    console.error('.nyc_output not found at', dir);
    process.exit(2);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    out.merge(data);
  }

  if (out.size === 0) {
    console.error('No coverage entries were merged.');
    process.exit(3);
  }

  const sourceMapStore = libSourceMaps.createSourceMapStore();
  const transformed = await sourceMapStore.transformCoverage(out);
  const remapped = libCoverage.createCoverageMap(transformed.map || transformed.data || {});

  const outDir = path.join(process.cwd(), 'coverage-reports', 'e2e');
  fs.mkdirSync(outDir, { recursive: true });
  const context = libReport.createContext({ dir: outDir, coverageMap: remapped });

  reports.create('lcovonly', {}).execute(context);
  reports.create('html', {}).execute(context);

  console.log('Wrote remapped e2e coverage to', outDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
