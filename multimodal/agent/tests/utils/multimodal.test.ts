/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolCallResult, getLogger } from './../../src';
import { convertToMultimodalToolCallResult } from './../../src/utils/multimodal';

// Mock logger
vi.mock('./logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('multimodal utilities', () => {
  const mockLogger = getLogger('test');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertToMultimodalToolCallResult', () => {
    describe('Text content handling', () => {
      it('should convert simple string content properly', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_123',
          toolName: 'textTool',
          content: 'Simple text response',
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "Simple text response",
                "type": "text",
              },
            ],
            "toolCallId": "call_123",
            "toolName": "textTool",
          }
        `);
      });

      it('should convert JSON string content properly', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_456',
          toolName: 'jsonTool',
          content: '{"result":"success","data":{"key":"value"}}',
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "{"result":"success","data":{"key":"value"}}",
                "type": "text",
              },
            ],
            "toolCallId": "call_456",
            "toolName": "jsonTool",
          }
        `);
      });

      it('should handle null/undefined/empty content', () => {
        const nullResult: ToolCallResult = {
          toolCallId: 'call_null',
          toolName: 'nullTool',
          content: null,
        };

        const undefinedResult: ToolCallResult = {
          toolCallId: 'call_undefined',
          toolName: 'undefinedTool',
          content: undefined,
        };

        const emptyResult: ToolCallResult = {
          toolCallId: 'call_empty',
          toolName: 'emptyTool',
          content: '',
        };

        expect(convertToMultimodalToolCallResult(nullResult)).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "null",
                "type": "text",
              },
            ],
            "toolCallId": "call_null",
            "toolName": "nullTool",
          }
        `);

        expect(convertToMultimodalToolCallResult(undefinedResult)).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "undefined",
                "type": "text",
              },
            ],
            "toolCallId": "call_undefined",
            "toolName": "undefinedTool",
          }
        `);

        expect(convertToMultimodalToolCallResult(emptyResult)).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "",
                "type": "text",
              },
            ],
            "toolCallId": "call_empty",
            "toolName": "emptyTool",
          }
        `);
      });
    });

    describe('Object content handling', () => {
      it('should convert regular object content to text', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_789',
          toolName: 'objectTool',
          content: { result: 'success', count: 42, items: ['item1', 'item2'] },
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "{
            "result": "success",
            "count": 42,
            "items": [
              "item1",
              "item2"
            ]
          }",
                "type": "text",
              },
            ],
            "toolCallId": "call_789",
            "toolName": "objectTool",
          }
        `);
      });

      it('should handle object with direct image data (PNG signature)', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_image_png',
          toolName: 'pngTool',
          content: {
            type: 'screenshot',
            data: 'iVBORw0KGgoAAAANSUhEUgAAA', // PNG signature
            description: 'A test PNG image',
          },
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA",
                },
                "type": "image_url",
              },
              {
                "text": "{
            "description": "A test PNG image"
          }",
                "type": "text",
              },
            ],
            "toolCallId": "call_image_png",
            "toolName": "pngTool",
          }
        `);
      });

      it('should handle object with image data and explicit mime type', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_image_jpeg',
          toolName: 'jpegTool',
          content: {
            type: 'image',
            data: '/9j/4AAQSkZJRgABAQAAAQABAAD', // JPEG signature
            mimeType: 'image/jpeg',
            description: 'A test JPEG image',
            size: { width: 800, height: 600 },
          },
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
                },
                "type": "image_url",
              },
              {
                "text": "{
            "description": "A test JPEG image",
            "size": {
              "width": 800,
              "height": 600
            }
          }",
                "type": "text",
              },
            ],
            "toolCallId": "call_image_jpeg",
            "toolName": "jpegTool",
          }
        `);
      });

      it('should handle object with just image data and no other properties', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_image_only',
          toolName: 'imageOnlyTool',
          content: {
            type: 'image',
            data: 'R0lGODlhAQABAIA', // GIF signature
          },
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,R0lGODlhAQABAIA",
                },
                "type": "image_url",
              },
            ],
            "toolCallId": "call_image_only",
            "toolName": "imageOnlyTool",
          }
        `);
      });
    });

    describe('Array content handling', () => {
      it('should convert simple array content to text', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_array',
          toolName: 'arrayTool',
          content: ['item1', 'item2', 'item3'],
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "text": "[
            "item1",
            "item2",
            "item3"
          ]",
                "type": "text",
              },
            ],
            "toolCallId": "call_array",
            "toolName": "arrayTool",
          }
        `);
      });

      it('should handle array with mixed content including image objects', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_mixed_array',
          toolName: 'mixedArrayTool',
          content: [
            { id: 1, name: 'First item' },
            {
              id: 2,
              type: 'image',
              data: 'iVBORw0KGgoAAAANSUhEUgAAA', // PNG data
              caption: 'An embedded image',
            },
            { id: 3, name: 'Third item' },
          ],
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA",
                },
                "type": "image_url",
              },
              {
                "text": "[
            {
              "id": 1,
              "name": "First item"
            },
            {
              "id": 2,
              "caption": "An embedded image"
            },
            {
              "id": 3,
              "name": "Third item"
            }
          ]",
                "type": "text",
              },
            ],
            "toolCallId": "call_mixed_array",
            "toolName": "mixedArrayTool",
          }
        `);
      });

      it('should handle array with multiple image objects', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_multi_image',
          toolName: 'multiImageTool',
          content: [
            {
              id: 1,
              type: 'image',
              data: 'iVBORw0KGgoAAAANSUhEUgAAA', // PNG
              caption: 'First image',
            },
            {
              id: 2,
              type: 'image',
              data: '/9j/4AAQSkZJRgABAQAAAQABAAD', // JPEG
              caption: 'Second image',
            },
          ],
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        // Multiple images should be added as separate content parts
        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA",
                },
                "type": "image_url",
              },
              {
                "image_url": {
                  "url": "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
                },
                "type": "image_url",
              },
              {
                "text": "[
            {
              "id": 1,
              "caption": "First image"
            },
            {
              "id": 2,
              "caption": "Second image"
            }
          ]",
                "type": "text",
              },
            ],
            "toolCallId": "call_multi_image",
            "toolName": "multiImageTool",
          }
        `);
      });
    });

    describe('Error handling', () => {
      it('should handle errors during content processing', () => {
        // Create object that throws when JSON.stringify is called
        const cyclicObj: Record<string, unknown> = {};
        cyclicObj.self = cyclicObj; // Create circular reference

        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_error',
          toolName: 'errorTool',
          content: cyclicObj,
        };

        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result.toolCallId).toBe('call_error');
        expect(result.toolName).toBe('errorTool');
        expect(result.content.length).toBe(1);
        expect(result.content[0].type).toBe('text');
        // Error message may vary, so just check prefix
        expect((result.content[0] as { text: string }).text).toContain('Error processing content:');
      });

      it('should handle error with invalid image data', () => {
        const toolCallResult: ToolCallResult = {
          toolCallId: 'call_bad_image',
          toolName: 'badImageTool',
          content: {
            type: 'image',
            data: 'not-valid-base64!@#',
            mimeType: 'image/png',
          },
        };

        // Should fall back to text representation
        const result = convertToMultimodalToolCallResult(toolCallResult);

        expect(result).toMatchInlineSnapshot(`
          {
            "content": [
              {
                "image_url": {
                  "url": "data:image/png;base64,not-valid-base64!@#",
                },
                "type": "image_url",
              },
            ],
            "toolCallId": "call_bad_image",
            "toolName": "badImageTool",
          }
        `);
      });
    });
  });
});
