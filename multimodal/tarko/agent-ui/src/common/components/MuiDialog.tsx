import React from 'react';
import { Dialog as MuiDialog, DialogContent, ThemeProvider } from '@mui/material';
import { createBasicMuiTheme } from '@/common/utils/muiTheme';

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

const DialogPanel: React.FC<DialogPanelProps> = ({ className, children }) => {
  return <div className={className}>{children}</div>;
};

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export const Dialog: React.FC<DialogProps> & {
  Panel: typeof DialogPanel;
  Title: typeof DialogTitle;
} = ({
  open,
  onClose,
  className,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
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
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f3f4f6' : '#111827',
            borderRadius: 3,
          },
        }}
        sx={{
          zIndex: 9999,
        }}
      >
        <DialogContent sx={{ padding: 0 }}>{children}</DialogContent>
      </MuiDialog>
    </ThemeProvider>
  );
};

Dialog.Panel = DialogPanel;
Dialog.Title = DialogTitle;
