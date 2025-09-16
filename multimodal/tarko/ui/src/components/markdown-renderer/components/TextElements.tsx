import React from 'react';
import { useTextStyles } from '../context/MarkdownThemeContext';

/**
 * Optimized text components using shared theme context
 * All components access the same pre-computed styles for better performance
 */

export const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useTextStyles();
  return <p className={styles.paragraph}>{children}</p>;
};

export const UnorderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useTextStyles();
  return <ul className={styles.unorderedList}>{children}</ul>;
};

export const OrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useTextStyles();
  return <ol className={styles.orderedList}>{children}</ol>;
};

export const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useTextStyles();
  return <li className={styles.listItem}>{children}</li>;
};

export const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useTextStyles();
  return <blockquote className={styles.blockquote}>{children}</blockquote>;
};

export const HorizontalRule: React.FC = () => {
  const styles = useTextStyles();
  return <hr className={styles.horizontalRule} />;
};
