export enum ETopRoute {
  HOME = '/',
  BLOG = '/blog',
  SHOWCASE = '/showcase',
  DOC = '/doc',
}

export const getShowcaseDetailRoute = (id: string): string => `${ETopRoute.SHOWCASE}/${id}`;
export const getDocDetailRoute = (docId: string): string => `${ETopRoute.DOC}/${docId}`;
