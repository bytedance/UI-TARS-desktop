import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDocsByCategory } from '../../docs';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@nextui-org/react';
import { FiMenu, FiX, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { getDocDetailRoute } from '../../constants/routes';

export const DocsSidebar: React.FC = () => {
  const { docId } = useParams();
  const [isOpen, setIsOpen] = useState(() => {
    // Initialize based on window width
    return window.innerWidth >= 768;
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize based on window width
    return window.innerWidth < 768;
  });

  // Add initial load flag
  const isInitialMount = useRef(true);
  const currentDocId = docId || 'quick-start';
  const docsByCategory = getDocsByCategory();

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Expand all categories by default on initialization
  useEffect(() => {
    const categories = Object.keys(docsByCategory);
    const newExpandedCategories: Record<string, boolean> = {};

    categories.forEach(category => {
      newExpandedCategories[category] = true;
    });

    setExpandedCategories(newExpandedCategories);
  }, []);

  // Set initial mount state to false after component mounts
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <>
      {/* Mobile menu button - fixed position */}
      {isMobile && (
        <Button
          isIconOnly
          className="fixed left-4 top-20 z-40 bg-purple-600 text-white shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </Button>
      )}

      {/* Desktop collapsed sidebar button */}
      {!isMobile && !isOpen && (
        <div
          className="fixed left-0 top-16 bottom-0 w-16 bg-black/30 border-r border-white/10 flex flex-col items-center pt-4 z-30"
          onClick={() => setIsOpen(true)}
        >
          <Button
            isIconOnly
            className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 mb-8"
            onClick={e => {
              e.stopPropagation();
              setIsOpen(true);
            }}
          >
            <FiMenu />
          </Button>
        </div>
      )}

      {/* Sidebar overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main sidebar */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.div
            initial={isInitialMount.current ? false : isMobile ? { x: -300 } : { width: '64px' }}
            animate={isOpen ? { x: 0, width: '256px' } : isMobile ? { x: -300 } : { width: '64px' }}
            exit={isMobile ? { x: -300 } : { width: '64px' }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
            className={`${
              isMobile ? 'fixed left-0 top-16 bottom-0 z-30' : 'relative'
            } border-r border-white/10 h-full overflow-y-auto bg-black/30`}
          >
            <div className={`p-4 ${isOpen ? '' : 'items-center'}`}>
              {isOpen && (
                <div className="flex justify-between items-center mb-4">
                  {/* <h3 className="font-medium text-white/90">Documentation</h3> */}
                  {!isMobile && (
                    <Button
                      isIconOnly
                      size="sm"
                      className="bg-transparent text-gray-400 hover:bg-white/10 ml-auto"
                      onClick={() => setIsOpen(false)}
                    >
                      <FiX />
                    </Button>
                  )}
                </div>
              )}

              {Object.entries(docsByCategory).map(([category, docs]) => (
                <div key={category} className="mb-6">
                  {isOpen ? (
                    <>
                      <div
                        className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-white/5 rounded-md"
                        onClick={() => toggleCategory(category)}
                      >
                        <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                          {category}
                        </h4>
                        {expandedCategories[category] ? (
                          <FiChevronDown className="text-gray-500" />
                        ) : (
                          <FiChevronRight className="text-gray-500" />
                        )}
                      </div>

                      <AnimatePresence>
                        {expandedCategories[category] && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            {docs.map(doc => (
                              <li key={doc.id}>
                                <Link
                                  to={getDocDetailRoute(doc.id)}
                                  className={`
                                    block px-3 py-2 rounded-md transition-colors text-sm
                                    ${
                                      currentDocId === doc.id
                                        ? 'bg-purple-500/20 text-white font-medium'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }
                                  `}
                                  onClick={() => isMobile && setIsOpen(false)}
                                >
                                  {doc.title}
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
