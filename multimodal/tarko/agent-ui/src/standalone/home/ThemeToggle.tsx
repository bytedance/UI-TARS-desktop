import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check current theme
    const currentTheme = localStorage.getItem('agent-tars-theme');
    const isCurrentlyDark = currentTheme === 'dark' || 
      (currentTheme === null && document.documentElement.classList.contains('dark'));
    setIsDark(isCurrentlyDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('agent-tars-theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <FiSun className="w-5 h-5 text-yellow-500" />
      ) : (
        <FiMoon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
};