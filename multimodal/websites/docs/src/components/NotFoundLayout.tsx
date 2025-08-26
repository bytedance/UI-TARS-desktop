import { useI18n } from 'rspress/runtime';
import { isInSSR } from '../shared/env';
import { ActionCard } from './ActionCard';

export function NotFoundLayout() {
  const t = useI18n<typeof import('i18n')>();
  
  if (isInSSR()) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center max-w-4xl px-4 py-20">
        <div className="text-9xl font-bold text-gray-200 dark:text-gray-800 mb-8">404</div>

        <h1 className="text-2xl font-bold mb-4">{t('not-found.title')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {t('not-found.description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <ActionCard
            title={t('not-found.github')}
            description={t('not-found.github-desc')}
            icon="🐙"
            href="https://github.com/bytedance/UI-TARS-desktop/issues"
            color="blue"
            showArrow={true}
            // GitHub 链接是外部链接，无需特殊处理，组件会自动判断
          />

          <ActionCard
            title={t('not-found.discord')}
            description={t('not-found.discord-desc')}
            icon="💬"
            href="#"
            color="purple"
            showArrow={true}
            // "#" 链接会被组件视为内部链接，使用 useNavigate
          />
        </div>
      </div>
    </div>
  );
}
