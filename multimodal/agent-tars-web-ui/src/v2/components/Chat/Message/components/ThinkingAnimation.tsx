import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ThinkingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

/**
 * 高级思考动画组件 - 世界级交互动画设计
 * 
 * 设计特点:
 * - 动态粒子系统模拟思考流程
 * - 微妙的光晕和扩散效果
 * - 精心编排的动画时序
 * - 流畅的性能和低CPU占用
 * - 响应式设计适应不同上下文
 */
export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ 
  size = 'medium', 
  text = 'Agent TARS is thinking', 
  className = '' 
}) => {
  // 根据尺寸设置参数
  const particleCount = size === 'small' ? 5 : size === 'medium' ? 8 : 12;
  const baseSize = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
  const containerClass = size === 'small' ? 'h-6' : size === 'medium' ? 'h-8' : 'h-10';
  
  // 粒子运动动画
  const particleVariants = {
    animate: {
      transition: {
        staggerChildren: 0.12,
        repeat: Infinity,
        repeatType: "loop" as const,
      }
    }
  };

  // 个体粒子动画
  const particleItem = {
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: [0, 1, 0],
      scale: [0.5, 1, 0.5],
      y: [0, -8, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  // 脉冲光效动画
  const pulseVariants = {
    animate: {
      scale: [0.95, 1.05, 0.95],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // 波浪文字动画
  const textVariants = {
    animate: {
      transition: {
        staggerChildren: 0.08,
      }
    }
  };
  
  const letterVariants = {
    initial: { y: 0 },
    animate: { 
      y: [0, -2, 0],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
        repeatType: "reverse",
      }
    }
  };

  // 动态创建文字动画
  const renderTextWithAnimation = () => {
    return (
      <motion.div
        variants={textVariants}
        animate="animate"
        className="flex items-center"
      >
        {text.split('').map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            variants={letterVariants}
            style={{
              display: 'inline-block',
              marginRight: char === ' ' ? '0.25em' : '0',
              opacity: char === '.' ? 0.7 : 1
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    );
  };

  return (
    <div className={`flex items-center space-x-3 ${containerClass} ${className}`}>
      <div className="relative">
        {/* 底部光晕 */}
        <motion.div 
          className="absolute rounded-full bg-accent-400/20 dark:bg-accent-500/10 blur-md" 
          style={{ 
            width: `${baseSize * 6}px`, 
            height: `${baseSize * 3}px`,
            bottom: `-${baseSize}px`,
            left: `${baseSize}px`,
          }}
          variants={pulseVariants}
          animate="animate"
        />
        
        {/* 粒子容器 */}
        <motion.div 
          className="relative flex items-center justify-center"
          style={{ width: `${baseSize * 8}px`, height: `${baseSize * 8}px` }}
          variants={particleVariants}
          animate="animate"
        >
          {/* 动态生成粒子 */}
          {Array.from({ length: particleCount }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-accent-500 dark:bg-accent-400 rounded-full"
              style={{ 
                width: `${baseSize}px`, 
                height: `${baseSize}px`,
                filter: `blur(${size === 'small' ? 0 : 0.5}px)`,
                x: `${Math.cos(i / particleCount * Math.PI * 2) * baseSize * 2}px`,
                y: `${Math.sin(i / particleCount * Math.PI * 2) * baseSize * 2}px`,
              }}
              variants={particleItem}
              custom={i}
            />
          ))}
          
          {/* 中心光点 */}
          <motion.div
            className="absolute bg-accent-600 dark:bg-accent-300 rounded-full z-10"
            style={{ 
              width: `${baseSize * 1.5}px`, 
              height: `${baseSize * 1.5}px`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>

      {/* 思考文字 */}
      <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">
        {renderTextWithAnimation()}
      </div>
    </div>
  );
};
