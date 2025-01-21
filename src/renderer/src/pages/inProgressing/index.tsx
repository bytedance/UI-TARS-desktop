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
import {
  Box,
  IconButton,
  Text,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaPause } from 'react-icons/fa';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
`;

export default function InProgressing() {
  const gradient = useColorModeValue(
    'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
    'linear-gradient(-45deg, #2d3748, #4a5568, #2c5282, #2b6cb0)',
  );

  const longThought =
    '这是一段很长的思考内容，可能会超出一行显示范围，需要在hover的时候显示完整内容...';

  return (
    <Box
      h="100vh"
      w="100vw"
      display="flex"
      justifyContent="center"
      alignItems="center"
      bgGradient={gradient}
      backgroundSize="400% 400%"
      animation={`${gradientAnimation} 15s ease infinite`}
    >
      <VStack spacing={4} color="white">
        {/* 指令标题 */}
        <Text fontSize="xl" fontWeight="bold" textAlign="center">
          Locate a well-known Post-Impressionist artist&apos;s colorful...
        </Text>

        {/* 思考内容 - 带悬浮提示 */}
        <Tooltip label={longThought} placement="top">
          <Text maxW="400px" isTruncated fontSize="md" color="whiteAlpha.800">
            {longThought}
          </Text>
        </Tooltip>

        {/* 操作细节 */}
        <Text fontSize="sm" color="whiteAlpha.700">
          Running
        </Text>

        {/* 暂停按钮 */}
        <IconButton
          aria-label="Pause"
          icon={<FaPause />}
          size="lg"
          colorScheme="whiteAlpha"
          variant="solid"
          isRound
        />
      </VStack>
    </Box>
  );
}
