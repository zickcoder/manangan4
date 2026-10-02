import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export function ThemeToggle({ className = '', iconClassName = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
        className || 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Dark Mode"
    >
      {isDark ? (
        <Sun className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45 shrink-0 ${iconClassName}`} />
      ) : (
        <Moon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 -rotate-12 hover:rotate-0 text-current shrink-0 ${iconClassName}`} />
      )}
    </button>
  );
}

