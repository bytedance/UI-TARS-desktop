import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/common/hooks/useSession';
import { WelcomeCard } from '@tarko/interface';
import { FiArrowUpRight, FiLoader } from 'react-icons/fi';

interface WelcomeCardsProps {
  cards: WelcomeCard[];
  isLoading?: boolean;
  isDirectChatLoading?: boolean;
}

const WelcomeCards: React.FC<WelcomeCardsProps> = ({
  cards,
  isLoading = false,
  isDirectChatLoading = false,
}) => {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useSession();
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // Group cards by category
  const cardsByCategory = useMemo(() => {
    const grouped = cards.reduce(
      (acc, card) => {
        if (!acc[card.category]) {
          acc[card.category] = [];
        }
        acc[card.category].push(card);
        return acc;
      },
      {} as Record<string, WelcomeCard[]>,
    );
    return grouped;
  }, [cards]);

  const categories = Object.keys(cardsByCategory);
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');

  const handleCardClick = async (card: WelcomeCard) => {
    if (isLoading || isDirectChatLoading) return;

    const cardId = `${card.category}-${card.title}`;
    setLoadingCardId(cardId);

    try {
      // Set runtime settings based on card category
      const runtimeSettings: Record<string, unknown> = {};
      // If activeCategory is "Game", set agentMode to "game"
      if (activeCategory === 'Game') {
        runtimeSettings.agentMode = 'game';
      }
      // For other categories, use default values (omni mode)
      // The default value will be applied by the system if not specified

      // Navigate to creating page with card-specific agent options and runtime settings
      navigate('/creating', {
        state: {
          ...(card.prompt && { query: card.prompt }),
          agentOptions: card.agentOptions || {},
          ...(Object.keys(runtimeSettings).length > 0 && { runtimeSettings }),
        },
      });
    } catch (error) {
      console.error('Failed to navigate to creating:', error);
      setLoadingCardId(null);
    }
  };

  if (cards.length === 0) {
    return null;
  }

  const showTabs = categories.length > 1;
  const activeCards = cardsByCategory[activeCategory] || [];

  const elegantGradients = [
    'from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800',
    'from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800',
    'from-zinc-700 to-zinc-900 dark:from-zinc-600 dark:to-zinc-800',
    'from-stone-700 to-stone-900 dark:from-stone-600 dark:to-stone-800',
    'from-neutral-700 to-neutral-900 dark:from-neutral-600 dark:to-neutral-800',
    'from-slate-800 to-gray-900 dark:from-slate-700 dark:to-gray-800',
  ];

  const getCardGradient = (index: number) => {
    return elegantGradients[index % elegantGradients.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full max-w-7xl mx-auto px-4"
    >
      {showTabs && (
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-black/10 rounded-2xl backdrop-blur-sm border border-gray-200/60 dark:border-white/5 shadow-sm dark:shadow-none">
            {categories.map((category) => {
              const categoryCards = cardsByCategory[category] || [];
              const count = categoryCards.length;

              return (
                <motion.button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    activeCategory === category
                      ? 'text-gray-900 dark:text-white bg-white dark:bg-white/5 shadow-sm dark:shadow-none'
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                  }`}
                  disabled={isLoading || isDirectChatLoading}
                >
                  {activeCategory === category && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-white dark:bg-white/5 rounded-xl shadow-sm dark:shadow-none"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  <span className="relative z-10">{category}</span>
                  <span
                    className={`relative z-10 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      activeCategory === category
                        ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white'
                        : 'bg-gray-200/60 dark:bg-gray-700/30 text-gray-500 dark:text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* 卡片网格 - 简洁设计 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {activeCards.map((card, index) => {
            const cardId = `${card.category}-${card.title}`;
            const isCardLoading = loadingCardId === cardId;
            const gradient = getCardGradient(index);

            return (
              <motion.div
                key={cardId}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCardClick(card)}
                className={`group relative cursor-pointer ${
                  isLoading || isDirectChatLoading || isCardLoading
                    ? 'pointer-events-none opacity-60'
                    : ''
                }`}
              >
                {/* 主卡片容器 */}
                <div className="relative h-64 rounded-2xl overflow-hidden bg-white dark:bg-black/10 backdrop-blur-sm border border-gray-200/40 dark:border-white/5 transition-all duration-300 group-hover:border-gray-300/60 dark:group-hover:border-white/10 shadow-lg dark:shadow-none group-hover:shadow-xl dark:group-hover:shadow-none">
                  {/* 背景层 */}
                  <div className="absolute inset-0">
                    {card.image ? (
                      <>
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 dark:bg-black/50" />
                      </>
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${gradient} opacity-90 dark:opacity-80`}
                      />
                    )}
                  </div>

                  {/* 内容层 */}
                  <div className="relative h-full p-6 flex flex-col justify-between">
                    {/* 顶部：分类标签和操作按钮 */}
                    <div className="flex justify-between items-start">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-black/20 dark:bg-white/10 text-white backdrop-blur-sm">
                        {card.category}
                      </span>

                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 dark:bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-black/30 dark:group-hover:bg-white/20 group-hover:scale-110">
                        {isCardLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <FiLoader className="w-4 h-4 text-white" />
                          </motion.div>
                        ) : (
                          <FiArrowUpRight className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </div>
                    </div>

                    {/* 底部：标题和描述 */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white leading-tight group-hover:text-white/90 transition-colors duration-300">
                        {card.title}
                      </h3>
                      <p className="text-white/80 dark:text-white/70 text-sm leading-relaxed line-clamp-3 group-hover:text-white/90 dark:group-hover:text-white/80 transition-colors duration-300">
                        {card.prompt}
                      </p>
                    </div>
                  </div>

                  {/* 悬浮时的微妙光效 */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/5 dark:from-white/3 to-transparent" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 空状态 */}
      {activeCards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-black/10 border border-gray-200 dark:border-white/5 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No cards found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">Try selecting a different category</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default WelcomeCards;
