import React from 'react';
import { useLocation, useNavigate } from 'rspress/runtime';
import { ShowcaseDetail } from '../Showcase/components/ShowcaseDetail';
import { useShowcaseData } from '../../hooks/useShowcaseData';
import { extractIdFromPath } from '../../shared/urlUtils';
import { isInSSR } from '../../shared/env';
import { usePageMeta, generatePageTitle, optimizeDescription } from '../hooks/usePageMeta';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // Set meta for 404 page
  usePageMeta({
    title: generatePageTitle('Replay Not Found'),
    description: 'The replay you\'re looking for doesn\'t exist or has been moved.',
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-100 mb-4">404</h1>
        <p className="text-gray-300 mb-8">
          The replay you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md transition-colors shadow-blue-900/20"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export const Replay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathInfo = extractIdFromPath(location.pathname);

  // Always call hooks in the same order
  const hookParams = pathInfo
    ? pathInfo.type === 'sessionId'
      ? { sessionId: pathInfo.value }
      : { slug: pathInfo.value }
    : {};

  const { items, isLoading, error } = useShowcaseData(hookParams);

  // Set page meta based on loaded data
  React.useEffect(() => {
    if (!isInSSR() && items.length > 0) {
      const item = items[0];
      const title = generatePageTitle(`${item.title} - Replay`);
      const description = optimizeDescription(
        `${item.description} - Watch this Agent TARS replay demonstrating ${item.category} capabilities.`
      );
      
      // Update meta tags dynamically
      if (typeof document !== 'undefined') {
        document.title = title;
        
        const setMetaContent = (selector: string, content: string) => {
          const meta = document.querySelector(selector);
          if (meta) {
            meta.setAttribute('content', content);
          }
        };
        
        setMetaContent('meta[name="description"]', description);
        setMetaContent('meta[property="og:title"]', title);
        setMetaContent('meta[property="og:description"]', description);
        setMetaContent('meta[name="twitter:title"]', title);
        setMetaContent('meta[name="twitter:description"]', description);
      }
    }
  }, [items]);

  // Set loading state meta
  usePageMeta({
    title: generatePageTitle(isLoading ? 'Loading Replay...' : 'Replay'),
    description: isLoading 
      ? 'Loading Agent TARS replay content...' 
      : 'Watch Agent TARS demonstration replays and learn from real-world usage examples.',
  });

  if (isInSSR()) {
    return null;
  }

  if (!pathInfo) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Replay</h1>
          <p className="text-gray-300 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md transition-colors shadow-blue-900/20"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return <NotFoundPage />;
  }

  return (
    <div className="mt-10">
      <ShowcaseDetail item={items[0]} showBack={false} />
    </div>
  );
};

export default Replay;
