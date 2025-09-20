import { useI18n } from '@rspress/core/runtime';
import { isInSSR } from '../shared/env';
import { ActionCard } from './ActionCard';

export function NotFoundLayout() {
  const t = useI18n<typeof import('i18n')>();

  if (isInSSR()) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="text-center max-w-2xl w-full">
        {/* Large 404 number with elegant styling */}
        <div className="flex justify-center items-center mb-4 font-extrabold leading-none tracking-tight">
          <span className="text-8xl md:text-9xl lg:text-[12rem] text-slate-800 dark:text-slate-100 drop-shadow-sm">
            4
          </span>
          <span className="text-8xl md:text-9xl lg:text-[12rem] text-slate-500 dark:text-slate-400 opacity-60 -mx-2">
            0
          </span>
          <span className="text-8xl md:text-9xl lg:text-[12rem] text-slate-800 dark:text-slate-100 drop-shadow-sm">
            4
          </span>
        </div>

        {/* Subtitle */}
        <div className="text-sm font-semibold tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-12 uppercase">
          PAGE NOT FOUND
        </div>

        {/* Main content */}
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 leading-tight">
            {t('not-found.title')}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
            {t('not-found.description')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-12">
          <ActionCard
            title={t('not-found.github')}
            description={t('not-found.github-desc')}
            icon="🐙"
            href="https://github.com/bytedance/UI-TARS-desktop/issues"
            color="gray"
            showArrow={true}
          />

          <ActionCard
            title={t('not-found.discord')}
            description={t('not-found.discord-desc')}
            icon="💬"
            href="#"
            color="gray"
            showArrow={true}
          />
        </div>

        {/* Take me home link */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 no-underline font-medium text-sm transition-all duration-200 px-4 py-2 rounded-lg border border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800"
          >
            Take me home
          </a>
        </div>
      </div>
    </div>
  );
}
