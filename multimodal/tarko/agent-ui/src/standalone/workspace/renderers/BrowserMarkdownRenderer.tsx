import React from 'react';
import { FileDisplayMode } from '../types';
import { StandardPanelContent } from '../types/panelContent';
import { MessageContent } from './generic/components/MessageContent';
import { DisplayMode } from './generic/types';
import { MonacoCodeEditor } from '@/sdk/code-editor';
import { useStableCodeContent } from '@/common/hooks/useStableValue';

// Constants
const MAX_HEIGHT_CALC = 'calc(100vh - 215px)';

interface BrowserMarkdownRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

export const BrowserMarkdownRenderer: React.FC<BrowserMarkdownRendererProps> = ({
  panelContent,
  onAction,
  displayMode = 'rendered',
}) => {
  // Extract markdown content from panelContent
  const markdownContent = getMarkdownContent(panelContent);
  const pageUrl = getPageUrl(panelContent);

  // Use stable content to prevent unnecessary re-renders during streaming
  const stableContent = useStableCodeContent(markdownContent || '');

  // Determine if content is currently streaming
  const isStreaming = panelContent.isStreaming || false;

  const approximateSize =
    typeof markdownContent === 'string' ? formatBytes(markdownContent.length) : 'Unknown size';

  // Format file size
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Handle content download
  const handleDownload = () => {
    const blob = new Blob([stableContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getPageTitle(pageUrl)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Content preview area */}
      <div className="overflow-hidden">
        {/* Markdown content display */}
        <div className="overflow-hidden">
          {displayMode === 'rendered' ? (
            <div className="prose dark:prose-invert prose-sm max-w-none p-4 pt-0">
              <MessageContent
                message={stableContent}
                isMarkdown={true}
                displayMode={displayMode as DisplayMode}
                isShortMessage={false}
              />
            </div>
          ) : (
            <div className="p-0">
              <MonacoCodeEditor
                code={stableContent}
                language="markdown"
                fileName={`${getPageTitle(pageUrl)}.md`}
                filePath={pageUrl || 'Browser Content'}
                fileSize={approximateSize}
                showLineNumbers={true}
                maxHeight={MAX_HEIGHT_CALC}
                className="rounded-none border-0"
                onCopy={handleDownload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getMarkdownContent(panelContent: StandardPanelContent): string | null {
  // Handle different source formats
  if (typeof panelContent.source === 'string') {
    return panelContent.source;
  }

  if (Array.isArray(panelContent.source)) {
    return panelContent.source
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('');
  }

  if (typeof panelContent.source === 'object' && panelContent.source !== null) {
    // Handle various object formats
    if ('content' in panelContent.source && typeof panelContent.source.content === 'string') {
      return panelContent.source.content;
    }
    if ('text' in panelContent.source && typeof panelContent.source.text === 'string') {
      return panelContent.source.text;
    }
    if ('markdown' in panelContent.source && typeof panelContent.source.markdown === 'string') {
      return panelContent.source.markdown;
    }
  }

  return null;
}

function getPageUrl(panelContent: StandardPanelContent): string | null {
  // Try to get URL from arguments
  if (panelContent.arguments?.url && typeof panelContent.arguments.url === 'string') {
    return panelContent.arguments.url;
  }

  // Try to get URL from source object
  if (typeof panelContent.source === 'object' && panelContent.source !== null) {
    if ('url' in panelContent.source && typeof panelContent.source.url === 'string') {
      return panelContent.source.url;
    }
  }

  return null;
}

function getPageTitle(url: string | null): string {
  if (!url) return 'page-content';

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const path = urlObj.pathname.replace(/\/$/, '').replace(/\//g, '-');
    return `${hostname}${path}` || hostname;
  } catch {
    return 'page-content';
  }
}
