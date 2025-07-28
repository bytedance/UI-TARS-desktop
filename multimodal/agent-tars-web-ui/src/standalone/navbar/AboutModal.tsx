import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiX, FiExternalLink, FiGithub, FiGlobe, FiCpu, FiCopy, FiCheck } from 'react-icons/fi';
import { apiService } from '@/common/services/apiService';
import { AgentServerVersionInfo } from '@agent-tars/interface';
import { ModelInfo } from '@/common/types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelInfo: ModelInfo;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, modelInfo }) => {
  const [versionInfo, setVersionInfo] = useState<AgentServerVersionInfo | null>(null);
  const [copiedModel, setCopiedModel] = useState(false);

  // Load version info when modal opens
  useEffect(() => {
    if (isOpen && !versionInfo) {
      apiService.getVersionInfo().then(setVersionInfo).catch(console.error);
    }
  }, [isOpen, versionInfo]);

  const formatBuildTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const copyModelId = async (modelId: string) => {
    try {
      await navigator.clipboard.writeText(modelId);
      setCopiedModel(true);
      setTimeout(() => setCopiedModel(false), 2000);
    } catch (error) {
      console.error('Failed to copy model ID:', error);
    }
  };

  const truncateModel = (model: string, maxLength = 48) => {
    if (model.length <= maxLength) return model;
    return `${model.slice(0, maxLength)}...`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      {/* Full screen backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Full screen modal */}
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="w-full h-full bg-white dark:bg-gray-900 relative overflow-hidden">
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-8 right-8 z-10 p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <FiX size={24} />
          </motion.button>

          {/* Content container */}
          <div className="h-full flex flex-col items-center justify-center px-8 py-16">
            {/* Logo section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="mb-8">
                <img
                  src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png"
                  alt="Agent TARS Logo"
                  className="w-24 h-24 mx-auto rounded-2xl shadow-lg"
                />
              </div>

              <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-gray-100 mb-4 tracking-wide">
                Agent TARS
              </h1>

              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-light tracking-wider uppercase">
                An Open-Source Multimodal AI Agent
              </p>
            </motion.div>

            {(modelInfo.model || modelInfo.provider) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-xl">
                  <FiCpu size={20} className="text-purple-500 flex-shrink-0" />
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {modelInfo.model && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-mono text-gray-800 dark:text-gray-200 truncate cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title={modelInfo.model} // Show full model on hover
                          onClick={() => copyModelId(modelInfo.model!)}
                        >
                          {truncateModel(modelInfo.model)}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyModelId(modelInfo.model!)}
                          className="text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors flex-shrink-0"
                          title="Copy model ID"
                        >
                          {copiedModel ? (
                            <FiCheck size={14} className="text-green-500" />
                          ) : (
                            <FiCopy size={14} />
                          )}
                        </motion.button>
                      </div>
                    )}
                    {modelInfo.provider && (
                      <>
                        <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">•</span>
                        <span className="provider-gradient-text font-medium flex-shrink-0">
                          {modelInfo.provider}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Version info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12 text-center"
            >
              {versionInfo ? (
                <div className="space-y-3">
                  <div className="text-2xl font-mono text-gray-800 dark:text-gray-200">
                    v{versionInfo.version}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    Built on {formatBuildTime(versionInfo.buildTime)}{' '}
                    {versionInfo.gitHash && versionInfo.gitHash !== 'unknown' && (
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-600">
                        (
                        <a
                          href={`https://github.com/bytedance/UI-TARS-desktop/commit/${versionInfo.gitHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline transition-colors"
                        >
                          {versionInfo.gitHash}
                        </a>
                        )
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-500">Loading version...</div>
              )}
            </motion.div>

            {/* Links section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              {/* Website link */}
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://agent-tars.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <FiGlobe size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  Official Website
                </span>
                <FiExternalLink
                  size={16}
                  className="text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors"
                />
              </motion.a>

              {/* GitHub link */}
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://github.com/bytedance/UI-TARS-desktop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg transition-colors group"
              >
                <FiGithub size={20} />
                <span className="font-medium">View on GitHub</span>
                <FiExternalLink
                  size={16}
                  className="opacity-75 group-hover:opacity-100 transition-opacity"
                />
              </motion.a>
            </motion.div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
