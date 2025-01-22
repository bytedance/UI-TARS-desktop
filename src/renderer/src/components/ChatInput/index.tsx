/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Button, Flex, HStack, Spinner, VStack } from '@chakra-ui/react';
import React, { forwardRef, useEffect, useRef } from 'react';
import { FaPaperPlane, FaStop, FaTrash } from 'react-icons/fa';
import { LuScreenShare } from 'react-icons/lu';
import { useDispatch } from 'zutron';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants/vlm';
import { StatusEnum } from '@ui-tars/shared/types';
import { ComputerUseUserData } from '@ui-tars/shared/types/data';

import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useStore } from '@renderer/hooks/useStore';
import { reportHTMLContent } from '@renderer/utils/html';

import reportHTMLUrl from '@resources/report.html?url';

const ChatInput = forwardRef((_props, _ref) => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
  } = useStore();
  const [localInstructions, setLocalInstructions] = React.useState(
    savedInstructions ?? '',
  );

  const { run } = useRunAgent();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const running = status === 'running';
  const maxLoop = status === 'max_loop';
  const dispatch = useDispatch(window.zutron);

  const startRun = () => {
    run(localInstructions, () => {
      setLocalInstructions('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    // `enter` to submit
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      localInstructions?.trim()
    ) {
      e.preventDefault();

      startRun();
    }
  };

  const needClear = (!running && messages?.length > 0) || maxLoop;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const handleShare = async () => {
    const response = await fetch(reportHTMLUrl);
    const html = await response.text();

    const userData = {
      ...restUserData,
      status,
      conversations: messages,
    } as ComputerUseUserData;

    const htmlContent = reportHTMLContent(html, [userData]);

    // create Blob object
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.html`;

    // trigger download
    document.body.appendChild(a);
    a.click();

    // clean up
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClearMessages = () => {
    dispatch('CLEAR_HISTORY');
  };

  return (
    <Box p="4" borderTop="1px" borderColor="gray.200">
      <Flex direction="column" h="full">
        <VStack spacing={4} align="center" h="100%" w="100%">
          <Box position="relative" width="100%">
            <Box
              as="textarea"
              ref={textareaRef}
              placeholder={
                status === StatusEnum.RUNNING &&
                lastHumanMessage &&
                messages?.length > 1
                  ? lastHumanMessage
                  : 'What can I do for you today?'
              }
              width="100%"
              height="auto"
              rows={1}
              p={4}
              borderRadius="16px"
              border="1px solid"
              borderColor="rgba(112, 107, 87, 0.5)"
              verticalAlign="top"
              resize="none"
              overflow="hidden"
              sx={{
                transition: 'box-shadow 0.2s, border-color 0.2s',
                _hover: {
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                },
                _focus: {
                  borderColor: 'blackAlpha.500',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                },
              }}
              value={localInstructions}
              disabled={running}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setLocalInstructions(e.target.value);
              }}
              onKeyDown={handleKeyDown}
            />
            {!localInstructions && !running && (
              <Box
                position="absolute"
                as="small"
                right={4}
                top="50%"
                transform="translateY(-50%)"
                fontSize="xs"
                color="gray.500"
                pointerEvents="none"
              >
                `Enter` to run
              </Box>
            )}
          </Box>
          <HStack justify="space-between" align="center" w="100%">
            <Box>
              {status !== StatusEnum.RUNNING && messages?.length > 1 && (
                <Button
                  variant="tars-ghost"
                  aria-label="Share"
                  onClick={handleShare}
                >
                  <LuScreenShare />
                </Button>
              )}
              <div />
            </Box>
            {/* <HStack spacing={2}>
            <Switch
              isChecked={fullyAuto}
              onChange={(e) => {
                toast({
                  description: "Whoops, automatic mode isn't actually implemented yet. 😬",
                  status: 'info',
                  duration: 3000,
                  isClosable: true,
                });
              }}
            />
            <Box>Full Auto</Box>
          </HStack> */}
            <HStack gap={4}>
              {running && <Spinner size="sm" color="gray.500" mr={2} />}
              {Boolean(needClear) && (
                <Button
                  variant="tars-ghost"
                  onClick={handleClearMessages}
                  aria-label="Clear Messages"
                >
                  <FaTrash />
                </Button>
              )}
              <Button
                variant="tars-ghost"
                onClick={running ? () => dispatch('STOP_RUN') : startRun}
                isDisabled={!running && localInstructions?.trim() === ''}
              >
                {running ? <FaStop /> : <FaPaperPlane />}
              </Button>
            </HStack>
          </HStack>

          {/* Add error display */}
          {/* {error && (
          <Box w="100%" color="red.700">
            {error}
          </Box>
        )} */}
        </VStack>
      </Flex>
    </Box>
  );
});

export default ChatInput;
