/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Avatar,
  Box,
  Center,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react';
import React, { useEffect, useRef } from 'react';

import { useRunAgent } from '@renderer/hooks/useRunAgent';

import iconUrl from '@resources/icon.png?url';
import { api } from '@renderer/api';

const Launcher: React.FC = () => {
  const [localInstructions, setLocalInstructions] = React.useState('');
  // const dispatch = useDispatch(window.zutron);
  const inputRef = useRef<HTMLInputElement>(null);

  const { run } = useRunAgent();

  const startRun = async () => {
    await api.closeLauncher();

    run(localInstructions, () => {
      setLocalInstructions('');
    });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      localInstructions?.trim()
    ) {
      e.preventDefault();

      startRun();
    } else if (e.key === 'Escape') {
      e.preventDefault();

      await api.closeLauncher();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInstructions(e.target.value);
  };

  const handleBlur = async () => {
    await api.closeLauncher();
  };

  return (
    <Box position="relative" p="5px" h="100vh" bg="rgba(175, 178, 179, 1.00)">
      <Box
        position="absolute"
        top={0}
        left={0}
        w="100vw"
        h="18px"
        className="draggable-area"
      />
      <Box
        position="relative"
        h="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="xl"
        bg="rgba(215, 218, 220, 1.00)"
      >
        <InputGroup>
          <InputLeftElement
            pointerEvents="none"
            color="gray.300"
            h="100%"
            w="3.5rem"
          >
            <Avatar src={iconUrl} size="md" />
          </InputLeftElement>
          <Input
            pl="3.5rem"
            pr="4rem"
            ref={inputRef}
            h="100%"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="no-draggable-area"
            fontSize="xl"
            value={localInstructions}
            autoFocus
            placeholder="输入指令..."
            bg="transparent"
            cursor="text"
            _placeholder={{ color: 'gray.500' }}
            onChange={handleChange}
            _focus={{ outline: 'none', boxShadow: 'none', border: 'none' }}
            _focusVisible={{
              outline: 'none',
              boxShadow: 'none',
              border: 'none',
            }}
            sx={{
              '&::selection': { background: 'rgba(66, 153, 225, 0.3)' },
              '&:focus': { outline: 'none', boxShadow: 'none', border: 'none' },
            }}
            border="none"
            borderRadius="xl"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
          {!localInstructions && (
            <InputRightElement width="7rem" h="100%">
              <Center
                as="small"
                fontSize="xs"
                color="gray.500"
                pointerEvents="none"
              >
                `Enter` to run
              </Center>
            </InputRightElement>
          )}
        </InputGroup>
      </Box>
    </Box>
  );
};

export default Launcher;
