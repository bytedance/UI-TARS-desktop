import { useLocation } from 'rspress/runtime';

export function useLocaledPath() {
  const location = useLocation();

  // FIXME: using `usePageData`
  // usePageData returns wrong state here.
  //   const pageData = usePageData();
  //   const {
  //     siteData: { base, lang },
  //   } = pageData;

  const localedPath = location.pathname.startsWith('/zh') ? '/zh/' : '/';
  return { localedPath };
}
