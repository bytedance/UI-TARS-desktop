import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import {
  FiArrowLeft,
  FiLayout,
  FiImage,
  FiFile,
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiDownload,
  FiExternalLink,
  FiBookmark,
  FiClock,
} from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import { Markdown } from '../Common/Markdown';

/**
 * WorkspaceDetail Component - Displays details of a single tool result
 *
 * Provides:
 * - Detailed view of tool execution results
 * - Back button to return to list view
 * - Content type-specific rendering
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent, setActivePanelContent, toolResults, activeSessionId } = useSession();
  const { getToolIcon } = useTool();

  if (!activePanelContent) {
    return null;
  }

  const handleBackToList = () => {
    setActivePanelContent(null);
  };

  // Render content based on type
  const renderContent = () => {
    const { type, source, error, arguments: toolArguments } = activePanelContent;
    console.log({ type, source, error, arguments: toolArguments });

    if (error) {
      return (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800/20">
          <div className="font-medium mb-2">Error</div>
          <div className="text-sm whitespace-pre-wrap font-mono">{error}</div>
        </div>
      );
    }

    switch (type) {
      case 'image':
        return (
          <div className="flex justify-center p-4">
            <img
              src={source}
              alt={activePanelContent.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200/50 dark:border-gray-700/50"
            />
          </div>
        );

      case 'search':
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // 新格式: [{ type: 'text', text: '...', name: 'QUERY' }, { type: 'text', text: '...', name: 'RESULTS' }]
          const resultsItem = source.find((item) => item.name === 'RESULTS');
          const queryItem = source.find((item) => item.name === 'QUERY');

          if (resultsItem && resultsItem.text) {
            // 分割结果文本为单独的结果项
            const resultBlocks = resultsItem.text.split('---').filter(Boolean);
            const parsedResults = resultBlocks.map((block) => {
              // 尝试提取标题、URL和摘要
              const lines = block.trim().split('\n');
              const titleLine = lines[0] || '';
              const urlLine = lines[1] || '';
              const snippet = lines.slice(2).join('\n');

              // 从行中提取标题和URL
              const title = titleLine.replace(/^\[\d+\]\s*/, '').trim();
              const url = urlLine.replace(/^URL:\s*/, '').trim();

              return { title, url, snippet };
            });

            return (
              <div className="p-6 space-y-8">
                {queryItem && (
                  <div className="mb-8">
                    <div className="flex items-center mb-3">
                      <FiSearch className="text-green-600 dark:text-green-500 mr-2.5" size={20} />
                      <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                        Search query
                      </h3>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-50/60 dark:from-green-900/20 dark:to-green-800/10 rounded-2xl px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border border-green-100/70 dark:border-green-800/30 shadow-sm">
                      {queryItem.text}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {parsedResults.map((result, idx) => (
                    <div key={idx} className="group relative">
                      <div className="absolute -left-3 top-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-green-300 dark:from-green-500 dark:to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="bg-gradient-to-b from-white to-white/95 dark:from-gray-800 dark:to-gray-800/95 rounded-2xl overflow-hidden transition-all duration-200 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md dark:hover:shadow-gray-900/40 hover:border-green-200/70 dark:hover:border-green-700/50 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400/40 to-green-300/40 dark:from-green-600/40 dark:to-green-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="p-5">
                          <div className="flex items-start">
                            <div className="min-w-0 flex-1">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center group/link"
                              >
                                <h3 className="font-semibold text-green-600 dark:text-green-500 mb-2 text-lg group-hover/link:text-green-700 dark:group-hover/link:text-green-400 transition-colors duration-200 pr-1.5">
                                  {result.title}
                                </h3>

                                <FiExternalLink
                                  className="text-green-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
                                  size={16}
                                />
                              </a>

                              <div className="flex items-center mb-3 text-xs text-gray-500 dark:text-gray-400">
                                <div className="max-w-[300px] truncate">{result.url}</div>
                              </div>

                              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {result.snippet}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gradient-to-r from-green-50/90 to-gray-50/90 dark:from-green-900/20 dark:to-gray-800/80 px-5 py-3 border-t border-green-100/50 dark:border-green-800/30 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                              <span>Relevant match</span>
                            </div>
                          </div>

                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 font-medium flex items-center transition-colors"
                          >
                            Visit <FiExternalLink className="ml-1.5" size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination or "Show more" button if needed */}
                {parsedResults.length > 3 && (
                  <div className="flex justify-center mt-8">
                    <button className="px-5 py-2.5 bg-gradient-to-r from-green-50 to-green-100/70 dark:from-green-900/20 dark:to-green-800/30 hover:from-green-100 hover:to-green-50 dark:hover:from-green-100/30 dark:hover:to-green-800/30 rounded-xl text-green-700 dark:text-green-400 text-sm font-medium transition-colors border border-green-100/70 dark:border-green-800/30">
                      Load more results
                    </button>
                  </div>
                )}
              </div>
            );
          }
        }

        // 回退到旧格式处理
        return (
          <div className="p-6 space-y-6">
            {Array.isArray(source.results) &&
              source.results.map((result: any, idx: number) => (
                <div key={idx} className="group relative">
                  <div className="absolute -left-3 top-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-green-300 dark:from-green-500 dark:to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="bg-gradient-to-b from-white to-white/95 dark:from-gray-800 dark:to-gray-800/95 rounded-2xl overflow-hidden transition-all duration-200 border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md dark:hover:shadow-gray-900/40 hover:border-green-200/70 dark:hover:border-green-700/50 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400/40 to-green-300/40 dark:from-green-600/40 dark:to-green-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="p-5">
                      <div className="flex items-start">
                        <div className="min-w-0 flex-1">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center group/link"
                          >
                            <h3 className="font-semibold text-green-600 dark:text-green-500 mb-2 text-lg group-hover/link:text-green-700 dark:group-hover/link:text-green-400 transition-colors duration-200 pr-1.5">
                              {result.title}
                            </h3>

                            <FiExternalLink
                              className="text-green-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
                              size={16}
                            />
                          </a>

                          <div className="flex items-center mb-3 text-xs text-gray-500 dark:text-gray-400">
                            <div className="max-w-[300px] truncate">{result.url}</div>
                          </div>

                          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {result.snippet}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gradient-to-r from-green-50/90 to-gray-50/90 dark:from-green-900/20 dark:to-gray-800/80 px-5 py-3 border-t border-green-100/50 dark:border-green-800/30 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                          <span>Relevant match</span>
                        </div>
                      </div>

                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 font-medium flex items-center transition-colors"
                      >
                        Visit <FiExternalLink className="ml-1.5" size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        );

      case 'command':
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          const commandItem = source.find((item) => item.name === 'COMMAND');
          const stdoutItem = source.find((item) => item.name === 'STDOUT');
          const stderrItem = source.find((item) => item.name === 'STDERR');

          const command = commandItem?.text || '';
          const stdout = stdoutItem?.text || '';
          const stderr = stderrItem?.text || '';

          return (
            <div className="p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Command:</div>
              <div className="p-2 bg-gray-800 text-gray-100 rounded-md font-mono text-sm mb-4">
                {command || (toolArguments && toolArguments.command) || 'Unknown command'}
              </div>

              {/* {toolArguments && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Arguments:</div>
                  <div className="p-2 bg-gray-700 text-gray-100 rounded-md font-mono text-sm overflow-auto">
                    <pre>{JSON.stringify(toolArguments, null, 2)}</pre>
                  </div>
                </div>
              )} */}

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Output:</div>
              <div className="p-2 bg-gray-800 text-gray-100 rounded-md font-mono text-sm overflow-auto max-h-[50vh]">
                <pre>{stdout}</pre>
                {stderr && (
                  <>
                    <div className="text-xs text-red-500 mt-2 mb-1">Error:</div>
                    <pre className="text-red-400">{stderr}</pre>
                  </>
                )}
              </div>
            </div>
          );
        }

        // 旧格式的命令结果处理 (对象格式)
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Command:</div>

            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm mb-4">
              {source.command}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Output:</div>
            <div className="p-2 bg-gray-800 text-gray-100 rounded-md font-mono text-sm overflow-auto max-h-[50vh]">
              <pre>{source.output}</pre>
            </div>
          </div>
        );

      case 'browser':
        if (
          Array.isArray(source) &&
          source.some(
            (item) => item.type === 'text' && item.text && item.text.startsWith('Navigated to'),
          )
        ) {
          const textItem = source.find((item) => item.type === 'text');
          if (textItem && textItem.text) {
            // 提取URL和页面内容
            const lines = textItem.text.split('\n');
            const urlLine = lines[0] || '';
            const url = urlLine.replace('Navigated to ', '').trim();
            const content = lines.slice(1).join('\n');

            return (
              <div className="p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">URL:</div>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm mb-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {url}
                  </a>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Page Content:</div>
                <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 max-h-[70vh] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
                </div>
              </div>
            );
          }
        }

        // 回退到旧格式处理
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">URL:</div>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm mb-4">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {source.url}
              </a>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Content:</div>
            <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 max-h-[50vh] overflow-auto">
              <Markdown>{source.content || source.text || 'No content available'}</Markdown>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">File:</div>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm mb-4">
              {source.path || 'Unknown file'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Content:</div>
            <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 max-h-[50vh] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {source.content || 'No content available'}
              </pre>
            </div>
          </div>
        );

      default:
        if (typeof source === 'object') {
          return (
            <div className="p-4">
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl overflow-auto max-h-[70vh] text-sm font-mono">
                {JSON.stringify(source, null, 2)}
              </pre>
            </div>
          );
        }
        return (
          <div className="p-4">
            <Markdown>{String(source)}</Markdown>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header with tool info and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-gray-700/20">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToList}
            className="mr-3 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 rounded-lg"
            title="Back to list"
          >
            <FiArrowLeft size={16} />
          </motion.button>

          <div className="w-8 h-8 mr-3 rounded-lg bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center text-primary-500 dark:text-primary-400">
            {getToolIcon(activePanelContent.type)}
          </div>

          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              {activePanelContent.title}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(activePanelContent.timestamp)}
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>

      {/* Footer with info text only */}
      <div className="p-4 border-t border-gray-200/30 dark:border-gray-700/20 flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">Tool result details</div>
      </div>
    </motion.div>
  );
};