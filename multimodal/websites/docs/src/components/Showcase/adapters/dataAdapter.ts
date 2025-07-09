import { ApiShareItem } from '../services/api';
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

export function adaptApiItemToShowcase(apiItem: ApiShareItem): ShowcaseItem {
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

  const title = apiItem.title || apiItem.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const description = apiItem.description || `Shared content: ${apiItem.slug}`;
  const imageUrl = apiItem.imageUrl || DEFAULT_IMAGE_URL;

  return {
    id: apiItem.sessionId,
    title,
    description,
    category,
    imageUrl,
    link: secureUrl,
    date: apiItem.createdAt,
    languages,
    tags,
    author: apiItem.author ? {
      name: apiItem.author,
      github: '',
    } : DEFAULT_AUTHOR,
  };
}

export function getItemsByCategory(items: ShowcaseItem[], categoryId: string): ShowcaseItem[] {
  const filteredItems =
    categoryId === 'all' ? items : items.filter((item) => item.category === categoryId);

  return sortItemsByDate(filteredItems);
}

export function getCategoriesWithCounts(items: ShowcaseItem[]): (Category & { count: number })[] {
  return categories.map((category) => ({
    ...category,
    count: items.filter((item) => item.category === category.id).length,
  }));
}

export function sortItemsByDate(items: ShowcaseItem[]): ShowcaseItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
}

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
