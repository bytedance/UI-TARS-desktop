import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface CustomCursorProps {
  className?: string;
}

const CustomCursor: React.FC<CustomCursorProps> = ({ className }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 确保光标可见
      if (!isVisible) setIsVisible(true);

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
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    // 仅当鼠标在页面内时隐藏默认鼠标
    if (isVisible) {
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
      document.body.style.cursor = 'auto';
      document.body.classList.remove('cursor-hidden');
    };
  }, [isVisible]);

  // 暴露setIsHovered方法给全局
  useEffect(() => {
    // @ts-ignore - 全局增加控制光标hover状态的方法
    window.setCursorHovered = (hovered: boolean) => setIsHovered(hovered);

    return () => {
      // @ts-ignore
      delete window.setCursorHovered;
    };
  }, []);

  if (!isVisible) return null;

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
