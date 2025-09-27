import React, { useRef, useState, useCallback } from 'react';
import {
  FiTerminal,
  FiClock,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';
import { JSONViewer, JSONViewerRef } from '@tarko/ui';
import { RawToolMapping } from '@/common/state/atoms/rawEvents';
import { formatTimestamp } from '@/common/utils/formatters';

interface RawModeRendererProps {
  toolMapping: RawToolMapping;
}

// Copy button component
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
      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
      title={title}
    >
      {copied ? (
        <FiCheck size={12} className="text-green-500" />
      ) : (
        <FiCopy size={12} className="text-slate-400" />
      )}
    </button>
  );
};

export const RawModeRenderer: React.FC<RawModeRendererProps> = ({ toolMapping }) => {
  const { toolCall, toolResult } = toolMapping;

  // Refs for JSONViewer components
  const parametersRef = useRef<JSONViewerRef>(null);
  const responseRef = useRef<JSONViewerRef>(null);
  const metadataRef = useRef<JSONViewerRef>(null);

  return (
    <div className="space-y-4 mt-4">
      {/* Tool Call Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
            <FiPlay size={12} className="text-white ml-0.5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">Input</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <div className="flex items-center gap-1">
                <FiClock size={10} />
                <span>
                  {toolCall.timestamp ? formatTimestamp(toolCall.timestamp, true) : 'Unknown time'}
                </span>
              </div>
              <span>•</span>
              <span className="font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                {toolCall.toolCallId.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <FiTerminal size={12} className="text-slate-500" />
                Tool
              </div>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {toolCall.name}
              </div>
            </div>
            {toolCall.arguments && (
              <div className="group">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Parameters</span>
                  <CopyButton jsonRef={parametersRef} title="Copy parameters JSON" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                  <JSONViewer
                    ref={parametersRef}
                    data={toolCall.arguments}
                    emptyMessage="No parameters provided"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Result Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${
            toolResult
              ? toolResult.error
                ? 'bg-red-50 dark:bg-red-900/10'
                : 'bg-green-50 dark:bg-green-900/10'
              : 'bg-slate-50 dark:bg-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center ${
              toolResult
                ? toolResult.error
                  ? 'bg-red-500'
                  : 'bg-green-500'
                : 'bg-slate-400'
            }`}
          >
            {toolResult ? (
              toolResult.error ? (
                <FiXCircle size={12} className="text-white" />
              ) : (
                <FiCheckCircle size={12} className="text-white" />
              )
            ) : (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">Output</h3>
            {toolResult ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <div className="flex items-center gap-1">
                  <FiClock size={10} />
                  <span>
                    {toolResult.timestamp ? formatTimestamp(toolResult.timestamp, true) : 'Unknown time'}
                  </span>
                </div>
                {toolResult.elapsedMs && (
                  <>
                    <span>•</span>
                    <span className="font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      {toolResult.elapsedMs}ms
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Processing...</div>
            )}
          </div>
        </div>
        <div className="p-4">
          {toolResult ? (
            <div className="space-y-4">
              {toolResult.error && (
                <div>
                  <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                    <FiXCircle size={12} className="text-red-500" />
                    Error
                  </div>
                  <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-md text-sm text-red-800 dark:text-red-200 font-mono border border-red-200 dark:border-red-800">
                    {toolResult.error}
                  </div>
                </div>
              )}
              <div className="group">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Response</span>
                  <CopyButton jsonRef={responseRef} title="Copy response JSON" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                  <JSONViewer
                    ref={responseRef}
                    data={toolResult.content}
                    emptyMessage="No response data"
                  />
                </div>
              </div>
              {toolResult._extra && (
                <div className="group">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>Metadata</span>
                    <CopyButton jsonRef={metadataRef} title="Copy metadata JSON" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-700">
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
                <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Processing request...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
