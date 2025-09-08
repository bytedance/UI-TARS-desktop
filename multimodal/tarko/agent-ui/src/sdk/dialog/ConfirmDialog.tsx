import React from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <FiAlertTriangle size={24} className="text-red-500 dark:text-red-400" />,
          confirmButton:
            'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
        };
      case 'warning':
        return {
          icon: <FiAlertTriangle size={24} className="text-amber-500 dark:text-amber-400" />,
          confirmButton:
            'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        };
      default:
        return {
          icon: <FiAlertTriangle size={24} className="text-blue-500 dark:text-blue-400" />,
          confirmButton:
            'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/30">
          <div className="flex items-start">
            <div className={`p-3 rounded-full ${typeStyles.iconBg} mr-4 flex-shrink-0`}>
              {typeStyles.icon}
            </div>

            <div className="flex-1">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {title}
              </Dialog.Title>

              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiX size={18} />
            </motion.button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {cancelText}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              className={`px-4 py-2 ${typeStyles.confirmButton} rounded-lg text-sm font-medium transition-colors`}
            >
              {confirmText}
            </motion.button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
