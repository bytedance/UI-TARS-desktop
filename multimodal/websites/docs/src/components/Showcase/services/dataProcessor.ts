import { ApiShareItem } from './api';
import { ensureHttps } from '../utils/urlUtils';

export type CategoryType = 'finance' | 'technology' | 'science' | 'research' | 'general';

export interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  imageUrl: string;
  link: string;
  date?: string;
  languages?: string[];
  tags?: string[];
  author?: {
    github: string;
    twitter?: string;
    name: string;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export const categories: Category[] = [
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial analysis and reports',
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tech innovations and solutions',
  },
  {
    id: 'research',
    name: 'Research',
    description: 'General research and discoveries',
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Scientific research and discoveries',
  },
  {
    id: 'general',
    name: 'General',
    description: 'General purpose applications',
  },
];

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop&crop=entropy&auto=format';
const DEFAULT_CATEGORY: CategoryType = 'general';
const DEFAULT_AUTHOR = {
  name: 'Agent TARS',
  github: 'agent-tars',
};

/**
 * Extract GitHub username from GitHub URL
 */
function extractGitHubUsername(url: string): string {
  if (!url) return '';

  // Handle cases where it's already just the username
  if (!url.includes('/') && !url.includes('.')) {
    return url;
  }

  // Extract from GitHub URL patterns
  const githubMatch = url.match(/github\.com\/([^\/\?#]+)/i);
  if (githubMatch) {
    return githubMatch[1];
  }

  // If it looks like a username (no protocol, no domain), return as is
  if (!url.includes('://') && !url.includes('.')) {
    return url;
  }

  return '';
}

/**
 * Extract Twitter username from Twitter/X URL
 */
function extractTwitterUsername(url: string): string {
  if (!url) return '';

  // Handle cases where it's already just the username
  if (!url.includes('/') && !url.includes('.')) {
    return url.startsWith('@') ? url.slice(1) : url;
  }

  // Extract from Twitter/X URL patterns
  const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/\?#]+)/i);
  if (twitterMatch) {
    return twitterMatch[1];
  }

  // If it looks like a username (no protocol, no domain), return as is
  if (!url.includes('://') && !url.includes('.')) {
    return url.startsWith('@') ? url.slice(1) : url;
  }

  return '';
}

/**
 * Transform API item to showcase item
 */
function transformApiItemToShowcase(apiItem: ApiShareItem): ShowcaseItem {
  const tags = apiItem.tags
    ? apiItem.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const categoryTag = tags.find((tag) => categories.some((cat) => cat.id === tag.toLowerCase()));
  const category = categoryTag ? (categoryTag.toLowerCase() as CategoryType) : DEFAULT_CATEGORY;

  const secureUrl = ensureHttps(apiItem.url);

  const languages = apiItem.languages
    ? apiItem.languages
        .split(',')
        .map((lang) => lang.trim())
        .filter(Boolean)
    : undefined;

  const title =
    apiItem.title || apiItem.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const description = apiItem.description || `Shared content: ${apiItem.slug}`;
  const imageUrl = ensureHttps(apiItem.imageUrl || DEFAULT_IMAGE_URL);

  // Process author information
  let author = DEFAULT_AUTHOR;
  if (apiItem.author) {
    const githubUsername = extractGitHubUsername(apiItem.authorGithub || '');
    const twitterUsername = extractTwitterUsername(apiItem.authorTwitter || '');

    author = {
      name: apiItem.author,
      github: githubUsername || 'agent-tars',
      ...(twitterUsername && { twitter: twitterUsername }),
    };
  }

  return {
    id: apiItem.slug,
    title,
    description,
    category,
    imageUrl,
    link: secureUrl,
    date: apiItem.date,
    languages,
    tags,
    author,
  };
}

/**
 * Sort items by date (newest first)
 */
function sortItemsByDate(items: ShowcaseItem[]): ShowcaseItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Check if item is recently published
 */
export function isRecentlyPublished(item: ShowcaseItem, days: number = 3): boolean {
  if (!item.date) return false;

  const publishDate = new Date(item.date);
  const currentDate = new Date();

  currentDate.setHours(0, 0, 0, 0);
  publishDate.setHours(0, 0, 0, 0);

  const diffTime = currentDate.getTime() - publishDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days && diffDays >= 0;
}

/**
 * Processed showcase data with performance optimizations
 */
export interface ProcessedShowcaseData {
  items: ShowcaseItem[];
  categoriesWithCounts: (Category & { count: number })[];
  getItemsByCategory: (categoryId: string) => ShowcaseItem[];
}

/**
 * Process API items into showcase data with caching for performance
 */
export function processShowcaseData(apiItems: ApiShareItem[]): ProcessedShowcaseData {
  // Transform API items to showcase items
  const showcaseItems = apiItems.map(transformApiItemToShowcase);

  // Sort items by date
  const sortedItems = sortItemsByDate(showcaseItems);

  // Calculate categories with counts
  const categoriesWithCounts = categories.map((category) => ({
    ...category,
    count: sortedItems.filter((item) => item.category === category.id).length,
  }));

  // Create a memoized function for filtering by category
  const categoryCache = new Map<string, ShowcaseItem[]>();

  const getItemsByCategory = (categoryId: string): ShowcaseItem[] => {
    if (categoryCache.has(categoryId)) {
      return categoryCache.get(categoryId)!;
    }

    const filtered =
      categoryId === 'all'
        ? sortedItems
        : sortedItems.filter((item) => item.category === categoryId);

    categoryCache.set(categoryId, filtered);
    return filtered;
  };

  return {
    items: sortedItems,
    categoriesWithCounts,
    getItemsByCategory,
  };
}
