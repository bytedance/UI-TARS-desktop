import React from 'react';
import { motion } from 'framer-motion';

interface ThinkingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

/**
 * 内容加载动画组件
 *
 * 设计特点:
 * - 简洁的加载条设计
 * - 动态长度变化的加载指示器
 * - 提供清晰的视觉反馈
 * - 支持可自定义大小
 */
export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  size = 'medium',
  text = 'Agent TARS is running',
  className = '',
}) => {
  // 根据尺寸设置参数
  const containerClass =
    size === 'small' ? 'max-w-[180px]' : size === 'medium' ? 'max-w-[240px]' : 'max-w-[300px]';
  const textClass = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';

  // 加载条数量和配置
  const loaderBars = [
    { width: '100%', delay: 0 },
    { width: '80%', delay: 0.2 },
    { width: '60%', delay: 0.4 },
  ];

  return (
    <div className={`${containerClass} ${className}`}>
      {/* 加载文本 */}
      <div className={`${textClass} text-gray-700 dark:text-gray-400 font-medium mb-3`}>{text}</div>

      {/* 加载条动画 */}
      <div className="space-y-2">
        {loaderBars.map((bar, index) => (
          <motion.div
            key={`loader-bar-${index}`}
            className="h-2 bg-gray-200 dark:bg-gray-700/40 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600/40 dark:to-gray-500/40 rounded-full"
              initial={{ width: '0%' }}
              animate={{
                width: bar.width,
                transition: {
                  duration: 1.2,
                  delay: bar.delay,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
