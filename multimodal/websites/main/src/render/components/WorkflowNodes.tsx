import React from 'react';
import { motion, useAnimationControls, useInView } from 'framer-motion';
import { Card } from '@nextui-org/react';
import { FaGlobe, FaTerminal, FaFolder, FaCode, FaBrain, FaArrowRight } from 'react-icons/fa';
import { MdAutorenew } from 'react-icons/md';
import { BiData } from 'react-icons/bi';

interface WorkflowNode {
  icon: React.ReactNode;
  title: string;
  description: string;
  position: string;
  mobileOrder: number;
  color: string;
  linePath: string;
}

const nodes: WorkflowNode[] = [
  {
    icon: <FaGlobe className="w-5 h-5" />,
    title: 'Browser Operation',
    description: 'Automated web interactions',
    position: 'left-[10%] top-[20%]',
    mobileOrder: 1,
    color: 'from-blue-500 to-cyan-400',
    linePath: 'M 50,50 C 30,50 20,35 15,20',
  },
  {
    icon: <BiData className="w-5 h-5" />,
    title: 'Data Processing',
    description: 'Real-time data analysis',
    position: 'left-[15%] top-[50%]',
    mobileOrder: 3,
    color: 'from-purple-500 to-pink-500',
    linePath: 'M 50,50 C 35,50 25,50 15,50',
  },
  {
    icon: <FaTerminal className="w-5 h-5" />,
    title: 'Command Line',
    description: 'System level operations',
    position: 'left-[10%] top-[80%]',
    mobileOrder: 5,
    color: 'from-green-500 to-emerald-400',
    linePath: 'M 50,50 C 30,50 20,65 15,80',
  },
  {
    icon: <FaFolder className="w-5 h-5" />,
    title: 'File System',
    description: 'File management & I/O',
    position: 'right-[10%] top-[20%]',
    mobileOrder: 2,
    color: 'from-yellow-500 to-orange-400',
    linePath: 'M 50,50 C 70,50 80,35 85,20',
  },
  {
    icon: <FaCode className="w-5 h-5" />,
    title: 'Code Generation',
    description: 'Smart code synthesis',
    position: 'right-[15%] top-[50%]',
    mobileOrder: 4,
    color: 'from-red-500 to-rose-400',
    linePath: 'M 50,50 C 65,50 75,50 85,50',
  },
  {
    icon: <MdAutorenew className="w-5 h-5" />,
    title: 'Code Interpretion',
    description: 'Continuous improvement',
    position: 'right-[10%] top-[80%]',
    mobileOrder: 6,
    color: 'from-indigo-500 to-violet-400',
    linePath: 'M 50,50 C 70,50 80,65 85,80',
  },
];

