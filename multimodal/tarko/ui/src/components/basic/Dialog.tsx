import React from 'react';
import { Dialog as MuiDialog, DialogContent, ThemeProvider } from '@mui/material';
import { createBasicMuiTheme } from '../../utils';
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
            backgroundColor: isDarkMode ? '#111827' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            borderRadius: 3,
          },
        }}
        sx={{
          zIndex: 9999,
          '& .MuiBackdrop-root': {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>{children}</DialogContent>
      </MuiDialog>
    </ThemeProvider>
  );
};

export const DialogPanel: React.FC<DialogPanelProps> = ({ className, children }) => {
  return <div className={className}>{children}</div>;
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};
