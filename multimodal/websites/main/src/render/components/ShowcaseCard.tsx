import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@nextui-org/react';
import { ShowcaseItem, isRecentlyPublished } from '../../data/showcaseData';
import { FiShare2 } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';

interface ShowcaseCardProps {
  item: ShowcaseItem;
  index: number;
  onOpenPreview: (item: ShowcaseItem) => void;
  onShareItem?: (item: ShowcaseItem) => void;
}

export const ShowcaseCard: React.FC<ShowcaseCardProps> = ({
  item,
  index,
  onOpenPreview,
  onShareItem,
}) => {
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShareItem) {
      onShareItem(item);
    }
  };

  // Check if item was published within the last 3 days
  const isNew = isRecentlyPublished(item, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full"
    >
      <Card
        isPressable
        className="h-full flex flex-col border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 overflow-hidden"
        onPress={() => onOpenPreview(item)}
      >
        <div className="relative aspect-video overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent z-10" />

          {/* Share button */}
          {/* <Button
            isIconOnly
            size="sm"
            className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm border border-white/20 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={handleShare}
          >
            <FiShare2 className="text-white" />
          </Button> */}
          {/* New badge */}
          {isNew && (
            <div className="absolute top-2 left-2 z-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
              NEW
            </div>
          )}

          {/* Preview button overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30 transform transition-all duration-300 hover:scale-110">
                <FaPlay className="text-white text-xl" />
              </div>
            </div>
          </div>

          <motion.img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center mb-2">
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-purple-300">
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </span>
            {item.date && <span className="ml-2 text-xs text-gray-400">{item.date}</span>}
          </div>

          <h3 className="text-lg text-left font-semibold text-white mb-1 line-clamp-2">
            {item.title}
          </h3>
          <p className="text-sm text-left text-gray-400 line-clamp-2 mb-3">{item.description}</p>

          <div className="mt-auto">
            {item.languages && item.languages.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-2">
                <div className="flex items-center">
                  {item.languages.map((language, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 mr-1"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
