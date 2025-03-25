import { useState, useEffect } from 'react';
import { Input, Select, SelectItem, Spinner, Switch } from '@nextui-org/react';
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
  const [useCustomModel, setUseCustomModel] = useState(false);
  const isAzure = settings.provider === ModelProvider.AZURE_OPENAI;

  // Check if the current model is one of the preset options
  useEffect(() => {
    if (!settings.model) return;

    const isCustomModel = !getModelOptions(settings.provider).some(
      (option) => option.value === settings.model,
    );

    setUseCustomModel(isCustomModel);
  }, [settings.provider, settings.model]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner label="Loading providers..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <div className="text-primary mr-2 text-lg">💡</div>
        <p className="text-sm text-primary-700 dark:text-primary-300">
          Claude is recommended for best results. Support for GPT-4o is
          currently in development.
        </p>
      </div>

      <Select
        label="Provider"
        selectedKeys={[settings.provider]}
        isRequired
        onChange={(e) => {
          const provider = e.target.value as ModelProvider;
          setSettings({
            ...settings,
            provider,
            model: '', // Clear the model when changing provider
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
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm">Use custom model name</p>
            <Switch
              size="sm"
              isSelected={useCustomModel}
              onValueChange={setUseCustomModel}
            />
          </div>

          {useCustomModel ? (
            <Input
              label="Model Name"
              placeholder="Enter custom model name"
              value={settings.model || ''}
              isRequired
              onChange={(e) =>
                setSettings({
                  ...settings,
                  model: e.target.value,
                })
              }
              description="Enter the exact model identifier"
            />
          ) : (
            <Select
              label="Model"
              selectedKeys={settings.model ? [settings.model] : []}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              isRequired
            >
              {getModelOptions(settings.provider).map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </Select>
          )}
        </>
      )}

      <Input
        type="password"
        label="API Key"
        placeholder="Enter your API key"
        value={settings.apiKey}
        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
      />

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
