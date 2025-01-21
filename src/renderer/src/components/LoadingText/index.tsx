/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box } from '@chakra-ui/react';

import './index.scss';

interface ThinkingProps {
  children: React.ReactNode;
  className?: string;
}

export default (props: ThinkingProps) => {
  return (
    <Box as="span" className="loading-shimmer">
      {props.children}
    </Box>
  );
};
