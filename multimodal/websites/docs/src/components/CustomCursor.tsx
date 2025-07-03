import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useCursor } from './CursorContext';

interface CustomCursorProps {
  className?: string;
}

const CustomCursor: React.FC<CustomCursorProps> = ({ className }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  // 使用上下文中的状态而不是本地状态
  const { isHovered } = useCursor();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 确保光标可见
      if (!isVisible && !isFullscreen) setIsVisible(true);

      // 直接设置鼠标位置，不使用状态更新以避免延迟
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
      // 仍然更新状态用于其他可能的用途
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => !isFullscreen && setIsVisible(true);

    // 监听全屏变化
    const handleFullscreenChange = () => {
      const isDocFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isDocFullscreen);

      // 全屏时使用原生光标，退出全屏恢复自定义光标
      if (isDocFullscreen) {
        document.body.style.cursor = 'auto';
        document.body.classList.remove('cursor-hidden');
        setIsVisible(false);
      } else {
        setIsVisible(true);
        document.body.style.cursor = 'none';
        document.body.classList.add('cursor-hidden');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 仅当鼠标在页面内且不在全屏模式时隐藏默认鼠标
    if (isVisible && !isFullscreen) {
      document.body.style.cursor = 'none';
      document.body.classList.add('cursor-hidden');
    } else {
      document.body.style.cursor = 'auto';
      document.body.classList.remove('cursor-hidden');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.style.cursor = 'auto';
      document.body.classList.remove('cursor-hidden');
    };
  }, [isVisible, isFullscreen]);

  if (!isVisible || isFullscreen) return null;

  return (
    <div
      ref={cursorRef}
      className={clsx(
        'custom-cursor',
        isHovered && 'cursor-hover',
        isClicking && 'cursor-clicking',
        className,
      )}
      style={{
        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
      }}
    >
      <svg
        className="cursor-pointer"
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill="white"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
