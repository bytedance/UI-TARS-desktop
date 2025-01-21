/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Image, ImageProps } from '@chakra-ui/react';
import clsx from 'clsx';
import mediumZoom, { type Zoom } from 'medium-zoom';
import React, { useEffect, useRef } from 'react';

const SnapshotImage: React.FC<ImageProps> = (props) => {
  const { className, ...rest } = props;
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let zoom: Zoom | undefined;
    const timeout = setTimeout(() => {
      if (imgRef.current) {
        zoom = mediumZoom(imgRef.current, {
          background: 'rgba(255,255,255,.7)',
          margin: 50,
        });
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      zoom?.detach();
      zoom?.close();
    };
  }, []);

  return (
    <Image ref={imgRef} className={clsx('snapshot', className)} {...rest} />
  );
};

export default SnapshotImage;
