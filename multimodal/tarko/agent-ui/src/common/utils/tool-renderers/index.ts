import { ToolToRendererCondition } from './types';
import {
  strReplaceEditorRendererCondition,
  generalRendererCondition,
  imageRendererCondition,
  readMultipleFilesRendererCondition,
} from './renderer-conditions';

// Group similar tools by renderer type for better maintainability
const SEARCH_TOOLS = ['web_search', 'Search'];
const COMMAND_TOOLS = ['run_command', 'execute_bash'];
const SCRIPT_TOOLS = ['run_script', 'JupyterCI'];
const FILE_TOOLS = ['write_file', 'read_file'];

const TOOL_TO_RENDERER_CONFIG: ToolToRendererCondition[] = [
  // Browser tools
  { toolName: 'browser_vision_control', renderer: 'browser_vision_control' },
  { toolName: 'browser_screenshot', renderer: 'image' },
  
  // File operations
  ...FILE_TOOLS.map(tool => ({ toolName: tool, renderer: 'file_result' })),
  { toolName: 'edit_file', renderer: 'diff_result' },
  
  // Command execution
  ...COMMAND_TOOLS.map(tool => ({ toolName: tool, renderer: 'command_result' })),
  
  // Script execution
  ...SCRIPT_TOOLS.map(tool => ({ toolName: tool, renderer: 'script_result' })),
  
  // Search tools
  ...SEARCH_TOOLS.map(tool => ({ toolName: tool, renderer: 'search_result' })),
  
  // Link tools
  { toolName: 'LinkReader', renderer: 'link_reader' },

  // Dynamic conditions (order matters - more specific first)
  strReplaceEditorRendererCondition,
  readMultipleFilesRendererCondition,
  generalRendererCondition,
  imageRendererCondition,

  // Fallback
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
