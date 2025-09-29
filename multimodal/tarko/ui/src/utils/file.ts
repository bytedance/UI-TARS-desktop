/**
 * File utility functions for code editor components
 */

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  python: 'python',
  py: 'python',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
  bash: 'shell',
  sh: 'shell',
};

export const getMonacoLanguage = (lang: string): string => {
  return LANGUAGE_MAP[lang.toLowerCase()] || 'plaintext';
};

export const getDisplayFileName = (fileName?: string, filePath?: string): string => {
  return fileName || (filePath ? filePath.split('/').pop() || filePath : 'Untitled');
};

export const getFileExtension = (fileName?: string): string => {
  return fileName && fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
};
