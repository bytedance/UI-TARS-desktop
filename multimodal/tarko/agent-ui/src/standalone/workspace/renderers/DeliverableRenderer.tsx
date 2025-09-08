import React from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiCode, FiDownload, FiExternalLink, FiCopy, FiCheck } from 'react-icons/fi';
import { StandardPanelContent } from '../types/panelContent';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import { FileDisplayMode } from '../types';

interface DeliverableRendererProps {
  panelContent: StandardPanelContent;
  onAction?: (action: string, data: unknown) => void;
  displayMode?: FileDisplayMode;
}

/**
 * DeliverableRenderer - Specialized component for rendering deliverable content
 */
export const DeliverableRenderer: React.FC<DeliverableRendererProps> = ({
  panelContent,
  onAction,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Extract deliverable data from panelContent
  const deliverableData = extractDeliverableData(panelContent);

  if (!deliverableData) {
    return <div className="text-gray-500 italic">No deliverable content available</div>;
  }

  const { title, content, name } = deliverableData;

  // Determine deliverable type based on available data
  const getDeliverableType = () => {
    // Check extensions if name exists
    if (name) {
      if (/\.(js|ts|jsx|tsx|py|java|c|cpp|php|html|css|json)$/i.test(name)) return 'code';
      if (/\.(md|txt|docx|pdf|rtf)$/i.test(name)) return 'document';
      if (/\.(csv|xlsx|xls|xml)$/i.test(name)) return 'data';
    }

    // Check title
    if (title) {
      if (title.toLowerCase().includes('report')) return 'document';
      if (title.toLowerCase().includes('code')) return 'code';
      if (title.toLowerCase().includes('data')) return 'data';
    }

    // Default
    return 'document';
  };

  const deliverableType = getDeliverableType();

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || title || 'deliverable';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Deliverable header with metadata */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
        <div className="flex items-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 border border-gray-200/50 dark:border-gray-700/30 shadow-sm 
            bg-gradient-to-br 
            from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 
            text-amber-500 dark:text-amber-400"
          >
            {deliverableType === 'code' ? <FiCode size={18} /> : <FiFileText size={18} />}
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              {title || name || 'Deliverable'}
            </h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="mr-2">
                {deliverableType === 'code' ? 'Code artifact' : 'Document'}
              </span>
              {name && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Copy content"
          >
            {copied ? <FiCheck size={18} className="text-green-500" /> : <FiCopy size={18} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download file"
          >
            <FiDownload size={18} />
          </motion.button>
        </div>
      </div>

      {/* Content preview with appropriate rendering */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100/50 dark:border-gray-700/30 flex items-center">
          <FiFileText className="text-gray-600 dark:text-gray-400 mr-2.5" size={16} />
          <div className="font-medium text-gray-700 dark:text-gray-300">Content Preview</div>
        </div>

        <div className="p-4 max-h-[70vh] overflow-auto">
          {deliverableType === 'code' ? (
            <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100/30 dark:border-gray-700/20 overflow-x-auto">
              {content}
            </pre>
          ) : (
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function extractDeliverableData(panelContent: StandardPanelContent): {
  title?: string;
  content: string;
  name?: string;
} | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const { title, text, data, name } = panelContent.arguments;
      const content = text || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      if (content && typeof content === 'string') {
        return {
          title: title ? String(title) : panelContent.title,
          content,
          name: name ? String(name) : undefined,
        };
      }
    }

    // Try to extract from source
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      const sourceObj = panelContent.source as any;
      const { title, text, data, name } = sourceObj;
      const content = text || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      if (content && typeof content === 'string') {
        return {
          title: title ? String(title) : panelContent.title,
          content,
          name: name ? String(name) : undefined,
        };
      }
    }

    // If source is a string, treat it as content
    if (typeof panelContent.source === 'string') {
      return {
        title: panelContent.title,
        content: panelContent.source,
        name: undefined,
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract deliverable data:', error);
    return null;
  }
}
