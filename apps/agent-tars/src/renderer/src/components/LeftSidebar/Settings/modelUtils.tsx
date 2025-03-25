import {
  SiGooglegemini,
  SiOpenai,
  SiAnthropic,
  SiMicrosoftazure,
} from 'react-icons/si';
import DeepSeekIcon from '@renderer/assets/DeepSeekIcon';
import { AiFillApi } from 'react-icons/ai';
import MistralIcon from '@renderer/assets/Mistral';
import { ModelProvider } from '@agent-infra/shared';

export function getProviderLogo(provider: ModelProvider) {
  switch (provider) {
    case ModelProvider.OPENAI:
      return <SiOpenai size={18} />;
    case ModelProvider.ANTHROPIC:
      return <SiAnthropic size={18} />;
    case ModelProvider.GEMINI:
      return <SiGooglegemini size={18} />;
    case ModelProvider.MISTRAL:
      return <MistralIcon />;
    case ModelProvider.AZURE_OPENAI:
      return <SiMicrosoftazure size={18} />;
    case ModelProvider.DEEPSEEK:
      return <DeepSeekIcon />;
    default:
      return <AiFillApi size={18} />;
  }
}

export function getModelOptions(provider: ModelProvider) {
  switch (provider) {
    case ModelProvider.ANTHROPIC:
      return [
        { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      ];
    case ModelProvider.OPENAI:
      return [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      ];
    case ModelProvider.GEMINI:
      return [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      ];
    case ModelProvider.MISTRAL:
      return [
        { value: 'mistral-large-latest', label: 'Mistral Large' },
        { value: 'mistral-medium-latest', label: 'Mistral Medium' },
        { value: 'mistral-small-latest', label: 'Mistral Small' },
      ];
    case ModelProvider.DEEPSEEK:
      return [{ value: 'deepseek-chat', label: 'DeepSeek-V3' }];
    case ModelProvider.AZURE_OPENAI:
      return [];
    default:
      return [];
  }
}
