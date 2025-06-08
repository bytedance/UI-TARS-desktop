import { WorkspacePathManager } from '../workspace-path';

/**
 * Ensures a working directory exists and returns its path
 * @param namespace workspace namespace, used when you need to isolate the execution of tasks
 * @param workspacePath optional path to workspace directory (defaults to CWD/agent-tars-workspace)
 * @param isolateSessions whether to create isolated session directories (default: false)
 * @param isDebug whether to log debug information
 * @returns Path to the working directory
 */
export function ensureWorkingDirectory(
  namespace: string,
  workspacePath?: string,
  isolateSessions = false,
  isDebug = false,
): string {
  try {
    // Resolve the workspace path using the workspace path manager
    const baseDir = process.cwd();
    const resolvedPath = WorkspacePathManager.resolveWorkspacePath(
      baseDir,
      workspacePath,
      namespace,
      isolateSessions,
    );

    // Ensure the directory exists
    const workingDirectory = WorkspacePathManager.ensureWorkspaceDirectory(resolvedPath);

    if (isDebug) {
      console.log(`Created or verified working directory: ${workingDirectory}`);
    }
    return workingDirectory;
  } catch (error) {
    console.error(`Failed to create working directory:`, error);
    throw new Error(
      `Failed to initialize agent workspace: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
