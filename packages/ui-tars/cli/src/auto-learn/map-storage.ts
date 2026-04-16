/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { UIMap, UI_MAP_SCHEMA_VERSION } from './types';
import { mapFile, mkdirSafe } from './utils';

export const MAP_DIR = path.join(process.cwd(), '.ui-tars', 'app-maps');
export const SS_DIR = path.join(process.cwd(), '.ui-tars', 'screenshots');

mkdirSafe(MAP_DIR);
mkdirSafe(SS_DIR);

function readJsonFile<T>(fp: string): T | null {
  if (!fs.existsSync(fp)) return null;

  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(fp: string, value: unknown): void {
  fs.writeFileSync(fp, JSON.stringify(value, null, 2));
}

export function uiMapFile(pkg: string): string {
  return `${mapFile(pkg).replace(/\.json$/i, '')}.ui-map.v${UI_MAP_SCHEMA_VERSION}.json`;
}

export function isUIMap(value: unknown): value is UIMap {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<UIMap>;
  return (
    !!candidate.meta &&
    candidate.meta.schemaVersion === UI_MAP_SCHEMA_VERSION &&
    !!candidate.pages &&
    !!candidate.regions &&
    !!candidate.elements &&
    Array.isArray(candidate.navigation)
  );
}

/**
 * Load a cached UI map for the given package.
 */
export function loadUIMap(pkg: string): UIMap | null {
  const fp = path.join(MAP_DIR, uiMapFile(pkg));
  const parsed = readJsonFile<unknown>(fp);
  return isUIMap(parsed) ? parsed : null;
}

/**
 * Save a UI map to JSON file.
 */
export function saveUIMap(pkg: string, map: UIMap): string {
  const fp = path.join(MAP_DIR, uiMapFile(pkg));
  writeJsonFile(fp, map);
  console.log(`UI map saved: ${fp}`);
  return fp;
}
