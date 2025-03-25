import { OpenAIProvider } from './OpenAIProvider';
import { LLMConfig } from '../interfaces/LLMProvider';

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config: LLMConfig = {}) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.deepseek.com/v1',
    });
  }
}
