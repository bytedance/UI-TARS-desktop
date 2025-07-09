import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner, Button } from '@nextui-org/react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'rspress/runtime';
import { ShowcaseCard } from './components/ShowcaseCard';
import { CategoryFilter } from './components/CategoryFilter';
import { ShowcaseHeader } from './components/ShowcaseHeader';
import { ShowcaseDetail } from './components/ShowcaseDetail';
import { useShowcaseData } from './hooks/useShowcaseData';
import {
  getItemsByCategory,
  getCategoriesWithCounts,
  ShowcaseItem,
} from './adapters/dataAdapter';
import { extractIdFromPath } from './utils/urlUtils';

export const Showcase: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathInfo = extractIdFromPath(location.pathname);
  const isDetailPage = !!pathInfo;

  const hookParams = pathInfo 
    ? pathInfo.type === 'sessionId' 
      ? { sessionId: pathInfo.value }
      : { slug: pathInfo.value }
    : {};
  
  const { items, isLoading, error, refetch } = useShowcaseData(hookParams);

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
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      onNavigateToDetail={(item) => {
        const pathSegment = item.id.includes('-') ? item.id : item.id;
        navigate(`/showcase/${encodeURIComponent(pathSegment)}`);
      }}
    />
  );
};

interface ShowcaseListPageProps {
  items: ShowcaseItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigateToDetail: (item: ShowcaseItem) => void;
}

const ShowcaseListPage: React.FC<ShowcaseListPageProps> = ({
  items,
  isLoading,
  error,
  onRetry,
  onNavigateToDetail,
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = useMemo(() => {
    return getItemsByCategory(items, activeCategory);
  }, [items, activeCategory]);

  const categoriesWithCounts = useMemo(() => {
    return getCategoriesWithCounts(items);
  }, [items]);

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-16 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <ShowcaseHeader 
            title="Showcase" 
            description="Explore our collection of impressive demos and applications" 
          />
          
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
            <Button
              color="danger"
              variant="ghost"
              startContent={<FiRefreshCw />}
              onClick={onRetry}
            >
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
        <ShowcaseHeader 
          title="Showcase" 
          description="Explore our collection of impressive demos and applications" 
        />

        <CategoryFilter
          categories={categoriesWithCounts}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
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
                      onOpenPreview={onNavigateToDetail}
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
          <ShowcaseHeader 
            title="Loading..." 
            description="Please wait while we load the content" 
          />
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
            <Button
              color="danger"
              variant="ghost"
              startContent={<FiRefreshCw />}
              onClick={onRetry}
            >
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
                : 'The shared content may have been removed or the link is invalid'
              }
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <ShowcaseDetail
      item={items[0]}
      onBack={() => navigate('/showcase')}
    />
  );
};

export default Showcase;