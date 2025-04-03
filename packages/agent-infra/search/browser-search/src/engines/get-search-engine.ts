import { GoogleSearchEngine } from './google-engine';
import { BingSearchEngine } from './bing-engine';
import { BaiduSearchEngine } from './baidu-engine';
import { SogouSearchEngine } from './sogou-engine';
import type { LocalBrowserSearchEngine, SearchEngineAdapter } from '../types';

/**
 * Factory function to get the appropriate search engine adapter instance.
 *
 * @param engine - The search engine identifier ('google', 'bing', 'baidu', or 'sogou')
 * @returns An instance of the requested search engine adapter
 */
export function getSearchEngine(
  engine: LocalBrowserSearchEngine,
): SearchEngineAdapter {
  switch (engine) {
    case 'google':
      return new GoogleSearchEngine();
    case 'bing':
      return new BingSearchEngine();
    case 'baidu':
      return new BaiduSearchEngine();
    case 'sogou':
      return new SogouSearchEngine();
    default:
      return new GoogleSearchEngine();
  }
}
