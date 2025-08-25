import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';

interface CommandResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
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
    <div key={index} className="command-line whitespace-pre-wrap break-words">
      {tokenize(line)}
    </div>
  ));
};

/**
 * Renders a terminal-like command and output result
 */
export const CommandResultRenderer: React.FC<CommandResultRendererProps> = ({ panelContent }) => {
  // Extract command data from panelContent
  const commandData = extractCommandData(panelContent);

  if (!commandData) {
    return <div className="text-gray-500 italic">Command result is empty</div>;
  }

  const { command, stdout, stderr, exitCode } = commandData;

  // Exit code styling
  const isError = exitCode !== 0 && exitCode !== undefined;

  return (
    <div className="space-y-4">
      <TerminalOutput
        command={command ? highlightCommand(command) : undefined}
        stdout={stdout}
        stderr={stderr}
        exitCode={exitCode}
        maxHeight="calc(100vh - 215px)"
      />
    </div>
  );
};

/**
 * Extract command data from panel content
 *
 * @param panelContent
 * @returns
 */
function extractCommandData(panelContent: StandardPanelContent) {
  const command = panelContent.arguments?.command;

  /**
   * For Agent TARS "run_command" tool.
   * panelContent example:
   *
   * {
   *   "panelContent": {
   *     "type": "command_result",
   *     "source": [
   *       {
   *         "type": "text",
   *         "text": "On branch feat/tarko-workspace-path-display\nChanges to be committed:\n  (use \"git restore --staged <file>...\" to unstage)\n\tmodified:   multimodal/tarko/agent-web-ui/src/common/state/actions/eventProcessor.ts\n\tnew file:   multimodal/tarko/agent-web-ui/src/common/state/atoms/rawEvents.ts\n\n",
   *         "name": "STDOUT"
   *       }
   *     ],
   *     "title": "run_command",
   *     "timestamp": 1755111391440,
   *     "toolCallId": "call_1755111391072_htk5vylkv",
   *     "arguments": {
   *       "command": "git status"
   *     }
   *   }
   * }
   * @param panelContent
   * @returns
   */
  if (Array.isArray(panelContent.source)) {
    // @ts-expect-error MAKE `panelContent.source` is Array
    const stdout = panelContent.source?.find((s) => s.name === 'STDOUT')?.text;
    // @ts-expect-error MAKE `panelContent.source` is Array
    const stderr = panelContent.source?.find((s) => s.name === 'STDERR')?.text;
    return { command, stdout, stderr, exitCode: !stderr ? 0 : 1 };
  }

  /**
   * FIXME: we need to We should design an extension mechanism so that all compatible logic can be
   * implemented through external plug-in solutions.
   */

  /**
   * For Omni-TARS  "execute_bash" tool.
   * {
   *   "panelContent": {
   *      "type": "command_result",
   *      "source": {
   *          "session_id": "0cec471e-97ae-4a4b-9d55-9f3a3466a9b7",
   *          "command": "mkdir -p /home/gem/tmp",
   *          "status": "completed",
   *          "returncode": 0,
   *          "output": "\\u001b[?2004hgem@50ddd3ffedb3:~$ > mkdir -p /home/gem/tmp\\nmkdir -p /home/gem/tmp\\r\\n\\u001b[?2004l\\r\\u001b[?2004hgem@50ddd3ffedb3:~$ ",
   *          "console": [
   *              {
   *                  "ps1": "gem@50ddd3ffedb3:~ $",
   *                  "command": "mkdir -p /home/gem/tmp",
   *                  "output": "\\u001b[?2004hgem@50ddd3ffedb3:~$ > mkdir -p /home/gem/tmp\\nmkdir -p /home/gem/tmp\\r\\n\\u001b[?2004l\\r\\u001b[?2004hgem@50ddd3ffedb3:~$ "
   *              }
   *          ]
   *      },
   *      "title": "execute_bash",
   *      "timestamp": 1755109845677,
   *      "toolCallId": "call_1755109845259_h5f8zcseg",
   *      "arguments": {
   *          "command": "mkdir -p /home/gem/tmp"
   *      }
   *  }
   *}
   */
  if (panelContent.title === 'execute_bash' && typeof panelContent.source === 'object') {
    return {
      command: panelContent.arguments?.command,
      stdout: panelContent.source.output,
      exitCode: panelContent.source.returncode,
    };
  }

  /**
   * Final fallback
   */
  if (typeof panelContent.source === 'string') {
    const isError = panelContent.source.includes('Error: ');

    if (isError) {
      return { command, stderr: panelContent.source, exitCode: 1 };
    }
    return { command, stdout: panelContent.source, exitCode: 0 };
  }
}
