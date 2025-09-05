/**
 * Utility functions for markdown rendering
 */

export * from './linkPreprocessor';

/**
 * Generate a URL-friendly ID from text content
 */
export const generateId = (text: string | undefined): string => {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-');
};

/**
 * Check if a URL is external
 */
export const isExternalUrl = (url: string): boolean => {
  return /^(https?:)?\/\//.test(url);
};

/**
 * Check if a URL is a hash link
 */
export const isHashLink = (url: string): boolean => {
  return url.startsWith('#');
};

/**
 * Check if a URL is an internal path
 */
export const isInternalPath = (url: string): boolean => {
  return !isExternalUrl(url) && url.startsWith('/');
};

/**
 * Smooth scroll to element by ID
 */
export const scrollToElement = (id: string): void => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    window.history.pushState(null, '', `#${id}`);
  }
};
