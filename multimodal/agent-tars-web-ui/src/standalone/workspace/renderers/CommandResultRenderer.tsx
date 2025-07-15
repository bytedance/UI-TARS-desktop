import React from 'react';
import { ToolResultContentPart } from '../types';

interface CommandResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * Custom command highlighting function
 * Breaks down command line syntax into highlightable fragments
 */
const highlightCommand = (command: string) => {
  // Split the command line, preserving content within quotes
  const tokenize = (cmd: string) => {
    const parts: React.ReactNode[] = [];

    // Regular expression patterns
    const patterns = [
      // Commands and subcommands (usually the first word)
      {
        pattern: /^[\w.-]+|(?<=\s|;|&&|\|\|)[\w.-]+(?=\s|$)/,
        className: 'text-cyan-400 font-bold',
      },
      // Option flags (-v, --version etc.)
      { pattern: /(?<=\s|^)(-{1,2}[\w-]+)(?=\s|=|$)/, className: 'text-yellow-300' },
      // Paths and files
      {
        pattern: /(?<=\s|=|:|^)\/[\w./\\_-]+|\.\/?[\w./\\_-]+|~\/[\w./\\_-]+/,
        className: 'text-green-400',
      },
      // Quoted strings
      { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/, className: 'text-orange-300' },
      // Environment variables
      { pattern: /\$\w+|\$\{\w+\}/, className: 'text-accent-400' },
      // Output redirection
      { pattern: /(?<=\s)(>|>>|<|<<|2>|2>>|&>)(?=\s|$)/, className: 'text-blue-400 font-bold' },
      // Pipes and operators
      { pattern: /(?<=\s)(\||;|&&|\|\|)(?=\s|$)/, className: 'text-red-400 font-bold' },
    ];

    let remainingCmd = cmd;
    let lastIndex = 0;

    // Iterate to parse the command line
    while (remainingCmd) {
      let foundMatch = false;

      for (const { pattern, className } of patterns) {
        const match = remainingCmd.match(pattern);
        if (match && match.index === 0) {
          const value = match[0];
          if (lastIndex < match.index) {
            parts.push(
              <span key={`plain-${lastIndex}`}>{remainingCmd.slice(0, match.index)}</span>,
            );
          }

          parts.push(
            <span key={`highlight-${lastIndex}`} className={className}>
              {value}
            </span>,
          );

          remainingCmd = remainingCmd.slice(match.index + value.length);
          lastIndex += match.index + value.length;
          foundMatch = true;
          break;
        }
      }

      // If no pattern matches, add a plain character and continue
      if (!foundMatch) {
        parts.push(<span key={`char-${lastIndex}`}>{remainingCmd[0]}</span>);
        remainingCmd = remainingCmd.slice(1);
        lastIndex += 1;
      }
    }

    return parts;
  };

  const lines = command.split('\n');
  return lines.map((line, index) => (
    <div key={index} className="command-line whitespace-nowrap">
      {tokenize(line)}
    </div>
  ));
};

/**
 * Renders a terminal-like command and output result
 */
export const CommandResultRenderer: React.FC<CommandResultRendererProps> = ({ part }) => {
  const { command, stdout, stderr, exitCode } = part;

  if (!command && !stdout && !stderr) {
    return <div className="text-gray-500 italic">Command result is empty</div>;
  }

  // Exit code styling
  const isError = exitCode !== 0 && exitCode !== undefined;
  const exitCodeDisplay =
    exitCode !== undefined ? (
      <span className={`ml-2 text-xs ${isError ? 'text-red-500' : 'text-green-500'}`}>
        (exit code: {exitCode})
      </span>
    ) : null;

  return (
    <div className="space-y-2">
      <div className="mb-2">
        {/* Terminal interface with aligned styling */}
        <div className="rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          {/* Terminal title bar with aligned control buttons */}
          <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
            <div className="flex space-x-1.5 mr-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
            </div>
            <div className="text-gray-400 text-xs font-medium mx-auto">user@agent-tars</div>
          </div>

          {/* Terminal content area - use horizontal scrolling instead of auto-wrapping */}
          <div className="bg-black px-3 py-2 font-mono text-sm terminal-content overflow-auto max-h-[80vh]">
            <div className="overflow-x-auto min-w-full">
              {/* Command section */}
              {command && (
                <div className="flex items-start whitespace-nowrap">
                  <span className="select-none text-green-400 mr-2 font-bold terminal-prompt-symbol">
                    $
                  </span>
                  <div className="flex-1 text-gray-200">{highlightCommand(command)}</div>
                </div>
              )}

              {/* Output section - disable auto-wrapping */}
              {stdout && (
                <pre className="whitespace-pre overflow-x-visible text-gray-200 mt-3 ml-3">
                  {stdout}
                </pre>
              )}

              {/* Error output */}
              {stderr && (
                <pre className="whitespace-pre overflow-x-visible text-red-400 my-3 ml-3">
                  {stderr}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
