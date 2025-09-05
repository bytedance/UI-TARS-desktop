import React from 'react';
import { StreamingMarkdownRenderer } from './StreamingMarkdownRenderer';

interface MarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
}

/**
 * MarkdownRenderer component
 * Now uses StreamingMarkdownRenderer for smooth streaming experience
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = (props) => {
  return <StreamingMarkdownRenderer {...props} />;
};
