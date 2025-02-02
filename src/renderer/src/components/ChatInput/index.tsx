/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Box,
  Button,
  Flex,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { RiRecordCircleLine } from 'react-icons/ri';
import { TbReport } from 'react-icons/tb';
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { FaPaperPlane, FaStop, FaTrash } from 'react-icons/fa';
import { HiChevronDown } from 'react-icons/hi';
import { FaRegShareFromSquare } from 'react-icons/fa6';
import { IoPlay } from 'react-icons/io5';
import { useDispatch } from 'zutron';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { StatusEnum, ComputerUseUserData } from '@ui-tars/shared/types';

import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useStore } from '@renderer/hooks/useStore';
import { reportHTMLContent } from '@renderer/utils/html';
import { uploadReport } from '@renderer/utils/share';

import reportHTMLUrl from '@resources/report.html?url';
import { isCallUserMessage } from '@renderer/utils/message';
import { useScreenRecord } from '@renderer/hooks/useScreenRecord';

const ChatInput = forwardRef((_props, _ref) => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
    settings,
  } = useStore();

  const [localInstructions, setLocalInstructions] = React.useState(
    savedInstructions ?? '',
  );

  const toast = useToast();
  const { run } = useRunAgent();
  const {
    isOpen: isShareOpen,
    onOpen: onShareOpen,
    onClose: onShareClose,
  } = useDisclosure();
  const {
    canSaveRecording,
    startRecording,
    stopRecording,
    saveRecording,
    recordRefs,
  } = useScreenRecord();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const running = status === 'running';
  const maxLoop = status === 'max_loop';
  const dispatch = useDispatch(window.zutron);

  const startRun = () => {
    run(localInstructions, () => {
      startRecording().catch((e) => {
        console.error('start recording failed:', e);
      });
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

  useEffect(() => {
    if (status === StatusEnum.INIT) {
      return;
    }
  }, [status]);

  const isCallUser = useMemo(() => isCallUserMessage(messages), [messages]);

  /**
   * `call_user` for human-in-the-loop
   */
  useEffect(() => {
    if (status === StatusEnum.END && isCallUser && savedInstructions) {
      setLocalInstructions(savedInstructions);
    }
    // record screen when running
    if (status !== StatusEnum.INIT) {
      stopRecording();
    }

    return () => {
      stopRecording();
    };
  }, [isCallUser, status]);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const [isSharing, setIsSharing] = React.useState(false);
  const isSharePending = React.useRef(false);
  const shareTimeoutRef = React.useRef<NodeJS.Timeout>();
  const SHARE_TIMEOUT = 100000;

  const handleShare = async (type: 'report' | 'video') => {
    if (isSharePending.current) {
      return;
    }

    try {
      setIsSharing(true);
      isSharePending.current = true;

      shareTimeoutRef.current = setTimeout(() => {
        setIsSharing(false);
        isSharePending.current = false;
        toast({
          title: 'Share timeout',
          description: 'Please try again later',
          status: 'error',
          position: 'top',
          duration: 3000,
          isClosable: true,
        });
      }, SHARE_TIMEOUT);

      if (type === 'video') {
        saveRecording();
      } else if (type === 'report') {
        const response = await fetch(reportHTMLUrl);
        const html = await response.text();

        const userData = {
          ...restUserData,
          status,
          conversations: messages,
        } as ComputerUseUserData;

        const htmlContent = reportHTMLContent(html, [userData]);

        let reportUrl: string | undefined;

        if (settings?.reportStorageBaseUrl) {
          try {
            const { url } = await uploadReport(
              htmlContent,
              settings.reportStorageBaseUrl,
            );
            reportUrl = url;
            await navigator.clipboard.writeText(url);
            toast({
              title: 'Report link copied to clipboard!',
              status: 'success',
              position: 'top',
              duration: 2000,
              isClosable: true,
              variant: 'ui-tars-success',
            });
          } catch (error) {
            console.error('Share failed:', error);
            toast({
              title: 'Failed to upload report',
              description:
                error instanceof Error ? error.message : JSON.stringify(error),
              status: 'error',
              position: 'top',
              duration: 3000,
              isClosable: true,
            });
          }
        }

        // Send UTIO data through IPC
        if (settings?.utioBaseUrl) {
          const lastScreenshot = messages
            .filter((m) => m.screenshotBase64)
            .pop()?.screenshotBase64;

          await window.electron.utio.shareReport({
            type: 'shareReport',
            instruction: lastHumanMessage,
            lastScreenshot,
            report: reportUrl,
          });
        }

        // If shareEndpoint is not configured or the upload fails, fall back to downloading the file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: 'Failed to generate share content',
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
        status: 'error',
        position: 'top',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
      setIsSharing(false);
      isSharePending.current = false;
    }
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
                <HStack spacing={2}>
                  <Menu isLazy isOpen={isShareOpen} onClose={onShareClose}>
                    <MenuButton
                      as={Button}
                      onMouseOver={onShareOpen}
                      variant="tars-ghost"
                      aria-label="Share options"
                      rightIcon={<HiChevronDown />}
                    >
                      {isSharing ? (
                        <Spinner size="sm" />
                      ) : (
                        <FaRegShareFromSquare />
                      )}
                    </MenuButton>
                    <MenuList>
                      {canSaveRecording && (
                        <MenuItem onClick={() => handleShare('video')}>
                          <HStack spacing={1}>
                            <RiRecordCircleLine />
                            <span>Export as Video</span>
                          </HStack>
                        </MenuItem>
                      )}
                      <MenuItem onClick={() => handleShare('report')}>
                        <HStack spacing={1}>
                          <TbReport />
                          <span>Export as HTML</span>
                        </HStack>
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
              )}
              <div />
            </Box>
            <div style={{ display: 'none' }}>
              <video ref={recordRefs.videoRef} />
              <canvas ref={recordRefs.canvasRef} />
            </div>
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
                {(() => {
                  if (running) {
                    return <FaStop />;
                  }
                  if (isCallUser) {
                    return (
                      <>
                        <IoPlay />
                        Return control to UI-TARS
                      </>
                    );
                  }
                  return <FaPaperPlane />;
                })()}
              </Button>
            </HStack>
          </HStack>
        </VStack>
      </Flex>
    </Box>
  );
});

export default ChatInput;
