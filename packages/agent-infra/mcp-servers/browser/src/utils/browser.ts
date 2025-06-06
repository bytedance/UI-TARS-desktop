import { Browser } from 'puppeteer-core';

export const getCurrentPage = async (browser: Browser) => {
  const pages = await browser?.pages();
  // if no pages, create a new page
  if (!pages?.length)
    return { activePage: await browser?.newPage(), activePageId: 0 };

  for (let i = 0; i < pages.length; i++) {
    try {
      const isVisible = await pages[i].evaluate(
        () => document.visibilityState === 'visible',
      );
      if (isVisible) {
        return {
          activePage: pages[i],
          activePageId: i,
        };
      }
    } catch (error) {
      continue;
    }
  }

  return {
    activePage: pages[0],
    activePageId: 0,
  };
};
