import React, { useState, useRef, useEffect } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: placement.startsWith('top') ? rect.top - 8 : rect.bottom + 8,
        left: placement.endsWith('end') ? rect.right : rect.left,
      });
    }
  }, [isOpen, placement]);

  const dropdownContent = isOpen ? (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Menu */}
      <div
        className={`fixed z-50 w-80 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm overflow-hidden ${menuClassName}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: placement.startsWith('top') ? 'translateY(-100%)' : 'none',
        }}
      >
        <div className="p-4">{children}</div>
      </div>
    </>
  ) : null;

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={triggerRef}>
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      </div>
      
      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
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
      onClick={onClick}
      className={`group flex w-full items-center rounded-xl px-4 py-3 text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
      } ${className}`}
      disabled={disabled}
    >
      {icon && <span className="mr-4 flex-shrink-0 text-lg">{icon}</span>}
      <div className="flex-1">
        {children}
      </div>
    </button>
  );
};

export const DropdownDivider: React.FC<DropdownDividerProps> = ({ className = '' }) => {
  return <div className={`my-3 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent ${className}`} />;
};

export const DropdownHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-1 py-2 mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </div>
  );
};