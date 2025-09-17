import React from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
}

export interface MenuItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface MenuDividerProps {
  className?: string;
}

// 共享的菜单项样式
const getMenuItemStyles = (isDarkMode: boolean) => ({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: isDarkMode ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.9)',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left' as const,
  },
  hover: {
    backgroundColor: isDarkMode
      ? 'rgba(71, 85, 105, 0.3)'
      : 'rgba(241, 245, 249, 0.8)',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

// 共享的菜单容器样式
const getMenuContainerStyles = (isDarkMode: boolean) => ({
  position: 'fixed' as const,
  top: '50px',
  right: '16px',
  minWidth: '200px',
  backgroundColor: isDarkMode
    ? 'rgba(30, 41, 59, 0.95)'
    : 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(12px)',
  border: isDarkMode
    ? '1px solid rgba(71, 85, 105, 0.3)'
    : '1px solid rgba(226, 232, 240, 0.8)',
  borderRadius: '12px',
  boxShadow: isDarkMode
    ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  zIndex: 1000,
  padding: '8px',
});

export const Menu: React.FC<MenuProps> = ({ open, onClose, children, className }) => {
  const isDarkMode = useDarkMode();

  // Close menu when clicking outside
  React.useEffect(() => {
    if (open) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-menu]')) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-menu
      className={className}
      style={getMenuContainerStyles(isDarkMode)}
    >
      {children}
    </div>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({ onClick, children, icon, disabled = false }) => {
  const isDarkMode = useDarkMode();
  const styles = getMenuItemStyles(isDarkMode);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const combinedStyle = {
    ...styles.base,
    ...(isHovered && !disabled ? styles.hover : {}),
    ...(disabled ? styles.disabled : {}),
  };

  return (
    <button
      onClick={handleClick}
      style={combinedStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
    >
      {icon && (
        <span style={{ opacity: 0.7, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
};

export const MenuDivider: React.FC<MenuDividerProps> = ({ className }) => {
  const isDarkMode = useDarkMode();

  return (
    <div
      className={className}
      style={{
        height: '1px',
        backgroundColor: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.6)',
        margin: '8px 0',
      }}
    />
  );
};

// 导出样式工具函数供其他组件使用
export { getMenuItemStyles, getMenuContainerStyles };
