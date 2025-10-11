import type { RspressPlugin } from '@rspress/core';

interface ShowcaseDataPluginOptions {
  apiUrl?: string;
}

/**
 * Rspress plugin to fetch showcase data at build time and inject into runtime
 */
export function showcaseDataPlugin(options: ShowcaseDataPluginOptions = {}): RspressPlugin {
  const { 
    apiUrl = 'https://agent-tars.toxichl1994.workers.dev/shares/public?page=1&limit=100'
  } = options;

  return {
    name: 'showcase-data-plugin',
    async addRuntimeModules() {
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

        // Return the data as a virtual module
        return {
          'showcase-data': `export const showcaseData = ${JSON.stringify(data.data, null, 2)};
export const lastUpdated = '${new Date().toISOString()}';`,
        };
      } catch (error) {
        console.warn('⚠️ Failed to fetch showcase data at build time:', error);
        console.log('📦 Using empty fallback data - runtime API will be used instead');
        
        // Return empty data as fallback
        return {
          'showcase-data': `export const showcaseData = [];
export const lastUpdated = '${new Date().toISOString()}';`,
        };
      }
    },
  };
}