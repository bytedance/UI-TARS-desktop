export interface DocItem {
  id: string;
  title: string;
  category?: string;
  publishDate?: string;
  author?: string;
}

// Basic path configuration
export const GITHUB_REPO = 'agent-infra/agent-tars-website';
export const GITHUB_BRANCH = 'main';
export const DOCS_SOURCE_PATH = 'src/docs/source/docs';

export const availableDocs: DocItem[] = [
  {
    id: 'quick-start',
    title: 'Quick Start',
    category: 'Introduction',
    publishDate: '2025-04-06',
  },
  {
    id: 'mcp',
    title: 'MCP',
    category: 'Guide',
    publishDate: '2025-04-02',
  },
  {
    id: 'trouble-shooting',
    title: 'Trouble Shooting',
    category: 'Guide',
    publishDate: '2025-03-22',
  },
];

// Group docs by category
export const getDocsByCategory = () => {
  const categories: Record<string, DocItem[]> = {};

  availableDocs.forEach(doc => {
    const category = doc.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(doc);
  });

  return categories;
};

// Build GitHub edit link
export const getGithubEditPath = (docId: string): string => {
  return `https://github.com/${GITHUB_REPO}/edit/${GITHUB_BRANCH}/${DOCS_SOURCE_PATH}/guide/${docId}.md`;
};
