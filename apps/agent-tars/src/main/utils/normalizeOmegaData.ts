/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from 'fs-extra';
import path from 'path';
import { logger } from './logger';

interface ImageItem {
  type: 'image';
  path: string;
  content?: string;
}

interface ToolUsedEvent {
  type: 'tool-used';
  content: {
    result: Array<ImageItem | any>;
  };
}

interface OmegaAgentMessage {
  type: 'omega-agent';
  content: {
    events: Array<ToolUsedEvent | any>;
  };
}

function isImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext);
}

export async function normalizeMessages(messages: Array<OmegaAgentMessage>) {
  const normalizedMessages = await Promise.all(
    messages.map(async (item) => {
      if (item.type !== 'omega-agent') {
        return item;
      }

      const normalizedEvents = await Promise.all(
        item.content.events.map(async (event) => {
          if (
            event.type === 'tool-used' &&
            event.content.tool.includes('browser')
          ) {
            const result = event.content.result || [];
            const normalizedResults = await Promise.all(
              result.map(async (resultItem) => {
                if (resultItem.type === 'image') {
                  // base64 image
                  if (
                    !resultItem.path &&
                    resultItem.data &&
                    resultItem.mimeType
                  ) {
                    return {
                      ...resultItem,
                      content: `data:${resultItem.mimeType};base64,${resultItem.data}`,
                    };
                  }

                  // binary png image
                  const base64Content = await readFile(
                    resultItem.path,
                    'base64',
                  );
                  delete resultItem.path;
                  return {
                    ...resultItem,
                    content: `data:image/png;base64,${base64Content}`,
                  };
                }
                return resultItem;
              }),
            );
            return {
              ...event,
              content: {
                ...event.content,
                result: normalizedResults,
              },
            };
          }
          return event;
        }),
      );

      return {
        ...item,
        content: {
          ...item.content,
          events: normalizedEvents,
        },
      };
    }),
  );

  return normalizedMessages;
}

export async function parseArtifacts(messages: Array<OmegaAgentMessage>) {
  let artifacts: {
    [key: string]: {
      content: string;
    };
  } = {};

  await Promise.all(
    messages.map(async (item) => {
      if (item.type !== 'omega-agent') {
        return;
      }

      await Promise.all(
        item.content.events.map(async (event) => {
          if (event.type === 'chat-text') {
            const { attachments = [] } = event.content;
            await Promise.all(
              attachments.map(async (attachment) => {
                const artifactPath = attachment.path;
                const fileName = path.basename(artifactPath);

                try {
                  if (isImage(artifactPath)) {
                    const base64Content = await readFile(
                      artifactPath,
                      'base64',
                    );
                    artifacts[fileName] = {
                      content: `data:image/${path.extname(artifactPath).slice(1)};base64,${base64Content}`,
                    };
                  } else {
                    const content = await readFile(artifactPath, 'utf-8');
                    artifacts[fileName] = { content };
                  }
                } catch (error) {
                  logger.error(`Failed to read file: ${artifactPath}`, error);
                }
              }),
            );
          }
        }),
      );
    }),
  );

  return artifacts;
}
