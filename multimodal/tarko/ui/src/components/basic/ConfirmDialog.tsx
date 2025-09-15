/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from './Dialog';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ConfirmDialogProps {
  isOpen: boolean;
  deleteConfirmLoading: boolean;
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
  deleteConfirmLoading,
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
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm">
      <DialogPanel className="p-6">
        <div className="flex items-start">
          <div className={`p-3 rounded-full ${typeStyles.iconBg} mr-4 flex-shrink-0`}>
            {typeStyles.icon}
          </div>

          <div className="flex-1">
            <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </DialogTitle>

            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 active:scale-90"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={deleteConfirmLoading ? undefined : onConfirm}
            disabled={deleteConfirmLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              deleteConfirmLoading
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : `${typeStyles.confirmButton} hover:scale-105 active:scale-95`
            }`}
          >
            {deleteConfirmLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </DialogPanel>
    </Dialog>
  );
};
