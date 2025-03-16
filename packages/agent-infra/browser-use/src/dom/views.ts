/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/dom/views.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { ViewportInfo, CoordinateSet } from './history/views';

export abstract class DOMBaseNode {
  isVisible: boolean;
  parent?: DOMElementNode | null;

  constructor(isVisible: boolean, parent?: DOMElementNode | null) {
    this.isVisible = isVisible;
    // Use None as default and set parent later to avoid circular reference issues
    this.parent = parent;
  }
}

export class DOMTextNode extends DOMBaseNode {
  type = 'TEXT_NODE' as const;
  text: string;

  constructor(
    text: string,
    isVisible: boolean,
    parent?: DOMElementNode | null,
  ) {
    super(isVisible, parent);
    this.text = text;
  }

  hasParentWithHighlightIndex(): boolean {
    let current = this.parent;
    while (current != null) {
      if (current.highlightIndex !== undefined) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}

export class DOMElementNode extends DOMBaseNode {
  /**
   * xpath: the xpath of the element from the last root node (shadow root or iframe OR document if no shadow root or iframe).
   * To properly reference the element we need to recursively switch the root node until we find the element (work you way up the tree with `.parent`)
   */
  tagName: string | null;
  xpath: string | null;
  cssSelector: string | null;
  attributes: Record<string, string>;
  children: DOMBaseNode[];
  isInteractive: boolean;
  isTopElement: boolean;
  shadowRoot: boolean;
  highlightIndex?: number;
  viewportCoordinates?: CoordinateSet;
  pageCoordinates?: CoordinateSet;
  viewportInfo?: ViewportInfo;

  constructor(params: {
    tagName: string | null;
    xpath: string | null;
    cssSelector: string | null;
    attributes: Record<string, string>;
    children: DOMBaseNode[];
    isVisible: boolean;
    isInteractive?: boolean;
    isTopElement?: boolean;
    shadowRoot?: boolean;
    highlightIndex?: number;
    viewportCoordinates?: CoordinateSet;
    pageCoordinates?: CoordinateSet;
    viewportInfo?: ViewportInfo;
    parent?: DOMElementNode | null;
  }) {
    super(params.isVisible, params.parent);
    this.tagName = params.tagName;
    this.xpath = params.xpath;
    this.cssSelector = params.cssSelector;
    this.attributes = params.attributes;
    this.children = params.children;
    this.isInteractive = params.isInteractive ?? false;
    this.isTopElement = params.isTopElement ?? false;
    this.shadowRoot = params.shadowRoot ?? false;
    this.highlightIndex = params.highlightIndex;
    this.viewportCoordinates = params.viewportCoordinates;
    this.pageCoordinates = params.pageCoordinates;
    this.viewportInfo = params.viewportInfo;
  }

  getAllTextTillNextClickableElement(maxDepth = -1): string {
    const textParts: string[] = [];

    const collectText = (node: DOMBaseNode, currentDepth: number): void => {
      if (maxDepth !== -1 && currentDepth > maxDepth) {
        return;
      }

      // Skip this branch if we hit a highlighted element (except for the current node)
      if (
        node instanceof DOMElementNode &&
        node !== this &&
        node.highlightIndex !== undefined
      ) {
        return;
      }

      if (node instanceof DOMTextNode) {
        textParts.push(node.text);
      } else if (node instanceof DOMElementNode) {
        for (const child of node.children) {
          collectText(child, currentDepth + 1);
        }
      }
    };

    collectText(this, 0);
    return textParts.join('\n').trim();
  }

  clickableElementsToString(includeAttributes: string[] = []): string {
    const formattedText: string[] = [];

    const processNode = (node: DOMBaseNode, depth: number): void => {
      if (node instanceof DOMElementNode) {
        // Add element with highlight_index
        if (node.highlightIndex !== undefined) {
          let attributesStr = '';
          if (includeAttributes.length) {
            attributesStr = ` ${includeAttributes
              .map((key) =>
                node.attributes[key] ? `${key}="${node.attributes[key]}"` : '',
              )
              .filter(Boolean)
              .join(' ')}`;
          }

          formattedText.push(
            `[${node.highlightIndex}]<${node.tagName}${attributesStr}>${node.getAllTextTillNextClickableElement()}</${node.tagName}>`,
          );
        }
        // Process children regardless
        for (const child of node.children) {
          processNode(child, depth + 1);
        }
      } else if (node instanceof DOMTextNode) {
        // Add text node only if it doesn't have a highlighted parent
        if (!node.hasParentWithHighlightIndex()) {
          formattedText.push(`[]${node.text}`);
        }
      }
    };

    processNode(this, 0);
    return formattedText.join('\n');
  }

  getFileUploadElement(checkSiblings = true): DOMElementNode | null {
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    if (this.tagName === 'input' && this.attributes['type'] === 'file') {
      return this;
    }

    for (const child of this.children) {
      if (child instanceof DOMElementNode) {
        const result = child.getFileUploadElement(false);
        if (result) return result;
      }
    }

    if (checkSiblings && this.parent) {
      for (const sibling of this.parent.children) {
        if (sibling !== this && sibling instanceof DOMElementNode) {
          const result = sibling.getFileUploadElement(false);
          if (result) return result;
        }
      }
    }

    return null;
  }

  getAdvancedCssSelector(): string {
    return this.enhancedCssSelectorForElement();
  }

  convertSimpleXPathToCssSelector(xpath: string): string {
    if (!xpath) {
      return '';
    }

    // Remove leading slash if present
    const cleanXpath = xpath.replace(/^\//, '');

    // Split into parts
    const parts = cleanXpath.split('/');
    const cssParts: string[] = [];

    for (const part of parts) {
      if (!part) {
        continue;
      }

      // Handle index notation [n]
      if (part.includes('[')) {
        const bracketIndex = part.indexOf('[');
        let basePart = part.substring(0, bracketIndex);
        const indexPart = part.substring(bracketIndex);

        // Handle multiple indices
        const indices = indexPart
          .split(']')
          .slice(0, -1)
          .map((i) => i.replace('[', ''));

        for (const idx of indices) {
          // Handle numeric indices
          if (/^\d+$/.test(idx)) {
            try {
              const index = Number.parseInt(idx, 10) - 1;
              basePart += `:nth-of-type(${index + 1})`;
            } catch (error) {
              // continue
            }
          }
          // Handle last() function
          else if (idx === 'last()') {
            basePart += ':last-of-type';
          }
          // Handle position() functions
          else if (idx.includes('position()')) {
            if (idx.includes('>1')) {
              basePart += ':nth-of-type(n+2)';
            }
          }
        }

        cssParts.push(basePart);
      } else {
        cssParts.push(part);
      }
    }

    const baseSelector = cssParts.join(' > ');
    return baseSelector;
  }

  enhancedCssSelectorForElement(includeDynamicAttributes = true): string {
    try {
      if (!this.xpath) {
        return '';
      }

      // Get base selector from XPath
      let cssSelector = this.convertSimpleXPathToCssSelector(this.xpath);

      // Handle class attributes
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      if (this.attributes['class'] && includeDynamicAttributes) {
        // Define a regex pattern for valid class names in CSS
        const validClassNamePattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

        // Iterate through the class attribute values
        // biome-ignore lint/complexity/useLiteralKeys: <explanation>s
        const classes = this.attributes['class'].split(/\s+/);
        for (const className of classes) {
          // Skip empty class names
          if (!className.trim()) {
            continue;
          }

          // Check if the class name is valid
          if (validClassNamePattern.test(className)) {
            // Append the valid class name to the CSS selector
            cssSelector += `.${className}`;
          }
        }
      }

      // Expanded set of safe attributes that are stable and useful for selection
      const SAFE_ATTRIBUTES = new Set([
        // Data attributes (if they're stable in your application)
        'id',
        // Standard HTML attributes
        'name',
        'type',
        'value',
        'placeholder',
        // Accessibility attributes
        'aria-label',
        'aria-labelledby',
        'aria-describedby',
        'role',
        // Common form attributes
        'for',
        'autocomplete',
        'required',
        'readonly',
        // Media attributes
        'alt',
        'title',
        'src',
        // Custom stable attributes
        'href',
        'target',
      ]);

      // Handle other attributes
      if (includeDynamicAttributes) {
        SAFE_ATTRIBUTES.add('data-id');
        SAFE_ATTRIBUTES.add('data-qa');
        SAFE_ATTRIBUTES.add('data-cy');
        SAFE_ATTRIBUTES.add('data-testid');
      }

      // Handle other attributes
      for (const [attribute, value] of Object.entries(this.attributes)) {
        if (attribute === 'class') {
          continue;
        }

        // Skip invalid attribute names
        if (!attribute.trim()) {
          continue;
        }

        if (!SAFE_ATTRIBUTES.has(attribute)) {
          continue;
        }

        // Escape special characters in attribute names
        const safeAttribute = attribute.replace(':', '\\:');

        // Handle different value cases
        if (value === '') {
          cssSelector += `[${safeAttribute}]`;
        } else if (/["'<>`\n\r\t]/.test(value)) {
          // Use contains for values with special characters
          // Regex-substitute any whitespace with a single space, then trim
          const collapsedValue = value.replace(/\s+/g, ' ').trim();
          // Escape embedded double-quotes
          const safeValue = collapsedValue.replace(/"/g, '\\"');
          cssSelector += `[${safeAttribute}*="${safeValue}"]`;
        } else {
          cssSelector += `[${safeAttribute}="${value}"]`;
        }
      }

      return cssSelector;
    } catch (error) {
      // Fallback to a more basic selector if something goes wrong
      const tagName = this.tagName || '*';
      return `${tagName}[highlight-index='${this.highlightIndex}']`;
    }
  }
}

export interface DOMState {
  elementTree: DOMElementNode;
  selectorMap: Map<number, DOMElementNode>;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function domElementNodeToDict(elementTree: DOMBaseNode): any {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  function nodeToDict(node: DOMBaseNode): any {
    if (node instanceof DOMTextNode) {
      return {
        type: 'text',
        text: node.text,
      };
    }
    if (node instanceof DOMElementNode) {
      return {
        type: 'element',
        tagName: node.tagName, // Note: using camelCase to match TypeScript conventions
        attributes: node.attributes,
        highlightIndex: node.highlightIndex,
        children: node.children.map((child) => nodeToDict(child)),
      };
    }

    return {};
  }

  return nodeToDict(elementTree);
}
