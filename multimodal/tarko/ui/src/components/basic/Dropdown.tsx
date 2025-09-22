import React from 'react';
import { Menu } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  menuClassName?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

export interface DropdownItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface DropdownDividerProps {
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  className = '',
  menuClassName = '',
  placement = 'bottom-start',
}) => {
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <Menu.Button as="div">{trigger}</Menu.Button>

      <AnimatePresence>
        <Menu.Items
          as={motion.div}
          initial={{ opacity: 0, scale: 0.95, y: placement.startsWith('top') ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: placement.startsWith('top') ? 10 : -10 }}
          transition={{ duration: 0.15 }}
          className={`absolute z-50 min-w-56 origin-top-right rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden ${
            placement === 'bottom-start'
              ? 'top-full left-0 mt-2'
              : placement === 'bottom-end'
              ? 'top-full right-0 mt-2'
              : placement === 'top-start'
              ? 'bottom-full left-0 mb-2'
              : 'bottom-full right-0 mb-2'
          } ${menuClassName}`}
        >
          <div className="p-1">{children}</div>
        </Menu.Items>
      </AnimatePresence>
    </Menu>
  );
};

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onClick,
  children,
  icon,
  disabled = false,
  className = '',
}) => {
  return (
    <Menu.Item disabled={disabled}>
      {({ active }) => (
        <button
          onClick={onClick}
          className={`${
            active
              ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
              : 'text-gray-700 dark:text-gray-300'
          } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${className}`}
          disabled={disabled}
        >
          {icon && <span className="mr-3 flex-shrink-0">{icon}</span>}
          {children}
        </button>
      )}
    </Menu.Item>
  );
};

export const DropdownDivider: React.FC<DropdownDividerProps> = ({ className = '' }) => {
  return <div className={`my-1 h-px bg-gray-200 dark:bg-gray-600 ${className}`} />;
};

export const DropdownHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
      {children}
    </div>
  );
};