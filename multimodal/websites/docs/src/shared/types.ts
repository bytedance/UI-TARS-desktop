export enum DYNAMIC_ROUTE {
  Showcase = '/showcase',
  Replay = '/replay',
}

/**
 * One record of the public shares API, mirrored field-for-field by the committed
 * snapshot in `src/data/showcaseShares.ts`. Everything past the identifiers is
 * nullable because the API really does return `null` for unset author handles;
 * `refresh-showcase-data.mjs` enforces exactly this shape before writing.
 */
export interface ApiShareItem {
  sessionId: string;
  slug: string;
  url: string;
  tags?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  languages?: string | null;
  author?: string | null;
  authorGithub?: string | null;
  authorTwitter?: string | null;
  date?: string | null;
}
