import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';
import { getAgentTitle } from '@/config/web-ui-config';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * JSON syntax highlighting component
 */
const JsonHighlight: React.FC<{ content: string }> = ({ content }) => {
  const highlightJson = (jsonString: string) => {
    // Try to parse and re-stringify to ensure valid JSON formatting
    let formattedJson: string;
    try {
      const parsed = JSON.parse(jsonString);
      formattedJson = JSON.stringify(parsed, null, 2);
    } catch {
      formattedJson = jsonString;
    }

    // Apply syntax highlighting
    return formattedJson
      .split('\n')
      .map((line, index) => {
        const highlightedLine = line
          // Highlight property names (keys)
          .replace(/"([^"]+)":/g, '<span class="text-cyan-400 font-medium">"$1"</span>:')
          // Highlight string values
          .replace(/:\s*"([^"]*)"/g, ': <span class="text-orange-300">"$1"</span>')
          // Highlight numbers
          .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-yellow-300">$1</span>')
          // Highlight booleans
          .replace(/:\s*(true|false)/g, ': <span class="text-purple-400">$1</span>')
          // Highlight null
          .replace(/:\s*(null)/g, ': <span class="text-gray-500">$1</span>')
          // Highlight brackets and braces
          .replace(/([\[\]{}])/g, '<span class="text-gray-400">$1</span>')
          // Highlight commas
          .replace(/(,)/g, '<span class="text-gray-500">$1</span>');

        return (
          <div key={index} dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        );
      });
  };

  return (
    <div className="font-mono text-sm leading-relaxed">
      {highlightJson(content)}
    </div>
  );
};

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
    return source;
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
          // Custom terminal with JSON highlighting
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
            <div
              className="bg-black p-3 font-mono text-sm terminal-content overflow-auto"
              style={{ maxHeight: 'calc(100vh - 215px)' }}
            >
              <div className="overflow-x-auto min-w-full">
                {/* Command section */}
                <div className="flex items-start">
                  <span className="select-none text-green-400 mr-2 font-bold">$</span>
                  <div className="flex-1 text-gray-200">{command}</div>
                </div>

                {/* Output section with JSON highlighting */}
                <div className="mt-3 ml-3">
                  <JsonHighlight content={combinedOutput || '(no output)'} />
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
