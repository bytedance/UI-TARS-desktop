import { ToolResultTransformer, CommandData, RendererType } from '../types';

/**
 * Transforms command-related tool results to standardized command data
 */
export const commandTransformer: ToolResultTransformer = (toolName, content, args, metadata) => {
  // Only transform if this is actually a command tool or has command-like content
  if (!isCommandTool(toolName) && !hasCommandContent(content)) {
    return null as any;
  }
  
  let command = '';
  let stdout = '';
  let stderr = '';
  let exitCode: number | undefined;
  
  // Extract command from arguments
  if (args && typeof args === 'object') {
    if ('command' in args && typeof args.command === 'string') {
      command = args.command;
    } else if ('script' in args && typeof args.script === 'string') {
      command = args.script;
    }
  }
  
  // Extract output from content
  if (typeof content === 'string') {
    // Simple string content
    if (content.includes('Error:') || content.includes('error:')) {
      stderr = content;
    } else {
      stdout = content;
    }
  } else if (Array.isArray(content)) {
    // Array format with STDOUT/STDERR/COMMAND markers
    for (const item of content) {
      if (item && typeof item === 'object' && item.type === 'text') {
        if (item.name === 'STDOUT') {
          stdout = item.text || '';
        } else if (item.name === 'STDERR') {
          stderr = item.text || '';
        } else if (item.name === 'COMMAND') {
          command = item.text || '';
        } else if (!stdout && !stderr) {
          // Fallback: treat as stdout if no explicit markers
          stdout = item.text || '';
        }
      }
    }
  } else if (typeof content === 'object' && content) {
    // Object format
    if ('stdout' in content && typeof content.stdout === 'string') {
      stdout = content.stdout;
    }
    if ('stderr' in content && typeof content.stderr === 'string') {
      stderr = content.stderr;
    }
    if ('output' in content && typeof content.output === 'string') {
      stdout = content.output;
    }
    if ('error' in content && typeof content.error === 'string') {
      stderr = content.error;
    }
    if ('exitCode' in content && typeof content.exitCode === 'number') {
      exitCode = content.exitCode;
    }
  }
  
  // Determine exit code if not provided
  if (exitCode === undefined) {
    exitCode = stderr ? 1 : 0;
  }
  
  const commandData: CommandData = {
    type: 'command',
    command,
    stdout,
    stderr,
    exitCode,
  };
  
  return {
    type: 'command_result' as RendererType,
    data: commandData,
    metadata: {
      toolName,
      toolCallId: metadata?.toolCallId || '',
      timestamp: metadata?.timestamp || Date.now(),
      title: metadata?.title || `Command: ${command || toolName}`,
      ...metadata,
    },
  };
};

/**
 * Check if tool name indicates a command tool
 */
function isCommandTool(toolName: string): boolean {
  const commandTools = [
    'run_command',
    'run_script',
    'execute_bash',
    'JupyterCI',
    'str_replace_editor', // Can output command-like results
  ];
  return commandTools.includes(toolName);
}

/**
 * Check if content looks like command output
 */
function hasCommandContent(content: unknown): boolean {
  if (Array.isArray(content)) {
    return content.some(item => 
      item && 
      typeof item === 'object' && 
      item.type === 'text' && 
      (item.name === 'STDOUT' || item.name === 'STDERR' || item.name === 'COMMAND')
    );
  }
  
  if (typeof content === 'object' && content) {
    return 'stdout' in content || 'stderr' in content || 'exitCode' in content;
  }
  
  return false;
}
