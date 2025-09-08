import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useMarkdownTheme, type ThemeColors } from '../hooks/useMarkdownTheme';

/**
 * Computed styles for all markdown elements
 * Centralized to avoid duplicate calculations across components
 */
interface MarkdownStyles {
  text: {
    paragraph: string;
    unorderedList: string;
    orderedList: string;
    listItem: string;
    blockquote: string;
    horizontalRule: string;
  };
  headings: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5h6: string;
  };
  colors: ThemeColors;
  themeClass: string;
}

/**
 * Generate all markdown styles in one place
 * Prevents style recalculation across multiple components
 */
const createMarkdownStyles = (colors: ThemeColors, themeClass: string): MarkdownStyles => {
  const baseHeadingStyles = 'group scroll-mt-20 flex items-center font-semibold leading-tight';
  
  return {
    text: {
      paragraph: `my-2 ${colors.text.primary} leading-relaxed text-base`,
      unorderedList: `my-2 list-disc pl-6 ${colors.text.primary} text-base`,
      orderedList: `my-2 list-decimal pl-6 ${colors.text.primary} text-base`,
      listItem: 'my-1 text-base',
      blockquote: `border-l-4 ${colors.border.quote} pl-4 my-5 italic ${colors.text.muted}`,
      horizontalRule: `my-8 border-t ${colors.border.default}`,
    },
    headings: {
      h1: `${baseHeadingStyles} ${colors.text.heading} text-3xl font-bold mt-6 mb-2 pb-2 border-b ${colors.border.default}`,
      h2: `${baseHeadingStyles} ${colors.text.heading} text-2xl font-bold mt-6 mb-2 pb-2`,
      h3: `${baseHeadingStyles} ${colors.text.primary} text-xl font-semibold mt-8 mb-3`,
      h4: `${baseHeadingStyles} ${colors.text.primary} text-md font-semibold mt-6 mb-2`,
      h5h6: `${baseHeadingStyles} ${colors.text.secondary} text-sm font-medium mt-4 mb-2`,
    },
    colors,
    themeClass,
  };
};

/**
 * Context for sharing markdown theme styles across components
 * Prevents duplicate hook calls and style calculations
 */
const MarkdownThemeContext = createContext<MarkdownStyles | null>(null);

/**
 * Provider component that calculates styles once and shares them
 * Optimized for performance with memoization
 */
export const MarkdownThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { colors, themeClass } = useMarkdownTheme();
  
  // Memoize the entire style object to prevent recalculation
  const styles = useMemo(() => {
    return createMarkdownStyles(colors, themeClass);
  }, [colors, themeClass]);
  
  return (
    <MarkdownThemeContext.Provider value={styles}>
      {children}
    </MarkdownThemeContext.Provider>
  );
};

/**
 * Optimized hook to access markdown theme styles
 * No additional calculations, just context access
 */
export const useMarkdownStyles = (): MarkdownStyles => {
  const context = useContext(MarkdownThemeContext);
  
  if (!context) {
    throw new Error('useMarkdownStyles must be used within MarkdownThemeProvider');
  }
  
  return context;
};

/**
 * Convenience hooks for specific style categories
 */
export const useTextStyles = () => useMarkdownStyles().text;
export const useHeadingStyles = () => useMarkdownStyles().headings;
export const useThemeColors = () => useMarkdownStyles().colors;