export const WorkflowNodes: React.FC = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const controls = nodes.map(() => useAnimationControls());
  const [activeNodeIndex, setActiveNodeIndex] = React.useState(0);
  const [isHovering, setIsHovering] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check if mobile view
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  React.useEffect(() => {
    if (!isInView || isHovering) return;

    const animateNodes = async () => {
      // Skip animation for mobile
      if (isMobile) {
        setActiveNodeIndex(0);
        return;
      }

      for (let i = 0; i < nodes.length; i++) {
        await controls[i].start({
          pathLength: 1,
          opacity: 1,
          transition: { duration: 1.2, ease: 'easeInOut' },
        });
        setActiveNodeIndex(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      await Promise.all(
        controls.map(control =>
          control.start({
            pathLength: [1, 0],
            opacity: [1, 0.3],
            transition: { duration: 0.8, ease: 'easeInOut' },
          }),
        ),
      );
      setActiveNodeIndex(0);
      animateNodes();
    };

    animateNodes();
  }, [isInView, isHovering, isMobile]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${isMobile ? 'h-auto py-10' : 'h-[700px]'} max-w-6xl mx-auto`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Central Brain Node - Hidden on mobile */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative w-32 h-32">
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(45deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1))',
                border: '2px solid rgba(59,130,246,0.3)',
              }}
              animate={{
                rotate: 360,
                boxShadow: [
                  '0 0 20px rgba(59,130,246,0.3)',
                  '0 0 30px rgba(147,51,234,0.3)',
                  '0 0 20px rgba(59,130,246,0.3)',
                ],
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <motion.div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #3B82F6, #9333EA)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(59,130,246,0.5)',
                    '0 0 20px rgba(147,51,234,0.5)',
                    '0 0 10px rgba(59,130,246,0.5)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            {/* Middle rotating ring */}
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{
                background: 'linear-gradient(45deg, rgba(147,51,234,0.1), rgba(236,72,153,0.1))',
                border: '2px solid rgba(147,51,234,0.3)',
              }}
              animate={{
                rotate: -360,
                boxShadow: [
                  '0 0 15px rgba(147,51,234,0.3)',
                  '0 0 25px rgba(236,72,153,0.3)',
                  '0 0 15px rgba(147,51,234,0.3)',
                ],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <motion.div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #9333EA, #EC4899)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 8px rgba(147,51,234,0.5)',
                    '0 0 15px rgba(236,72,153,0.5)',
                    '0 0 8px rgba(147,51,234,0.5)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            {/* Center brain container */}
            <motion.div
              className="absolute inset-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(45deg, #3B82F6, #9333EA)',
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(59,130,246,0.4)',
                  '0 0 30px rgba(147,51,234,0.4)',
                  '0 0 20px rgba(59,130,246,0.4)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <FaBrain className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            {/* Label */}
            <motion.div
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Agent Loop
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Mobile brain node (simplified) */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-20 h-20">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(45deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1))',
                border: '2px solid rgba(59,130,246,0.3)',
              }}
              animate={{
                rotate: 360,
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
              }}
            />

            <motion.div
              className="absolute inset-3 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(45deg, #3B82F6, #9333EA)',
              }}
              animate={{
                boxShadow: [
                  '0 0 10px rgba(59,130,246,0.4)',
                  '0 0 15px rgba(147,51,234,0.4)',
                  '0 0 10px rgba(59,130,246,0.4)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <FaBrain className="w-6 h-6 text-white" />
            </motion.div>

            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Agent Loop
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connection lines - Only show on desktop */}
      {!isMobile && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {nodes.map((_, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`lineGradient-${index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={`rgb(${59 + index * 30}, 130, 246)`} />
                <stop offset="100%" stopColor={`rgb(147, ${51 + index * 30}, 234)`} />
              </linearGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {nodes.map((node, index) => (
            <motion.path
              key={index}
              d={node.linePath}
              stroke={`url(#lineGradient-${index})`}
              strokeWidth="1.5"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={controls[index]}
              filter="url(#glow)"
            />
          ))}
        </svg>
      )}

      {/* Workflow nodes */}
      <div className={isMobile ? 'flex flex-col gap-4' : ''}>
        {nodes
          .slice()
          .sort((a, b) => (isMobile ? a.mobileOrder - b.mobileOrder : 0))
          .map((node, index) => (
            <motion.div
              key={index}
              className={isMobile ? '' : `absolute ${node.position}`}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
              }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
            >
              <Card
                className={`
                  relative overflow-hidden backdrop-blur-sm border p-4
                  ${isMobile ? 'w-full' : 'w-52'}
                  transition-all duration-500 cursor-pointer
                  ${
                    activeNodeIndex === index && !isMobile
                      ? 'bg-white/15 border-white/30 shadow-lg'
                      : 'bg-white/5 border-white/10'
                  }
                `}
              >
                <motion.div
                  className="absolute inset-0 opacity-0"
                  initial={false}
                  animate={{
                    opacity: (activeNodeIndex === index && !isMobile) || isMobile ? 0.1 : 0,
                    background: `linear-gradient(45deg, ${node.color
                      .split(' ')[0]
                      .replace('from-', '')}, ${node.color.split(' ')[1].replace('to-', '')})`,
                  }}
                  transition={{ duration: 0.3 }}
                />

                <div className="relative flex items-start gap-4">
                  <motion.div
                    className={`
                      p-3 rounded-xl bg-gradient-to-r ${node.color}
                      shadow-lg
                    `}
                    animate={{
                      scale: activeNodeIndex === index && !isMobile ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      duration: 0.5,
                      ease: 'easeInOut',
                    }}
                  >
                    {node.icon}
                  </motion.div>

                  <div className="flex flex-col gap-1">
                    <motion.h3
                      className="font-semibold text-white/90"
                      animate={{
                        opacity: activeNodeIndex === index && !isMobile ? 1 : 0.7,
                      }}
                    >
                      {node.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-white/60"
                      animate={{
                        opacity: activeNodeIndex === index && !isMobile ? 0.8 : 0.5,
                      }}
                    >
                      {node.description}
                    </motion.p>
                  </div>
                </div>

                <motion.div
                  className="absolute bottom-0 left-0 h-[1px] w-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${node.color
                      .split(' ')[0]
                      .replace('from-', '')}, ${node.color
                      .split(' ')[1]
                      .replace('to-', '')}, transparent)`,
                  }}
                  animate={{
                    opacity: activeNodeIndex === index && !isMobile ? 0.5 : 0.2,
                  }}
                />
              </Card>
            </motion.div>
          ))}
      </div>
    </motion.div>
  );
};
