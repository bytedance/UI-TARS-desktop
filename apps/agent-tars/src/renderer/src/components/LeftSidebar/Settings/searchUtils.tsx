import { SiDuckduckgo, SiMicrosoftbing, SiSearxng } from 'react-icons/si';
import { TbSearch, TbBrowser } from 'react-icons/tb';
import { SearchProvider } from '@agent-infra/shared';

export function getSearchProviderLogo(provider: SearchProvider) {
  switch (provider) {
    case SearchProvider.BingSearch:
      return <SiMicrosoftbing size={18} />;
    case SearchProvider.Tavily:
      return <TbSearch size={18} />;
    case SearchProvider.DuckduckgoSearch:
      return <SiDuckduckgo size={18} />;
    case SearchProvider.SearXNG:
      return <SiSearxng size={18} />;
    case SearchProvider.BrowserSearch:
      return <TbBrowser size={18} />;
    default:
      return null;
  }
}
