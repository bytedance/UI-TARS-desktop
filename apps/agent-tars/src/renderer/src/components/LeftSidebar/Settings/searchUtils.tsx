import { SiDuckduckgo, SiMicrosoftbing } from 'react-icons/si';
import { TbSearch, TbBrowser } from 'react-icons/tb';
import { SearchProvider } from '@agent-infra/shared';

export function getSearchProviderLogo(provider: SearchProvider) {
  switch (provider) {
    case SearchProvider.BING_SEARCH:
      return <SiMicrosoftbing size={18} />;
    case SearchProvider.TAVILY:
      return <TbSearch size={18} />;
    case SearchProvider.DUCKDUCKGO_SEARCH:
      return <SiDuckduckgo size={18} />;
    case SearchProvider.BROWSER_SEARCH:
      return <TbBrowser size={18} />;
    default:
      return null;
  }
}
