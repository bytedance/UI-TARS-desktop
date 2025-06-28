import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BiLoaderAlt } from 'react-icons/bi';
import { FiMonitor } from 'react-icons/fi';

type AnimationState = 'first-full' | 'both-showing' | 'second-full';

export function IntroAnimation() {
  const [animationState, setAnimationState] = useState<AnimationState>('first-full');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const firstVideoRef = useRef<HTMLVideoElement>(null);
  const secondVideoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<number[]>([]);

  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 初始检查
    checkIfMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 处理视频加载状态
  const handleVideosReady = useCallback(() => {
    if (firstVideoRef.current?.readyState >= 3 && secondVideoRef.current?.readyState >= 3) {
      setLoading(false);
    }
  }, []);

  // 监听视频加载事件
  useEffect(() => {
    const firstVideo = firstVideoRef.current;
    const secondVideo = secondVideoRef.current;

    if (!firstVideo || !secondVideo) return;

    // 检查初始状态
    handleVideosReady();

    const events = ['loadeddata', 'canplay', 'canplaythrough'];
    events.forEach((event) => {
      firstVideo.addEventListener(event, handleVideosReady);
      secondVideo.addEventListener(event, handleVideosReady);
    });

    return () => {
      events.forEach((event) => {
        firstVideo.removeEventListener(event, handleVideosReady);
        secondVideo.removeEventListener(event, handleVideosReady);
      });
    };
  }, [handleVideosReady]);

  // 动画循环控制
  const startAnimationLoop = useCallback(() => {
    const firstVideo = firstVideoRef.current;
    const secondVideo = secondVideoRef.current;

    if (!firstVideo || !secondVideo) return;

    // 清除所有现有定时器
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    // 重置视频状态
    firstVideo.currentTime = 0;
    secondVideo.currentTime = 0;
    secondVideo.pause();

    // 开始播放第一个视频
    const playFirstVideo = () => {
      const playPromise = firstVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('无法自动播放第一个视频:', error);
        });
      }
    };

    playFirstVideo();
    setAnimationState('first-full');

    // 第一阶段：完整播放第一个视频
    const firstFullDuration = firstVideo.duration * 1000;

    const timer1 = window.setTimeout(() => {
      setAnimationState('both-showing');

      // 开始播放第二个视频
      secondVideo.currentTime = 0;
      const playPromise = secondVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('无法自动播放第二个视频:', error);
        });
      }

      // 过渡时间
      const transitionDuration = 2000; // 1秒

      const timer2 = window.setTimeout(() => {
        setAnimationState('second-full');

        // 第二个视频播放完毕
        const secondFullDuration = secondVideo.duration * 1000;

        const timer3 = window.setTimeout(() => {
          secondVideo.pause();

          // 循环重置延迟
          const resetDelay = 1000; // 1秒

          const timer4 = window.setTimeout(() => {
            startAnimationLoop();
          }, resetDelay);

          timersRef.current.push(timer4);
        }, secondFullDuration);

        timersRef.current.push(timer3);
      }, transitionDuration);

      timersRef.current.push(timer2);
    }, firstFullDuration);

    timersRef.current.push(timer1);
  }, []);

  // 启动动画循环
  useEffect(() => {
    if (!loading) {
      startAnimationLoop();
    }

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [loading, startAnimationLoop]);

  return (
    <div className="relative w-full" style={{ minHeight: '500px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 dark:bg-gray-900/95 backdrop-blur-sm z-30 rounded-lg border border-gray-700/50 shadow-inner">
          <div className="flex flex-col items-center space-y-3">
            <BiLoaderAlt className="animate-spin h-8 w-8 text-blue-400" />
            <span className="text-blue-300 font-medium tracking-wide text-sm">
              Loading videos...
            </span>
          </div>
        </div>
      )}

      {!loading && isMobile && animationState === 'first-full' && (
        <div className="absolute left-0 right-0 bottom-0 h-1/2 flex items-center justify-center bg-gray-900/75 dark:bg-gray-900/80 backdrop-blur-sm z-20 rounded-b-lg">
          <div className="flex flex-col items-center space-y-3">
            <FiMonitor className="animate-pulse h-8 w-8 text-blue-400" />
            <span className="text-blue-300 font-medium tracking-wide text-sm text-center px-4">
              Web UI is waiting to be displayed
            </span>
          </div>
        </div>
      )}

      <video
        ref={firstVideoRef}
        src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/docs/agent-cli-launch.mp4"
        muted
        playsInline
        className={`absolute transition-all duration-1000 ease-in-out ${
          loading ? 'opacity-0' : ''
        } ${
          isMobile
            ? animationState === 'first-full'
              ? 'w-full top-0 left-0 z-20'
              : animationState === 'both-showing'
                ? 'w-full top-0 left-0 z-10'
                : 'w-full top-0 left-0 z-10 opacity-50'
            : animationState === 'first-full'
              ? 'w-full top-0 left-0 z-20'
              : animationState === 'both-showing'
                ? 'w-3/5 top-0 left-0 z-10'
                : 'w-3/5 top-0 left-0 z-10'
        }`}
      />
      <video
        ref={secondVideoRef}
        src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/docs/agent-tars-game-play.mp4"
        muted
        playsInline
        className={`absolute shadow-lg transition-all duration-1000 ease-in-out ${
          loading ? 'opacity-0' : ''
        } ${
          isMobile
            ? animationState === 'first-full'
              ? 'w-full bottom-0 left-0 opacity-0'
              : animationState === 'both-showing'
                ? 'w-full bottom-0 left-0 z-20 opacity-100'
                : 'w-full bottom-0 left-0 z-20 opacity-100'
            : animationState === 'first-full'
              ? 'w-3/5 bottom-0 right-0 opacity-0'
              : animationState === 'both-showing'
                ? 'w-3/5 bottom-0 right-0 z-20 opacity-100'
                : 'w-full bottom-0 right-0 z-20 opacity-100'
        }`}
      />
    </div>
  );
}
