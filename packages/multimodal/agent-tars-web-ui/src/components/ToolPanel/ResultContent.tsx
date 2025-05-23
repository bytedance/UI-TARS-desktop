import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiExternalLink, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { PanelContent } from '../../store/atoms/sessionAtoms';

interface ResultContentProps {
  content: PanelContent;
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}

export const ResultContent: React.FC<ResultContentProps> = ({
  content,
  isFullscreen,
  setIsFullscreen,
}) => {
  if (content.error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 text-red-500 bg-red-50/60 dark:bg-red-900/10 rounded-xl border border-red-100/40 dark:border-red-800/20"
      >
        {content.error}
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={content.toolCallId || content.timestamp}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-auto p-1"
      >
        {renderContent(content.source, content.type, isFullscreen, setIsFullscreen)}
      </motion.div>
    </AnimatePresence>
  );
};

// Render the content based on type
const renderContent = (
  content: any,
  type: string,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
) => {
  if (!content) return <div>No content available</div>;

  switch (type) {
    case 'image':
      return renderImageContent(content, isFullscreen, setIsFullscreen);
    case 'browser':
      return renderBrowserContent(content, isFullscreen, setIsFullscreen);
    case 'search':
      return renderSearchContent(content);
    case 'command':
      return renderCommandContent(content);
    case 'file':
      return renderFileContent(content);
    default:
      return renderDefaultContent(content);
  }
};

// Render image content
const renderImageContent = (
  content: any,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
) => {
  if (typeof content === 'object' && content.type === 'image') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-full"
      >
        <motion.img
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={`data:image/png;base64,${content.data}`}
          alt="Generated image"
          className="max-w-full max-h-[80vh] rounded-2xl border border-gray-200/40 dark:border-gray-700/30 object-contain"
        />
        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </motion.div>
    );
  } else if (typeof content === 'string' && content.startsWith('data:image/')) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-full"
      >
        <motion.img
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={content}
          alt="Image"
          className="max-w-full max-h-[80vh] rounded-2xl border border-gray-200/40 dark:border-gray-700/30 object-contain"
        />
        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </motion.div>
    );
  }
  return <div>Unsupported image format</div>;
};

// Image controls component
const ImageControls: React.FC<{
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}> = ({ isFullscreen, setIsFullscreen }) => (
  <div className="mt-4 flex gap-2">
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <FiDownload size={12} />
      <span>Download</span>
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      onClick={() => setIsFullscreen(!isFullscreen)}
    >
      {isFullscreen ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
      <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
    </motion.button>
  </div>
);

// Render browser content
const renderBrowserContent = (
  content: any,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
) => {
  if (
    (typeof content === 'object' && content.screenshot) ||
    (typeof content === 'string' && content.startsWith('data:image/'))
  ) {
    const imgSrc = typeof content === 'object' ? content.screenshot : content;

    return (
      <div className="flex flex-col h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <motion.img
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            src={imgSrc}
            alt="Browser screenshot"
            className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-2 object-contain"
          />
          <div className="mt-auto">
            {typeof content === 'object' && content.title && (
              <div className="text-sm font-medium mt-2">{content.title}</div>
            )}
            {typeof content === 'object' && content.url && (
              <div className="flex items-center gap-1 mt-1">
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-500 dark:text-primary-400 hover:underline truncate flex items-center gap-1 group"
                >
                  {content.url}
                  <FiExternalLink
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>
        </motion.div>

        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </div>
    );
  }

  // For multimodal content (array)
  if (Array.isArray(content)) {
    return (
      <div className="space-y-4">
        {content.map((item, index) => {
          if (item.type === 'text') {
            return (
              <motion.div
                key={index}
                className="mb-3"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.1 }}
              >
                {item.text}
              </motion.div>
            );
          } else if (item.type === 'image_url') {
            return (
              <motion.img
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                src={item.image_url.url}
                alt={item.image_url.alt || 'Browser content'}
                className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-3"
              />
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

// Render search results
const renderSearchContent = (content: any) => {
  // Handle search results
  if (Array.isArray(content)) {
    // Check if this is multimodal content
    if (content.length > 0 && content[0].type) {
      return content.map((item, index) => {
        if (item.type === 'text') {
          return (
            <motion.div
              key={index}
              className="mb-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              {item.text}
            </motion.div>
          );
        }
        return null;
      });
    }

    // Standard search results
    return (
      <div className="space-y-4">
        {content.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="border-b border-gray-200/40 dark:border-gray-700/30 pb-3 last:border-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 p-2 rounded-lg transition-colors"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.snippet}</div>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-500 dark:text-primary-400 hover:underline truncate block mt-1 flex items-center gap-1 group"
              >
                {item.link}
                <FiExternalLink
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </a>
            )}
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

// Render command output
const renderCommandContent = (content: any) => {
  if (typeof content === 'string') {
    return (
      <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
        {content}
      </pre>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

// Render file content
const renderFileContent = (content: any) => {
  if (typeof content === 'string') {
    return (
      <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
        {content}
      </pre>
    );
  } else if (typeof content === 'object' && content.content) {
    return (
      <div>
        <div className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
          {content.filename || content.path || 'File'}
        </div>
        <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
          {content.content}
        </pre>
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

// Default content renderer for other tool types
const renderDefaultContent = (content: any) => {
  if (Array.isArray(content)) {
    return content.map((item, index) => {
      if (item.type === 'text') {
        return (
          <motion.div
            key={index}
            className="mb-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
          >
            {item.text}
          </motion.div>
        );
      } else if (item.type === 'image_url') {
        return (
          <motion.img
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            src={item.image_url.url}
            alt={item.image_url.alt || 'Content'}
            className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-3"
          />
        );
      }
      return null;
    });
  }

  return (
    <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};
