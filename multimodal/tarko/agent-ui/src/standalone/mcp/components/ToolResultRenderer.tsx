import React from 'react';
import { FiCheckCircle, FiXCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { JsonRenderer } from '@/common/components/JsonRenderer';
import type { MCPToolCallResult, MCPStreamEvent } from '@/common/types/mcp';

interface ToolResultRendererProps {
  result: MCPToolCallResult | null;
  streamingEvents: MCPStreamEvent[];
  isStreaming: boolean;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({
  result,
  streamingEvents,
  isStreaming,
}) => {
  // Render streaming events
  if (streamingEvents.length > 0 || isStreaming) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          {isStreaming ? (
            <>
              <FiLoader className="animate-spin text-blue-600 dark:text-blue-400" size={18} />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Streaming...</h4>
            </>
          ) : (
            <>
              <FiCheckCircle className="text-green-600 dark:text-green-400" size={18} />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Stream Complete</h4>
            </>
          )}
        </div>

        <div className="space-y-2">
          {streamingEvents.map((event, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                event.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : event.type === 'done'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {event.type === 'error' && (
                  <FiXCircle className="flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" size={16} />
                )}
                {event.type === 'done' && (
                  <FiCheckCircle className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" size={16} />
                )}
                {event.type === 'partial' && (
                  <FiAlertCircle className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" size={16} />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">
                    {event.type}
                  </div>
                  {event.error ? (
                    <p className="text-sm text-red-700 dark:text-red-300">{event.error}</p>
                  ) : event.data ? (
                    typeof event.data === 'object' ? (
                      <JsonRenderer data={event.data} className="p-2" />
                    ) : (
                      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {String(event.data)}
                      </pre>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render non-streaming result
  if (result) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          {result.success ? (
            <>
              <FiCheckCircle className="text-green-600 dark:text-green-400" size={18} />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Success</h4>
            </>
          ) : (
            <>
              <FiXCircle className="text-red-600 dark:text-red-400" size={18} />
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Error</h4>
            </>
          )}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {result.error ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
          </div>
        ) : result.result ? (
          typeof result.result === 'object' ? (
            <JsonRenderer data={result.result} className="p-3" />
          ) : (
            <pre className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words overflow-auto max-h-96">
              {String(result.result)}
            </pre>
          )
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No result data</p>
        )}
      </div>
    );
  }

  return null;
};