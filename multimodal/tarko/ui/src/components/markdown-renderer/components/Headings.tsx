import React from 'react';
import { generateId } from '../utils';
import { useDarkMode } from '../../../hooks';

interface HeadingProps {
  children: React.ReactNode;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * First H1 tracking ref - shared across all heading instances
 */
const firstH1Rendered = { current: false };

/**
 * Reset the first H1 flag (called when content changes)
 */
export const resetFirstH1Flag = (): void => {
  firstH1Rendered.current = false;
};

/**
 * Generic heading component with consistent styling and anchor support
 */
export const Heading: React.FC<HeadingProps> = ({ children, level }) => {
  const id = generateId(children?.toString());
  const isDarkMode = useDarkMode();
  
  const baseHeadingStyles = 'group scroll-mt-20 flex items-center font-semibold leading-tight';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';

  const getHeadingClassName = () => {
    switch (level) {
      case 1:
        return `${baseHeadingStyles} ${textColor} text-3xl font-bold mt-6 mb-2 pb-2 border-b ${borderColor}`;
      case 2:
        return `${baseHeadingStyles} ${textColor} text-2xl font-bold mt-6 mb-2 pb-2`;
      case 3:
        return `${baseHeadingStyles} ${textColor} text-xl font-semibold mt-8 mb-3`;
      case 4:
        return `${baseHeadingStyles} ${textColor} text-md font-semibold mt-6 mb-2`;
      default:
        return `${baseHeadingStyles} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium mt-4 mb-2`;
    }
  };

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag id={id} className={getHeadingClassName()}>
      {children}
    </HeadingTag>
  );
};

/**
 * Specific heading components for markdown renderer
 */
export const H1: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirstH1 = !firstH1Rendered.current;
  if (isFirstH1) {
    firstH1Rendered.current = true;
  }

  return <Heading level={1}>{children}</Heading>;
};

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={2}>{children}</Heading>
);

export const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={3}>{children}</Heading>
);

export const H4: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Heading level={4}>{children}</Heading>
);
