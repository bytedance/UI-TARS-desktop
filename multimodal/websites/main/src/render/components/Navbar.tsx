import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@nextui-org/react';
import { FiDownload, FiMenu, FiX } from 'react-icons/fi';
import { FaDiscord, FaGithub } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './icon.png';
import { ETopRoute } from '../../constants/routes';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    if (!isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-10 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-0 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={ETopRoute.HOME} className="flex items-center">
              <img src={Icon} alt="TARS Logo" className="h-8 w-8 mr-0" />
            </Link>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="flex items-center gap-6">
                <Link
                  to={ETopRoute.DOC}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Docs
                </Link>
                <Link
                  to={ETopRoute.BLOG}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Blog
                </Link>
                <Link
                  to={ETopRoute.SHOWCASE}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Showcase
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                isIconOnly
                className="min-w-[36px] w-[36px] h-[36px] p-0 bg-transparent border border-white/20 hover:bg-white/10"
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? (
                  <FiX className="text-white text-xl" />
                ) : (
                  <FiMenu className="text-white text-xl" />
                )}
              </Button>
            )}

            <Button
              as="a"
              href="https://github.com/bytedance/UI-TARS-desktop"
              target="_blank"
              className="min-w-[36px] w-[36px] h-[36px] p-0 bg-transparent border border-white/20 hover:bg-white/10"
              isIconOnly
              size="md"
            >
              <FaGithub className="text-white" />
            </Button>

            <Button
              as="a"
              href="https://discord.com/invite/HnKcSBgTVx"
              target="_blank"
              className="min-w-[36px] w-[36px] h-[36px] p-0 bg-transparent border border-white/20 hover:bg-white/10"
              isIconOnly
              size="md"
            >
              <FaDiscord className="text-white" />
            </Button>
            <Button
              as="a"
              href="https://github.com/bytedance/UI-TARS-desktop/releases"
              target="_blank"
              size="sm"
              className="
                bg-gradient-to-r from-[#6D28D9] to-[#7C3AED]
                hover:from-[#5B21B6] hover:to-[#6D28D9]
                text-white font-medium px-3 py-2 rounded-full
                shadow-[0_0_15px_rgba(124,58,237,0.2)]
                border border-white/10
                backdrop-blur-sm
                transition-all duration-300
                hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]
                hover:scale-105
                active:scale-95
                group
              "
              startContent={
                <FiDownload className="text-sm group-hover:scale-110 transition-transform duration-300" />
              }
            >
              Download
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Menu with Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop with blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={closeMobileMenu}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-black/80 backdrop-blur-md border-r border-white/10 pt-20 px-6"
            >
              <div className="flex flex-col gap-8">
                <Link
                  to={ETopRoute.DOC}
                  className="text-gray-300 hover:text-white transition-colors text-lg font-medium"
                  onClick={closeMobileMenu}
                >
                  Docs
                </Link>
                <Link
                  to={ETopRoute.BLOG}
                  className="text-gray-300 hover:text-white transition-colors text-lg font-medium"
                  onClick={closeMobileMenu}
                >
                  Blog
                </Link>
                <Link
                  to={ETopRoute.SHOWCASE}
                  className="text-gray-300 hover:text-white transition-colors text-lg font-medium"
                  onClick={closeMobileMenu}
                >
                  Showcase
                </Link>

                <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
                  <Button
                    as="a"
                    href="https://github.com/bytedance/UI-TARS-desktop"
                    target="_blank"
                    size="md"
                    className="w-full bg-white/10 text-white"
                    startContent={<FaGithub />}
                  >
                    GitHub
                  </Button>
                  <Button
                    as="a"
                    href="https://github.com/bytedance/UI-TARS-desktop/releases?q=Agent-TARS&expanded=true"
                    target="_blank"
                    size="md"
                    className="w-full bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] text-white"
                    startContent={<FiDownload />}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
