import React from 'react';
import { useI18n, useLang, usePageData } from 'rspress/runtime';
import { ActionCard } from './ActionCard';
import { ActionCardContainer } from './ActionCardContainer';

export interface UnderConstructionLayoutProps {
  /**
   * 可选的其他语言版本链接
   * 如果未提供，将自动生成中英文切换链接
   */
  availableLanguages?: {
    code: string;
    name: string;
    url: string;
  }[];

  displayLanguageSwitch?: boolean;
}

export function UnderConstructionLayout({
  availableLanguages,
  displayLanguageSwitch = true,
}: UnderConstructionLayoutProps) {
  const t = useI18n<typeof import('i18n')>();
  const currentLang = useLang();
  const {
    siteData: { base },
    page: { routePath },
  } = usePageData();

  // 构建语言切换链接
  const buildLanguageUrl = (langCode: string) => {
    // 如果当前是中文，目标是英文
    if (currentLang === 'zh' && langCode === 'en') {
      // 从路径中移除 /zh/ 前缀
      return routePath.replace(/^\/zh\//, '/');
    }
    // 如果当前是英文，目标是中文
    else if (currentLang === 'en' && langCode === 'zh') {
      // 在路径前添加 /zh/ 前缀
      return `/zh${routePath}`;
    }
    // 默认返回语言主页
    return langCode === 'en' ? '/' : `/${langCode}/`;
  };

  // 如果没有提供语言列表，默认提供中英文切换
  const languageOptions =
    availableLanguages ||
    [
      { code: 'en', name: 'English Documentation', url: buildLanguageUrl('en') },
      { code: 'zh', name: '中文文档', url: buildLanguageUrl('zh') },
    ].filter((lang) => lang.code !== currentLang);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-400px)]">
      <div className="text-center max-w-3xl px-4 py-6">
        {/* 更美观的施工标志 */}
        <div className="relative mb-10 flex justify-center text-[100px]">🚧</div>

        <h1 className="text-3xl font-bold mb-4">
          {t('under-construction.title') || 'This page is still under construction'}
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {t('under-construction.description') ||
            "We're working hard to build this page. Please check back soon!"}
        </p>

        {/* 添加语言切换选项 */}
        {displayLanguageSwitch && languageOptions.length > 0 && (
          <div className="mt-12">
            <ActionCardContainer minCardWidth="240px">
              {languageOptions.map((lang) => (
                <ActionCard
                  key={lang.code}
                  title={lang.name}
                  description={
                    t('under-construction.available-content') ||
                    'This content may be available in this language'
                  }
                  icon={lang.code.toUpperCase()}
                  href={lang.url}
                  color={lang.code === 'en' ? 'blue' : 'purple'}
                />
              ))}
            </ActionCardContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export interface UnderConstructionLayoutProps {
  /**
   * 可选的其他语言版本链接
   * 如果未提供，将自动生成中英文切换链接
   */
  availableLanguages?: {
    code: string;
    name: string;
    url: string;
  }[];

  displayLanguageSwitch?: boolean;
}

export function UnderConstructionLayout({
  availableLanguages,
  displayLanguageSwitch = true,
}: UnderConstructionLayoutProps) {
  const t = useI18n<typeof import('i18n')>();
  const currentLang = useLang();
  const {
    siteData: { base },
    page: { routePath },
  } = usePageData();

  // 构建语言切换链接
  const buildLanguageUrl = (langCode: string) => {
    // 如果当前是中文，目标是英文
    if (currentLang === 'zh' && langCode === 'en') {
      // 从路径中移除 /zh/ 前缀
      return routePath.replace(/^\/zh\//, '/');
    }
    // 如果当前是英文，目标是中文
    else if (currentLang === 'en' && langCode === 'zh') {
      // 在路径前添加 /zh/ 前缀
      return `/zh${routePath}`;
    }
    // 默认返回语言主页
    return langCode === 'en' ? '/' : `/${langCode}/`;
  };

  // 如果没有提供语言列表，默认提供中英文切换
  const languageOptions =
    availableLanguages ||
    [
      { code: 'en', name: 'English Documentation', url: buildLanguageUrl('en') },
      { code: 'zh', name: '中文文档', url: buildLanguageUrl('zh') },
    ].filter((lang) => lang.code !== currentLang);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-400px)]">
      <div className="text-center max-w-3xl px-4 py-6">
        {/* 更美观的施工标志 */}
        <div className="relative mb-10 flex justify-center text-[100px]">🚧</div>

        <h1 className="text-3xl font-bold mb-4">
          {t('under-construction.title') || 'This page is still under construction'}
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          {t('under-construction.description') ||
            "We're working hard to build this page. Please check back soon!"}
        </p>

        {/* 添加语言切换选项 */}
        {displayLanguageSwitch && languageOptions.length > 0 && (
          <div className="mt-12">
            <ActionCardContainer minCardWidth="240px">
              {languageOptions.map((lang) => (
                <ActionCard
                  key={lang.code}
                  title={lang.name}
                  description={
                    t('under-construction.available-content') ||
                    'This content may be available in this language'
                  }
                  icon={lang.code.toUpperCase()}
                  href={lang.url}
                  color={lang.code === 'en' ? 'blue' : 'purple'}
                />
              ))}
            </ActionCardContainer>
          </div>
        )}
      </div>
    </div>
  );
}
