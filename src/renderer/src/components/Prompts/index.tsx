/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Flex, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';

// 将 Box 转换为可以使用动画的组件
const MotionBox = motion(Box);

interface SuggestionProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
}

const Prompts = ({ suggestions, onSelect }: SuggestionProps) => {
  return (
    <Flex flexDirection="column" gap={3}>
      {suggestions.map((suggestion, index) => (
        <MotionBox
          key={index}
          // 初始状态
          initial={{
            opacity: 0,
            y: 20,
          }}
          // 动画状态
          animate={{
            opacity: 1,
            y: 0,
          }}
          // 配置动画
          transition={{
            duration: 0.5,
            delay: index * 0.1, // 每个项目依次延迟显示
            ease: 'easeOut',
          }}
          onClick={() => onSelect?.(suggestion)}
        >
          <Box
            bg="rgba(241, 243, 247, 0.9)"
            px={4}
            py={2}
            borderRadius="2xl"
            cursor="pointer"
            as="button"
            display="inline-block"
          >
            <Text fontSize="sm" textAlign="left" color="gray.600">
              {suggestion} →
            </Text>
          </Box>
        </MotionBox>
      ))}
    </Flex>
  );
};
export default Prompts;
