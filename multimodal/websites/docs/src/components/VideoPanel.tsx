import React, { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause, FaExpand } from 'react-icons/fa';

interface VideoPanelProps {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function VideoPanel({
  src,
  poster,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = true,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMobile, setIsMobile] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // 简单的移动设备检测
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 检测全屏状态变化
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，防止触发togglePlay

    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen().catch((err) => {
          console.error(`全屏请求失败: ${err.message} (${err.name})`);
        });
      }
    }
  };

  return (
    <div
      className={`relative w-full ${className}`}
      onMouseEnter={() => setControlsVisible(true)}
      onMouseLeave={() => setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        className="w-full cursor-pointer"
        onClick={!controls ? togglePlay : undefined}
      />

      {!controls && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {!isPlaying && (
            <button
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 
                bg-[#00FFFF]/80 hover:bg-[#00FFFF]/90 text-black rounded-full p-2 md:p-3
                transition-all duration-300 shadow-lg backdrop-blur-sm"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <FaPause className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              ) : (
                <FaPlay className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} ml-1`} />
              )}
            </button>
          )}

          {/* 全屏按钮 */}
          <button
            className={`absolute bottom-3 right-3 z-40 
              bg-[#00FFFF]/80 hover:bg-[#00FFFF]/90 text-black rounded-full p-2
              transition-all duration-300 shadow-lg backdrop-blur-sm
              ${controlsVisible || isMobile || isFullscreen ? 'opacity-100' : 'opacity-0'}`}
            onClick={toggleFullScreen}
            aria-label="Full Screen"
          >
            <FaExpand className="h-3 w-3 md:h-4 md:w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
