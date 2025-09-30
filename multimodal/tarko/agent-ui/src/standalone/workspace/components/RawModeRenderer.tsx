import React, { useRef, useState, useCallback } from 'react';
import {
  FiTerminal,
  FiClock,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import { JSONViewer, JSONViewerRef } from '@tarko/ui';
import { RawToolMapping } from '@/common/state/atoms/rawEvents';
import { formatTimestamp } from '@/common/utils/formatters';

interface RawModeRendererProps {
  toolMapping: RawToolMapping;
}

// Minimalist copy button
const CopyButton: React.FC<{
  jsonRef: React.RefObject<JSONViewerRef>;
  title: string;
}> = ({ jsonRef, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const jsonString = jsonRef.current?.copyAll();
      if (jsonString) {
        await navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  }, [jsonRef]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
      title={title}
    >
      {copied ? (
        <FiCheck size={14} className="text-green-600" />
      ) : (
        <FiCopy size={14} className="text-slate-400" />
      )}
    </button>
  );
};

// Collapsible section component
const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  timestamp?: string;
  duration?: string;
}> = ({ title, children, defaultOpen = true, icon, timestamp, duration }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors text-left"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900 dark:text-slate-100">{title}</span>
            {(timestamp || duration) && (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {timestamp && (
                  <div className="flex items-center gap-1">
                    <FiClock size={12} />
                    <span className="font-mono">{timestamp}</span>
                  </div>
                )}
                {duration && (
                  <div className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">
                    <span className="font-mono">{duration}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {isOpen ? (
          <FiChevronDown size={16} className="text-slate-400 flex-shrink-0" />
        ) : (
          <FiChevronRight size={16} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="p-4 bg-slate-50 dark:bg-slate-800">{children}</div>}
    </div>
  );
};

// Status indicator component
const StatusIndicator: React.FC<{
  status: 'pending' | 'success' | 'error';
  size?: number;
}> = ({ status, size = 16 }) => {
  if (status === 'pending') {
    return (
      <div
        className="border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
    );
  }

  if (status === 'error') {
    return <FiXCircle size={size} className="text-red-500" />;
  }

  return <FiCheckCircle size={size} className="text-green-500" />;
};

// Simple metadata display
const MetadataRow: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
    {icon}
    <span className="font-medium">{label}:</span>
    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg">
      {value}
    </span>
  </div>
);

export const RawModeRenderer: React.FC<RawModeRendererProps> = ({ toolMapping }) => {
  const { toolCall, toolResult } = toolMapping;

  // Refs for JSONViewer components
  const parametersRef = useRef<JSONViewerRef>(null);
  const responseRef = useRef<JSONViewerRef>(null);
  const metadataRef = useRef<JSONViewerRef>(null);

  const hasParameters = toolCall.arguments && Object.keys(toolCall.arguments).length > 0;
  const hasMetadata = toolResult?._extra && Object.keys(toolResult._extra).length > 0;

  return (
    <div className="space-y-3 mt-4">
      {/* Input Section */}
      <CollapsibleSection
        title="Input"
        icon={<FiPlay size={16} className="text-blue-500" />}
        timestamp={toolCall.timestamp ? formatTimestamp(toolCall.timestamp, true) : undefined}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Tool name */}
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
              <FiTerminal size={14} />
              Tool
            </div>
            <div className="font-mono text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              {toolCall.name}
            </div>
          </div>

          {/* Parameters */}
          {hasParameters && (
            <div className="group">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Parameters</span>
                <CopyButton jsonRef={parametersRef} title="Copy parameters" />
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <JSONViewer
                  ref={parametersRef}
                  data={toolCall.arguments}
                  emptyMessage="No parameters"
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Output Section */}
      <CollapsibleSection
        title="Output"
        icon={
          <StatusIndicator
            status={toolResult ? (toolResult.error ? 'error' : 'success') : 'pending'}
            size={16}
          />
        }
        timestamp={toolResult?.timestamp ? formatTimestamp(toolResult.timestamp, true) : undefined}
        duration={toolResult?.elapsedMs ? `${toolResult.elapsedMs}ms` : undefined}
        defaultOpen={true}
      >
        {toolResult ? (
          <div className="space-y-4">
            {/* Error display */}
            {toolResult.error && (
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                  <FiXCircle size={14} />
                  Error
                </div>
                <div className="bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <pre className="text-sm text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap">
                    {toolResult.error}
                  </pre>
                </div>
              </div>
            )}

            {/* Response data */}
            <div className="group">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Response</span>
                <CopyButton jsonRef={responseRef} title="Copy response" />
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <JSONViewer
                  ref={responseRef}
                  data={toolResult.content}
                  emptyMessage="No response data"
                />
              </div>
            </div>

            {/* Metadata */}
            {hasMetadata && (
              <div className="group">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>Metadata</span>
                  <CopyButton jsonRef={metadataRef} title="Copy metadata" />
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <JSONViewer
                    ref={metadataRef}
                    data={toolResult._extra}
                    emptyMessage="No metadata"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <StatusIndicator status="pending" size={24} />
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                Processing request...
              </p>
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
