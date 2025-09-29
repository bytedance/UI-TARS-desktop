import React from 'react';
import { MonacoCodeEditor } from '@tarko/ui';
import { FileDisplayMode } from '../types';
import { StandardPanelContent } from '../types/panelContent';
import { MessageContent } from '../components/shared';
import { useStableCodeContent } from '@/common/hooks/useStableValue';
import { ThrottledHtmlRenderer } from '../components/ThrottledHtmlRenderer';
import { formatBytes } from '../utils/codeUtils';

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
  const fileContent = getFileContent(panelContent);
  const filePath = getFilePath(panelContent);

  const stableContent = useStableCodeContent(fileContent || '');

  const fileName = filePath ? filePath.split('/').pop() || filePath : '';
  const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';

  const fileType = determineFileType(fileExtension);

  const isHtmlFile = fileExtension === 'html' || fileExtension === 'htm';
  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(fileExtension);
  const isMarkdownFile = ['md', 'markdown'].includes(fileExtension);
  const isCodeFile = fileType === 'code';

  const approximateSize =
    typeof fileContent === 'string' ? formatBytes(fileContent.length) : 'Unknown size';

  const isStreaming = panelContent.isStreaming || false;

  return (
    <div className="space-y-4 md:text-base text-sm">
      <div className="overflow-hidden">
        <div className="overflow-hidden md:max-h-none max-h-96 overflow-auto">
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
              <div className="prose dark:prose-invert prose-sm max-w-none p-4 pt-0 md:text-base text-sm md:[&_h1]:text-2xl [&_h1]:text-xl md:[&_h2]:text-xl [&_h2]:text-lg md:[&_h3]:text-lg [&_h3]:text-base md:[&_pre]:text-sm [&_pre]:text-xs md:[&_pre]:p-4 [&_pre]:p-3 md:[&_code]:text-sm [&_code]:text-xs md:[&_table]:text-base [&_table]:text-xs md:[&_th]:px-4 md:[&_th]:py-2 [&_th]:px-2 [&_th]:py-1 md:[&_td]:px-4 md:[&_td]:py-2 [&_td]:px-2 [&_td]:py-1">
                <MessageContent
                  message={stableContent}
                  isMarkdown={true}
                  displayMode={displayMode}
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

function getFileContent(panelContent: StandardPanelContent): string | null {
  if (panelContent.arguments?.content && typeof panelContent.arguments.content === 'string') {
    return panelContent.arguments.content;
  }

  // FIXME: For "str_replace_editor" "create", Found a better solution here,
  if (panelContent.arguments?.file_text && typeof panelContent.arguments.file_text === 'string') {
    return panelContent.arguments.file_text;
  }

  if (typeof panelContent.source === 'object') {
    if (Array.isArray(panelContent.source)) {
      return panelContent.source
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');
    } else {
      if (
        panelContent.arguments?.command === 'view' &&
        typeof panelContent.source === 'object' &&
        typeof panelContent.source.output === 'string'
      ) {
        return panelContent.source.output;
      }
    }
  }

  if (typeof panelContent.source === 'string') {
    return panelContent.source;
  }

  return null;
}

function getFilePath(panelContent: StandardPanelContent): string {
  if (panelContent.arguments?.path && typeof panelContent.arguments.path === 'string') {
    return panelContent.arguments.path;
  }

  return panelContent.title || 'Unknown file';
}

function determineFileType(extension: string): 'code' | 'document' | 'image' | 'other' {
  if (
    ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'php', 'html', 'css'].includes(extension)
  ) {
    return 'code';
  }
  if (['md', 'txt', 'docx', 'pdf', 'rtf', 'markdown'].includes(extension)) {
    return 'document';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(extension)) {
    return 'image';
  }
  return 'other';
}
