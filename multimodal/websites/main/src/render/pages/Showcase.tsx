import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@nextui-org/react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { ETopRoute, getShowcaseDetailRoute } from '../../constants/routes';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

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
            onClick={() => navigate(ETopRoute.HOME)}
            className="bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const Showcase: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState(showcaseItems);
  const [isLoading, setIsLoading] = useState(true);
  const [shareItem, setShareItem] = useState<ShowcaseItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Check access permission
  const searchParams = new URLSearchParams(location.search);
  const hasAccess = searchParams.get('enableShowcaseIndex') === '1';

  const categoriesWithCounts = getCategoriesWithCounts();

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true);
    setTimeout(() => {
      // getItemsByCategory now returns sorted items
      setFilteredItems(getItemsByCategory(activeCategory));
      setIsLoading(false);
    }, 600);
  }, [activeCategory]);

  // If no access permission, show 404
  if (!hasAccess) {
    return <NotFoundPage />;
  }

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
