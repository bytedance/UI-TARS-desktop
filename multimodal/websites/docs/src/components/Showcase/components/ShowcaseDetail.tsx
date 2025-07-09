import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Spinner, Chip, Tooltip, Avatar, Link } from '@nextui-org/react';
import { FiArrowLeft, FiShare2, FiX, FiInfo, FiGithub, FiMaximize2 } from 'react-icons/fi';
import { FaCode } from 'react-icons/fa';
import { ShowcaseItem, isRecentlyPublished } from '../adapters/dataAdapter';
import { BrowserShell } from './BrowserShell';

interface ShowcaseDetailProps {
  item: ShowcaseItem;
  onBack: () => void;
  onShare?: (item: ShowcaseItem) => void;
}

export const ShowcaseDetail: React.FC<ShowcaseDetailProps> = ({
  item,
  onBack,
  onShare,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandView = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const handleShare = () => {
    if (onShare && item) {
      onShare(item);
    }
  };

  // Check if item was published within the last 3 days
  const isNew = isRecentlyPublished(item, 3);

  return (
    <>
      <div className="min-h-screen pt-20 bg-black text-white">
        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                className="w-[90%] h-[90%] max-w-7xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={handleClose}
                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20"
                  >
                    <FiX size={18} />
                  </Button>
                </div>

                <div className="h-[calc(100%-40px)]">
                  <BrowserShell
                    url={item.link}
                    loading={isLoading}
                    title={item.title}
                    onShare={handleShare}
                    onClose={handleClose}
                  >
                    <iframe
                      src={item.link}
                      className="w-full h-full"
                      title={item.title}
                      frameBorder="0"
                      style={{
                        borderRadius: '0 0 12px 12px',
                        backgroundColor: '#fff',
                      }}
                      onLoad={() => setIsLoading(false)}
                    />
                  </BrowserShell>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="max-w-[95%] mx-auto px-4 pb-16">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="light"
              color="default"
              startContent={<FiArrowLeft />}
              onClick={onBack}
              className="text-white"
            >
              Back to Showcase
            </Button>
          </div>

          {/* Left-right layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side - Browser preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isExpanded ? 0 : 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:w-3/4 relative h-[calc(100vh-220px)] min-h-[500px]"
            >
              <BrowserShell
                url={item.link}
                loading={isLoading}
                title={item.title}
                onShare={handleShare}
                onExpand={handleExpandView}
              >
                <iframe
                  src={item.link}
                  className="w-full h-full"
                  title={item.title}
                  frameBorder="0"
                  style={{
                    borderRadius: '0 0 12px 12px',
                    backgroundColor: '#fff',
                  }}
                  onLoad={() => setIsLoading(false)}
                />
              </BrowserShell>
            </motion.div>

            {/* Right side - Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-1/4 lg:sticky lg:top-24 lg:self-start"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-6">
                {/* Author section */}
                {item.author && (
                  <div className="border-b border-white/10 pb-5">
                    <h3 className="text-xs uppercase text-gray-500 mb-3">Created by</h3>
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={item.author.github ? `https://github.com/${item.author.github}.png` : undefined}
                        alt={item.author.name}
                        className="w-14 h-14"
                        showFallback
                      />
                      <div>
                        <p className="text-white text-lg font-medium">{item.author.name}</p>
                        {item.author.github && (
                          <a
                            href={`https://github.com/${item.author.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:underline flex items-center gap-1 mt-1"
                          >
                            <FiGithub size={14} />@{item.author.github}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                    {item.title}
                    {isNew && (
                      <span className="ml-2 inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full align-middle">
                        NEW
                      </span>
                    )}
                  </h1>

                  <p className="text-gray-400 mb-5 text-sm">{item.description}</p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm px-3 py-1 rounded-full bg-white/10 text-purple-300">
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>

                    {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase text-gray-500 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-2">
                    <Button
                      startContent={<FiShare2 />}
                      className="bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white w-full mb-3"
                      onClick={handleShare}
                    >
                      Share
                    </Button>
                  </div>
                </div>

                {/* Contribute your own section */}
                <div className="mt-8 pt-5 border-t border-white/10">
                  <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-lg p-4">
                    <h3 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
                      <FaCode />
                      Contribute Your Own
                    </h3>
                    <p className="text-sm text-gray-300 mb-3">
                      Have an interesting Agent TARS report to showcase? We'd love to feature your
                      work in our gallery!
                    </p>
                    <Button
                      as={Link}
                      href="https://github.com/bytedance/UI-TARS-desktop/discussions/244"
                      target="_blank"
                      className="bg-purple-600/80 hover:bg-purple-600 text-white text-sm w-full"
                      size="sm"
                    >
                      Submit Your works
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};
