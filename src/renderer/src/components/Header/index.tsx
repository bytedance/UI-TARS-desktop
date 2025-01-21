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
          <Image alt="UI-TARS Logo" src={logoVector} h="40px" />
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
