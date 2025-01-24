/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Box,
  Button,
  Collapse,
  HStack,
  Icon,
  Text,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { AiOutlineDrag } from 'react-icons/ai';
import { BiSolidError } from 'react-icons/bi';
import { FaMousePointer } from 'react-icons/fa';
import { FiType } from 'react-icons/fi';
import { ImCheckboxChecked } from 'react-icons/im';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { PiMouseScrollFill } from 'react-icons/pi';
import { SiAutohotkey } from 'react-icons/si';
import { TbHandClick } from 'react-icons/tb';

import { PredictionParsed } from '@ui-tars/shared/types';

import Image from '../Image';

interface ThoughtStepCardProps {
  step: PredictionParsed;
  index: number;
  borderRadius?: string;
}

const actionIconMap = {
  scroll: PiMouseScrollFill,
  drag: AiOutlineDrag,
  hotkey: SiAutohotkey,
  type: FiType,
  click: TbHandClick,
  left_double: TbHandClick,
  error_env: BiSolidError,
  finished: ImCheckboxChecked,
};

const ThoughtStepCard = ({ step, borderRadius }: ThoughtStepCardProps) => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box
      bg="#e1e0db"
      borderRadius={borderRadius}
      overflow="hidden"
      boxShadow="sm"
    >
      {/* 反思部分（可折叠） */}
      {Boolean(step.reflection) && (
        <>
          <Button
            onClick={onToggle}
            variant="ghost"
            width="100%"
            size="sm"
            leftIcon={isOpen ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
            color="gray.600"
            justifyContent="flex-start"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          >
            {isOpen ? '收起反思过程' : '查看反思过程'}
          </Button>
          <Collapse in={isOpen}>
            <Box
              p={4}
              bg="rgba(255, 255, 255, 0.4)"
              borderTop="1px solid"
              borderColor="rgba(0, 0, 0, 0.1)"
            >
              <Text color="gray.600" fontSize="sm">
                {step.reflection}
              </Text>
            </Box>
          </Collapse>
        </>
      )}
      {/* 思考部分 */}
      {Boolean(step.thought) && (
        <Box p={4}>
          <Text color="gray.700">{step.thought}</Text>
        </Box>
      )}

      {/* 动作部分 */}
      {Boolean(step.action_type) && (
        <Box
          p={4}
          bg="rgba(0, 0, 0, 0.03)"
          borderTop="1px solid"
          borderColor="rgba(0, 0, 0, 0.1)"
        >
          <HStack spacing={3}>
            <Icon
              as={actionIconMap[step?.action_type] || FaMousePointer}
              color="gray.600"
            />
            <Text fontSize="sm" color="gray.600">
              Action: {step.action_type}
              {step.action_inputs?.start_box &&
                `(start_box: ${step.action_inputs.start_box})`}
              {Boolean(step.action_inputs?.content) &&
                `(${step.action_inputs.content})`}
              {Boolean(step.action_inputs?.key) &&
                `(${step.action_inputs.key})`}
            </Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
};

interface ThoughtChainProps {
  steps: PredictionParsed[];
  somImage?: string;
  somImageHighlighted?: boolean;
}

const RADIUS = {
  top: 'var(--chakra-radii-md) var(--chakra-radii-md) 0 0',
  bottom: '0 0 var(--chakra-radii-md) var(--chakra-radii-md)',
  none: '0',
  all: 'md',
};

const ThoughtChain = ({
  steps,
  somImage,
  somImageHighlighted,
}: ThoughtChainProps) => {
  const { isOpen: isImageOpen, onToggle: onImageToggle } = useDisclosure({
    defaultIsOpen: true,
  });

  return (
    <VStack gap={0} align="stretch" w="100%">
      {steps?.map?.((step, index) => (
        <ThoughtStepCard
          key={index}
          step={step}
          index={index}
          borderRadius={
            somImage ? (index === 0 ? RADIUS.top : RADIUS.none) : RADIUS.all
          }
        />
      ))}
      {Boolean(somImage) && (
        <Box
          bg="#e1e0db"
          overflow="hidden"
          boxShadow="sm"
          borderRadius={RADIUS.bottom}
        >
          <Button
            onClick={onImageToggle}
            variant="ghost"
            width="100%"
            size="sm"
            leftIcon={
              isImageOpen ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />
            }
            color="gray.600"
            justifyContent="flex-start"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          >
            Marked Areas
          </Button>
          <Collapse in={isImageOpen}>
            <Box
              p={4}
              bg="rgba(255, 255, 255, 0.4)"
              borderTop="1px solid"
              borderColor="rgba(0, 0, 0, 0.1)"
            >
              <Box
                display="inline-block"
                p={1}
                borderRadius="md"
                bg={somImageHighlighted ? 'red.500' : undefined}
              >
                <Image
                  maxH="200px"
                  src={`data:image/png;base64,${somImage}`}
                  alt="SoM"
                />
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}
    </VStack>
  );
};

export default ThoughtChain;
