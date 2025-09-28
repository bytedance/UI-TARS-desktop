import { FunctionToolToRendererCondition } from '../types';

export const generalRendererCondition: FunctionToolToRendererCondition = (
  toolName: string,
  content: any,
): string | null => {
  if (Array.isArray(content)) {
    if (
      content.some(
        (item) => item.type === 'text' && (item.name === 'RESULTS' || item.name === 'QUERY'),
      )
    ) {
      return 'search_result';
    }

    if (content.some((item) => item.type === 'text' && item.text?.startsWith('Navigated to'))) {
      return 'browser_result';
    }

    if (content.some((item) => item.type === 'image_url')) {
      return 'image';
    }

    if (
      content.some(
        (item) => item.type === 'text' && (item.name === 'STDOUT' || item.name === 'COMMAND'),
      )
    ) {
      return 'command_result';
    }
  }
  return null;
};
