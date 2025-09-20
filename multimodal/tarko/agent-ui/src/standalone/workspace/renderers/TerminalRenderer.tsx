import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';
import { getAgentTitle } from '@/config/web-ui-config';
import { CodeEditor } from '@tarko/ui';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Check if content is valid JSON
 */
function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format tool arguments as JSON string
 */
function formatArguments(args: Record<string, any>): string {
  if (!args || Object.keys(args).length === 0) {
    return '';
  }
  return JSON.stringify(args, null, 2);
}

/**
 * Format tool output as JSON string when applicable
 */
function formatOutput(source: any): string {
  if (Array.isArray(source)) {
    // Handle array format (like command results)
    const outputLines: string[] = [];
    for (const item of source) {
      if (typeof item === 'object' && item !== null) {
        if ('type' in item && 'text' in item) {
          if (item.name) {
            outputLines.push(`[${item.name}]`);
          }
          outputLines.push(String(item.text));
        } else {
          outputLines.push(JSON.stringify(item, null, 2));
        }
      } else {
        outputLines.push(String(item));
      }
    }
    return outputLines.join('\n');
  } else if (typeof source === 'string') {
    // Try to parse and reformat if it's a JSON string
    try {
      const parsed = JSON.parse(source);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return source;
    }
  } else if (source && typeof source === 'object') {
    return JSON.stringify(source, null, 2);
  } else {
    return '(no output)';
  }
}

/**
 * Create terminal command display with syntax highlighting
 */
function formatCommand(title: string, args?: Record<string, any>): React.ReactNode {
  const parts: React.ReactNode[] = [];
  
  // Tool name in cyan
  parts.push(
    <span key="tool" className="text-cyan-400 font-bold">
      {title}
    </span>
  );
  
  // Add key arguments inline if they exist
  if (args && Object.keys(args).length > 0) {
    // Show key arguments inline for common tools
    const keyArgs = ['command', 'path', 'url', 'query'].filter(key => args[key]);
    if (keyArgs.length > 0) {
      parts.push(
        <span key="args" className="text-gray-400 ml-2">
          {keyArgs.map(key => (
            <span key={key}>
              <span className="text-yellow-300">--{key}</span>
              <span className="text-orange-300 ml-1">'{args[key]}'</span>
              <span className="ml-2"></span>
            </span>
          ))}
        </span>
      );
    }
  }
  
  return <div className="flex flex-wrap items-center">{parts}</div>;
}

export const TerminalRenderer: React.FC<TerminalRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  const command = formatCommand(panelContent.title, panelContent.arguments);
  const argumentsJson = formatArguments(panelContent.arguments);
  const output = formatOutput(panelContent.source);
  
  // Combine arguments and output into a single terminal output
  const combinedOutput = [
    argumentsJson && argumentsJson.trim(),
    output && output.trim()
  ].filter(Boolean).join('\n\n');
  
  const hasJsonContent = argumentsJson || (output && isValidJson(output));
  
  return (
    <div className="space-y-4 md:text-base text-sm">
      <div className="md:[&_pre]:text-sm [&_pre]:text-xs md:[&_pre]:p-4 [&_pre]:p-2">
        {hasJsonContent ? (
          // Custom terminal with JSON highlighting using CodeEditor
          <div className="rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {/* Terminal title bar */}
            <div className="bg-[#111111] px-3 py-1.5 border-b border-gray-900 flex items-center">
              <div className="flex space-x-1.5 mr-3">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
              </div>
              <div className="text-gray-400 text-xs font-medium mx-auto">
                user@{getAgentTitle().toLowerCase().replace(/\s+/g, '-')}
              </div>
            </div>

            {/* Terminal content area */}
            <div className="bg-black">
              <div className="overflow-x-auto min-w-full">
                {/* Command section */}
                <div className="flex items-start p-3 pb-0">
                  <span className="select-none text-green-400 mr-2 font-bold">$</span>
                  <div className="flex-1 text-gray-200">{command}</div>
                </div>

                {/* Output section with JSON highlighting using CodeEditor */}
                <div className="[&_.code-editor-container]:!bg-transparent [&_.code-editor-wrapper]:!bg-transparent [&_.code-editor-content]:!bg-transparent [&_.code-editor-pre]:!bg-transparent [&_.code-editor-header]:hidden [&_.code-editor-status-bar]:hidden">
                  <CodeEditor
                    code={combinedOutput || '(no output)'}
                    fileName="output.json"
                    readOnly={true}
                    showLineNumbers={false}
                    maxHeight="calc(100vh - 215px)"
                    className="border-0 rounded-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Use standard TerminalOutput for non-JSON content
          <TerminalOutput
            command={command}
            stdout={combinedOutput || '(no output)'}
            maxHeight="calc(100vh - 215px)"
          />
        )}
      </div>
    </div>
  );
};
