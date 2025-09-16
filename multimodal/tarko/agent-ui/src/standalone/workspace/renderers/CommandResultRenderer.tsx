import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';
import { highlightCommand } from '../utils/commandHighlight';
import { commonExtractors } from '@/common/utils/panelContentExtractor';

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
  const commandData = commonExtractors.commandData(panelContent);

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


