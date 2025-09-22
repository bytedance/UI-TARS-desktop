import React from 'react';
import { Menu } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

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
  const [buttonRef, setButtonRef] = React.useState<HTMLElement | null>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [isOpen, setIsOpen] = React.useState(false);

  const updatePosition = React.useCallback(() => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      const newPosition = {
        top: placement.startsWith('top') ? rect.top - 8 : rect.bottom + 8,
        left: placement.endsWith('end') ? rect.right : rect.left,
      };
      setPosition(newPosition);
    }
  }, [buttonRef, placement]);

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [updatePosition, isOpen]);

  return (
    <>
      <Menu as="div" className={`relative inline-block text-left ${className}`}>
        <Menu.Button as="div" ref={setButtonRef} onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </Menu.Button>

        <Menu.Items
          className={`absolute invisible ${menuClassName}`}
          style={{ visibility: 'hidden', pointerEvents: 'none' }}
        >
          <div className="p-1">{children}</div>
        </Menu.Items>
      </Menu>

      {/* Portal for actual visible dropdown */}
      {isOpen && createPortal(
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: placement.startsWith('top') ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: placement.startsWith('top') ? 10 : -10 }}
          transition={{ duration: 0.15 }}
          className={`fixed z-50 min-w-56 origin-top-right rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden ${menuClassName}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: placement.startsWith('top') ? 'translateY(-100%)' : 'none',
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="p-1">{children}</div>
        </motion.div>,
        document.body
      )}

      {/* Click outside handler */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />,
        document.body
      )}
    </>
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
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) {
          onClick();
        }
      }}
      className={`group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      disabled={disabled}
    >
      {icon && <span className="mr-3 flex-shrink-0">{icon}</span>}
      {children}
    </button>
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