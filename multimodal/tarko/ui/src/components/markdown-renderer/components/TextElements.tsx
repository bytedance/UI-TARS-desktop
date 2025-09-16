import React from 'react';
import { useDarkMode } from '../../../hooks';

export const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useDarkMode();
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  return <p className={`my-2 ${textColor} leading-relaxed text-base`}>{children}</p>;
};

export const UnorderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useDarkMode();
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  return <ul className={`my-2 list-disc pl-6 ${textColor} text-base`}>{children}</ul>;
};

export const OrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useDarkMode();
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  return <ol className={`my-2 list-decimal pl-6 ${textColor} text-base`}>{children}</ol>;
};

export const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <li className="my-1 text-base">{children}</li>;
};

export const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useDarkMode();
  const borderColor = isDarkMode ? 'border-slate-600' : 'border-gray-200';
  const textColor = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  return <blockquote className={`border-l-4 ${borderColor} pl-4 my-5 italic ${textColor}`}>{children}</blockquote>;
};

export const HorizontalRule: React.FC = () => {
  const isDarkMode = useDarkMode();
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  return <hr className={`my-8 border-t ${borderColor}`} />;
};
