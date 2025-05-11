import React, { useState } from 'react';
import { useCanvas } from './Canvas/CanvasContext';
import { FiFile, FiCode, FiImage, FiX } from 'react-icons/fi';

interface PanelProps {
  content: string;
  isGenerating?: boolean;
  onClose: () => void;
}

type PanelType = 'documentation' | 'code' | 'website';

const Panel: React.FC<PanelProps> = ({ content, isGenerating = false, onClose }) => {
  const [activePanel, setActivePanel] = useState<PanelType>('documentation');

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'documentation':
        return (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: content || '<div class="text-gray-400">等待生成文档内容...</div>',
            }}
          ></div>
        );
      case 'code':
        return (
          <div className="font-mono bg-gray-900 text-white p-4 rounded-md overflow-auto">
            <pre>{content || '// 等待生成代码...'}</pre>
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
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                ></div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                等待生成网站内容...
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-900 mr-6">
            {activePanel === 'documentation' && '文档预览'}
            {activePanel === 'code' && '代码预览'}
            {activePanel === 'website' && '网站预览'}
            {isGenerating && <span className="ml-2 text-sm text-blue-500">生成中...</span>}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActivePanel('documentation')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'documentation'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <FiFile className="w-5 h-5 mr-1" />
              <span className="text-sm">文档</span>
            </button>
            <button
              onClick={() => setActivePanel('code')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'code'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <FiCode className="w-5 h-5 mr-1" />
              <span className="text-sm">代码</span>
            </button>
            <button
              onClick={() => setActivePanel('website')}
              className={`p-2 rounded-lg transition-colors flex items-center ${
                activePanel === 'website'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <FiImage className="w-5 h-5 mr-1" />
              <span className="text-sm">网站</span>
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors p-2"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">{renderPanelContent()}</div>
    </div>
  );
};

export default Panel;
