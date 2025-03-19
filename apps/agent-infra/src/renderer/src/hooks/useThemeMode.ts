import useDarkMode from 'use-dark-mode';

window.global = window;

export const useThemeMode = () =>
  useDarkMode(false, {
    classNameDark: 'dark',
    classNameLight: 'light',
    element: window.document.documentElement,
    storageKey: 'open-agent-dark-mode',
  });
