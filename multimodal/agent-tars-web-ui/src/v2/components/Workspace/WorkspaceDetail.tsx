import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import { FiFileText, FiBookOpen } from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { ResearchReportRenderer } from './renderers/ResearchReportRenderer';

/**
 * WorkspaceDetail Component - Displays details of a single tool result or report
 */
export const WorkspaceDetail: React.FC = () => {
  const { activePanelContent } = useSession();
  const { getToolIcon } = useTool();

  if (!activePanelContent) {
    return null;
  }

  // 特殊处理 final_answer 类型或研究报告内容
  if (
    activePanelContent?.type === 'research_report' ||
    (activePanelContent.toolCallId && activePanelContent.toolCallId.startsWith('final-answer'))
  ) {
    return (
      <ResearchReportRenderer
        content={
          typeof activePanelContent.source === 'string'
            ? activePanelContent.source
            : JSON.stringify(activePanelContent.source, null, 2)
        }
        title={activePanelContent.title || 'Research Report'}
        isStreaming={activePanelContent.isStreaming}
      />
    );
  }

  // 特殊处理研究报告内容
  if (activePanelContent?.type === 'research_report') {
    return (
      <ResearchReportRenderer
        content={activePanelContent.source}
        title={activePanelContent.title}
        isStreaming={activePanelContent.isStreaming}
      />
    );
  }

  // Convert legacy format content to standardized tool result parts
  const getStandardizedContent = (): ToolResultContentPart[] => {
    const { type, source, title, error, arguments: toolArguments } = activePanelContent;

    // Show error if present
    if (error) {
      return [
        {
          type: 'text',
          name: 'ERROR',
          text: error,
        },
      ];
    }

    // Handle write_file tool specifically
    if (type === 'file' && toolArguments && typeof toolArguments === 'object') {
      if (toolArguments.path && (toolArguments.content || typeof source === 'string')) {
        return [
          {
            type: 'file_result',
            name: 'FILE_RESULT',
            path: toolArguments.path,
            content: toolArguments.content || source,
          },
        ];
      }
    }

    // Handle browser_vision_control type specifically
    if (type === 'browser_vision_control') {
      // 如果这是环境增强，包含原始截图数据
      const environmentImage = Array.isArray(activePanelContent.originalContent)
        ? extractImageUrl(activePanelContent.originalContent)
        : null;

      // Create browser_control part for the specialized renderer
      return [
        {
          type: 'browser_control',
          name: 'BROWSER_CONTROL',
          toolCallId: activePanelContent.toolCallId,
          thought: toolArguments?.thought || '',
          step: toolArguments?.step || '',
          action: toolArguments?.action || '',
          status: source?.status || 'unknown',
          environmentImage: environmentImage, // 传递环境图像
        },
      ];
    }

    // Handle array of content parts from environment_input
    if (Array.isArray(source) && source.some((part) => part.type === 'image_url')) {
      const imagePart = source.find((part) => part.type === 'image_url');
      if (imagePart && imagePart.image_url && imagePart.image_url.url) {
        const imgSrc = imagePart.image_url.url;
        if (imgSrc.startsWith('data:image/')) {
          const [mimeTypePrefix, base64Data] = imgSrc.split(',');
          const mimeType = mimeTypePrefix.split(':')[1].split(';')[0];
          return [
            {
              type: 'image',
              imageData: base64Data,
              mimeType,
              name: activePanelContent.title,
            },
          ];
        }
      }
    }

    // Based on tool type, convert to standardized format
    switch (type) {
      case 'image':
        // Image content
        if (typeof source === 'string' && source.startsWith('data:image/')) {
          const [mimeTypePrefix, base64Data] = source.split(',');
          const mimeType = mimeTypePrefix.split(':')[1].split(';')[0];

          return [
            {
              type: 'image',
              imageData: base64Data,
              mimeType,
              name: activePanelContent.title,
            },
          ];
        }
        return [
          {
            type: 'text',
            text: 'Image could not be displayed',
          },
        ];

      case 'search':
        // Search results
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // Handle new multimodal format
          const resultsItem = source.find((item) => item.name === 'RESULTS');
          const queryItem = source.find((item) => item.name === 'QUERY');

          if (resultsItem && resultsItem.text) {
            // Parse results text into separate result items
            const resultBlocks = resultsItem.text.split('---').filter(Boolean);
            const parsedResults = resultBlocks.map((block) => {
              const lines = block.trim().split('\n');
              const titleLine = lines[0] || '';
              const urlLine = lines[1] || '';
              const snippet = lines.slice(2).join('\n');

              const title = titleLine.replace(/^\[\d+\]\s*/, '').trim();
              const url = urlLine.replace(/^URL:\s*/, '').trim();

              return { title, url, snippet };
            });

            // Return only the search_result part, removing the redundant text query part
            return [
              {
                type: 'search_result',
                name: 'SEARCH_RESULTS',
                results: parsedResults,
                query: queryItem?.text,
              },
            ];
          }
        }

        // Handle old format
        if (source && typeof source === 'object' && source.results) {
          return [
            {
              type: 'search_result',
              name: 'SEARCH_RESULTS',
              results: source.results,
              query: source.query,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      case 'command':
        // Command results
        if (Array.isArray(source) && source.some((item) => item.type === 'text')) {
          // New multimodal format
          const commandItem = source.find((item) => item.name === 'COMMAND');
          const stdoutItem = source.find((item) => item.name === 'STDOUT');
          const stderrItem = source.find((item) => item.name === 'STDERR');

          return [
            {
              type: 'command_result',
              name: 'COMMAND_RESULT',
              command: commandItem?.text || toolArguments?.command,
              stdout: stdoutItem?.text || '',
              stderr: stderrItem?.text || '',
              exitCode: source.find((item) => item.name === 'EXIT_CODE')?.value,
            },
          ];
        }

        // Old format
        if (source && typeof source === 'object') {
          return [
            {
              type: 'command_result',
              name: 'COMMAND_RESULT',
              command: source.command || toolArguments?.command,
              stdout: source.output || source.stdout || '',
              stderr: source.stderr || '',
              exitCode: source.exitCode,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      case 'browser':
        return [
          {
            type: 'json',
            name: title || 'BROWSER_DATA',
            data: source,
          },
        ];

      case 'file':
        // File results
        if (source && typeof source === 'object') {
          return [
            {
              type: 'text',
              name: 'FILE_PATH',
              text: `File: ${source.path || 'Unknown file'}`,
            },
            {
              type: 'text',
              name: 'FILE_CONTENT',
              text: source.content || 'No content available',
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];

      default:
        // Default handling for unknown types
        if (typeof source === 'object') {
          return [
            {
              type: 'json',
              name: 'JSON_DATA',
              data: source,
            },
          ];
        }

        return [
          {
            type: 'text',
            text: typeof source === 'string' ? source : JSON.stringify(source, null, 2),
          },
        ];
    }
  };

  // 辅助函数：从文本内容中提取URL
  const extractUrlFromContent = (content: string): string => {
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const lines = content.split('\n');
      const firstLine = lines[0] || '';
      return firstLine.replace('Navigated to ', '').trim();
    }
    return '';
  };

  // 辅助函数：从环境内容中提取图片URL
  const extractImageUrl = (content: any[]): string | null => {
    const imgPart = content.find(
      (part) => part && part.type === 'image_url' && part.image_url && part.image_url.url,
    );
    return imgPart ? imgPart.image_url.url : null;
  };

  // Handle tool result content action
  const handleContentAction = (action: string, data: any) => {
    if (action === 'zoom' && data.src) {
      // Here you could open a modal with the zoomed image
      console.log('Zoom image:', data.src);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header with tool info */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/40 dark:border-gray-700/20">
        <div className="flex items-center">
          <div className="w-10 h-10 mr-3 rounded-xl flex items-center justify-center relative overflow-hidden">
            {/* 使用特殊图标替代 final_answer 工具图标 */}
            {activePanelContent.toolCallId?.startsWith('final-answer') ? (
              <div className="absolute inset-0 bg-gradient-to-br from-accent-400 to-accent-500 opacity-20"></div>
            ) : (
              <div
                className={`absolute inset-0 opacity-20 ${
                  activePanelContent?.type === 'search'
                    ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                    : activePanelContent?.type === 'browser'
                      ? 'bg-gradient-to-br from-purple-400 to-pink-500'
                      : activePanelContent?.type === 'command'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : activePanelContent?.type === 'file'
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                          : activePanelContent?.type === 'image'
                            ? 'bg-gradient-to-br from-red-400 to-rose-500'
                            : activePanelContent?.type === 'browser_vision_control'
                              ? 'bg-gradient-to-br from-cyan-400 to-teal-500'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}
              ></div>
            )}
            <div className="relative z-10">
              {activePanelContent.toolCallId?.startsWith('final-answer') ? (
                <FiBookOpen className="text-accent-600 dark:text-accent-400" size={20} />
              ) : (
                getToolIcon(activePanelContent?.type || 'other')
              )}
            </div>
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
      <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/30 p-6">
        <ToolResultRenderer content={getStandardizedContent()} onAction={handleContentAction} />
      </div>
    </motion.div>
  );
};
