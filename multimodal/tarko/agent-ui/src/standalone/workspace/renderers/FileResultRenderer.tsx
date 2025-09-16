import React from 'react';
import { FileDisplayMode } from '../types';
import { StandardPanelContent } from '../types/panelContent';
import { MessageContent } from './generic/components/MessageContent';
import { DisplayMode } from './generic/types';
import { MonacoCodeEditor } from '@/sdk/code-editor';
import { useStableCodeContent } from '@/common/hooks/useStableValue';
import { ThrottledHtmlRenderer } from '../components/ThrottledHtmlRenderer';
import { formatBytes } from '../utils/codeUtils';
import { determineFileType } from './generic/utils';
import { commonExtractors } from '@/common/utils/panelContentExtractor';

// Constants
const MAX_HEIGHT_CALC = 'calc(100vh - 215px)';

interface FileResultRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const FileResultRenderer: React.FC<FileResultRendererProps> = ({
  panelContent,
  onAction,
  displayMode,
}) => {
  // Extract file content from panelContent
  const fileData = commonExtractors.fileData(panelContent);
  const fileContent = fileData?.content;
  const filePath = fileData?.path || 'Unknown file';

  // Use stable content to prevent unnecessary re-renders during streaming
  const stableContent = useStableCodeContent(fileContent || '');

  // File metadata parsing
  const fileName = filePath ? filePath.split('/').pop() || filePath : '';
  const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';

  const fileType = determineFileType(fileExtension);

  const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isMarkdownFile = ['md', 'markdown'].includes(fileExtension);
  const isCodeFile = fileType === 'code';

  const approximateSize =
    typeof fileContent === 'string' ? formatBytes(fileContent.length) : 'Unknown size';

  // Determine if content is currently streaming
  const isStreaming = panelContent.isStreaming || false;

  return (
    <div className="space-y-4">
      {/* Content preview area */}
      <div className="overflow-hidden">
        {/* File content display */}
        <div className="overflow-hidden">
          {isHtmlFile &&
          displayMode === 'rendered' &&
          // FIXME: For "str_replace_editor" "create", Found a better solution here,
          panelContent.arguments?.command !== 'view' ? (
            <ThrottledHtmlRenderer content={stableContent} isStreaming={isStreaming} />
          ) : isImageFile ? (
            <div className="text-center p-4">
              <img
                src={`data:image/${fileExtension};base64,${stableContent}`}
                alt={filePath}
                className="max-w-full mx-auto border border-gray-200/50 dark:border-gray-700/30 rounded-lg"
              />
            </div>
          ) : isCodeFile || (isHtmlFile && displayMode === 'source') ? (
            <div className="p-0">
              <MonacoCodeEditor
                code={stableContent}
                fileName={fileName}
                filePath={filePath}
                fileSize={approximateSize}
                showLineNumbers={true}
                maxHeight={MAX_HEIGHT_CALC}
                className="rounded-none border-0"
              />
            </div>
          ) : isMarkdownFile ? (
            displayMode === 'source' ? (
              <div className="p-0">
                <MonacoCodeEditor
                  code={stableContent}
                  fileName={fileName}
                  filePath={filePath}
                  fileSize={approximateSize}
                  showLineNumbers={true}
                  maxHeight={MAX_HEIGHT_CALC}
                  className="rounded-none border-0"
                />
              </div>
            ) : (
              <div className="prose dark:prose-invert prose-sm max-w-none p-4 pt-0">
                <MessageContent
                  message={stableContent}
                  isMarkdown={true}
                  displayMode={displayMode as DisplayMode}
                  isShortMessage={false}
                />
              </div>
            )
          ) : (
            <div className="p-0">
              <MonacoCodeEditor
                code={stableContent}
                fileName={fileName}
                filePath={filePath}
                fileSize={approximateSize}
                showLineNumbers={true}
                maxHeight={MAX_HEIGHT_CALC}
                className="rounded-none border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




