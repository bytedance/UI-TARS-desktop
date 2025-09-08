import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiTerminal, FiClock, FiPlay, FiCheckCircle, FiXCircle, FiCopy, FiCheck } from 'react-icons/fi';
import { JsonRenderer, JsonRendererRef } from '@/common/components/JsonRenderer';
import { RawToolMapping } from '@/common/state/atoms/rawEvents';
import { formatTimestamp } from '@/common/utils/formatters';

interface RawModeRendererProps {
  toolMapping: RawToolMapping;
}

// Copy button component
const CopyButton: React.FC<{
  jsonRef: React.RefObject<JsonRendererRef>;
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
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
      title={title}
    >
      {copied ? (
        <FiCheck size={12} className="text-green-500" />
      ) : (
        <FiCopy size={12} className="text-slate-400" />
      )}
    </motion.button>
  );
};

export const RawModeRenderer: React.FC<RawModeRendererProps> = ({ toolMapping }) => {
  const { toolCall, toolResult } = toolMapping;
  
  // Refs for JsonRenderer components
  const parametersRef = useRef<JsonRendererRef>(null);
  const responseRef = useRef<JsonRendererRef>(null);
  const metadataRef = useRef<JsonRendererRef>(null);

  return (
    <div className="space-y-3 mt-3">
      {/* Tool Call Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500/5 to-blue-500/5 dark:from-indigo-400/10 dark:to-blue-400/10 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md">
            <FiPlay size={14} className="text-white ml-0.5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">Input</h3>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              <div className="flex items-center gap-1.5">
                <FiClock size={11} />
                <span className="font-medium">{formatTimestamp(toolCall.timestamp, true)}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
                {toolCall.toolCallId.slice(-8)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <FiTerminal size={14} className="text-slate-500" />
                Tool
              </div>
              <div className="px-3 py-2 bg-white/60 dark:bg-slate-800/60 rounded-lg font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200/40 dark:border-slate-700/40">
                {toolCall.name}
              </div>
            </div>
            {toolCall.arguments && (
              <div className="group">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Parameters</span>
                  <CopyButton jsonRef={parametersRef} title="Copy parameters JSON" />
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200/40 dark:border-slate-700/40">
                  <JsonRenderer ref={parametersRef} data={toolCall.arguments} emptyMessage="No parameters provided" />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tool Result Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 ${
            toolResult
              ? toolResult.error
                ? 'bg-gradient-to-r from-red-500/5 to-rose-500/5 dark:from-red-400/10 dark:to-rose-400/10'
                : 'bg-gradient-to-r from-emerald-500/5 to-green-500/5 dark:from-emerald-400/10 dark:to-green-400/10'
              : 'bg-gradient-to-r from-slate-500/5 to-gray-500/5 dark:from-slate-400/10 dark:to-gray-400/10'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md ${
              toolResult
                ? toolResult.error
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-emerald-500 to-green-600'
                : 'bg-gradient-to-br from-slate-400 to-gray-500'
            }`}
          >
            {toolResult ? (
              toolResult.error ? (
                <FiXCircle size={14} className="text-white" />
              ) : (
                <FiCheckCircle size={14} className="text-white" />
              )
            ) : (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">Output</h3>
            {toolResult ? (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                <div className="flex items-center gap-1.5">
                  <FiClock size={11} />
                  <span className="font-medium">{formatTimestamp(toolResult.timestamp, true)}</span>
                </div>
                {toolResult.elapsedMs && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
                      {toolResult.elapsedMs}ms
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Processing...</div>
            )}
          </div>
        </div>
        <div className="p-4">
          {toolResult ? (
            <div className="space-y-3">
              {toolResult.error && (
                <div>
                  <div className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                    <FiXCircle size={14} className="text-red-500" />
                    Error
                  </div>
                  <div className="px-3 py-2 bg-red-50/80 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200 font-mono border border-red-200/40 dark:border-red-800/40">
                    {toolResult.error}
                  </div>
                </div>
              )}
              <div className="group">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Response</span>
                  <CopyButton jsonRef={responseRef} title="Copy response JSON" />
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200/40 dark:border-slate-700/40">
                  <JsonRenderer ref={responseRef} data={toolResult.content} emptyMessage="No response data" />
                </div>
              </div>
              {toolResult._extra && (
                <div className="group">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>Metadata</span>
                    <CopyButton jsonRef={metadataRef} title="Copy metadata JSON" />
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200/40 dark:border-slate-700/40">
                    <JsonRenderer ref={metadataRef} data={toolResult._extra} emptyMessage="No metadata" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Processing request...
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
