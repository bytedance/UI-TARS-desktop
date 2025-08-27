import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner, Button } from '@nextui-org/react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'rspress/runtime';
import { ShowcaseCard } from './components/ShowcaseCard';
import { CategoryFilter } from './components/CategoryFilter';
import { ShowcaseHeader } from './components/ShowcaseHeader';
import { ShowcaseDetail } from './components/ShowcaseDetail';
import { useShowcaseData } from '../../hooks/useShowcaseData';
import { ProcessedShowcaseData, ShowcaseItem } from '../../services/dataProcessor';
import { extractIdFromPath } from '../../shared/urlUtils';
import { isInSSR } from '../../shared/env';
import { usePageMeta, generatePageTitle, optimizeDescription } from '../hooks/usePageMeta';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // Set meta for 404 page
  usePageMeta({
    title: generatePageTitle('Page Not Found'),
    description: "The page you're looking for doesn't exist or has been moved.",
  });

  return (
    <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="text-9xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            404
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">Page Not Found</h1>
          <p className="text-xl text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export const Showcase: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathInfo = extractIdFromPath(location.pathname);
  const isDetailPage = !!pathInfo;

  // Always call hooks in the same order - move useShowcaseData before conditional returns
  const hookParams = pathInfo
    ? pathInfo.type === 'sessionId'
      ? { sessionId: pathInfo.value }
      : { slug: pathInfo.value }
    : {};

  const { items, processedData, isLoading, error, refetch } = useShowcaseData(hookParams);

  // Set base meta tags for showcase
  usePageMeta({
    title: generatePageTitle('Showcase'),
    description:
      'Explore Agent TARS showcase demos and replays. Discover real-world examples of multimodal AI agent capabilities in action.',
  });

  if (isInSSR()) {
    return null;
  }

  if (isDetailPage) {
    return (
      <ShowcaseDetailPage
        items={items}
        isLoading={isLoading}
        error={error}
        pathInfo={pathInfo}
        onRetry={refetch}
      />
    );
  }

  return (
    <ShowcaseListPage
      items={items}
      processedData={processedData}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      onNavigateToDetail={(item, activeCategory) => {
        // Pass current category as state to preserve filter when navigating back
        navigate(`/showcase/${encodeURIComponent(item.id)}`, {
          state: { previousCategory: activeCategory !== 'all' ? activeCategory : null }
        });
      }}
    />
  );
};

interface ShowcaseListPageProps {
  items: ShowcaseItem[];
  processedData: ProcessedShowcaseData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigateToDetail: (item: ShowcaseItem, activeCategory: string) => void;
}

