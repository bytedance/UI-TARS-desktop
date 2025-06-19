import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@nextui-org/react';
import { ShowcaseCard } from '../components/ShowcaseCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ShowcaseHeader } from '../components/ShowcaseHeader';
import { ShareModal } from '../components/ShareModal';
import {
  showcaseItems,
  getItemsByCategory,
  getCategoriesWithCounts,
  ShowcaseItem,
} from '../../data/showcaseData';
import { useNavigate } from 'react-router-dom';
import { ETopRoute, getShowcaseDetailRoute } from '../../constants/routes';

const Showcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState(showcaseItems);
  const [isLoading, setIsLoading] = useState(true);
  const [shareItem, setShareItem] = useState<ShowcaseItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const categoriesWithCounts = getCategoriesWithCounts();
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true);
    setTimeout(() => {
      // getItemsByCategory now returns sorted items
      setFilteredItems(getItemsByCategory(activeCategory));
      setIsLoading(false);
    }, 600);
  }, [activeCategory]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleOpenPreview = (item: ShowcaseItem) => {
    navigate(getShowcaseDetailRoute(item.id));
  };

  const handleShareItem = (item: ShowcaseItem) => {
    setShareItem(item);
    setIsShareModalOpen(true);
  };

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
                      onShareItem={handleShareItem}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        item={shareItem}
      />
    </div>
  );
};

export default Showcase;
