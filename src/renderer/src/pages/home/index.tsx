/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Flex } from '@chakra-ui/react';

import ChatInput from '@renderer/components/ChatInput';
import Header from '@renderer/components/Header';
import RunMessages from '@renderer/components/RunMessages';
import { useStore } from '@renderer/hooks/useStore';
import { isWindows } from '@renderer/utils/os';

export default function Home() {
  const { messages, thinking } = useStore();

  return (
    <Flex h="100vh">
      <Box
        minW={400}
        w="full"
        h="full"
        borderRight="1px"
        borderColor="gray.200"
        bg="background.primary"
      >
        <Flex direction="column" h="full">
          {!isWindows && <Box className="draggable-area" w="100%" pt={5} />}
          <Header />
          <RunMessages autoScroll messages={messages} thinking={thinking} />
          <ChatInput />
        </Flex>
      </Box>
    </Flex>
  );
}
