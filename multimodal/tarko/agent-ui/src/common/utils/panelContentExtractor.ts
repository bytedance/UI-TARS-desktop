import { StandardPanelContent } from '@/standalone/workspace/types/panelContent';

/**
 * Generic data extractor for panel content
 * Handles the common pattern of extracting data from arguments or source
 */
export function extractPanelData<T>(
  panelContent: StandardPanelContent,
  extractor: (data: any) => T | null,
): T | null {
  try {
    // Try arguments first
    if (panelContent.arguments) {
      const result = extractor(panelContent.arguments);
      if (result !== null) {
        return result;
      }
    }

    // Try to extract from source
    if (panelContent.source) {
      const result = extractor(panelContent.source);
      if (result !== null) {
        return result;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract panel data:', error);
    return null;
  }
}

/**
 * Extract string field with fallback to title
 */
export function extractStringField(
  data: any,
  fieldName: string,
  fallbackTitle?: string,
): string | undefined {
  const value = data[fieldName];
  if (value && typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'undefined' && value !== null) {
    return String(value);
  }
  return fallbackTitle;
}

/**
 * Extract content with fallback logic for text/data fields
 */
export function extractContentField(data: any): string | null {
  const { text, data: dataField, content } = data;

  if (text && typeof text === 'string') {
    return text;
  }

  if (content && typeof content === 'string') {
    return content;
  }

  if (typeof dataField === 'string') {
    return dataField;
  }

  if (dataField && typeof dataField === 'object') {
    try {
      return JSON.stringify(dataField, null, 2);
    } catch {
      return String(dataField);
    }
  }

  return null;
}

/**
 * Common extractors for frequently used patterns
 */
export const commonExtractors = {
  /**
   * Extract basic content with title and name
   */
  basicContent: (panelContent: StandardPanelContent) =>
    extractPanelData(panelContent, (data) => {
      const content = extractContentField(data);
      if (!content) return null;

      return {
        title: extractStringField(data, 'title', panelContent.title),
        content,
        name: extractStringField(data, 'name'),
      };
    }),

  /**
   * Extract URL-based content
   */
  urlContent: (panelContent: StandardPanelContent) =>
    extractPanelData(panelContent, (data) => {
      const { url } = data;

      return {
        url: extractStringField(data, 'url'),
        title: extractStringField(data, 'title', panelContent.title),
        content: extractContentField(data),
        contentType: extractStringField(data, 'contentType'),
        screenshot: panelContent._extra?.currentScreenshot,
      };
    }) ||
    (panelContent.source && typeof panelContent.source === 'string'
      ? panelContent.source.startsWith('http')
        ? {
            url: panelContent.source,
            title: panelContent.title,
            screenshot: panelContent._extra?.currentScreenshot,
          }
        : {
            content: panelContent.source,
            screenshot: panelContent._extra?.currentScreenshot,
          }
      : null),

  /**
   * Extract image data with support for multiple formats
   */
  imageData: (panelContent: StandardPanelContent) => {
    // Try standard extraction first
    const standardResult = extractPanelData(panelContent, (data) => {
      const { imageData, mimeType = 'image/png', name } = data;
      if (!imageData || typeof imageData !== 'string') return null;

      return {
        src: `data:${mimeType};base64,${imageData}`,
        mimeType,
        name: extractStringField(data, 'name', panelContent.title || 'Image'),
      };
    });

    if (standardResult) return standardResult;

    // Handle ChatCompletionContentPart[] array format
    if (Array.isArray(panelContent.source)) {
      const imageContent = panelContent.source.find(
        (item): item is { type: 'image_url'; image_url: { url: string } } =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'image_url' &&
          'image_url' in item &&
          typeof item.image_url === 'object' &&
          item.image_url !== null &&
          'url' in item.image_url &&
          typeof item.image_url.url === 'string',
      );

      if (imageContent?.image_url) {
        return {
          src: imageContent.image_url.url,
          mimeType: 'image/jpeg',
          name: panelContent.title || 'Environment Screenshot',
        };
      }
    }

    // Handle direct URL or data URL in source
    if (typeof panelContent.source === 'string') {
      if (panelContent.source.startsWith('data:')) {
        const mimeTypeMatch = panelContent.source.match(/^data:([^;]+);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

        return {
          src: panelContent.source,
          mimeType,
          name: panelContent.title || 'Image',
        };
      } else if (panelContent.source.startsWith('http')) {
        return {
          src: panelContent.source,
          mimeType: 'image/png',
          name: panelContent.title || 'Image',
        };
      }
    }

    return null;
  },

  /**
   * Extract command execution data
   */
  commandData: (panelContent: StandardPanelContent) => {
    const command = panelContent.arguments?.command;

    // Handle Agent TARS "run_command" tool format
    if (Array.isArray(panelContent.source)) {
      const stdout = panelContent.source?.find((s: any) => s.name === 'STDOUT')?.text;
      const stderr = panelContent.source?.find((s: any) => s.name === 'STDERR')?.text;
      return { command, stdout, stderr, exitCode: !stderr ? 0 : 1 };
    }

    // Handle Omni-TARS "execute_bash" tool format
    if (panelContent.title === 'execute_bash' && typeof panelContent.source === 'object') {
      const source = panelContent.source as any;
      return {
        command: panelContent.arguments?.command,
        stdout: source.output,
        exitCode: source.returncode,
      };
    }

    // Final fallback for string source
    if (typeof panelContent.source === 'string') {
      const isError = panelContent.source.includes('Error: ');
      return isError
        ? { command, stderr: panelContent.source, exitCode: 1 }
        : { command, stdout: panelContent.source, exitCode: 0 };
    }

    return null;
  },

  /**
   * Extract file content and path with advanced format support
   */
  fileData: (panelContent: StandardPanelContent) => {
    const getPath = () => {
      if (panelContent.arguments?.path && typeof panelContent.arguments.path === 'string') {
        return panelContent.arguments.path;
      }
      return panelContent.title || 'Unknown file';
    };

    // Try arguments first (for file operations)
    const args = panelContent.arguments;
    if (args) {
      const content = args.content || args.file_text;

      if (content && typeof content === 'string') {
        return {
          content,
          path: getPath(),
        };
      }
    }

    // Handle source as object
    if (typeof panelContent.source === 'object' && panelContent.source !== null) {
      // Handle source array format (text parts)
      if (Array.isArray(panelContent.source)) {
        const textContent = panelContent.source
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');

        if (textContent) {
          return {
            content: textContent,
            path: getPath(),
          };
        }
      } else {
        // Handle special "view" command format
        const source = panelContent.source as any;
        if (args?.command === 'view' && typeof source.output === 'string') {
          return {
            content: source.output,
            path: getPath(),
          };
        }

        // Fallback to JSON stringify
        return {
          content: JSON.stringify(panelContent.source, null, 2),
          path: getPath(),
        };
      }
    }

    // Handle source as string content
    if (typeof panelContent.source === 'string') {
      return {
        content: panelContent.source,
        path: getPath(),
      };
    }

    return null;
  },
};
