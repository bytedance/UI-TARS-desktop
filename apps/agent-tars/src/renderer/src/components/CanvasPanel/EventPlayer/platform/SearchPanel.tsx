import { SearchResult } from '@agent-infra/search';
import { FiExternalLink, FiSearch } from 'react-icons/fi';

interface SearchPanelProps {
  query: string;
  result: SearchResult;
}

export function SearchPanel({
  query,
  result = { pages: [] },
}: SearchPanelProps) {
  return (
    <div className="h-full overflow-auto p-4">
      {/* Search Query Section */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <FiSearch className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Search results for: "{query}"
        </span>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {(result.pages || []).map((page, index) => (
          <div
            key={index}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                {page.title}
              </h3>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              >
                <FiExternalLink className="w-5 h-5" />
              </a>
            </div>

            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block truncate"
            >
              {page.url}
            </a>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {page.content}
            </p>
          </div>
        ))}
      </div>

      {(result.pages || []).length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No results found</p>
        </div>
      )}
    </div>
  );
}