const ShowcaseListPage: React.FC<ShowcaseListPageProps> = ({
  items,
  processedData,
  isLoading,
  error,
  onRetry,
  onNavigateToDetail,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  // Get category from URL params, default to 'all'
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  
  // Update URL when category changes
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const newSearchParams = new URLSearchParams(location.search);
    if (categoryId === 'all') {
      newSearchParams.delete('category');
    } else {
      newSearchParams.set('category', categoryId);
    }
    navigate(`/showcase${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`, { replace: true });
  };
  
  // Sync state with URL changes (for browser back/forward)
  useEffect(() => {
    const currentCategory = searchParams.get('category') || 'all';
    if (currentCategory !== activeCategory) {
      setActiveCategory(currentCategory);
    }
  }, [location.search]);

  const filteredItems = useMemo(() => {
    return processedData?.getItemsByCategory(activeCategory) || [];
  }, [processedData, activeCategory]);

  const categoriesWithCounts = processedData?.categoriesWithCounts || [];

  // Update meta for category filtering
  React.useEffect(() => {
    if (!isInSSR() && activeCategory !== 'all') {
      const categoryName = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
      const title = generatePageTitle(`${categoryName} Showcase`);
      const description = optimizeDescription(
        `Explore ${categoryName} demos and examples with Agent TARS. See real-world applications of multimodal AI in ${activeCategory}.`,
      );

      if (typeof document !== 'undefined') {
        document.title = title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', description);
        }
      }
    }
  }, [activeCategory]);

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <ShowcaseHeader title="Showcase" description="Explore our impressive demos and replays" />

          <motion.div
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-900/20 border border-red-500/20 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FiAlertCircle className="text-5xl mb-4 text-red-400" />
            <h2 className="text-xl font-semibold mb-2 text-red-300">
              Failed to Load Showcase Data
            </h2>
            <p className="text-gray-400 mb-4 max-w-md">{error}</p>
            <Button color="danger" variant="ghost" startContent={<FiRefreshCw />} onClick={onRetry}>
              Retry
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <ShowcaseHeader title="Showcase" description="Explore our impressive demos and replays" />

        <CategoryFilter
          categories={categoriesWithCounts}
          activeCategory={activeCategory}
          onSelectCategory={handleCategoryChange}
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Spinner size="lg" color="white" />
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {filteredItems.length > 0 ? (
                <div className="grid gap-6 auto-rows-fr grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredItems.map((item, index) => (
                    <ShowcaseCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpenPreview={(item) => onNavigateToDetail(item, activeCategory)}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/5 border border-white/10 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-5xl mb-4 text-gray-500">🔍</div>
                  <p className="text-gray-400 text-lg mb-2">No items found in this category</p>
                  <p className="text-gray-500 text-sm max-w-md">
                    Try selecting a different category or check back later for new additions
                  </p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <motion.div
          className="mt-16 pt-8 border-t border-white/10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-gray-500">
            Want to showcase your project?{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300 underline">
              Contact us
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

interface ShowcaseDetailPageProps {
  items: ShowcaseItem[];
  isLoading: boolean;
  error: string | null;
  pathInfo: { type: 'slug' | 'sessionId'; value: string };
  onRetry: () => void;
}

const ShowcaseDetailPage: React.FC<ShowcaseDetailPageProps> = ({
  items,
  isLoading,
  error,
  pathInfo,
  onRetry,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Set meta for detail page based on loaded item
  React.useEffect(() => {
    if (!isInSSR() && items.length > 0) {
      const item = items[0];
      const title = generatePageTitle(item.title);
      const description = optimizeDescription(
        `${item.description} - Explore this ${item.category} demonstration showcasing Agent TARS capabilities.`,
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

  const getPageContent = () => {
    const item = items[0];
    if (pathInfo.type === 'sessionId') {
      return {
        title: item ? item.title : 'Shared Showcase',
        description: item ? item.description : 'View shared showcase content',
      };
    } else {
      return {
        title: item ? item.title : 'Shared Content',
        description: item ? item.description : 'View shared content',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <ShowcaseHeader title="Loading..." description="Please wait while we load the content" />
          <div className="flex justify-center items-center h-64">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Spinner size="lg" color="white" />
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const { title, description } = getPageContent();

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <ShowcaseHeader title={title} description={description} />

          <motion.div
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-red-900/20 border border-red-500/20 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FiAlertCircle className="text-5xl mb-4 text-red-400" />
            <h2 className="text-xl font-semibold mb-2 text-red-300">
              Failed to Load Shared Content
            </h2>
            <p className="text-gray-400 mb-4 max-w-md">{error}</p>
            <Button color="danger" variant="ghost" startContent={<FiRefreshCw />} onClick={onRetry}>
              Retry
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <ShowcaseHeader title={title} description={description} />

          <motion.div
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/5 border border-white/10 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-5xl mb-4 text-gray-500">🔗</div>
            <p className="text-gray-400 text-lg mb-2">Shared content not found</p>
            <p className="text-gray-500 text-sm max-w-md">
              {pathInfo.type === 'sessionId'
                ? 'The shared showcase may have been removed or the sessionId is invalid'
                : 'The shared content may have been removed or the link is invalid'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleBackToShowcase = () => {
    // Use navigation state to preserve category filter
    const previousCategory = location.state?.previousCategory;
    if (previousCategory) {
      navigate(`/showcase?category=${previousCategory}`);
    } else {
      navigate('/showcase');
    }
  };
  
  return <ShowcaseDetail item={items[0]} onBack={handleBackToShowcase} />;
};

export default Showcase;
