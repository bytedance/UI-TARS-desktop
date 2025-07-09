import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner, Button } from '@nextui-org/react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { ShowcaseCard } from './components/ShowcaseCard';
import { CategoryFilter } from './components/CategoryFilter';
import { ShowcaseHeader } from './components/ShowcaseHeader';
import { ShowcasePreview } from './components/ShowcasePreview';
import { useShowcaseData } from './hooks/useShowcaseData';
import {
  getItemsByCategory,
  getCategoriesWithCounts,
  ShowcaseItem,
} from './adapters/dataAdapter';

export const Showcase: React.FC = () => {
  const { items, isLoading, error, refetch } = useShowcaseData();
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewItem, setPreviewItem] = useState<ShowcaseItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return getItemsByCategory(items, activeCategory);
  }, [items, activeCategory]);

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

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewItem(null);
  };

  const handleRetry = () => {
    refetch();
  };

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
            <h2 className="text-xl font-semibold mb-2 text-red-300">Failed to Load Showcase Data</h2>
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
        <ShowcaseHeader
          title="Showcase"
          description="Explore our collection of impressive demos and applications"
        />

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                  {filteredItems.map((item, index) => (
                    <ShowcaseCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpenPreview={handleOpenPreview}
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

      <ShowcasePreview
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        item={previewItem}
      />
    </div>
  );
};

export default Showcase;
