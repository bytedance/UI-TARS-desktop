/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Center, Flex, Spinner } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { useDispatch } from 'zutron';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants/vlm';
import { Conversation } from '@ui-tars/shared/types/data';

import Duration from '@renderer/components/Duration';
import Image from '@renderer/components/Image';
import LoadingText from '@renderer/components/LoadingText';

import Prompts from '../Prompts';
import ThoughtChain from '../ThoughtChain';
import './index.scss';

interface RunMessagesProps {
  highlightedFrame?: number;
  messages: Conversation[];
  thinking?: boolean;
  loading?: boolean;
  autoScroll?: boolean;
}

const DurationWrapper = (props: { timing: Conversation['timing'] }) => (
  <Box
    className="duration-component"
    opacity={0}
    visibility="hidden"
    transition="all .2s"
  >
    <Duration timing={props.timing} />
  </Box>
);

const RunMessages: React.FC<RunMessagesProps> = (props) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dispatch = useDispatch(window.zutron);
  const { messages, thinking, autoScroll, loading, highlightedFrame } = props;

  const suggestions = [];

  const handleSelect = (suggestion: string) => {
    dispatch({ type: 'SET_INSTRUCTIONS', payload: suggestion });
  };

  console.log('[messages]', messages);

  useEffect(() => {
    if (autoScroll) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [messages, autoScroll, thinking]);

  return (
    <Box flex="1" overflowY="auto" p="4">
      <Box
        ref={containerRef}
        w="100%"
        h="100%"
        bg="white"
        borderRadius="16px"
        border="1px solid"
        borderColor="rgba(112, 107, 87, 0.5)"
        p={4}
        overflow="auto"
        css={{
          '&::-webkit-scrollbar': 'initial',
          '&::-webkit-scrollbar-track': 'initial',
          '&::-webkit-scrollbar-thumb': 'border-radius: 4px',
        }}
      >
        {Boolean(loading) && (
          <Center h="100%">
            <Spinner />
          </Center>
        )}
        {!messages?.length && suggestions?.length > 0 && (
          <Prompts suggestions={suggestions} onSelect={handleSelect} />
        )}
        {messages?.map((m, idx) => {
          console.log(
            'timing',
            m?.timing?.start,
            m.timing?.end,
            m.timing?.cost,
          );
          // 计算当前消息之前的图片总数
          const imageIndex = messages
            .slice(0, idx)
            .filter(
              (msg) =>
                msg.screenshotBase64 || msg.screenshotBase64WithElementMarker,
            )?.length;
          const highlightedImageFrame = highlightedFrame === imageIndex;

          if (m?.from === 'human') {
            if (m?.value === IMAGE_PLACEHOLDER) {
              const imageData = m.screenshotBase64;

              return imageData ? (
                <Flex
                  key={`${idx}`}
                  id={`snapshot-image-${imageIndex}`}
                  gap={2}
                  mb={4}
                  justify="flex-end"
                  _hover={{
                    '& .duration-component': {
                      opacity: 1,
                      visibility: 'visible',
                    },
                  }}
                >
                  <Box>
                    <Box
                      p={2}
                      borderRadius="md"
                      bg={highlightedImageFrame ? 'red.500' : 'gray.50'}
                    >
                      <Image
                        src={`data:image/png;base64,${imageData}`}
                        maxH="200px"
                        alt="image"
                      />
                    </Box>
                    <DurationWrapper timing={m.timing} />
                  </Box>
                </Flex>
              ) : null;
            }
            // user instruction
            return (
              <Flex
                key={`${idx}`}
                gap={2}
                mb={4}
                alignItems="center"
                flexDirection="row"
                justify="flex-end"
              >
                <Box key={`${idx}`} p={3} borderRadius="md" bg="gray.50">
                  <Box fontFamily="monospace" color="blue.600">
                    {m?.value}
                  </Box>
                </Box>
              </Flex>
            );
          } else {
            const { predictionParsed, screenshotBase64WithElementMarker } = m;
            return (
              <Flex
                key={`${idx}`}
                p={3}
                justify="flex-start"
                maxW="80%"
                _hover={{
                  '& .duration-component': {
                    opacity: 1,
                    visibility: 'visible',
                  },
                }}
              >
                <Box mb={4}>
                  {predictionParsed?.length && (
                    <Box id={`snapshot-image-${imageIndex}`}>
                      <ThoughtChain
                        steps={predictionParsed}
                        somImage={screenshotBase64WithElementMarker}
                        somImageHighlighted={highlightedImageFrame}
                      />
                    </Box>
                  )}
                  <DurationWrapper timing={m.timing} />
                </Box>
              </Flex>
            );
          }
        })}
        {thinking && <LoadingText>Thinking...</LoadingText>}
      </Box>
    </Box>
  );
};

export default RunMessages;
