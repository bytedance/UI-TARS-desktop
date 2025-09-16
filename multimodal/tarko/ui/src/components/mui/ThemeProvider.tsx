import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Theme } from '@mui/material/styles';

export interface ThemeProviderProps {
  theme: Theme;
  children: React.ReactNode;
}

/**
 * ThemeProvider component wrapper for MUI ThemeProvider
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, theme }) => {
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};
