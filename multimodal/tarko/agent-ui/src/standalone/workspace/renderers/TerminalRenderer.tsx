import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * Format tool arguments with JSON syntax highlighting
 */
function formatArguments(args: Record<string, any>): React.ReactNode {
  if (!args || Object.keys(args).length === 0) {
    return null;
  }

  const argLines: React.ReactNode[] = [];
  
  Object.entries(args).forEach(([key, value], index) => {
    argLines.push(
      <div key={index} className="flex">
        <span className="text-cyan-400 font-bold">{key}</span>
        <span className="text-gray-400 mx-2">:</span>
        <span className="text-orange-300">
          {typeof value === 'string' && value.length > 80
            ? `"${value.substring(0, 80)}..."`
            : JSON.stringify(value)}
        </span>
      </div>
    );
  });

  return (
    <div className="mb-3">
      <div className="text-yellow-300 font-bold mb-1"># Tool Arguments:</div>
      <div className="ml-3 space-y-1">{argLines}</div>
    </div>
  );
}

/**
 * Format tool output with JSON syntax highlighting when applicable
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
  const argumentsDisplay = formatArguments(panelContent.arguments);
  const output = formatOutput(panelContent.source);
  
  // Combine arguments and output
  const fullOutput = argumentsDisplay 
    ? React.createElement('div', {}, 
        argumentsDisplay,
        React.createElement('div', { className: 'text-yellow-300 font-bold mb-1' }, '# Tool Output:'),
        React.createElement('pre', { className: 'ml-3 whitespace-pre-wrap' }, output)
      )
    : output;
  
  return (
    <div className="space-y-4 md:text-base text-sm">
      <div className="md:[&_pre]:text-sm [&_pre]:text-xs md:[&_pre]:p-4 [&_pre]:p-2">
        <TerminalOutput
          command={command}
          stdout={typeof fullOutput === 'string' ? fullOutput : undefined}
          maxHeight="calc(100vh - 215px)"
        />
        {typeof fullOutput !== 'string' && (
          <div className="rounded-lg overflow-hidden border border-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)] mt-4">
            <div className="bg-black p-3 font-mono text-sm">
              <div className="text-gray-200">{fullOutput}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
