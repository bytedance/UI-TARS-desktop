import React from 'react';

export const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto my-6">
    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm w-full my-6">{children}</table>
  </div>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">{children}</tr>
);

export const TableHeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600">{children}</th>
);

export const TableDataCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-3 py-3 text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-slate-600">{children}</td>
);
