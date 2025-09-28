import { ToolToRendererCondition } from './types';
import {
  strReplaceEditorRendererCondition,
  generalRendererCondition,
  imageRendererCondition,
  readMultipleFilesRendererCondition,
} from './renderer-conditions';

const TOOL_TO_RENDERER_CONFIG: ToolToRendererCondition[] = [
  { toolName: 'web_search', renderer: 'search_result' },
  { toolName: 'browser_vision_control', renderer: 'browser_vision_control' },
  { toolName: 'browser_screenshot', renderer: 'image' },
  { toolName: 'write_file', renderer: 'file_result' },
  { toolName: 'read_file', renderer: 'file_result' },
  { toolName: 'edit_file', renderer: 'diff_result' },
  { toolName: 'run_command', renderer: 'command_result' },
  { toolName: 'run_script', renderer: 'script_result' },
  { toolName: 'LinkReader', renderer: 'link_reader' },
  { toolName: 'Search', renderer: 'search_result' },
  { toolName: 'execute_bash', renderer: 'command_result' },
  { toolName: 'JupyterCI', renderer: 'script_result' },

  strReplaceEditorRendererCondition,

  readMultipleFilesRendererCondition,

  generalRendererCondition,

  imageRendererCondition,

  (): string => 'json',
];

export function determineToolRendererType(name: string, content: any): string {
  for (const condition of TOOL_TO_RENDERER_CONFIG) {
    if (typeof condition === 'function') {
      const result = condition(name, content);
      if (result) {
        return result;
      }
    } else if (condition.toolName === name) {
      return condition.renderer;
    }
  }

  return 'json';
}
