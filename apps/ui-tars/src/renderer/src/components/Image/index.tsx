/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import mediumZoom, { type Zoom } from 'medium-zoom';
import React, { useEffect, useRef, useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageProps {
  src: string;
  alt: string;
}

const SnapshotImage: React.FC<ImageProps> = (props) => {
  const { src, alt } = props;
  const [copied, setCopied] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleCopyImage = async () => {
    if (!imgRef.current) return;

    try {
      const img = new Image();
      img.src = imgRef.current.src;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 500);
          }
        });
      };
    } catch (error) {
      toast.error('Failed to copy image', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  useEffect(() => {
    let zoom: Zoom | undefined;
    const initZoom = () => {
      if (imgRef.current) {
        zoom = mediumZoom(imgRef.current, {
          background: 'rgba(0,0,0,.7)',
          margin: 50,
        });
      }
    };
    requestAnimationFrame(initZoom);
    return () => {
      zoom?.detach();
      zoom?.close();
    };
  }, []);

  return (
    <div className="relative group">
      <img
        ref={imgRef}
        src={src}
        className="max-w-full max-h-full object-contain"
        alt={alt}
      />
      <button
        onClick={handleCopyImage}
        className="absolute bottom-2 right-2 p-1.5 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

export default SnapshotImage;
