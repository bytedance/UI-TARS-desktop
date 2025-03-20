import { ToolCallType } from '@renderer/type/agent';
import {
  checkPathPermission,
  normalizePath,
} from '@renderer/services/filePermissionService';
import toast from 'react-hot-toast';
import { ToolCall } from '@agent-infra/shared';

// File operation tools that require path permission checks
const FILE_OPERATION_TOOLS = [
  ToolCallType.ReadFile,
  ToolCallType.WriteFile,
  ToolCallType.ReadMultipleFiles,
  ToolCallType.EditFile,
  ToolCallType.CreateDirectory,
  ToolCallType.ListDirectory,
  ToolCallType.DirectoryTree,
  ToolCallType.MoveFile,
  ToolCallType.SearchFiles,
  ToolCallType.GetFileInfo,
];

/**
 * Intercepts tool calls to check file path permissions
 * @param toolCalls The tool calls to intercept
 * @returns Promise resolving to the intercepted tool calls
 */
export async function interceptToolCalls(
  toolCalls: ToolCall[],
): Promise<any[]> {
  const interceptedCalls: ToolCall[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name as ToolCallType;

    // Skip tools that don't need path permission checks
    if (!FILE_OPERATION_TOOLS.includes(toolName)) {
      interceptedCalls.push(toolCall);
      continue;
    }

    try {
      const params = JSON.parse(toolCall.function.arguments);

      // Check which paths need permission
      let pathsToCheck: string[] = [];

      if (
        toolName === ToolCallType.ReadFile ||
        toolName === ToolCallType.WriteFile ||
        toolName === ToolCallType.EditFile ||
        toolName === ToolCallType.CreateDirectory ||
        toolName === ToolCallType.ListDirectory ||
        toolName === ToolCallType.DirectoryTree ||
        toolName === ToolCallType.GetFileInfo
      ) {
        pathsToCheck = [params.path];
      } else if (toolName === ToolCallType.ReadMultipleFiles) {
        pathsToCheck = params.paths || [];
      } else if (toolName === ToolCallType.MoveFile) {
        pathsToCheck = [params.source, params.destination];
      } else if (toolName === ToolCallType.SearchFiles) {
        pathsToCheck = [params.path];
      }

      // Check permissions for all paths - this will now block until user decides
      let allPathsAllowed = true;
      for (const pathToCheck of pathsToCheck) {
        const allowed = await checkPathPermission(pathToCheck);
        if (!allowed) {
          allPathsAllowed = false;
          toast.error(`Access denied to path: ${pathToCheck}`);
          break;
        }
      }

      if (allPathsAllowed) {
        // If all paths are allowed, normalize them in the tool call
        const updatedParams = { ...params };

        if (
          toolName === ToolCallType.ReadFile ||
          toolName === ToolCallType.WriteFile ||
          toolName === ToolCallType.EditFile ||
          toolName === ToolCallType.CreateDirectory ||
          toolName === ToolCallType.ListDirectory ||
          toolName === ToolCallType.DirectoryTree ||
          toolName === ToolCallType.GetFileInfo
        ) {
          updatedParams.path = await normalizePath(params.path);
        } else if (toolName === ToolCallType.ReadMultipleFiles) {
          updatedParams.paths = await Promise.all(
            (params.paths || []).map((path: string) => {
              return normalizePath(path);
            }),
          );
        } else if (toolName === ToolCallType.MoveFile) {
          updatedParams.source = await normalizePath(params.source);
          updatedParams.destination = await normalizePath(params.destination);
        } else if (toolName === ToolCallType.SearchFiles) {
          updatedParams.path = await normalizePath(params.path);
        }

        // Update the tool call with normalized paths
        interceptedCalls.push({
          ...toolCall,
          function: {
            ...toolCall.function,
            arguments: JSON.stringify(updatedParams),
          },
        });
      }
    } catch (error) {
      console.error(`Error intercepting tool call ${toolName}:`, error);
      interceptedCalls.push(toolCall);
    }
  }

  return interceptedCalls;
}
