/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { extendTheme } from '@chakra-ui/react';

export const chakraUItheme = extendTheme({
  styles: {
    global: {
      body: {
        color: 'rgb(83, 81, 70)',
        // bg: 'background.primary',
      },
    },
  },
  colors: {
    background: {
      primary: 'rgb(240, 238, 229)',
    },
    color: {
      primary: '#c79060',
    },
  },
  components: {
    Alert: {
      variants: {
        'ui-tars-success': {
          container: {
            bg: 'color.primary',
            color: 'white',
          },
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            _selected: {
              color: '#c79060',
              borderColor: '#c79060',
            },
          },
          tablist: {
            borderBottom: '1px solid',
            borderColor: 'blackAlpha.200',
          },
        },
      },
    },
    Slider: {
      variants: {
        line: {
          filledTrack: {
            bg: '#c79060',
          },
          thumb: {
            _focus: {
              boxShadow: '0 1px 4px #c79060',
            },
          },
        },
      },
    },
    Button: {
      variants: {
        'tars-ghost': {
          bg: 'transparent',
          fontWeight: 'normal',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'blackAlpha.200',
          _hover: {
            bg: 'whiteAlpha.500',
            borderColor: 'blackAlpha.300',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          },
          _focus: {
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            outline: 'none',
          },
        },
        'tars-primary': {
          bg: 'background.primary',
          fontWeight: 'normal',
          borderRadius: '12px',
          _hover: {
            bg: 'rgb(235, 233, 224)',
            borderColor: 'blackAlpha.300',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          },
          _focus: {
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            outline: 'none',
          },
        },
        'tars-ghost-primary': {
          bg: 'transparent',
          fontWeight: 'normal',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: '#c79060',
          color: '#c79060',
          _hover: {
            bg: 'whiteAlpha.500',
            borderColor: '#c79060',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          },
          _focus: {
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            outline: 'none',
            borderColor: '#c79060',
          },
        },
      },
    },
    Switch: {
      baseStyle: {
        track: {
          bg: 'blackAlpha.200',
          _checked: {
            bg: '#c79060',
          },
        },
      },
    },
  },
});
