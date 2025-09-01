import React, { useRef } from 'react';
import { generateId } from '../utils';
import { useHeadingStyles } from '../context/MarkdownThemeContext';

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
  const headingStyles = useHeadingStyles();
  
  const getHeadingClassName = () => {
    switch (level) {
      case 1:
        return headingStyles.h1;
      case 2:
        return headingStyles.h2;
      case 3:
        return headingStyles.h3;
      case 4:
        return headingStyles.h4;
      default:
        return headingStyles.h5h6;
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
