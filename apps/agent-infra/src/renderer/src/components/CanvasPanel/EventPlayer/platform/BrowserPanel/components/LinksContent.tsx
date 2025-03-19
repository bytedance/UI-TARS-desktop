import { FiGlobe } from 'react-icons/fi';
import { ContentProps } from '../types';
import { DefaultTip } from '../../DefaultTip';

export function LinksContent({ result }: ContentProps) {
  if (!Array.isArray(result)) {
    return <DefaultTip description="Reading page links..." />;
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {result.map((link, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <FiGlobe className="w-4 h-4 text-blue-500" />
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm truncate"
            >
              {link}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
