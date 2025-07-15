export type CategoryType = 'finance' | 'technology' | 'science' | 'research' | 'general';

export interface ShowcaseItem {
  id: string; // Unique identifier for the showcase item
  title: string; // Title of the showcase item
  description: string; // Brief description of the showcase item
  category: CategoryType; // Category the item belongs to
  imageUrl: string; // URL for the item's preview image
  link: string; // Link to the full showcase content
  date?: string; // Optional publication date
  languages?: string[]; // Optional list of languages used in the showcase
  tags?: string[]; // Optional tags for filtering and categorization
  author?: {
    github: string; // Author's GitHub username
    name: string; // Author's display name
  };
}

export type Category = {
  id: string;
  name: string;
  description?: string;
};

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

export const showcaseItems: ShowcaseItem[] = [
  {
    id: 'tesla-stock-decline-reasons',
    title: "Reasons behind Tesla's recent stock price decline",
    description: "Why has Tesla's stock price recently fallen?",
    category: 'finance',
    imageUrl:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000&auto=format&fit=crop',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/tesla-stock-decline-reasons.html',
    date: '2025-03-18',
    languages: ['English'],
    author: {
      github: 'ycjcl868',
      name: 'Charles',
    },
  },
  {
    id: 'kipchoge-marathon-moon',
    title: 'Time for Eliud Kipchoge to run Earth-Moon distance at marathon pace',
    description:
      'If Eliud Kipchoge could maintain his record-making marathon pace indefinitely, how many thousand hours would it take him to run the distance between the Earth and the Moon its closest approach? Please use the minimum perigee value on the Wikipedia page for the Moon when carrying out your calculation. Round your result to the nearest 1000 hours and do not use any comma separators if necessary.',
    category: 'science',
    imageUrl: 'https://cdn.mos.cms.futurecdn.net/p7rWPJoYDKZ4wwoXHGmzPL-1200-80.jpg',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/kipchoge-marathon-moon.html',
    date: '2025-03-18',
    languages: ['English'],
    author: {
      github: 'skychx',
      name: 'skychx',
    },
  },
  {
    id: '7-day-trip-plan-to-mexico-city',
    title: '7-day trip plan to Mexico City from NYC',
    description:
      'I need a 7-day trip to Mexico City from NYC for April 15-23, with a budget of $2500-5000 for my fiancee and I. We love historical sites, hidden gems, and Mexican culture (Mexican art, architecture, food). We want to visit the pyramids of Teotihuacan and explore the city on foot. I plan to propose during this trip and need suggestions for a special venue. Please provide a detailed itinerary and a simple HTML travel brochure with maps, descriptions of attractions, essential basic Spanish phrases, and travel tips that we can refer to throughout our trip.',
    category: 'general',
    imageUrl:
      'https://www.cataloniahotels.com/en/blog/wp-content/uploads/2017/09/cataloniahotels-mexico2.jpg',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/7-day-trip-plan-to-mexico-city.html',
    date: '2025-03-18',
    languages: ['English', 'Spanish'],
    author: {
      github: 'ulivz',
      name: 'ULIVZ',
    },
  },
  {
    id: 'lynx-repository-issues-report',
    title: 'Analyse issues in the Lynx repository',
    description:
      'Summarize the issues in this repository: https://github.com/lynx-family/lynx and generate a detailed report page contains good data visualization.',
    category: 'technology',
    imageUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/lynx.png',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/lynx-repository-issues-report.html',
    date: '2025-03-18',
    languages: ['English'],
    author: {
      github: 'ulivz',
      name: 'ULIVZ',
    },
  },
  {
    id: 'tesla-stock-technical-analysis',
    title: "Technical analysis of Tesla's future stock price trends",
    description: '从技术面分析下特斯拉未来的股价走势',
    category: 'finance',
    imageUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/tesla-stock.png',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/tesla-stock-technical-analysis.html',
    date: '2025-03-20',
    languages: ['Chinese'],
    author: {
      github: 'ycjcl868',
      name: 'Charles',
    },
  },
  {
    id: 'hangzhou-to-weihai-travel-plan',
    title: 'Travel plan from Hangzhou to Weihai in detailed markdown format',
    description:
      '我想要在 2025 年清明节假期从杭州去威海旅游，给我规划旅游计划，用详细的 markdown 输出',
    category: 'general',
    imageUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/weihai.jpeg',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/hangzhou-to-weihai-travel-plan.html',
    date: '2025-03-20',
    languages: ['Chinese'],
    author: {
      github: 'sanyuan0704',
      name: 'yangxingyuan',
    },
  },
  {
    id: 'producthunt-top-projects-analysis',
    title: 'Top 5 most popular ProductHunt projects analysis report',
    description:
      'Tell me the top 5 most popular projects on ProductHunt today, analyze them in depth, and output a report to me',
    category: 'research',
    imageUrl:
      'https://images.ctfassets.net/72n9zqcdnf4y/33Bvg09ZWCRIuq8dtJSBaI/2a927c19b494bd895da84fe9a1b5c0a9/product-hunt.jpg',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/producthunt-top-projects-analysis.html',
    date: '2025-03-20',
    languages: ['English'],
    author: {
      github: 'ulivz',
      name: 'ULIVZ',
    },
  },
  {
    id: 'agent-tars-release-summaries',
    title: 'Organize and summarize the latest releases of Agent TARS',
    description: 'Organize and summarize the latest releases of Agent TARS',
    category: 'research',
    imageUrl:
      'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/agent-tars-twitter-banner.png',
    link: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars/agent-tars-release-summaries.html',
    date: '2025-03-23',
    languages: ['English'],
    author: {
      github: 'ulivz',
      name: 'ULIVZ',
    },
  },
];

// Helper function to get items by category
export const getItemsByCategory = (categoryId: string): ShowcaseItem[] => {
  const items =
    categoryId === 'all'
      ? showcaseItems
      : showcaseItems.filter(item => item.category === categoryId);

  // Sort by date (newest first)
  return sortItemsByDate(items);
};

// Helper function to get all categories with counts
export const getCategoriesWithCounts = (): (Category & { count: number })[] => {
  return categories.map(category => ({
    ...category,
    count: showcaseItems.filter(item => item.category === category.id).length,
  }));
};

// Helper function to sort items by date (newest first)
export const sortItemsByDate = (items: ShowcaseItem[]): ShowcaseItem[] => {
  return [...items].sort((a, b) => {
    // If no date is provided, consider it as oldest
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
};

// Helper function to check if an item was published within the last N days
export const isRecentlyPublished = (item: ShowcaseItem, days: number = 3): boolean => {
  if (!item.date) return false;

  const publishDate = new Date(item.date);
  const currentDate = new Date();

  // Reset time part for accurate day comparison
  currentDate.setHours(0, 0, 0, 0);
  publishDate.setHours(0, 0, 0, 0);

  // Calculate difference in days
  const diffTime = currentDate.getTime() - publishDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days && diffDays >= 0;
};
