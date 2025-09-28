import { FunctionToolToRendererCondition } from '../types';

export const imageRendererCondition: FunctionToolToRendererCondition = (
  toolName: string,
  content: any,
): string | null => {
  if (
    content &&
    ((typeof content === 'object' && content.type === 'image') ||
      (typeof content === 'string' && content.startsWith('data:image/')))
  ) {
    return 'image';
  }
  return null;
};
