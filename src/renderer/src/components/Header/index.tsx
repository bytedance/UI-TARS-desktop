/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Flex, HStack, IconButton, Image } from '@chakra-ui/react';
import { IoIosSettings } from 'react-icons/io';
import { useDispatch } from 'zutron';

import logoVector from '@resources/logo-full.png?url';

export default function Header({ className }: { className?: string }) {
  const dispatch = useDispatch(window.zutron);

  return (
    <Box position="relative" textAlign="center" className={className}>
      <Flex alignItems="center" justifyContent="center">
        <HStack>
          <Image
            alt="UI-TARS Logo"
            src={logoVector}
            h="40px"
            draggable={false}
          />
        </HStack>
        <Box position="absolute" right="4">
          <IconButton
            aria-label="Settings"
            isRound
            icon={<IoIosSettings size={24} />}
            colorScheme="blackAlpha"
            variant="ghost"
            size="md"
            onClick={() =>
              dispatch({ type: 'OPEN_SETTINGS_WINDOW', payload: null })
            }
          />
        </Box>
      </Flex>
    </Box>
  );
}
