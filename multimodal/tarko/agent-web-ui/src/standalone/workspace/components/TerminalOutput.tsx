import React from 'react';
import { getAgentTitle } from '@/config/web-ui-config';

interface TerminalOutputProps {
  title?: React.ReactNode;
  command?: React.ReactNode;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  maxHeight?: string;
}

/**
 * Shared terminal UI component for command and script execution output
 */
export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  title = `user@${getAgentTitle().toLowerCase().replace(/\s+/g, '-')}`,
  command,
  stdout,
  stderr,
  exitCode,
  maxHeight = '80vh',
}) => {
  const isError = exitCode !== 0 && exitCode !== undefined;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      {/* Terminal title bar */}
      <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
        <div className="flex space-x-1.5 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
        </div>
        <div className="text-gray-400 text-xs font-medium mx-auto flex items-center gap-2">
          <span>{title}</span>
          {exitCode !== undefined && (
            <span
              className={`ml-2 px-1 py-0.5 rounded text-[9px] font-mono ${
                isError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
              }`}
            >
              exit {exitCode}
            </span>
          )}
        </div>
      </div>

      {/* Terminal content area */}
      <div
        className="bg-black p-3 font-mono text-sm terminal-content overflow-auto"
        style={{ maxHeight }}
      >
        <div className="overflow-x-auto min-w-full">
          {/* Command section */}
          {command && (
            <div className="flex items-start">
              <span className="select-none text-green-400 mr-2 font-bold">$</span>
              <div className="flex-1 text-gray-200">{command}</div>
            </div>
          )}

          {/* Output section */}
          {(stdout || stderr) && (
            <div className={command ? 'mt-3' : ''}>
              {stdout && (
                <pre className="whitespace-pre-wrap text-gray-200 ml-3 leading-relaxed">
                  {stdout}
                </pre>
              )}

              {stderr && (
                <pre className="whitespace-pre-wrap text-red-400 ml-3 leading-relaxed">
                  {stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
