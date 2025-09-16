import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';
import { highlightCommand } from '../utils/commandHighlight';

interface CommandResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}



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
