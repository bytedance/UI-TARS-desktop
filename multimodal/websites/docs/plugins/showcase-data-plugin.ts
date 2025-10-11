import type { RspressPlugin } from '@rspress/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface ShowcaseDataPluginOptions {
  apiUrl?: string;
  outputFile?: string;
}

/**
 * Fetch showcase data and write to file
 */
async function fetchAndWriteData(apiUrl: string, outputFile: string) {
  try {
    console.log('🚀 Fetching showcase data at build time...');
    
    // Fetch data from API during build with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Agent-TARS-Docs-Builder/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch showcase data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful response');
    }

    console.log(`✅ Successfully fetched ${data.data.length} showcase items`);

    // Write data to file
    const outputPath = join(process.cwd(), outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    
    const fileContent = `// This file is auto-generated during build time
// Do not edit manually

import type { ApiShareItem } from '../services/api';

export const showcaseData: ApiShareItem[] = ${JSON.stringify(data.data, null, 2)};

export const lastUpdated = '${new Date().toISOString()}';
`;
    
    writeFileSync(outputPath, fileContent, 'utf-8');
    console.log(`📝 Showcase data written to ${outputFile}`);
    
  } catch (error) {
    console.warn('⚠️ Failed to fetch showcase data at build time:', error);
    console.log('📦 Writing empty fallback data - runtime API will be used instead');
    
    // Write empty data as fallback
    const outputPath = join(process.cwd(), outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    
    const fallbackContent = `// This file is auto-generated during build time
// Do not edit manually
// Fallback data due to build-time fetch failure

import type { ApiShareItem } from '../services/api';

export const showcaseData: ApiShareItem[] = [];

export const lastUpdated = '${new Date().toISOString()}';
`;
    
    writeFileSync(outputPath, fallbackContent, 'utf-8');
  }
}

/**
 * Rspress plugin to fetch showcase data at build time and write to a file
 */
export function showcaseDataPlugin(options: ShowcaseDataPluginOptions = {}): RspressPlugin {
  const { 
    apiUrl = 'https://agent-tars.toxichl1994.workers.dev/shares/public?page=1&limit=100',
    outputFile = 'src/data/showcase-data.generated.ts'
  } = options;

  // Run immediately when plugin is created
  fetchAndWriteData(apiUrl, outputFile);

  return {
    name: 'showcase-data-plugin',
  };
}