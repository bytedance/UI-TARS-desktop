import { useI18n } from '@rspress/core/runtime';
import { isInSSR } from '../shared/env';
import { ActionCard } from './ActionCard';

export function NotFoundLayout() {
  const t = useI18n<typeof import('i18n')>();

  if (isInSSR()) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-gray-950">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.02),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),transparent_50%)]" />
      
      <div className="relative flex min-h-screen items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-lg text-center">
          {/* Elegant 404 with modern typography */}
          <div className="relative mb-8">
            <div className="select-none font-mono text-[8rem] font-black leading-none tracking-tighter text-gray-900/10 dark:text-white/10 md:text-[12rem]">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="font-mono text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
                404
              </div>
            </div>
          </div>

          {/* Clean typography */}
          <div className="mb-8 space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white md:text-3xl">
              {t('not-found.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('not-found.description')}
            </p>
          </div>

          {/* Minimal action buttons */}
          <div className="mb-12 space-y-3">
            <a
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:w-auto"
            >
              ← Take me home
            </a>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <a
                href="https://github.com/bytedance/UI-TARS-desktop/issues"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                🐙 {t('not-found.github')}
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                💬 {t('not-found.discord')}
              </a>
            </div>
          </div>

          {/* Subtle footer */}
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Error 404 • Page not found
          </div>
        </div>
      </div>
    </div>
  );
}
