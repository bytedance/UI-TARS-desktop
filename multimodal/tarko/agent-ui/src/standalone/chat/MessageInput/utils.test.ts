import { describe, expect, it } from 'vitest';
import type { ChatCompletionContentPart } from '@tarko/agent-interface';
import type { UploadedFileInfo } from '../../../common/types';
import { composeMessageContent, isMessageEmpty } from './utils';

const uploadedCsv: UploadedFileInfo = {
  name: 'sample.csv',
  storedName: 'sample-abc123.csv',
  relativePath: 'uploads/sample-abc123.csv',
  size: 2048,
  mimeType: 'text/csv',
};

describe('message input utilities', () => {
  it('adds uploaded workspace paths to a text query', () => {
    expect(composeMessageContent('Analyze this data', [], [uploadedCsv])).toBe(
      'Analyze this data\n\n' +
        'Uploaded files (paths are relative to the current Agent workspace):\n' +
        '- uploads/sample-abc123.csv (2048 bytes, text/csv)',
    );
  });

  it('keeps file context in multimodal messages', () => {
    const image: ChatCompletionContentPart = {
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,abc' },
    };

    expect(composeMessageContent('', [image], [uploadedCsv])).toEqual([
      image,
      {
        type: 'text',
        text: [
          'Uploaded files (paths are relative to the current Agent workspace):',
          '- uploads/sample-abc123.csv (2048 bytes, text/csv)',
        ].join('\n'),
      },
    ]);
  });

  it('allows a persisted file to be sent without additional text', () => {
    expect(isMessageEmpty('', [], [uploadedCsv])).toBe(false);
    expect(isMessageEmpty('', [], [])).toBe(true);
  });
});
