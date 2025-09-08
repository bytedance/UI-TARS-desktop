import { ToolToRendererCondition } from './types';
import {
  strReplaceEditorRendererCondition,
  generalRendererCondition,
  imageRendererCondition,
  readMultipleFilesRendererCondition,
} from './renderer-conditions';

const TOOL_TO_RENDERER_CONFIG: ToolToRendererCondition[] = [
  // Static tool name mappings
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

  // str_replace_editor
  strReplaceEditorRendererCondition,

  // read_multiple_files detection
  readMultipleFilesRendererCondition,

  // Dynamic conditions based on content
  generalRendererCondition,

  // Image content detection
  imageRendererCondition,

  // Fallback to JSON renderer
  (): string => 'json',
];

/**
 * Determine the renderer type from tool name and content
 * Uses the flexible condition-based configuration system
 */
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

  // This should never be reached due to the fallback function, but kept for safety
  return 'json';
}
