import { createTheme } from '@mui/material';

/**
 * Creates a basic MUI theme with just dark/light mode
 */
export const createBasicMuiTheme = (isDarkMode: boolean) => {
  return createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });
};

/**
 * Creates an enhanced MUI theme for model selector with custom styling
 */
export const createModelSelectorMuiTheme = (isDarkMode: boolean) => {
  return createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1',
      },
      background: {
        paper: isDarkMode ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        default: isDarkMode ? '#1f2937' : '#f9fafb',
      },
      text: {
        primary: isDarkMode ? '#f9fafb' : '#374151',
        secondary: isDarkMode ? '#d1d5db' : '#6b7280',
      },
    },
    components: {
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            height: '28px',
            minHeight: '28px',
            fontSize: '12px',
            fontWeight: 500,
            background: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
            backdropFilter: 'blur(8px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.3)'
              : '1px solid rgba(203, 213, 225, 0.6)',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none !important' },
            '&:hover': {
              background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
              boxShadow: isDarkMode
                ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
            },
            '& .MuiSelect-icon': {
              display: 'none',
            },
          },
          select: {
            padding: '4px 10px !important',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '24px',
            minHeight: '24px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '13px',
            padding: '8px 16px',
            borderRadius: '8px',
            margin: '3px 8px',
            minHeight: '40px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
              transform: 'translateX(2px)',
            },
            '&.Mui-selected': {
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)',
              color: isDarkMode ? '#a5b4fc' : '#6366f1',
              '&:hover': {
                backgroundColor: isDarkMode
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'rgba(99, 102, 241, 0.18)',
                transform: 'translateX(2px)',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '16px',
            maxWidth: '400px',
            boxShadow: isDarkMode
              ? '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 8px 16px -4px rgba(0, 0, 0, 0.3)'
              : '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(20px)',
            border: isDarkMode
              ? '1px solid rgba(75, 85, 99, 0.4)'
              : '1px solid rgba(229, 231, 235, 0.6)',
            background: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            animation: 'menuSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transformOrigin: 'top center',
          },
        },
      },
    },
  });
};
