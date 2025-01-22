/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Flex, FlexProps, Text } from '@chakra-ui/react';
import ms from 'ms';
import React from 'react';
import { MdAccessTime } from 'react-icons/md';

import { Conversation } from '@ui-tars/shared/types/data';

const Duration: React.FC<Pick<Conversation, 'timing'> & FlexProps> = (
  props,
) => {
  const { timing, color, ...rest } = props;

  return (
    <Flex justify="flex-end" mt={1} {...rest}>
      {typeof timing?.cost === 'number' && timing.cost >= 0 && (
        <Text
          fontSize="sm"
          display="flex"
          alignItems="center"
          gap={1}
          color={color ?? 'gray.400'}
        >
          <MdAccessTime size={14} />
          {ms(timing?.cost, { long: false })}
        </Text>
      )}
    </Flex>
  );
};

export default Duration;
