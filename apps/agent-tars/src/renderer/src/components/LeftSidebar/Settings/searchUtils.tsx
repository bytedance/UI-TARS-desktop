import { SiMicrosoftbing } from 'react-icons/si';
import { SearchProvider } from '@agent-infra/shared';

export function getSearchProviderLogo(provider: SearchProvider) {
  switch (provider) {
    case SearchProvider.BING_SEARCH:
      return <SiMicrosoftbing size={18} />;
    default:
      return null;
  }
}
