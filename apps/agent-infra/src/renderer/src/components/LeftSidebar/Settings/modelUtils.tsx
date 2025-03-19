import {
  SiGooglegemini,
  SiOpenai,
  SiAnthropic,
  SiMicrosoftazure,
} from 'react-icons/si';
import { AiFillApi } from 'react-icons/ai';
import MistralIcon from '@renderer/assets/Mistral';
import { Provider } from './types';

export function getProviderLogo(provider: Provider) {
  switch (provider) {
    case Provider.OPENAI:
      return <SiOpenai size={18} />;
    case Provider.ANTHROPIC:
      return <SiAnthropic size={18} />;
    case Provider.GEMINI:
      return <SiGooglegemini size={18} />;
    case Provider.MISTRAL:
      return <MistralIcon />;
    case Provider.AZURE_OPENAI:
      return <SiMicrosoftazure size={18} />;
    default:
      return <AiFillApi size={18} />;
  }
}

export function getModelOptions(provider: Provider) {
  switch (provider) {
    case Provider.OPENAI:
      return [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      ];
    case Provider.ANTHROPIC:
      return [
        { value: 'claude-3.7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      ];
    case Provider.GEMINI:
      return [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      ];
    case Provider.MISTRAL:
      return [
        { value: 'mistral-large-latest', label: 'Mistral Large' },
        { value: 'mistral-medium-latest', label: 'Mistral Medium' },
        { value: 'mistral-small-latest', label: 'Mistral Small' },
      ];
    case Provider.AZURE_OPENAI:
      return [];
    default:
      return [];
  }
}
