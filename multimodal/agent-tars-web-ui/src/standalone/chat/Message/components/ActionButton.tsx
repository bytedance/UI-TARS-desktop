import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  status?: 'default' | 'pending' | 'success' | 'error';
  statusIcon?: React.ReactNode;
  description?: string;
}

/**
 * ActionButton - 通用操作按钮组件，用于工具调用和环境状态查看等功能
 * 
 * 设计原则：
 * - 统一的视觉风格和交互体验
 * - 可定制的状态显示
 * - 一致的动画效果
 */
export const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  status = 'default',
  statusIcon,
  description
}) => {
  // Helper function to get status color classes
  const getStatusColorClasses = () => {
    switch (status) {
      case 'pending':
        return 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 shadow-sm';
      case 'success':
        return 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 shadow-sm';
      case 'error':
        return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm';
      default:
        return 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 shadow-sm';
    }
  };

  // Helper function to get hover effect classes
  const getHoverColorClasses = () => {
    switch (status) {
      case 'pending':
        return 'hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500';
      case 'success':
        return 'hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500';
      case 'error':
        return 'hover:bg-red-100 dark:hover:bg-red-800/30 hover:border-red-300 dark:hover:border-red-600';
      default:
        return 'hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500';
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border text-left group w-full mt-2 ${getStatusColorClasses()} ${getHoverColorClasses()}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ 
        y: -1,
        transition: { duration: 0.15 }
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 opacity-80">
        {icon}
      </div>
      
      {/* Button text */}
      <div className="truncate flex-1">
        <span className="font-medium">{label}</span>
        {description && (
          <div className="text-xs opacity-70 truncate">{description}</div>
        )}
      </div>
      
      {/* Status icon or arrow */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {statusIcon || (
          <FiArrowRight
            className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-slate-500 dark:text-slate-400"
            size={11}
          />
        )}
      </div>
    </motion.button>
  );
};
