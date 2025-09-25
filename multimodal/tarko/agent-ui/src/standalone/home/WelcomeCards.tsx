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
  isDirectChatLoading = false 
}) => {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useSession();
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // Group cards by category
  const cardsByCategory = useMemo(() => {
    const grouped = cards.reduce((acc, card) => {
      if (!acc[card.category]) {
        acc[card.category] = [];
      }
      acc[card.category].push(card);
      return acc;
    }, {} as Record<string, WelcomeCard[]>);
    return grouped;
  }, [cards]);

  const categories = Object.keys(cardsByCategory);
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');

  const handleCardClick = async (card: WelcomeCard) => {
    if (isLoading || isDirectChatLoading) return;
    
    const cardId = `${card.category}-${card.title}`;
    setLoadingCardId(cardId);
    navigate('/creating');

    try {
      const sessionId = await createSession();
      navigate(`/${sessionId}`, { replace: true });
      await sendMessage(card.prompt);
    } catch (error) {
      console.error('Failed to create session:', error);
      navigate('/', { replace: true });
    } finally {
      setLoadingCardId(null);
    }
  };

  if (cards.length === 0) {
    return null;
  }

  const showTabs = categories.length > 1;
  const activeCards = cardsByCategory[activeCategory] || [];

  // 预定义的高端渐变色彩
  const premiumGradients = [
    'from-indigo-600 via-purple-600 to-blue-600',
    'from-violet-600 via-purple-600 to-pink-600', 
    'from-blue-600 via-indigo-600 to-purple-600',
    'from-purple-600 via-pink-600 to-rose-600',
    'from-emerald-600 via-teal-600 to-cyan-600',
    'from-amber-600 via-orange-600 to-red-600',
    'from-slate-600 via-gray-600 to-zinc-600',
    'from-rose-600 via-pink-600 to-purple-600'
  ];

  const getCardGradient = (index: number) => {
    return premiumGradients[index % premiumGradients.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full max-w-8xl mx-auto px-6 py-12"
    >
      {/* 分类标签 - 奢华设计 */}
      {showTabs && (
        <div className="flex justify-center mb-16">
          <div className="relative">
            {/* 背景光晕 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-400/20 dark:via-purple-400/20 dark:to-pink-400/20 blur-xl rounded-full" />
            
            <div className="relative flex bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-3xl p-2 border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/30">
              {categories.map((category) => {
                const categoryCards = cardsByCategory[category] || [];
                const count = categoryCards.length;
                
                return (
                  <motion.button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative px-8 py-4 text-sm font-semibold rounded-2xl transition-all duration-500 flex items-center gap-3 ${
                      activeCategory === category
                        ? 'text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    disabled={isLoading || isDirectChatLoading}
                  >
                    {/* 活跃状态背景 */}
                    {activeCategory === category && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                      />
                    )}
                    
                    <span className="relative z-10">{category}</span>
                    <span className={`relative z-10 px-2.5 py-1 rounded-xl text-xs font-bold ${
                      activeCategory === category
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 卡片网格 - 奢华设计 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.5, ease: [0.21, 1.11, 0.81, 0.99] }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {activeCards.map((card, index) => {
            const cardId = `${card.category}-${card.title}`;
            const isCardLoading = loadingCardId === cardId;
            const gradient = getCardGradient(index);
            
            return (
              <motion.div
                key={cardId}
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.7, 
                  delay: index * 0.15,
                  ease: [0.21, 1.11, 0.81, 0.99]
                }}
                whileHover={{ 
                  y: -12, 
                  scale: 1.03,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCardClick(card)}
                className={`group relative cursor-pointer ${
                  isLoading || isDirectChatLoading || isCardLoading
                    ? 'pointer-events-none opacity-60'
                    : ''
                }`}
              >
                {/* 主卡片容器 */}
                <div className="relative h-96 rounded-3xl overflow-hidden">
                  {/* 背景层 */}
                  <div className="absolute inset-0">
                    {card.image ? (
                      <>
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/70 dark:from-black/60 dark:via-black/40 dark:to-black/80" />
                      </>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} relative overflow-hidden`}>
                        {/* 装饰性几何图案 */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 dark:bg-white/5 rounded-full -translate-y-20 translate-x-20 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full translate-y-16 -translate-x-16 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12" />
                        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 dark:bg-white/3 rounded-full -translate-x-12 -translate-y-12 transition-transform duration-700 group-hover:scale-150" />
                        
                        {/* 动态光效 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-white/3 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      </div>
                    )}
                  </div>

                  {/* 玻璃态边框 */}
                  <div className="absolute inset-0 rounded-3xl border border-white/20 dark:border-white/10 group-hover:border-white/40 dark:group-hover:border-white/20 transition-all duration-500" />

                  {/* 内容层 */}
                  <div className="relative h-full p-8 flex flex-col justify-between backdrop-blur-sm">
                    {/* 顶部：分类标签和操作按钮 */}
                    <div className="flex justify-between items-start">
                      <span className="inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold bg-white/20 dark:bg-white/10 text-white backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg">
                        {card.category}
                      </span>
                      
                      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10 transition-all duration-500 group-hover:bg-white/25 dark:group-hover:bg-white/15 group-hover:scale-110 group-hover:rotate-12 shadow-lg">
                        {isCardLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <FiLoader className="w-6 h-6 text-white" />
                          </motion.div>
                        ) : (
                          <FiArrowUpRight className="w-6 h-6 text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                        )}
                      </div>
                    </div>

                    {/* 底部：标题和描述 */}
                    <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-white leading-tight group-hover:text-white/95 transition-colors duration-300">
                        {card.title}
                      </h3>
                      <p className="text-white/85 dark:text-white/80 text-sm leading-relaxed line-clamp-3 group-hover:text-white/95 dark:group-hover:text-white/90 transition-colors duration-300">
                        {card.prompt}
                      </p>
                    </div>
                  </div>

                  {/* 悬浮时的光晕效果 */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-white/5 to-transparent dark:from-white/3 dark:to-transparent" />
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-400/15 dark:via-purple-400/15 dark:to-pink-400/15 blur-lg" />
                  </div>

                  {/* 点击涟漪效果 */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl bg-white/10 dark:bg-white/5 opacity-0"
                    whileTap={{ opacity: [0, 0.3, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* 卡片阴影 */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-black/5 to-black/20 dark:from-black/10 dark:to-black/40 blur-xl scale-95 group-hover:scale-100 transition-transform duration-500 -z-10" />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 空状态 - 优雅设计 */}
      {activeCards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-32"
        >
          <div className="relative mx-auto mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10 blur-2xl rounded-full" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No cards found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Try selecting a different category
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default WelcomeCards;