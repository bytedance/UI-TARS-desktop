import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner, Button } from '@nextui-org/react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { useLocation } from 'rspress/runtime';
import { ShowcaseCard } from './components/ShowcaseCard';
import { CategoryFilter } from './components/CategoryFilter';
import { ShowcaseHeader } from './components/ShowcaseHeader';
import { ShowcasePreview } from './components/ShowcasePreview';
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
  const pathInfo = extractIdFromPath(location.pathname);
  const isShareMode = !!pathInfo;
  
  // 根据路径类型使用不同的参数
  const hookParams = pathInfo 
    ? pathInfo.type === 'sessionId' 
      ? { sessionId: pathInfo.value }
      : { slug: pathInfo.value }
    : {};
  
  const { items, isLoading, error, refetch } = useShowcaseData(hookParams);
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewItem, setPreviewItem] = useState<ShowcaseItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ShowcaseItem | null>(null);

  const filteredItems = useMemo(() => {
    if (isShareMode) {
      return items;
    }
    return getItemsByCategory(items, activeCategory);
  }, [items, activeCategory, isShareMode]);

  const categoriesWithCounts = useMemo(() => {
    return getCategoriesWithCounts(items);
  }, [items]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleOpenPreview = (item: ShowcaseItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  const handleOpenDetail = (item: ShowcaseItem) => {
    setDetailItem(item);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewItem(null);
  };

  const handleBackFromDetail = () => {
    setDetailItem(null);
  };

  const handleRetry = () => {
    refetch();
  };

  // 获取页面标题和描述
  const getPageContent = () => {
    if (isShareMode) {
      const item = items[0];
      if (pathInfo?.type === 'sessionId') {
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
    }
    return {
      title: 'Showcase',
      description: 'Explore our collection of impressive demos and applications',
    };
  };

  const { title, description } = getPageContent();

  // 如果有详情项目，显示详情页面
  if (detailItem) {
    return (
      <ShowcaseDetail
        item={detailItem}
        onBack={handleBackFromDetail}
        onShare={(item) => {
          setPreviewItem(item);
          setIsPreviewOpen(true);
        }}
      />
    );
  }

  // 如果是分享模式且有数据，直接显示详情页面
  if (isShareMode && items.length > 0 && !isLoading) {
    return (
      <ShowcaseDetail
        item={items[0]}
        onBack={() => window.history.back()}
        onShare={(item) => {
          setPreviewItem(item);
          setIsPreviewOpen(true);
        }}
      />
    );
  }

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
              {isShareMode ? 'Failed to Load Shared Content' : 'Failed to Load Showcase Data'}
            </h2>
            <p className="text-gray-400 mb-4 max-w-md">{error}</p>
            <Button
              color="danger"
              variant="ghost"
              startContent={<FiRefreshCw />}
              onClick={handleRetry}
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
        <ShowcaseHeader title={title} description={description} />

        {/* 只在非分享模式下显示分类过滤器 */}
        {!isShareMode && (
          <CategoryFilter
            categories={categoriesWithCounts}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
          />
        )}

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
              key={isShareMode ? pathInfo?.value : activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {filteredItems.length > 0 ? (
                <div className={`grid gap-6 auto-rows-fr ${
                  isShareMode 
                    ? 'grid-cols-1 max-w-4xl mx-auto' 
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {filteredItems.map((item, index) => (
                    <ShowcaseCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpenPreview={isShareMode ? handleOpenDetail : handleOpenPreview}
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
                  <div className="text-5xl mb-4 text-gray-500">
                    {isShareMode ? '🔗' : '🔍'}
                  </div>
                  <p className="text-gray-400 text-lg mb-2">
                    {isShareMode ? 'Shared content not found' : 'No items found in this category'}
                  </p>
                  <p className="text-gray-500 text-sm max-w-md">
                    {isShareMode 
                      ? pathInfo?.type === 'sessionId' 
                        ? 'The shared showcase may have been removed or the sessionId is invalid'
                        : 'The shared content may have been removed or the link is invalid'
                      : 'Try selecting a different category or check back later for new additions'
                    }
                  </p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* 只在非分享模式下显示联系信息 */}
        {!isShareMode && (
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
        )}
      </div>

      <ShowcasePreview
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        item={previewItem}
      />
    </div>
  );
};

export default Showcase;
