import React from 'react';
import { createPortal } from 'react-dom';
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

const getMenuStyles = (isDarkMode: boolean) => ({
  container: {
    position: 'fixed' as const,
    top: '50px',
    right: '16px',
    minWidth: '200px',
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '16px',
    boxShadow: isDarkMode 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    zIndex: 50000,
    padding: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '10px',
    color: isDarkMode ? 'rgba(248, 250, 252, 0.95)' : 'rgba(30, 41, 59, 0.9)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'left' as const,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
  },
  itemHover: {
    backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
    color: isDarkMode ? 'rgba(165, 180, 252, 0.95)' : 'rgba(99, 102, 241, 0.9)',
    transform: 'translateX(2px)',
    boxShadow: isDarkMode 
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
  },
});

export const Menu: React.FC<MenuProps> = ({ open, onClose, children, className }) => {
  const isDarkMode = useDarkMode();
  const styles = getMenuStyles(isDarkMode);

  React.useEffect(() => {
    if (open) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-menu]')) onClose();
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div data-menu className={className} style={styles.container}>
      {children}
    </div>,
    document.body
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  children,
  icon,
  disabled = false,
}) => {
  const isDarkMode = useDarkMode();
  const styles = getMenuStyles(isDarkMode);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={() => !disabled && onClick?.()}
      style={{
        ...styles.item,
        ...(isHovered && !disabled ? styles.itemHover : {}),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
    >
      {icon && (
        <span 
          style={{ 
            opacity: isHovered ? 0.9 : 0.7, 
            flexShrink: 0,
            transition: 'opacity 0.2s ease',
            color: isHovered ? (isDarkMode ? '#a5b4fc' : '#6366f1') : 'inherit'
          }}
        >
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
