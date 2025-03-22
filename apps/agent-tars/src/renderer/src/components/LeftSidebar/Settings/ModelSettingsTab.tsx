import { Divider, Input, Select, SelectItem, Spinner } from '@nextui-org/react';
import { ModelSettings, ModelProvider } from '@agent-infra/shared';
import { getProviderLogo, getModelOptions } from './modelUtils';
import { useProviders } from './useProviders';

interface ModelSettingsTabProps {
  settings: ModelSettings;
  setSettings: (settings: ModelSettings) => void;
}

export function ModelSettingsTab({
  settings,
  setSettings,
}: ModelSettingsTabProps) {
  const { providers, loading } = useProviders();
  const isAzure = settings.provider === ModelProvider.AZURE_OPENAI;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner label="Loading providers..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <Select
        label="Provider"
        selectedKeys={[settings.provider]}
        onChange={(e) => {
          const provider = e.target.value as ModelProvider;
          setSettings({
            ...settings,
            provider,
          });
        }}
        startContent={getProviderLogo(settings.provider)}
      >
        {providers.map((provider) => (
          <SelectItem
            key={provider}
            startContent={getProviderLogo(provider as ModelProvider)}
            value={provider}
          >
            {provider.charAt(0).toUpperCase() +
              provider.slice(1).replace('_', ' ')}
          </SelectItem>
        ))}
      </Select>

      {isAzure ? (
        <Input
          label="Azure Model Name"
          placeholder="Enter your Azure model name"
          value={settings.model || ''}
          onChange={(e) =>
            setSettings({
              ...settings,
              model: e.target.value,
            })
          }
          description="The deployment name of your Azure OpenAI model"
          isRequired
        />
      ) : (
        <Select
          label="Model"
          selectedKeys={settings.model ? [settings.model] : []}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
        >
          {getModelOptions(settings.provider).map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </Select>
      )}

      <Input
        type="password"
        label="API Key"
        placeholder="Enter your API key"
        value={settings.apiKey}
        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
      />

      <Divider className="my-2" />
      <p className="text-sm text-default-500">Advanced Settings (Optional)</p>

      <Input
        label="API Version"
        placeholder="e.g., 2023-05-15"
        value={settings.apiVersion || ''}
        onChange={(e) =>
          setSettings({ ...settings, apiVersion: e.target.value })
        }
        description={
          isAzure
            ? 'Required for Azure OpenAI (e.g., 2023-05-15)'
            : 'Required for some providers'
        }
        isRequired={false}
      />

      <Input
        label="Custom Endpoint"
        placeholder="https://..."
        value={settings.endpoint || ''}
        onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
        description={
          isAzure
            ? 'Your Azure OpenAI resource endpoint'
            : 'Override the default API endpoint'
        }
        isRequired={false}
      />
    </div>
  );
}
