import { FunctionToolToRendererCondition } from '../types';

export const strReplaceEditorRendererCondition: FunctionToolToRendererCondition = (
  toolName: string,
  content: any,
): string | null => {
  if (toolName === 'str_replace_editor') {
    debugger;
    return null;
  }
  return null;
};
