import { Input, Select, SelectItem, Divider } from '@nextui-org/react';
import { SearchSettings, SearchProvider } from '@agent-infra/shared';
import { getSearchProviderLogo } from './searchUtils';

interface SearchSettingsTabProps {
  settings: SearchSettings;
  setSettings: (settings: SearchSettings) => void;
}

export function SearchSettingsTab({
  settings,
  setSettings,
}: SearchSettingsTabProps) {
  return (
    <div className="space-y-4 py-2">
      <Select
        label="Search Provider"
        selectedKeys={[settings.provider]}
        onChange={(e) => {
          setSettings({
            ...settings,
            provider: e.target.value as SearchProvider,
          });
        }}
        startContent={getSearchProviderLogo(settings.provider)}
      >
        <SelectItem
          key={SearchProvider.BING_SEARCH}
          startContent={getSearchProviderLogo(SearchProvider.BING_SEARCH)}
        >
          Bing Search
        </SelectItem>
      </Select>

      <Input
        type="password"
        label="API Key"
        placeholder="Enter your API key"
        value={settings.apiKey}
        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
        isRequired
        description="Your Bing Search API key"
      />

      <Divider className="my-2" />
      <p className="text-sm text-default-500">Advanced Settings (Optional)</p>

      <Input
        label="Custom Endpoint"
        placeholder="https://api.bing.microsoft.com/"
        value={settings.baseUrl || ''}
        onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
        description="Override the default Bing Search API endpoint"
      />
    </div>
  );
}
