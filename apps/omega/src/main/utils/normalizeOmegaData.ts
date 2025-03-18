import { readFile } from 'fs-extra';

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

export async function normalizeMessages(
  messages: Array<OmegaAgentMessage | any>,
) {
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
