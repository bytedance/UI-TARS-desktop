import { useMemo } from 'react';
import { useDarkMode } from '@/common/hooks/useDarkMode';

/**
 * Theme color definitions - cached and optimized
 * Separated from hook for better performance and reusability
 */
const THEME_COLORS = {
  light: {
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-700',
      heading: 'text-gray-900',
      muted: 'text-gray-600',
    },
    background: {
      code: 'bg-gray-50',
      quote: 'bg-gray-50',
    },
    border: {
      default: 'border-gray-200',
      quote: 'border-gray-200',
    }
  },
  dark: {
    text: {
      primary: 'text-gray-200',
      secondary: 'text-gray-300',
      heading: 'text-gray-100',
      muted: 'text-gray-400',
    },
    background: {
      code: 'bg-gray-800/50',
      quote: 'bg-gray-800/30',
    },
    border: {
      default: 'border-gray-700',
      quote: 'border-slate-600',
    }
  }
} as const;

/**
 * Optimized theme management hook with memoization
 * Provides consistent color schemes and theme detection across all markdown elements
 * 
 * Performance optimizations:
 * - Memoized color object to prevent unnecessary re-renders
 * - Static theme definitions for better bundling
 * - Minimal object creation on theme changes
 */
export const useMarkdownTheme = () => {
  const isDarkMode = useDarkMode();
  
  // Memoize the color object to prevent unnecessary re-renders
  const colors = useMemo(() => {
    return THEME_COLORS[isDarkMode ? 'dark' : 'light'];
  }, [isDarkMode]);
  
  const themeClass = isDarkMode ? 'dark' : 'light';

  return {
    isDarkMode,
    themeClass,
    colors,
  };
};

/**
 * Type definitions for better TypeScript support
 */
export type ThemeColors = typeof THEME_COLORS.light;
export type TextColors = ThemeColors['text'];
export type BackgroundColors = ThemeColors['background'];
export type BorderColors = ThemeColors['border'];
