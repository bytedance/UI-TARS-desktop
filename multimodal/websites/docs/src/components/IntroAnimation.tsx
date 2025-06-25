import React, { useEffect, useState, useRef } from 'react';

type AnimationState = 'first-full' | 'both-showing' | 'second-full';

export function IntroAnimation() {
  const [animationState, setAnimationState] = useState<AnimationState>('first-full');
  const firstVideoRef = useRef<HTMLVideoElement>(null);
  const secondVideoRef = useRef<HTMLVideoElement>(null);
  const [videosReady, setVideosReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    // 只有当两个视频都加载完成时才开始动画
    const checkIfVideosReady = () => {
      if (firstVideoRef.current?.readyState >= 3 && secondVideoRef.current?.readyState >= 3) {
        setVideosReady(true);
      }
    };

    // 给视频元素添加事件监听
    const firstVideo = firstVideoRef.current;
    const secondVideo = secondVideoRef.current;

    if (firstVideo && secondVideo) {
      firstVideo.addEventListener('canplay', checkIfVideosReady);
      secondVideo.addEventListener('canplay', checkIfVideosReady);

      return () => {
        firstVideo.removeEventListener('canplay', checkIfVideosReady);
        secondVideo.removeEventListener('canplay', checkIfVideosReady);
      };
    }
  }, []);

  useEffect(() => {
    if (!videosReady || !firstVideoRef.current || !secondVideoRef.current) return;

    const firstVideo = firstVideoRef.current;
    const secondVideo = secondVideoRef.current;

    // 获取视频的实际时长
    const firstVideoDuration = firstVideo.duration;
    const secondVideoDuration = secondVideo.duration;

    // 修改时间计算逻辑，确保第一个视频完整播放
    const firstFullDuration = firstVideoDuration; // 完整播放第一个视频
    const transitionDuration = 1; // 1秒过渡时间
    const secondFullDuration = secondVideoDuration; // 完整播放第二个视频
    const resetDelay = 1; // 1秒重置延迟

    // 存储所有的定时器，以便清理
    let timers: NodeJS.Timeout[] = [];

    const animationLoop = () => {
      // 清除之前的所有定时器
      timers.forEach((timer) => clearTimeout(timer));
      timers = [];

      // 重置视频播放
      firstVideo.currentTime = 0;
      secondVideo.currentTime = 0;

      // 确保第二个视频是暂停状态
      secondVideo.pause();

      // 只播放第一个视频，并处理可能的播放拒绝
      firstVideo.play().catch((error) => {
        console.warn('无法自动播放第一个视频:', error);
        // 可以在这里添加一个视觉提示，告诉用户点击页面以开始播放
      });

      // Step 1: 显示第一个视频全屏
      setAnimationState('first-full');

      // Step 2: 第一个视频播放完毕后，过渡到两个视频同时显示
      const timer1 = setTimeout(() => {
        setAnimationState('both-showing');
        secondVideo.currentTime = 0; // 确保第二个视频从头开始
        secondVideo.play().catch((error) => {
          console.warn('无法自动播放第二个视频:', error);
        }); // 开始播放第二个视频

        // Step 3: 过渡时间后，显示第二个视频全屏
        const timer2 = setTimeout(() => {
          setAnimationState('second-full');

          // Step 4: 当第二个视频播放完毕后，暂停它
          const timer3 = setTimeout(() => {
            secondVideo.pause(); // 暂停第二个视频

            // 等待 resetDelay 后，重新开始第一个视频
            const timer4 = setTimeout(() => {
              // 重新开始循环
              animationLoop();
            }, resetDelay * 1000);

            timers.push(timer4);
          }, secondFullDuration * 1000);

          timers.push(timer3);
        }, transitionDuration * 1000);

        timers.push(timer2);
      }, firstFullDuration * 1000);

      timers.push(timer1);
    };

    animationLoop();

    // 组件卸载时清除所有定时器
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [videosReady]);

  return (
    <div className="relative w-full" style={{ minHeight: '450px' }}>
      <video
        ref={firstVideoRef}
        src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/docs/agent-cli-launch.mp4"
        muted
        playsInline
        autoPlay
        className={`absolute transition-all duration-1000 ease-in-out ${
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
        autoPlay
        className={`absolute shadow-lg transition-all duration-1000 ease-in-out ${
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
