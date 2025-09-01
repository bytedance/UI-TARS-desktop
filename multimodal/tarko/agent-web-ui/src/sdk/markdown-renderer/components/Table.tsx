import React from 'react';

/**
 * Table component styles
 */
const TABLE_STYLES = {
  wrapper: 'overflow-x-auto my-6',
  table:
    'min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm w-full my-6',
  thead: 'bg-gray-100 dark:bg-gray-800',
  tbody: 'divide-y divide-gray-200 dark:divide-gray-700',
  tr: 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
  th: 'px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600',
  td: 'px-3 py-3 text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-slate-600',
};

/**
 * Table wrapper component
 */
export const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={TABLE_STYLES.wrapper}>
    <table className={TABLE_STYLES.table}>{children}</table>
  </div>
);

/**
 * Table head component
 */
export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className={TABLE_STYLES.thead}>{children}</thead>
);

/**
 * Table body component
 */
export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className={TABLE_STYLES.tbody}>{children}</tbody>
);

/**
 * Table row component
 */
export const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className={TABLE_STYLES.tr}>{children}</tr>
);

/**
 * Table header cell component
 */
export const TableHeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className={TABLE_STYLES.th}>{children}</th>
);

/**
 * Table data cell component
 */
export const TableDataCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className={TABLE_STYLES.td}>{children}</td>
);
