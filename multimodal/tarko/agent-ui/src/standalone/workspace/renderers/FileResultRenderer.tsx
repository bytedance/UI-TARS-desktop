import React from 'react';
import { FileDisplayMode } from '../types';
import { StandardPanelContent } from '../types/panelContent';
import { MessageContent } from './generic/components/MessageContent';
import { DisplayMode } from './generic/types';
import { MonacoCodeEditor } from '@/sdk/code-editor';
import { useStableCodeContent } from '@/common/hooks/useStableValue';
import { ThrottledHtmlRenderer } from '../components/ThrottledHtmlRenderer';
import { getLanguageFromExtension, formatBytes } from '../utils/codeUtils';

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
  const fileContent = getFileContent(panelContent);
  const filePath = getFilePath(panelContent);

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

  // Get language for code highlighting
  const language = getLanguageFromExtension(fileExtension);

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
                language={language}
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
                  language="markdown"
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
                language="text"
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

// Helper functions
function getFileContent(panelContent: StandardPanelContent): string | null {
  // Try arguments first (for file operations)
  if (panelContent.arguments?.content && typeof panelContent.arguments.content === 'string') {
    return panelContent.arguments.content;
  }

  // FIXME: For "str_replace_editor" "create", Found a better solution here,
  if (panelContent.arguments?.file_text && typeof panelContent.arguments.file_text === 'string') {
    return panelContent.arguments.file_text;
  }

  if (typeof panelContent.source === 'object') {
    // Handle source array format
    if (Array.isArray(panelContent.source)) {
      return panelContent.source
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('');
    } else {
      // FIXME: For "str_replace_editor" "view"
      if (
        panelContent.arguments?.command === 'view' &&
        typeof panelContent.source === 'object' &&
        typeof panelContent.source.output === 'string'
      ) {
        // Here's the result of running `cat -n` on /home/gem/ui-tars-website/index.html:\n     1\t<!DOCTYPE html>\n
        // return panelContent.source.output.split('\n').slice(1).join('\n');
        return panelContent.source.output;
      }
    }
  }

  // Try source as string (fallback for old format)
  if (typeof panelContent.source === 'string') {
    return panelContent.source;
  }

  return null;
}

function getFilePath(panelContent: StandardPanelContent): string {
  // Try arguments first
  if (panelContent.arguments?.path && typeof panelContent.arguments.path === 'string') {
    return panelContent.arguments.path;
  }

  // Fallback to title
  return panelContent.title || 'Unknown file';
}

// Helper function for file type determination
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
