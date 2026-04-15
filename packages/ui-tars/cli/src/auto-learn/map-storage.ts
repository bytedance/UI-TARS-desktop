/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { AppMap } from './types';
import { mapFile, mkdirSafe } from './utils';

export const MAP_DIR = path.join(process.cwd(), '.ui-tars', 'app-maps');
export const SS_DIR = path.join(process.cwd(), '.ui-tars', 'screenshots');

// Ensure directories exist
mkdirSafe(MAP_DIR);
mkdirSafe(SS_DIR);

/**
 * Load a cached app map for the given package
 */
export function loadMap(pkg: string): AppMap | null {
  const fp = path.join(MAP_DIR, mapFile(pkg));
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8')) as AppMap;
}

/**
 * Save an app map to JSON file
 */
export function saveMap(pkg: string, map: AppMap): string {
  const fp = path.join(MAP_DIR, mapFile(pkg));
  fs.writeFileSync(fp, JSON.stringify(map, null, 2));
  console.log(`App map saved: ${fp}`);
  return fp;
}
