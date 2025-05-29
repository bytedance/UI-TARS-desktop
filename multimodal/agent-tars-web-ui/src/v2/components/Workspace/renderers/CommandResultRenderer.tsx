import React from 'react';
import { ToolResultContentPart } from '@agent-tars/core';
import { FiTerminal, FiFile } from 'react-icons/fi';

interface CommandResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Renders command execution results with command, stdout, and stderr
 */
export const CommandResultRenderer: React.FC<CommandResultRendererProps> = ({ part }) => {
  const { command, stdout, stderr, exitCode } = part;

  if (!command && !stdout && !stderr) {
    return <div className="text-gray-500 italic">Command result is empty</div>;
  }

  // Style the code blocks based on success/failure
  const isError = exitCode !== 0 && exitCode !== undefined;

  return (
    <div className="space-y-4">
      {command && (
        <div className="mb-4">
          <div className="flex items-center mb-3">
            <FiTerminal className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">Command</h3>
          </div>

          <div className="p-3 bg-gray-800 text-gray-100 rounded-xl font-mono text-sm mb-6 overflow-x-auto border border-gray-700/50">
            {command}
          </div>
        </div>
      )}

      {(stdout || stderr) && (
        <div>
          <div className="flex items-center mb-3">
            <FiFile className="text-gray-600 dark:text-gray-400 mr-2.5" size={18} />
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
              Output
              {exitCode !== undefined && (
                <span className={`ml-2 text-xs ${isError ? 'text-red-500' : 'text-green-500'}`}>
                  (exit code: {exitCode})
                </span>
              )}
            </h3>
          </div>

          <div className="p-3 bg-gray-800 text-gray-100 rounded-xl font-mono text-sm overflow-auto max-h-[50vh] border border-gray-700/50">
            {stdout && <pre className="whitespace-pre-wrap">{stdout}</pre>}

            {stderr && (
              <>
                {stdout && <div className="border-t border-gray-700/50 my-2 pt-2"></div>}
                <div className="text-xs text-red-500 mt-2 mb-1">Error:</div>
                <pre className="text-red-400 whitespace-pre-wrap">{stderr}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
