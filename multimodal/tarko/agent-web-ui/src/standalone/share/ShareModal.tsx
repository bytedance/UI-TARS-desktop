import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiShare2, FiLink, FiDownload, FiCheck } from 'react-icons/fi';
import { shareService, ShareConfig, ShareResult } from './shareService';
import { Dialog } from '@headlessui/react';
import { LoadingSpinner } from '@/common/components/LoadingSpinner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, sessionId }) => {
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        try {
          const config = await shareService.getShareConfig();
          setShareConfig(config);
        } catch (error) {
          console.error('Failed to get share config:', error);
          setShareConfig({ hasShareProvider: false, shareProvider: null });
        }
      };

      fetchConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShareResult(null);
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (!sessionId || !shareConfig) return;

    setIsLoading(true);
    setShareResult(null);

    try {
      const result = await shareService.shareSession(sessionId, true);
      setShareResult(result);
    } catch (error) {
      console.error('Failed to share session:', error);
      setShareResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setShareResult(null);

    try {
      const result = await shareService.shareSession(sessionId, false);
      setShareResult(result);

      if (result.success && result.html) {
        shareService.downloadShareHtml(result.html, sessionId);
      }
    } catch (error) {
      console.error('Failed to download share HTML:', error);
      setShareResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareResult?.url) {
      navigator.clipboard.writeText(shareResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-3xl border border-[#E5E6EC] dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-medium text-gray-800 dark:text-gray-200 flex items-center">
              <FiShare2 className="mr-3 text-gray-500 dark:text-gray-400" />
              Share Conversation
            </Dialog.Title>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <FiX size={20} />
            </motion.button>
          </div>

          {!shareConfig && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <LoadingSpinner size={5} className="border-gray-400 border-t-transparent" />
                <span>Loading share options...</span>
              </div>
            </div>
          )}

          {shareConfig && !isLoading && !shareResult && (
            <div className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Choose how you want to share this conversation:
              </p>

              <div className="space-y-4">
                {shareConfig.hasShareProvider && (
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/70 transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 mr-3">
                        <FiLink size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          Get shareable link
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Upload and get a link to share
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <FiShare2 size={16} className="text-gray-500 dark:text-gray-400" />
                    </div>
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/70 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 mr-3">
                      <FiDownload size={20} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">
                        Download HTML
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Save the conversation as HTML file
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FiDownload size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                </motion.button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Sharing includes all messages and tool results in this conversation.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <LoadingSpinner size={12} className="border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 text-center">
                Preparing your conversation for sharing...
              </p>
            </div>
          )}

          {shareResult && shareResult.success && shareResult.url && (
            <div className="space-y-6">
              <div className="bg-green-50/50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100/60 dark:border-green-800/30 flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center flex-shrink-0 mr-3">
                  <FiCheck className="text-green-600 dark:text-green-400" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Share link created!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Your conversation is now available at the link below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 pr-1.5">
                <input
                  type="text"
                  value={shareResult.url}
                  readOnly
                  className="flex-grow pl-4 py-3 bg-transparent text-gray-800 dark:text-gray-200 text-sm focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {copied ? (
                    <span className="flex items-center">
                      <FiCheck className="mr-1" size={12} />
                      Copied!
                    </span>
                  ) : (
                    'Copy Link'
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                This link will be accessible to anyone who has it.
              </p>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}

          {shareResult && shareResult.success && shareResult.html && (
            <div className="space-y-6">
              <div className="bg-green-50/50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100/60 dark:border-green-800/30 flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center flex-shrink-0 mr-3">
                  <FiCheck className="text-green-600 dark:text-green-400" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    HTML file downloaded!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    The HTML file contains all messages and tool results from this conversation.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}

          {shareResult && !shareResult.success && (
            <div className="space-y-6">
              <div className="bg-red-50/50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100/60 dark:border-red-800/30 flex items-start">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800/40 flex items-center justify-center flex-shrink-0 mr-3">
                  <FiX className="text-red-600 dark:text-red-400" size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Failed to share</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {shareResult.error ||
                      'An error occurred while trying to share the conversation.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
