import React from 'react';
import { Dialog as HeadlessDialog } from '@headlessui/react';
import { useDarkMode } from '../../hooks/useDarkMode';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
}

interface DialogPanelProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  className,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
}) => {
  const isDarkMode = useDarkMode();

  // Map maxWidth to actual CSS values
  const maxWidthMap = {
    xs: '444px',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  };

  const dialogStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50000, // Increased z-index to ensure it's above everything
    display: 'flex',
    alignItems: fullScreen ? 'stretch' : 'center',
    justifyContent: fullScreen ? 'stretch' : 'center',
    padding: fullScreen ? 0 : '16px',
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)', // Safari support
    transition: 'all 225ms cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: -1, // Behind the dialog panel
  };

  const paperStyle: React.CSSProperties = {
    backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    color: isDarkMode ? '#f9fafb' : '#111827',
    boxShadow: isDarkMode
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', // Safari support
    outline: 'none',
    position: 'relative',
    overflow: fullScreen ? 'auto' : 'hidden',
    transition: 'all 225ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...(fullScreen
      ? {
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          borderRadius: 0,
          flex: 1, // Take full available space
        }
      : {
          borderRadius: '12px',
          maxWidth: maxWidth && typeof maxWidth === 'string' ? maxWidthMap[maxWidth] : 'none',
          width: fullWidth ? '100%' : 'auto',
          maxHeight: 'calc(100vh - 32px)',
        }),
  };

  return (
    <HeadlessDialog open={open} onClose={onClose} className={className} style={dialogStyle}>
      <div style={backdropStyle} aria-hidden="true" />
      <HeadlessDialog.Panel style={paperStyle}>
        <div
          style={{
            padding: 0,
            width: '100%',
            height: fullScreen ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </HeadlessDialog.Panel>
    </HeadlessDialog>
  );
};

export const DialogPanel: React.FC<DialogPanelProps> = ({ className, children }) => {
  return <div className={className}>{children}</div>;
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};
