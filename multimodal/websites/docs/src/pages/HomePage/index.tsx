import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { FaGithub, FaCopy, FaCheck } from 'react-icons/fa';
import CustomCursor from '@components/CustomCursor';
import { Link } from '@components/Link';
import { VideoPanel } from '@components/VideoPanel';
import { useCursor } from '@components/CursorContext';
import { usePageMeta, generatePageTitle, optimizeDescription } from '@components/hooks';
import './index.css';

// Terminal commands
const terminalCommands = ['npx @agent-tars/cli@latest'];

// SEO configuration
const SEO_CONFIG = {
  defaultDescription:
    'Agent TARS is an open-source multimodal AI agent that controls your browser through natural language. Experience seamless integration with DOM manipulation, VLM capabilities, and real-world MCP tools.',
  siteUrl: 'https://example.com',
  keywords: ['AI agent', 'browser control', 'multimodal', 'open-source', 'natural language'],
};

export const HomePage = () => {
  // Set SEO meta tags for home page with enhanced options
  usePageMeta({
    title: generatePageTitle(), // Will generate "Agent TARS" as the main title
    description: optimizeDescription(SEO_CONFIG.defaultDescription),
    type: 'website',
    url: typeof window !== 'undefined' ? window.location.origin : SEO_CONFIG.siteUrl,
    keywords: SEO_CONFIG.keywords,
  });

  const [commandIndex, setCommandIndex] = useState(0);
  const [typedCommand, setTypedCommand] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const { setIsHovered } = useCursor();

  const auroraRef = useRef<HTMLDivElement>(null);

  // Carousel content - Update colors to match the new theme
  const slides = [
    {
      title: 'AGENT',
      highlight: 'TARS',
      subtitle: 'AN OPEN-SOURCE MULTIMODAL AI AGENT',
      color: 'var(--accent)',
      titleFont: 'font-mono-bolder-italic',
      subtitleFont: 'font-condensed',
    },
    {
      title: 'BROWSER',
      highlight: 'CONTROL',
      subtitle: 'BROWSER GUI AGENT CONTROLLED BY DOM AND VLM',
      color: 'var(--primary)',
      titleFont: 'font-mono-bolder-italic',
      subtitleFont: 'font-condensed',
    },
    {
      title: 'SEAMLESS',
      highlight: 'INTEGRATION',
      subtitle: 'WITH A WIDE RANGE OF REAL-WORLD MCP TOOLS',
      color: 'var(--accent-alt)',
      titleFont: 'font-mono-bolder-italic',
      subtitleFont: 'font-condensed',
      highlightStyle: { fontSize: 'clamp(2rem, 13vw, 14rem)' },
    },
    {
      title: 'EVENT',
      highlight: 'STREAM',
      subtitle: 'DRIVEN BY EVENT STREAM, FROM AGENT CORE TO UI',
      color: 'var(--accent)',
      titleFont: 'font-mono-bolder-italic',
      subtitleFont: 'font-condensed',
    },
  ];

  // Create aurora background effect
  useEffect(() => {
    if (auroraRef.current) {
      const container = auroraRef.current;
      container.innerHTML = '';

      // 增加极光射线数量，使效果更加丰富但每束更微妙
      for (let i = 0; i < 8; i++) {
        const aurora = document.createElement('div');
        aurora.className = 'aurora-beam';

        // Set random position and size
        const startPos = Math.random() * 100;
        const width = Math.random() * 20 + 10;
        const delay = Math.random() * 8;
        const duration = Math.random() * 15 + 20; // 增加动画持续时间，使动作更加缓慢

        aurora.style.left = `${startPos}%`;
        aurora.style.width = `${width}%`;
        aurora.style.animationDelay = `${delay}s`;
        aurora.style.animationDuration = `${duration}s`;

        // 降低颜色透明度，并添加更深沉的颜色选项
        const colors = [
          'rgba(0, 255, 255, 0.08)', // 降低青色透明度
          'rgba(128, 0, 255, 0.07)', // 降低紫色透明度
          'rgba(0, 128, 255, 0.06)', // 降低蓝色透明度
          'rgba(255, 45, 85, 0.05)', // 降低红色透明度
          'rgba(0, 64, 128, 0.08)', // 添加深蓝色
          'rgba(45, 0, 75, 0.05)', // 添加深紫色
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // 使用三层渐变，增加深度感
        aurora.style.background = `linear-gradient(to top, 
          transparent, 
          ${color} 35%, 
          ${color.replace(/[0-9\.]+\)$/, '0.04)')} 70%, 
          transparent)`;

        // 添加随机水平偏移量，增加暗流涌动感
        aurora.style.transform = `translateX(${Math.random() * 20 - 10}px)`;

        container.appendChild(aurora);
      }
    }
  }, []);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Auto carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Typing effect
  useEffect(() => {
    if (isTyping) {
      if (typedCommand.length < terminalCommands[commandIndex].length) {
        const timeout = setTimeout(
          () => {
            setTypedCommand(terminalCommands[commandIndex].substring(0, typedCommand.length + 1));
          },
          Math.random() * 50 + 30,
        );
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => {
          setIsTyping(true);
          setCommandIndex((prev) => (prev + 1) % terminalCommands.length);
          setTypedCommand('');
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [typedCommand, isTyping, commandIndex]);

  // Letter animation variants - Adjusted for serif fonts
  const letterVariants = {
    hidden: { y: 60, opacity: 0, scale: 0.5 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.04,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.8 },
      },
    }),
  };

  // Highlight text animation variants
  const highlightVariants = {
    hidden: { opacity: 0, scale: 1.5, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        delay: 0.4,
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  // Subtitle animation variants
  const subtitleVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        delay: 0.7,
        duration: 0.7,
        ease: 'easeOut',
      },
    },
  };

  // Terminal animation variants
  const terminalVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: 1,
        duration: 0.7,
        ease: 'easeOut',
      },
    },
  };

  // Button animation variants
  const buttonVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.2 + i * 0.1,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  // Video panel animation variants - same style as button animation
  const videoPanelVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: 1.1, // appears slightly earlier than button
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const copyCommand = () => {
    navigator.clipboard
      .writeText(terminalCommands[commandIndex])
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
      });
  };

  return (
    <div className="bg-cyber-black text-white h-screen overflow-hidden relative">
      {/* Noise texture */}
      <div className="noise"></div>

      {/* Aurora background effect */}
      <div ref={auroraRef} className="aurora-container"></div>

      {/* Custom mouse pointer */}
      <CustomCursor />

      {/* GitHub icon in the top right corner */}
      <motion.div
        className="absolute top-4 right-4 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Link
          href="https://github.com/bytedance/UI-TARS-desktop"
          className="text-white hover:text-primary transition-colors duration-300"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <FaGithub className="w-8 h-8 hover:text-[var(--accent)] transition-all duration-300" />
        </Link>
      </motion.div>

      {/* Background grid */}
      <div className="cyber-grid-bg absolute inset-0 opacity-10"></div>
      <div className="animated-grid"></div>

      {/* Scan line effect */}
      <div className="scan-line absolute inset-0"></div>

      {/* Main content */}
      <main className="relative z-10 h-screen flex flex-col items-center justify-center px-6">
        <div className="container mx-auto">
          {/* Main title animation carousel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
              style={{
                position: 'relative',
                zIndex: 20,
              }}
            >
              {/* Decorative elements */}
              <motion.div
                className="circuit-decoration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.5, duration: 1 }}
                style={{
                  top: -50,
                  left: '20%',
                  borderColor: slides[currentSlide].color,
                }}
              />

              <motion.div
                className="circuit-decoration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.7, duration: 1 }}
                style={{
                  bottom: -70,
                  right: '25%',
                  borderColor: slides[currentSlide].color,
                }}
              />

              <div className="overflow-hidden">
                <motion.h1 className={`mega-title ${slides[currentSlide].titleFont}`}>
                  {slides[currentSlide].title.split('').map((letter, i) => (
                    <motion.span
                      key={`title-${i}-${currentSlide}`}
                      custom={i}
                      variants={letterVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {letter}
                    </motion.span>
                  ))}{' '}
                  <motion.span
                    className="highlight title-glitch"
                    style={{
                      color: slides[currentSlide].color,
                      textShadow: `0 0 10px ${slides[currentSlide].color}, 0 0 20px ${slides[currentSlide].color}`,
                      ...(slides[currentSlide].highlightStyle || {}),
                    }}
                    variants={highlightVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {slides[currentSlide].highlight}
                  </motion.span>
                </motion.h1>
              </div>

              <motion.p
                className={`subtitle-cyber ${slides[currentSlide].subtitleFont}`}
                style={{
                  color: slides[currentSlide].color,
                  textShadow: `0 0 15px ${slides[currentSlide].color}`,
                }}
                variants={subtitleVariants}
                initial="hidden"
                animate="visible"
              >
                {slides[currentSlide].subtitle}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Interactive area - Terminal and buttons with animation */}
          <motion.div
            className="flex flex-col md:flex-row justify-center items-center w-full max-w-5xl mx-auto gap-12"
            initial={{ width: '100%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            {/* Video panel - uses the same animation variant as the button */}
            <motion.div
              className="cyber-panel w-full md:w-[280px] max-w-md mt-4 md:mt-0"
              variants={videoPanelVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.03 }}
              transition={{ scale: { duration: 0.2 } }}
            >
              <VideoPanel
                src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/docs/agent-tars-introduction-v1.mp4"
                loop
                autoPlay
                muted
                className="rounded-lg border border-cyber-border overflow-hidden shadow-neon"
              />
            </motion.div>

            {/* Terminal and buttons container */}
            <motion.div
              className="flex flex-col items-center w-full md:w-1/2 max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              {/* Terminal command display */}
              <motion.div
                className="cyber-terminal w-full max-w-[400px] mx-auto mb-12"
                variants={terminalVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="flex items-center gap-3 relative">
                  <span className="text-primary font-bold">$</span>
                  <span className="text-accent font-mono">{typedCommand}</span>
                  <span
                    className={`terminal-cursor ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}
                  ></span>

                  {/* 复制按钮 */}
                  <button
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 text-accent hover:text-white p-2 rounded-full bg-black/30 transition-all duration-300"
                    onClick={copyCommand}
                    title="Copy Command"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    {copied ? <FaCheck className="text-[var(--accent)]" /> : <FaCopy />}
                  </button>
                </div>
                <div className="terminal-scan-line"></div>
              </motion.div>

              {/* Button group - Using narrow aspect ratio font */}
              <div className="flex gap-6 justify-center">
                <Link
                  href="/guide/get-started/quick-start.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cyber-button-primary font-narrow-bold group"
                  variants={buttonVariants}
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>QUICK START</span>
                  <div className="cyber-button-border"></div>
                </Link>

                <Link
                  href="/blog/2025-06-25-introducing-agent-tars-beta.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cyber-button font-condensed group"
                  variants={buttonVariants}
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Introduction</span>
                  <div className="cyber-button-border"></div>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
