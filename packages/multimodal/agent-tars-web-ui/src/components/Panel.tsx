import React, { useState, useCallback } from 'react';
import { FiFile, FiCode, FiImage, FiX } from 'react-icons/fi';

interface PanelProps {
  /**
   * HTML content to display in the panel
   */
  content: string;

  /**
   * Indicates if content is currently being generated
   */
  isGenerating?: boolean;

  /**
   * Handler for closing the panel
   */
  onClose: () => void;
}

type PanelType = 'documentation' | 'code' | 'website';

/**
 * Panel component that displays different types of content
 * with tab navigation between documentation, code and website views
 */
const Panel: React.FC<PanelProps> = ({ content, isGenerating = false, onClose }) => {
  const [activePanel, setActivePanel] = useState<PanelType>('documentation');

  /**
   * Renders content based on active panel type
   */
  const renderPanelContent = useCallback(() => {
    switch (activePanel) {
      case 'documentation':
        return (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html:
                content || '<div class="text-gray-400">Waiting for documentation content...</div>',
            }}
          />
        );

      case 'code':
        return (
          <div className="font-mono bg-gray-900 text-white p-4 rounded-md overflow-auto">
            <pre>{content || '// Waiting for code generation...'}</pre>
          </div>
        );

      case 'website':
        return (
          <div className="border rounded-md h-full">
            {content ? (
              <div className="p-4">
                <div className="bg-gray-100 p-2 mb-4 rounded flex items-center">
                  <div className="flex space-x-2 mr-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="bg-white flex-1 h-6 rounded px-2 text-xs flex items-center text-gray-500">
                    example.com
                  </div>
                </div>
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

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-900 mr-6">
            {activePanel === 'documentation' && 'Documentation'}
            {activePanel === 'code' && 'Code Preview'}
            {activePanel === 'website' && 'Website Preview'}
            {isGenerating && <span className="ml-2 text-sm text-blue-500">Generating...</span>}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActivePanel('documentation')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'documentation'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Documentation tab"
            >
              <FiFile className="w-5 h-5 mr-1" />
              <span className="text-sm">Documentation</span>
            </button>
            <button
              onClick={() => setActivePanel('code')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'code'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Code tab"
            >
              <FiCode className="w-5 h-5 mr-1" />
              <span className="text-sm">Code</span>
            </button>
            <button
              onClick={() => setActivePanel('website')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'website'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Website preview tab"
            >
              <FiImage className="w-5 h-5 mr-1" />
              <span className="text-sm">Website</span>
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors p-2"
          aria-label="Close panel"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">{renderPanelContent()}</div>
    </div>
  );
};

export default Panel;
