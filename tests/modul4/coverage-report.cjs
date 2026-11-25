const fs = require('node:fs');
const path = require('node:path');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const targets = {
  'js/admin.js': [
    'renderSummaryCards', 'renderReminders', 'filterTable', 'saveStatus',
    'prevMonth', 'nextMonth', 'getPackageData', 'getCityData',
    'filterKru', 'saveKru', 'loadStats', 'saveStats',
  ],
  'js/catalog-rules.js': ['packageData', 'voucherData'],
  'js/admin-catalog.js': ['loadCatalog', 'saveCatalog'],
};

function rate(counts) {
  const covered = counts.filter(count => count > 0).length;
  const total = counts.length;
  return { covered, total, pct: total ? Number((100 * covered / total).toFixed(2)) : null };
}

function startsIn(location, body) {
  const start = location.start;
  return Boolean(start
    && (start.line > body.start.line || (start.line === body.start.line && start.column >= body.start.column))
    && (start.line < body.end.line || (start.line === body.end.line && start.column < body.end.column)));
}

function writeCoverage(coverage, root) {
  const dir = path.join(root, 'coverage');
  const context = libReport.createContext({ dir, coverageMap: coverage });
  for (const report of ['html', 'json-summary']) reports.create(report).execute(context);

  const rows = [];
  const allStatements = [];
  const allBranches = [];
  for (const [file, names] of Object.entries(targets)) {
    const data = coverage.fileCoverageFor(path.join(root, file)).data;
    for (const name of names) {
      const fn = Object.values(data.fnMap).find(entry => entry.name === name);
      if (!fn) throw new Error('Missing coverage for ' + file + ' ' + name);
      const statements = Object.entries(data.statementMap)
        .filter(([, loc]) => startsIn(loc, fn.loc));
      const branches = Object.entries(data.branchMap)
        .filter(([, entry]) => startsIn(entry.loc, fn.loc));
      const statementCounts = statements.map(([id]) => data.s[id]);
      const branchCounts = branches.flatMap(([id]) => data.b[id]);
      rows.push({
        file, name, line: fn.decl.start.line, statements: rate(statementCounts), branches: rate(branchCounts),
        uncoveredStatements: statements.filter(([id]) => !data.s[id]).map(([, loc]) => loc.start.line),
        uncoveredBranches: branches.flatMap(([id, entry]) => entry.locations.flatMap((loc, index) =>
          data.b[id][index] ? [] : [{ line: loc.start?.line ?? entry.line, type: entry.type, index }]
        )),
      });
      allStatements.push(...statementCounts);
      allBranches.push(...branchCounts);
    }
  }
  const result = { statements: rate(allStatements), branches: rate(allBranches), functions: rows };
  fs.writeFileSync(path.join(dir, 'selected-functions.json'), JSON.stringify(result, null, 2) + '\n');
  const format = ({ covered, total, pct }) => pct === null ? 'N/A' : `${covered}/${total} (${pct}%)`;
  console.log('16 fungsi: Statement ' + format(result.statements) + ', Branch ' + format(result.branches));
  console.log('Laporan: coverage/index.html dan coverage/selected-functions.json');
}

module.exports = { writeCoverage };
