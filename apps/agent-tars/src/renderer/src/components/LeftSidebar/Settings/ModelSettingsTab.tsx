import { useState, useEffect } from 'react';
import {
  Input,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Button,
} from '@nextui-org/react';
import { ModelSettings, ModelProvider } from '@agent-infra/shared';
import { getProviderLogo, getModelOptions } from './modelUtils';
import { useProviders } from './useProviders';
import { PasswordInput } from '@renderer/components/PasswordInput';
import toast from 'react-hot-toast';
import { ipcClient } from '@renderer/api';
import { FiAlertCircle, FiZap } from 'react-icons/fi';

interface ModelSettingsTabProps {
  settings: ModelSettings;
  setSettings: (settings: ModelSettings) => void;
}

interface TestModelServiceProps {
  settings: ModelSettings;
}

function TestModelService({ settings }: TestModelServiceProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelResponse, setModelResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);

  const handleTestModel = async () => {
    try {
      setIsLoading(true);
      setShowResponse(false);
      const { success, message, response } =
        await ipcClient.testModelService(settings);

      if (success) {
        toast.success('Model connection successful');
        setErrorMessage('');
        let text = '';
        if (response && response.tool_calls) {
          text = JSON.stringify(response, null, 2);
        } else {
          text = 'Attention: llm is ready but function_call test failed';
        }
        setModelResponse(text);
        setShowResponse(true);
      } else {
        setErrorMessage(message);
        setModelResponse('');
      }
    } catch (error) {
      setErrorMessage(String(error));
      setModelResponse('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full mt-6 flex justify-start items-center gap-2">
        <Button
          color="primary"
          variant="shadow"
          size="md"
          isLoading={isLoading}
          onClick={handleTestModel}
          className="mt-5 bg-gradient-to-r from-primary to-primary-600 hover:opacity-90 transition-opacity"
          startContent={
            !isLoading && <FiZap className="text-white" size={16} />
          }
        >
          Test Model Provider
        </Button>
        <span className="text-xs text-default-400 mt-5">
          Note: Testing will consume a small amount of tokens
        </span>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/10 border border-danger-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertCircle className="text-danger" size={16} />
            <p className="text-danger font-medium">Model Connection Error:</p>
          </div>

          <p className="text-danger-600 dark:text-danger-400 text-sm font-mono my-2 break-words whitespace-pre-wrap overflow-auto max-h-[200px]">
            {errorMessage}
          </p>
          <p className="text-xs text-danger-500">
            Please check your model provider settings and try again.
          </p>
        </div>
      )}

      {showResponse && modelResponse && (
        <div className="mt-4 p-3 bg-success-50 dark:bg-success-900/10 border border-success-200 rounded-md">
          <p className="text-success-600 dark:text-success-400 text-sm font-medium mb-2">
            User Query:
          </p>
          <div className="bg-default-50 dark:bg-default-100/10 p-3 rounded-md text-sm text-default-700 whitespace-pre-wrap">
            What model are you using now?
          </div>
          <p className="text-success-600 dark:text-success-400 text-sm font-medium mb-2">
            Model Response:
          </p>

          <div className="bg-default-50 dark:bg-default-100/10 p-3 rounded-md text-sm text-default-700 whitespace-pre-wrap overflow-auto max-h-[300px]">
            {modelResponse}
          </div>
        </div>
      )}
    </>
  );
}

export function ModelSettingsTab({
  settings,
  setSettings,
}: ModelSettingsTabProps) {
  const { providers, loading } = useProviders();
  const [useCustomModel, setUseCustomModel] = useState(false);
  const isAzure = settings.provider === ModelProvider.AZURE_OPENAI;
  const isClaudeProvider = settings.provider === ModelProvider.ANTHROPIC;
  const showNonClaudeWarning = !isClaudeProvider && settings.provider;

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
      {showNonClaudeWarning && (
        <div className="flex items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
          <div className="text-warning-600 dark:text-warning-400 mr-2 text-lg">
            ⚠️
          </div>
          <p className="text-sm text-warning-700 dark:text-warning-300">
            Non-Claude model selected. May result in degraded performance as it
            hasn't been officially tested.{' '}
            <a
              href="https://github.com/bytedance/UI-TARS-desktop/discussions/377"
              target="_blank"
              rel="noopener noreferrer"
              className="text-warning-600 dark:text-warning-400 font-medium hover:underline"
            >
              Learn more
            </a>
          </p>
        </div>
      )}

      <Select
        label="Provider"
        selectedKeys={[settings.provider]}
        disallowEmptySelection
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

      <PasswordInput
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

      <TestModelService settings={settings} />
    </div>
  );
}
