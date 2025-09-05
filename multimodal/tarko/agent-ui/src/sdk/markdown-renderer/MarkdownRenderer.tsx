import React from 'react';
import { TypewriterMarkdownRenderer } from './TypewriterMarkdownRenderer';

interface MarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
}

/**
 * MarkdownRenderer component
 * Now uses TypewriterMarkdownRenderer for smooth typewriter effect
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = (props) => {
  return <TypewriterMarkdownRenderer {...props} />;
};
