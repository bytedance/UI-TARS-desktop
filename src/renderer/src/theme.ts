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
