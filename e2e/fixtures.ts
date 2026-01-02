import { test as base, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const coverageEnabled = process.env.PW_COVERAGE === '1';
const coverageDir = path.resolve(process.cwd(), 'coverage', 'v8');

export const test = base.extend({});
export { expect };

const decodeSourceMapDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(
    /^data:application\/json(?:;charset=[^;]+)?(;base64)?,(.*)$/i,
  );
  if (!match) {
    return null;
  }
  const isBase64 = Boolean(match[1]);
  const data = match[2] ?? '';
  return isBase64 ? Buffer.from(data, 'base64').toString('utf8') : decodeURIComponent(data);
};

if (coverageEnabled) {
  test.beforeEach(async ({ page }) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
  });

  test.afterEach(async ({ page }, testInfo) => {
    const jsCoverage = await page.coverage.stopJSCoverage();
    await fs.mkdir(coverageDir, { recursive: true });

    const sanitizedTitle = testInfo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const entries = [];
    for (const entry of jsCoverage) {
      if (!entry.url.startsWith('http://127.0.0.1:4201')) {
        continue;
      }
      if (!entry.url.endsWith('.js')) {
        continue;
      }

      const sourceResponse = await page.request.get(entry.url);
      if (!sourceResponse.ok()) {
        continue;
      }
      const source = await sourceResponse.text();
      const mapMatch = source.match(/\/\/# sourceMappingURL=(.+)$/m);
      if (!mapMatch) {
        continue;
      }

      const mapTarget = mapMatch[1];
      let sourceMap: string | null = null;
      if (mapTarget.startsWith('data:')) {
        sourceMap = decodeSourceMapDataUrl(mapTarget);
      } else {
        const mapUrl = new URL(mapTarget, entry.url).toString();
        const mapResponse = await page.request.get(mapUrl);
        if (!mapResponse.ok()) {
          continue;
        }
        sourceMap = await mapResponse.text();
      }
      if (!sourceMap) {
        continue;
      }

      entries.push({
        url: entry.url,
        functions: entry.functions,
        source,
        sourceMap,
      });
    }

    const outputPath = path.join(
      coverageDir,
      `${sanitizedTitle}-${Date.now()}.json`,
    );
    await fs.writeFile(outputPath, JSON.stringify(entries), 'utf8');
  });
}
