/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
