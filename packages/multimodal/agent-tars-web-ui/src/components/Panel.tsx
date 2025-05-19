import React, { useState, useCallback } from 'react';
import { FiFile, FiCode, FiImage, FiX } from 'react-icons/fi';
import styles from './Panel.module.css'; // Import CSS Modules

interface PanelProps {
  /**
   * HTML content to display in the panel.
   * This content is typically rich text or code.
   */
  content: string;

  /**
   * Indicates if content is currently being generated.
   * Defaults to false if not provided.
   */
  isGenerating?: boolean;

  /**
   * Handler function to be called when the panel's close button is clicked.
   */
  onClose: () => void;
}

type PanelType = 'documentation' | 'code' | 'website';

/**
 * Panel component that displays different types of content
 * with tab navigation between documentation, code, and website views.
 * It uses CSS Modules for styling and adheres to the specified theming.
 */
export const Panel: React.FC<PanelProps> = ({ content, isGenerating = false, onClose }) => {
  const [activePanel, setActivePanel] = useState<PanelType>('documentation');

  /**
   * Renders content based on the active panel type.
   * Uses useCallback for performance optimization, re-rendering only when activePanel or content changes.
   */
  const renderPanelContent = useCallback(() => {
    switch (activePanel) {
      case 'documentation':
        return (
          <div
            className="prose max-w-none" // Tailwind's prose class for styling HTML
            dangerouslySetInnerHTML={{
              __html:
                content || '<div class="text-gray-400">Waiting for documentation content...</div>',
            }}
          />
        );

      case 'code':
        return (
          // Using Tailwind utilities for a standard code block appearance
          <div
            className={`${styles.codeBlockContainer} font-mono bg-gray-900 text-white p-4 rounded-md overflow-auto`}
          >
            <pre>{content || '// Waiting for code generation...'}</pre>
          </div>
        );

      case 'website':
        return (
          // Using Tailwind utilities for structure and standard UI elements
          <div className={`${styles.websitePreviewContainer} border rounded-md h-full`}>
            {content ? (
              <div className="p-4">
                <div
                  className={`${styles.browserFrame} bg-gray-100 p-2 mb-4 rounded flex items-center`}
                >
                  <div className="flex space-x-2 mr-2">
                    {/* Standard window control dots */}
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="bg-white flex-1 h-6 rounded px-2 text-xs flex items-center text-gray-500">
                    example.com
                  </div>
                </div>
                {/* Tailwind's prose class for styling HTML content */}
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Waiting for website preview...
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [activePanel, content]);

  // Helper to generate tab button class names
  const getTabClassName = (panelType: PanelType): string => {
    return `${styles.tabButton} ${
      activePanel === panelType ? styles.activeTab : styles.inactiveTab
    }`;
  };

  return (
    <div className={`${styles.panelContainer} flex flex-col`}>
      <div className={`${styles.header} flex justify-between items-center border-b`}>
        <div className="flex items-center">
          <h2 className={`${styles.title} text-xl font-semibold mr-6`}>
            {activePanel === 'documentation' && 'Documentation'}
            {activePanel === 'code' && 'Code Preview'}
            {activePanel === 'website' && 'Website Preview'}
            {isGenerating && <span className="ml-2 text-sm text-gray-500">Generating...</span>}
          </h2>
          <div className={`${styles.tabsContainer} flex space-x-2`}>
            <button
              onClick={() => setActivePanel('documentation')}
              className={getTabClassName('documentation')}
              aria-label="Documentation tab"
            >
              <FiFile className="w-5 h-5 mr-1" />
              <span className="text-sm">Documentation</span>
            </button>
            <button
              onClick={() => setActivePanel('code')}
              className={getTabClassName('code')}
              aria-label="Code tab"
            >
              <FiCode className="w-5 h-5 mr-1" />
              <span className="text-sm">Code</span>
            </button>
            <button
              onClick={() => setActivePanel('website')}
              className={getTabClassName('website')}
              aria-label="Website preview tab"
            >
              <FiImage className="w-5 h-5 mr-1" />
              <span className="text-sm">Website</span>
            </button>
          </div>
        </div>
        <button onClick={onClose} className={`${styles.closeButton} p-2`} aria-label="Close panel">
          <FiX className="w-5 h-5" />
        </button>
      </div>
      <div className={`${styles.contentArea} flex-1 overflow-y-auto`}>{renderPanelContent()}</div>
    </div>
  );
};

// Removed default export
