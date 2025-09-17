import React from 'react';

// Temporary compatibility ThemeProvider
// This provides the same interface as MUI's ThemeProvider but doesn't actually do anything
// since we're no longer using MUI themes

export interface ThemeProviderProps {
  theme: any; // Accept any theme object for compatibility
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Simply render children without any theme context
  // All styling is now handled by individual components
  return <>{children}</>;
};

// Legacy theme creation functions for backward compatibility
// These return empty objects since we no longer use MUI themes
export const createBasicMuiTheme = (isDarkMode: boolean) => {
  // Return empty theme object for compatibility
  return {
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  };
};

export const createModelSelectorMuiTheme = (isDarkMode: boolean) => {
  // Return empty theme object for compatibility
  return {
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  };
};
