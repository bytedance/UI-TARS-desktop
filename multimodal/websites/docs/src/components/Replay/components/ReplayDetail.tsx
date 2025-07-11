import React, { useState } from 'react';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import { ShowcaseItem } from '../../../services/dataProcessor';
import { SimpleBrowser } from './SimpleBrowser';

interface ReplayDetailProps {
  item: ShowcaseItem;
  onBack: () => void;
}

export const ReplayDetail: React.FC<ReplayDetailProps> = ({ item, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-300 hover:text-gray-100 transition-colors"
          >
            <FiArrowLeft />
            <span>Back</span>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            <SimpleBrowser url={item.link} title={item.title} loading={isLoading}>
              <iframe
                src={item.link}
                className="w-full h-[calc(100vh-150px)] min-h-[600px]"
                title={item.title}
                frameBorder="0"
                onLoad={() => setIsLoading(false)}
              />
            </SimpleBrowser>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/90 rounded-lg border border-gray-700/50 p-6 sticky top-6 backdrop-blur-sm shadow-gray-900/20">
              <h1 className="text-xl font-semibold text-gray-100 mb-3">
                {item.title}
              </h1>

              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{item.description}</p>

              {item.author && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-2">
                    Author
                  </h3>
                  <div className="flex items-center space-x-3">
                    <img
                      src={`https://github.com/${item.author.github}.png`}
                      alt={item.author.name}
                      className="w-8 h-8 rounded-full ring-2 ring-gray-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {item.author.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        @{item.author.github}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {item.date && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-2">
                    Date
                  </h3>
                  <p className="text-sm text-gray-300">{item.date}</p>
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-200 mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block bg-gray-700/70 text-gray-300 text-xs px-2 py-1 rounded-md border border-gray-600/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.languages && item.languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-200 mb-2">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {item.languages.map((lang, i) => (
                      <span
                        key={i}
                        className="inline-block bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-md border border-blue-800/50"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
