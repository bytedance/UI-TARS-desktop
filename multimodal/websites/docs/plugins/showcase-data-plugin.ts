import type { RspressPlugin } from '@rspress/core';

/**
 * Rspress plugin to fetch showcase data at build time
 */
export function showcaseDataPlugin(): RspressPlugin {
  return {
    name: 'showcase-data-plugin',
    async addRuntimeModules() {
      try {
        const response = await fetch('https://agent-tars.toxichl1994.workers.dev/shares/public?page=1&limit=100');
        const data = await response.json();
        
        return {
          'showcase-data': `export const showcaseData = ${JSON.stringify(data.success ? data.data : [])};`,
        };
      } catch {
        return {
          'showcase-data': 'export const showcaseData = [];',
        };
      }
    },
  };
}
