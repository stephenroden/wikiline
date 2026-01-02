import fs from 'node:fs/promises';
import path from 'node:path';
import v8ToIstanbul from 'v8-to-istanbul';
import coverageLib from 'istanbul-lib-coverage';
import reportLib from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const coverageDir = path.resolve(process.cwd(), 'coverage', 'v8');
const outputDir = path.resolve(process.cwd(), 'coverage', 'e2e');

const files = await fs.readdir(coverageDir).catch(() => []);
if (files.length === 0) {
  console.error('No V8 coverage files found in coverage/v8.');
  process.exit(1);
}

const { createCoverageMap } = coverageLib;
const { createContext } = reportLib;
const coverageMap = createCoverageMap({});

for (const file of files) {
  if (!file.endsWith('.json')) {
    continue;
  }
  const raw = await fs.readFile(path.join(coverageDir, file), 'utf8');
  const entries = JSON.parse(raw);

  for (const entry of entries) {
    if (!entry.url || !entry.functions || !entry.source || !entry.sourceMap) {
      continue;
    }

    let sourceMap = entry.sourceMap;
    if (typeof sourceMap === 'string') {
      sourceMap = { sourcemap: JSON.parse(sourceMap) };
    }

    const converter = v8ToIstanbul(entry.url, 0, {
      source: entry.source,
      sourceMap,
    });
    await converter.load();
    converter.applyCoverage(entry.functions);
    coverageMap.merge(converter.toIstanbul());
  }
}

await fs.mkdir(outputDir, { recursive: true });
const context = createContext({ dir: outputDir, coverageMap });
const reportTypes = ['text-summary', 'html', 'lcov'];

for (const reportType of reportTypes) {
  reports.create(reportType).execute(context);
}
