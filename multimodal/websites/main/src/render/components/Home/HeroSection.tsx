import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Spinner } from '@nextui-org/react';
import { FiBookOpen } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { ETopRoute } from '../../../constants/routes';

interface HeroSectionProps {
  onOpenVideo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const generateThumbnail = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        setThumbnailUrl(thumbnailUrl);
      }
    }
  }, []);

  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && video.currentTime === 0) {
      generateThumbnail();
      video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [generateThumbnail]);

  const handleVideoLoad = useCallback(() => {
    setIsVideoLoading(false);
    setTimeout(() => setIsVideoReady(true), 100);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [handleTimeUpdate]);

  return (
    <section className="relative min-h-screen flex items-center justify-center">
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl sm:text-8xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-100 to-gray-400 pb-2">
            Agent TARS
          </h1>
          <p className="text-xl mb-8 text-gray-400">
            An open-source <b>multimodal</b> AI agent <br />
            Offering seamless integration with a wide range of real-world tools.
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <Button
              as={Link}
              to={ETopRoute.DOC}
              className="bg-white text-black hover:bg-gray-200"
              startContent={<FiBookOpen />}
            >
              Get Started
            </Button>
            <Button
              as={Link}
              to="/2025/03/18/announcing-agent-tars-app"
              variant="solid"
              className="bg-gradient-to-r from-gray-100 to-white text-black hover:opacity-90 min-w-[120px]"
              startContent={<FiBookOpen className="text-lg" />}
            >
              Introduction
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-3xl mx-auto"
        >
          <div
            className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/10 cursor-pointer 
                transform transition-all duration-500 hover:scale-[1.02] hover:border-white/20"
            onClick={onOpenVideo}
          >
            <AnimatePresence>
              {isVideoLoading && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20"
                >
                  <Spinner size="lg" className="opacity-50" />
                </motion.div>
              )}
            </AnimatePresence>

            {thumbnailUrl && (
              <motion.img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: isVideoReady ? 0 : 1 }}
                transition={{ duration: 0.8 }}
              />
            )}

            <motion.div
              className="absolute inset-0 w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: isVideoReady ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            >
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={handleVideoMetadata}
                onLoadedData={handleVideoLoad}
              >
                <source
                  src="https://github.com/user-attachments/assets/5bfed86f-7201-4fe2-b33b-d93a591c35c8"
                  type="video/mp4"
                />
              </video>
            </motion.div>

            <motion.div
              className="absolute inset-0 bg-black/30 flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center
                border border-white/30 transform transition-all duration-300 hover:scale-110"
              >
                <FaPlay className="w-8 h-8 text-white ml-1" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
};
