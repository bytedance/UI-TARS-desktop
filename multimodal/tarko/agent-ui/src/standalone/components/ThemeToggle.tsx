import React, { useCallback } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useNavbarStyles } from '@tarko/ui';

interface ThemeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'navbar' | 'floating' | 'button';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'medium',
  variant = 'navbar'
}) => {
  const { isDarkMode } = useNavbarStyles();

  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('agent-tars-theme', newMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const iconSizes = {
    small: 12,
    medium: 16,
    large: 20
  };

  const variantClasses = {
    navbar: 'rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all hover:scale-110 active:scale-95',
    floating: 'rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200 transition-all hover:scale-105 active:scale-95 shadow-lg dark:shadow-none',
    button: 'rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 hover:text-gray-800 dark:hover:text-gray-200 transition-all hover:scale-105 active:scale-95'
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        <FiSun size={iconSizes[size]} />
      ) : (
        <FiMoon size={iconSizes[size]} />
      )}
    </button>
  );
};

export default ThemeToggle;