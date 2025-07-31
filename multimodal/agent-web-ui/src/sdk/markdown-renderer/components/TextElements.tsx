import React from 'react';

/**
 * Text element styles - Updated with merged tailwind classes
 */
const TEXT_STYLES = {
  paragraph: 'my-2 text-gray-800 dark:text-gray-200 leading-relaxed text-base',
  unorderedList: 'my-2 list-disc pl-6 text-gray-800 dark:text-gray-200 text-base',
  orderedList: 'my-2 list-decimal pl-6 text-gray-800 dark:text-gray-200 text-base',
  listItem: 'my-1 text-base',
  blockquote:
    'border-l-4 border-gray-200 dark:border-slate-600 pl-4 my-5 italic text-slate-600 dark:text-slate-400',
  horizontalRule: 'my-8 border-t border-gray-200 dark:border-gray-700',
};

/**
 * Paragraph component
 */
export const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={TEXT_STYLES.paragraph}>{children}</p>
);

/**
 * Unordered list component
 */
export const UnorderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className={TEXT_STYLES.unorderedList}>{children}</ul>
);

/**
 * Ordered list component
 */
export const OrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className={TEXT_STYLES.orderedList}>{children}</ol>
);

/**
 * List item component
 */
export const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className={TEXT_STYLES.listItem}>{children}</li>
);

/**
 * Blockquote component
 */
export const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <blockquote className={TEXT_STYLES.blockquote}>{children}</blockquote>
);

/**
 * Horizontal rule component
 */
export const HorizontalRule: React.FC = () => <hr className={TEXT_STYLES.horizontalRule} />;
