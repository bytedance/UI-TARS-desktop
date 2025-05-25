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
 * Design principles:
 * - Contextual content presentation optimized for each data type
 * - Visually distinct sections with elegant spacing and subtle accents
 * - Prominent visual hierarchy for important information
 * - Consistent color scheme with functional accent highlights
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

    if (error) {
      return (
        <div className="p-4 mb-4 bg-red-50/40 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl border border-red-100/40 dark:border-red-800/10">
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
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm"
            />
          </div>
        );

      case 'search':
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // New format: [{ type: 'text', text: '...', name: 'QUERY' }, { type: 'text', text: '...', name: 'RESULTS' }]
          const resultsItem = source.find((item) => item.name === 'RESULTS');
          const queryItem = source.find((item) => item.name === 'QUERY');

          if (resultsItem && resultsItem.text) {
            // Split results text into separate result items
            const resultBlocks = resultsItem.text.split('---').filter(Boolean);
            const parsedResults = resultBlocks.map((block) => {
              // Try to extract title, URL and snippet
              const lines = block.trim().split('\n');
              const titleLine = lines[0] || '';
              const urlLine = lines[1] || '';
              const snippet = lines.slice(2).join('\n');

              // Extract title and URL from lines
              const title = titleLine.replace(/^\[\d+\]\s*/, '').trim();
              const url = urlLine.replace(/^URL:\s*/, '').trim();

              return { title, url, snippet };
            });

            return (
              <div className="p-6 space-y-8">
                {queryItem && (
                  <div className="mb-8">
                    <div className="flex items-center mb-3">
                      <FiSearch className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                      <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                        Search query
                      </h3>
                    </div>

                    <div className="bg-gradient-to-r from-primary-50/80 to-primary-50/40 dark:from-primary-900/15 dark:to-primary-800/5 rounded-2xl px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-200 border border-primary-100/50 dark:border-primary-800/20 shadow-sm">
                      {queryItem.text}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {parsedResults.map((result, idx) => (
                    <div key={idx} className="group relative">
                      <div className="absolute -left-3 top-0 w-1.5 h-full bg-gradient-to-b from-primary-400 to-accent-400 dark:from-primary-500 dark:to-accent-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="bg-gradient-to-b from-white to-white/95 dark:from-gray-800 dark:to-gray-800/95 rounded-2xl overflow-hidden transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-sm dark:hover:shadow-gray-900/30 hover:border-primary-200/60 dark:hover:border-primary-700/40 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400/30 to-accent-400/30 dark:from-primary-600/30 dark:to-accent-500/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="p-5">
                          <div className="flex items-start">
                            <div className="min-w-0 flex-1">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center group/link"
                              >
                                <h3 className="font-semibold text-primary-600 dark:text-primary-500 mb-2 text-lg group-hover/link:text-primary-700 dark:group-hover/link:text-primary-400 transition-colors duration-200 pr-1.5">
                                  {result.title}
                                </h3>

                                <FiExternalLink
                                  className="text-primary-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
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
                        <div className="bg-gradient-to-r from-primary-50/80 to-gray-50/80 dark:from-primary-900/15 dark:to-gray-800/70 px-5 py-3 border-t border-primary-100/40 dark:border-primary-800/20 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className="flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5" />
                              <span>Relevant match</span>
                            </div>
                          </div>

                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 font-medium flex items-center transition-colors"
                          >
                            Visit <FiExternalLink className="ml-1.5" size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        }

        // Fallback to old format handling
        return (
          <div className="p-6 space-y-6">
            {Array.isArray(source.results) &&
              source.results.map((result: any, idx: number) => (
                <div key={idx} className="group relative">
                  <div className="absolute -left-3 top-0 w-1.5 h-full bg-gradient-to-b from-primary-400 to-accent-400 dark:from-primary-500 dark:to-accent-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="bg-gradient-to-b from-white to-white/95 dark:from-gray-800 dark:to-gray-800/95 rounded-2xl overflow-hidden transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-sm dark:hover:shadow-gray-900/30 hover:border-primary-200/60 dark:hover:border-primary-700/40 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400/30 to-accent-400/30 dark:from-primary-600/30 dark:to-accent-500/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="p-5">
                      <div className="flex items-start">
                        <div className="min-w-0 flex-1">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center group/link"
                          >
                            <h3 className="font-semibold text-primary-600 dark:text-primary-500 mb-2 text-lg group-hover/link:text-primary-700 dark:group-hover/link:text-primary-400 transition-colors duration-200 pr-1.5">
                              {result.title}
                            </h3>

                            <FiExternalLink
                              className="text-primary-500 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200"
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
                    <div className="bg-gradient-to-r from-primary-50/80 to-gray-50/80 dark:from-primary-900/15 dark:to-gray-800/70 px-5 py-3 border-t border-primary-100/40 dark:border-primary-800/20 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5" />
                          <span>Relevant match</span>
                        </div>
                      </div>

                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 font-medium flex items-center transition-colors"
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
            <div className="p-6">
              <div className="mb-5">
                <div className="flex items-center mb-3">
                  <FiTerminal className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                  <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                    Command
                  </h3>
                </div>
                <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-sm mb-6 overflow-x-auto">
                  {command || (toolArguments && toolArguments.command) || 'Unknown command'}
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center mb-3">
                  <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                  <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                    Output
                  </h3>
                </div>
                <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-sm overflow-auto max-h-[50vh]">
                  <pre>{stdout}</pre>
                  {stderr && (
                    <>
                      <div className="text-xs text-red-500 mt-2 mb-1">Error:</div>
                      <pre className="text-red-400">{stderr}</pre>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Old format command result handling (object format)
        return (
          <div className="p-6">
            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiTerminal className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Command
                </h3>
              </div>
              <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-sm mb-6">
                {source.command}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Output
                </h3>
              </div>
              <div className="p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-sm overflow-auto max-h-[50vh]">
                <pre>{source.output}</pre>
              </div>
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
            // Extract URL and page content
            const lines = textItem.text.split('\n');
            const urlLine = lines[0] || '';
            const url = urlLine.replace('Navigated to ', '').trim();
            const content = lines.slice(1).join('\n');

            return (
              <div className="p-6">
                <div className="mb-5">
                  <div className="flex items-center mb-3">
                    <FiMonitor className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                    <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                      Browser Navigation
                    </h3>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-primary-50/80 to-primary-50/40 dark:from-primary-900/15 dark:to-primary-800/5 rounded-2xl text-sm mb-6 border border-primary-100/50 dark:border-primary-800/20">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                    >
                      {url}
                      <FiExternalLink className="ml-1.5" size={14} />
                    </a>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center mb-3">
                    <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                    <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                      Page Content
                    </h3>
                  </div>
                  <div className="border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 max-h-[70vh] overflow-auto bg-white/70 dark:bg-gray-800/70 shadow-sm">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
                  </div>
                </div>
              </div>
            );
          }
        }

        // Fallback to old format handling
        return (
          <div className="p-6">
            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiMonitor className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Browser Navigation
                </h3>
              </div>
              <div className="p-4 bg-gradient-to-r from-primary-50/80 to-primary-50/40 dark:from-primary-900/15 dark:to-primary-800/5 rounded-2xl text-sm mb-6 border border-primary-100/50 dark:border-primary-800/20">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                >
                  {source.url}
                  <FiExternalLink className="ml-1.5" size={14} />
                </a>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Page Content
                </h3>
              </div>
              <div className="border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 max-h-[70vh] overflow-auto bg-white/70 dark:bg-gray-800/70 shadow-sm">
                <Markdown>{source.content || source.text || 'No content available'}</Markdown>
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="p-6">
            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  File
                </h3>
              </div>
              <div className="p-4 bg-gradient-to-r from-primary-50/80 to-primary-50/40 dark:from-primary-900/15 dark:to-primary-800/5 rounded-2xl text-sm mb-6 border border-primary-100/50 dark:border-primary-800/20">
                {source.path || 'Unknown file'}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center mb-3">
                <FiFile className="text-primary-600 dark:text-primary-500 mr-2.5" size={20} />
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                  Content
                </h3>
              </div>
              <div className="border border-gray-200/40 dark:border-gray-700/40 rounded-xl p-4 max-h-[70vh] overflow-auto bg-white/70 dark:bg-gray-800/70 shadow-sm">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {source.content || 'No content available'}
                </pre>
              </div>
            </div>
          </div>
        );

      default:
        if (typeof source === 'object') {
          return (
            <div className="p-6">
              <pre className="bg-gradient-to-b from-gray-50/90 to-gray-100/70 dark:from-gray-800/90 dark:to-gray-900/70 p-4 rounded-xl overflow-auto max-h-[70vh] text-sm font-mono border border-gray-200/40 dark:border-gray-700/40 shadow-sm">
                {JSON.stringify(source, null, 2)}
              </pre>
            </div>
          );
        }
        return (
          <div className="p-6">
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200/20 dark:border-gray-700/10">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToList}
            className="mr-3 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-lg"
            title="Back to list"
          >
            <FiArrowLeft size={16} />
          </motion.button>

          <div className="w-8 h-8 mr-3 rounded-lg bg-gradient-to-br from-primary-50/80 to-primary-100/60 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center text-primary-500 dark:text-primary-400">
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
    </motion.div>
  );
};
