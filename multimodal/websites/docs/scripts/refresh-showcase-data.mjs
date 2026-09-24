#!/usr/bin/env node
/**
 * Rewrites the committed showcase snapshot (`src/data/showcaseShares.ts`) from the
 * public shares API. Maintainer-only: it is deliberately kept out of `build` and
 * `dev` so the site never needs the API to be up.
 *
 * Environment:
 *   SHOWCASE_API_BASE   API origin, default is the production worker.
 *   SHOWCASE_FETCH_VIA  Request template containing `{url}`, into which the target
 *                       URL is substituted URL-encoded. Networks that cannot reach
 *                       the worker directly can relay through a CORS/HTTP proxy,
 *                       e.g. 'https://api.allorigins.win/raw?url={url}'.
 */
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_BASE = 'https://agent-tars.toxichl1994.workers.dev';
const REQUEST_TIMEOUT_MS = 30_000;

// Must match the ApiShareItem field order in src/shared/types.ts.
const KNOWN_FIELDS = [
  'sessionId',
  'slug',
  'url',
  'tags',
  'title',
  'description',
  'imageUrl',
  'languages',
  'author',
  'authorGithub',
  'authorTwitter',
  'date',
];
const REQUIRED_FIELDS = ['sessionId', 'slug', 'url'];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.join(scriptDir, '..', 'src', 'data', 'showcaseShares.ts');

function fail(message) {
  console.error(`refresh-showcase-data: ${message}`);
  process.exit(1);
}

function buildRequestUrl(apiUrl) {
  const template = process.env.SHOWCASE_FETCH_VIA;
  if (!template) return apiUrl;
  if (!template.includes('{url}')) {
    fail("SHOWCASE_FETCH_VIA must contain the '{url}' placeholder");
  }
  return template.replace('{url}', encodeURIComponent(apiUrl));
}

async function fetchShares(apiUrl) {
  const requestUrl = buildRequestUrl(apiUrl);
  console.log(`fetching ${requestUrl}`);

  const response = await fetch(requestUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`response is not JSON: ${body.slice(0, 200)}`);
  }

  if (payload.success !== true) {
    throw new Error(
      `API reported failure: ${payload.error ?? JSON.stringify(payload).slice(0, 200)}`,
    );
  }
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error('API returned no records; refusing to overwrite the snapshot');
  }
  return payload;
}

function validateRecords(records) {
  const unknownFields = new Set();
  records.forEach((record, index) => {
    for (const field of REQUIRED_FIELDS) {
      if (typeof record[field] !== 'string' || record[field].length === 0) {
        throw new Error(`record #${index} is missing a usable '${field}'`);
      }
    }
    for (const [field, value] of Object.entries(record)) {
      if (!KNOWN_FIELDS.includes(field)) {
        unknownFields.add(field);
      } else if (value !== null && typeof value !== 'string') {
        // ApiShareItem models every field as `string | null`; anything else would
        // silently break the build instead of failing here.
        throw new Error(
          `record #${index} field '${field}' is ${typeof value}, expected string or null`,
        );
      }
    }
  });

  if (unknownFields.size > 0) {
    throw new Error(
      `API returned unknown fields (${[...unknownFields].join(', ')}); ` +
        'add them to ApiShareItem in src/shared/types.ts and to KNOWN_FIELDS here first',
    );
  }
}

/** Emits records verbatim: no scheme fixing, no reordering, no text rewriting. */
function renderDataFile(records, { apiUrl, fetchedAt }) {
  const entries = records
    .map((record) => {
      const fields = KNOWN_FIELDS.filter((field) => field in record)
        .map((field) => `    ${field}: ${JSON.stringify(record[field])},`)
        .join('\n');
      return `  {\n${fields}\n  },`;
    })
    .join('\n');

  return `/**
 * Showcase share records captured from the public shares API.
 *
 * Committed on purpose: the showcase list, detail and replay pages read this
 * snapshot, so they keep working when the upstream API is down or unreachable.
 * Values are stored exactly as the API returns them — notably \`url\` and
 * \`imageUrl\` carry no scheme, which \`ensureHttps\` adds at render time.
 *
 * Regenerate with \`pnpm refresh:showcase-data\`; it never runs during build or dev.
 *
 * source: ${apiUrl}
 * fetchedAt: ${fetchedAt}
 * records: ${records.length}
 */
import type { ApiShareItem } from '../shared/types';

export const showcaseShares: ApiShareItem[] = [
${entries}
];
`;
}

function readPreviousRecordCount() {
  try {
    const match = readFileSync(targetFile, 'utf8').match(/^ \* records: (\d+)$/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

async function format(source) {
  try {
    const prettier = await import('prettier');
    const config = await prettier.resolveConfig(targetFile);
    return await prettier.format(source, { ...config, filepath: targetFile });
  } catch (error) {
    console.warn(`skipping prettier (${error.message})`);
    return source;
  }
}

async function main() {
  const apiBase = (process.env.SHOWCASE_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const apiUrl = `${apiBase}/shares/public?page=1&limit=100`;
  const previousCount = readPreviousRecordCount();

  const payload = await fetchShares(apiUrl);
  validateRecords(payload.data);

  const totalRecords = payload.pagination?.totalRecords;
  if (typeof totalRecords === 'number' && totalRecords > payload.data.length) {
    throw new Error(
      `API reports ${totalRecords} records but only ${payload.data.length} were returned; raise the page limit`,
    );
  }

  const source = await format(
    renderDataFile(payload.data, { apiUrl, fetchedAt: new Date().toISOString() }),
  );

  // Write beside the target and rename, so a crash can never leave a partial file.
  const tempFile = `${targetFile}.tmp`;
  try {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    writeFileSync(tempFile, source, 'utf8');
    renameSync(tempFile, targetFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch {
      // nothing to clean up
    }
    throw error;
  }

  const newCount = payload.data.length;
  const change =
    previousCount === null
      ? 'new file'
      : `was ${previousCount}, ${newCount >= previousCount ? '+' : ''}${newCount - previousCount}`;
  console.log(`wrote ${path.relative(process.cwd(), targetFile)}: ${newCount} records (${change})`);
}

main().catch((error) => fail(error.cause ? `${error.message} (${error.cause})` : error.message));
