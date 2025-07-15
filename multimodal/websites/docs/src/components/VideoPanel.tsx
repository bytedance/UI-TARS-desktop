import React, { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

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

  useEffect(() => {
    // 简单的移动设备检测
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
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

  return (
    <div className={`relative w-full ${className}`}>
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
        </div>
      )}
    </div>
  );
}
