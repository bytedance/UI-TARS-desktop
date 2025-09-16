import React from 'react';
import {
  Dialog as MuiDialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  ThemeProvider,
} from '@mui/material';
import { FiX } from 'react-icons/fi';
import { createBasicMuiTheme } from '@/common/utils/muiTheme';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  fullScreen?: boolean;
  hideCloseButton?: boolean;
  title?: string;
}

interface DialogPanelProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleComponentProps {
  children: React.ReactNode;
  className?: string;
}

const DialogPanel: React.FC<DialogPanelProps> = ({ className, children }) => {
  return <Box className={className}>{children}</Box>;
};

const DialogTitleComponent: React.FC<DialogTitleComponentProps> = ({ children, className }) => {
  return <Box className={className}>{children}</Box>;
};

export const Dialog: React.FC<DialogProps> & {
  Panel: typeof DialogPanel;
  Title: typeof DialogTitleComponent;
} = ({
  open,
  onClose,
  className,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  hideCloseButton = false,
  title,
}) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const theme = createBasicMuiTheme(isDarkMode);

  return (
    <ThemeProvider theme={theme}>
      <MuiDialog
        open={open}
        onClose={onClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        fullScreen={fullScreen}
        className={className}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 2,
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f3f4f6' : '#111827',
          },
        }}
        BackdropProps={
          fullScreen
            ? {
                sx: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(4px)',
                },
              }
            : {
                sx: {
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(12px)',
                },
              }
        }
        sx={{
          zIndex: 9999,
        }}
      >
        {title && (
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 0 24px',
            }}
          >
            <Box>{title}</Box>
            {!hideCloseButton && (
              <IconButton
                onClick={onClose}
                sx={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  '&:hover': {
                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                  },
                }}
              >
                <FiX size={20} />
              </IconButton>
            )}
          </DialogTitle>
        )}
        <DialogContent
          sx={{
            padding: '0px',
          }}
        >
          {children}
        </DialogContent>
      </MuiDialog>
    </ThemeProvider>
  );
};

Dialog.Panel = DialogPanel;
Dialog.Title = DialogTitleComponent;
