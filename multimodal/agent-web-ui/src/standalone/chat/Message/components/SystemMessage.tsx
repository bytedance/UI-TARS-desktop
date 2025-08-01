import React from 'react';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface SystemMessageProps {
  content: string;
  level?: 'info' | 'warning' | 'error';
  details?: Record<string, any>;
  timestamp?: number;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({
  content,
  level = 'info',
  details,
  timestamp,
}) => {
  const getMessageStyling = () => {
    switch (level) {
      case 'error':
        return {
          container: 'bg-red-50 dark:bg-red-950/50 border-red-200/60 dark:border-red-800/40',
          icon: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
          title: 'text-red-900 dark:text-red-100',
          content: 'text-red-800 dark:text-red-200',
          button:
            'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 hover:bg-red-100/50 dark:hover:bg-red-900/30',
          detailsBg: 'bg-red-100/50 dark:bg-red-900/20 border-red-200/40 dark:border-red-800/30',
          IconComponent: FiAlertCircle,
        };
      case 'warning':
        return {
          container:
            'bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/40',
          icon: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50',
          title: 'text-amber-900 dark:text-amber-100',
          content: 'text-amber-800 dark:text-amber-200',
          button:
            'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100/50 dark:hover:bg-amber-900/30',
          detailsBg:
            'bg-amber-100/50 dark:bg-amber-900/20 border-amber-200/40 dark:border-amber-800/30',
          IconComponent: FiAlertTriangle,
        };
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/60 dark:border-blue-800/40',
          icon: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
          title: 'text-blue-900 dark:text-blue-100',
          content: 'text-blue-800 dark:text-blue-200',
          button:
            'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100/50 dark:hover:bg-blue-900/30',
          detailsBg:
            'bg-blue-100/50 dark:bg-blue-900/20 border-blue-200/40 dark:border-blue-800/30',
          IconComponent: FiInfo,
        };
    }
  };

  const styling = getMessageStyling();
  const { IconComponent } = styling;

  return (
    <div className="w-full max-w-full">
      <div className={`w-full border rounded-xl ${styling.container} overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styling.icon}`}
            >
              <IconComponent size={18} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold leading-relaxed mb-1 ${styling.title}`}>
                {level === 'error' ? 'Error' : level === 'warning' ? 'Warning' : 'Information'}
              </div>
              <div className={`text-sm leading-relaxed ${styling.content}`}>{content}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
