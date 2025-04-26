/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef, useState } from 'react';
import { setOfMarksOverlays } from '@main/shared/setOfMarks';
import { getState } from './useStore';
import { Conversation } from '@ui-tars/shared/types';
import { api } from '@renderer/api';

export const useScreenRecord = (
  watermarkText = `© ${new Date().getFullYear()} UI-TARS Desktop`,
) => {
  const DOMURL = window.URL || window.webkitURL || window;
  const [isRecording, setIsRecording] = useState(false);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPosRef = useRef<{ xPos: number; yPos: number } | null>(null);

  const drawSetOfMarkOverlays = (
    ctx: CanvasRenderingContext2D,
    screenshotContext: NonNullable<Conversation['screenshotContext']>,
  ) => {
    const messages = getState().messages;
    // console.log('[messages]', messages);
    const latestPredictionParsed =
      messages[messages.length - 1]?.predictionParsed;

    if (latestPredictionParsed) {
      const { overlays } = setOfMarksOverlays({
        predictions: latestPredictionParsed,
        screenshotContext,
        xPos: lastPosRef.current?.xPos,
        yPos: lastPosRef.current?.yPos,
      });

      overlays.forEach((overlay) => {
        const { svg, xPos, yPos, offsetX, offsetY } = overlay;

        const img = new Image();

        const svgBlob = new Blob([svg], {
          type: 'image/svg+xml;charset=utf-8',
        });
        const url = DOMURL.createObjectURL(svgBlob);

        img.onload = function () {
          if (xPos && yPos) {
            ctx.drawImage(img, xPos + offsetX, yPos + offsetY);
            lastPosRef.current = { xPos, yPos };
          }
          DOMURL.revokeObjectURL(url);
        };

        img.src = url;
      });
    }
  };

  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];

      const { screenWidth, screenHeight, scaleFactor } =
        await api.getScreenSize();

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: screenWidth,
          height: screenHeight,
          displaySurface: 'monitor',
          frameRate: 60,
        },
      });

      streamRef.current = stream;

      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d', {
          alpha: true,
          willReadFrequently: true,
        });

        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          video.onloadeddata = () => resolve();
        });
        await video.play();

        // draw first frame
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // set canvas size
        canvas.width = screenWidth;
        canvas.height = screenHeight;

        const canvasStream = canvas.captureStream(60);

        // create MediaRecorder
        const recorder = new MediaRecorder(canvasStream, {
          mimeType: 'video/mp4',
          videoBitsPerSecond: 12000000,
        });

        const chunks: BlobPart[] = [];
        recorder.start();
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        let animationFrameId: number;
        const drawFrame = () => {
          if (ctx && !video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // draw watermark video frame
            ctx.font = '36px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const metrics = ctx.measureText(watermarkText);
            const padding = 20;
            const x = canvas.width - metrics.width - padding;
            const y = canvas.height - padding;
            ctx.fillText(watermarkText, x, y);

            // draw set of mark overlays
            drawSetOfMarkOverlays(ctx, {
              size: {
                width: screenWidth,
                height: screenHeight,
              },
              scaleFactor,
            });
          }
          animationFrameId = requestAnimationFrame(drawFrame);
        };

        drawFrame();

        recorder.onstop = () => {
          cancelAnimationFrame(animationFrameId);
          recordedChunksRef.current = chunks;
        };

        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      }
    } catch (error) {
      console.error('record failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    return () => {
      console.log('unmount useScreenRecord');
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && streamRef.current) {
      // `setTimeout` to preserve the last rendered screen content
      setTimeout(() => {
        mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      }, 500); // 500ms delay
    }
  };

  const saveRecording = () => {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ui-tars-recording-${Date.now()}.mp4`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const canSaveRecording = !isRecording && recordedChunksRef.current.length > 0;
  console.log(
    '[canSaveRecording]',
    canSaveRecording,
    isRecording,
    recordedChunksRef.current.length,
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
    saveRecording,
    canSaveRecording,
    recordRefs: { videoRef, canvasRef },
  };
};
