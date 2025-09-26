import React from 'react';
import { StandardPanelContent } from '../types/panelContent';
import { FileDisplayMode } from '../types';
import { TerminalOutput } from '../components/TerminalOutput';
import { getAgentTitle } from '@/config/web-ui-config';
import { CodeHighlight } from '@tarko/ui';

interface TerminalRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * URL regex pattern to detect URLs in text
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

/**
 * Convert text with URLs to JSX with clickable links
 */
function linkifyText(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
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
 * Custom CodeHighlight wrapper that makes URLs clickable in JSON
 */
function CodeHighlightWithLinks({ code, language }: { code: string; language: string }) {
  if (language !== 'json') {
    return <CodeHighlight code={code} language={language} />;
  }

  // For JSON, render with clickable URLs
  const renderJsonWithLinks = (jsonString: string) => {
    const urlRegex = /"(https?:\/\/[^"\s]+)"/g;
    const parts = jsonString.split(urlRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a URL (every odd index after split)
      if (index > 0 && index % 2 === 1 && /^https?:\/\//.test(part)) {
        return (
          <React.Fragment key={index}>
            <span className="text-green-400">"</span>
            <a
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
            <span className="text-green-400">"</span>
          </React.Fragment>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Check if the code contains URLs in JSON strings
  const hasUrls = /"https?:\/\/[^"\s]+"/.test(code);
  
  if (!hasUrls) {
    return <CodeHighlight code={code} language={language} />;
  }

  // Render with custom URL handling
  return (
    <pre className="text-sm bg-transparent text-gray-300 whitespace-pre-wrap break-words font-mono">
      <code>{renderJsonWithLinks(code)}</code>
    </pre>
  );
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
          // Try to parse and format the text if it's JSON
          let textContent = String(item.text);
          try {
            const parsed = JSON.parse(textContent);
            textContent = JSON.stringify(parsed, null, 2);
          } catch {
            // Keep original text if not JSON
          }
          outputLines.push(textContent);
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
    </span>,
  );

  // Add key arguments inline if they exist
  if (args && Object.keys(args).length > 0) {
    // Show key arguments inline for common tools
    const keyArgs = ['command', 'path', 'url', 'query'].filter((key) => args[key]);
    if (keyArgs.length > 0) {
      parts.push(
        <span key="args" className="text-gray-400 ml-2">
          {keyArgs.map((key) => (
            <span key={key}>
              <span className="text-yellow-300">--{key}</span>
              <span className="text-orange-300 ml-1">'{args[key]}'</span>
              <span className="ml-2"></span>
            </span>
          ))}
        </span>,
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

  return (
    <div className="space-y-4 md:text-base text-sm font-mono">
      <div className="md:[&_pre]:text-sm [&_pre]:text-xs md:[&_pre]:p-4 [&_pre]:p-2">
        {/* Terminal with JSON highlighting using CodeEditor */}
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
              <div className="flex items-start p-3 pb-0 text-sm">
                <span className="select-none text-green-400 mr-2 font-bold">$</span>
                <div className="flex-1 text-gray-200">{command}</div>
              </div>

              {/* Arguments section */}
              {argumentsJson && (
                <div className="p-3 pb-0 bg-[#121212] rounded m-3 mb-0 max-h-[40vh] overflow-auto">
                  <CodeHighlightWithLinks code={argumentsJson} language="json" />
                </div>
              )}

              {/* Output section */}
              {output && (
                <div className="p-3 bg-[#121212] rounded m-3 max-h-[80vh] overflow-auto">
                  <CodeHighlightWithLinks code={output} language="json" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
