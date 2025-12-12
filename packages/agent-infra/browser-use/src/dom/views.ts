/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/dom/views.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { ViewportInfo, CoordinateSet } from './history/views';

/**
 * Abstract base class for DOM nodes
 * Provides common properties and functionality for all DOM node types
 */
export abstract class DOMBaseNode {
  /**
   * Whether the node is visible in the viewport
   */
  isVisible: boolean;
  /**
   * Parent element node reference (null for root nodes)
   */
  parent?: DOMElementNode | null;

  constructor(isVisible: boolean, parent?: DOMElementNode | null) {
    this.isVisible = isVisible;
    // Use None as default and set parent later to avoid circular reference issues
    this.parent = parent;
  }
}

/**
 * Represents a text node in the DOM tree
 * Contains text content and visibility information
 */
export class DOMTextNode extends DOMBaseNode {
  type = 'TEXT_NODE' as const;
  /**
   * The text content of the node
   */
  text: string;

  constructor(
    text: string,
    isVisible: boolean,
    parent?: DOMElementNode | null,
  ) {
    super(isVisible, parent);
    this.text = text;
  }

  /**
   * Checks if any parent element has a highlight index assigned
   * Used to determine if text content is already part of a highlighted element
   * @returns true if a parent has a highlight index
   */
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
          const text = node.getEnhancedText();
          let output = `[${node.highlightIndex}]`;

          // If includeAttributes is specified, use these attributes directly without smart detection
          if (includeAttributes.length > 0) {
            const attributesStr = includeAttributes
              .map((key) =>
                node.attributes[key] ? `${key}="${node.attributes[key]}"` : '',
              )
              .filter(Boolean)
              .join(' ');

            if (attributesStr) {
              output += ` [${attributesStr}]`;
            }
          } else {
            // Use enhanced format smart context information
            const contextInfo = node.getEnhancedContextInfo();
            if (contextInfo.length > 0) {
              output += ` [${contextInfo.join(' ')}]`;
            }
          }

          // Add tag and text content
          output += ` <${node.tagName}>${text}</${node.tagName}>`;

          formattedText.push(output);
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

  getEnhancedText(): string {
    // Priority: aria-label > title > alt > inner text > placeholder > value > href description > fallback
    const ariaLabel = this.attributes['aria-label'];
    const title = this.attributes['title'];
    const alt = this.attributes['alt'];
    const placeholder = this.attributes['placeholder'];
    const value = this.attributes['value'];
    const href = this.attributes['href'];

    if (ariaLabel) return ariaLabel;
    if (title) return title;
    if (alt) return alt;

    const innerText = this.getAllTextTillNextClickableElement().trim();
    if (innerText) return innerText;

    if (placeholder) return `[placeholder: ${placeholder}]`;
    if (value && this.tagName !== 'input') return `[value: ${value}]`;
    if (href) return `[link]`;

    return `[${this.tagName || 'element'}]`;
  }

  getEnhancedContextInfo(): string[] {
    const context: string[] = [];

    const role = this.attributes['role'];
    const type = this.attributes['type'];
    const href = this.attributes['href'];
    const ariaLabel = this.attributes['aria-label'];
    const ariaChecked = this.attributes['aria-checked'];
    const ariaSelected = this.attributes['aria-selected'];
    const placeholder = this.attributes['placeholder'];
    const disabled = this.attributes['disabled'];
    const required = this.attributes['required'];
    const readonly = this.attributes['readonly'];
    const checked = this.attributes['checked'];
    const value = this.attributes['value'];
    const min = this.attributes['min'];
    const max = this.attributes['max'];
    const pattern = this.attributes['pattern'];
    const name = this.attributes['name'];
    const id = this.attributes['id'];
    const title = this.attributes['title'];
    const alt = this.attributes['alt'];
    const target = this.attributes['target'];
    const download = this.attributes['download'];
    const multiple = this.attributes['multiple'];
    const accept = this.attributes['accept'];
    const autocomplete = this.attributes['autocomplete'];

    // Determine element category and main type
    if (this.tagName === 'a') {
      // Link type determination
      if (href) {
        if (href.startsWith('mailto:')) {
          context.push('email');
        } else if (href.startsWith('tel:')) {
          context.push('phone');
        } else if (href.startsWith('#')) {
          context.push('anchor');
        } else if (href.startsWith('javascript:')) {
          context.push('javascript');
        } else if (download !== undefined) {
          context.push('download');
        } else {
          context.push('link');
        }
        // Always show href
        context.push(`href="${href}"`);
      } else {
        context.push('link');
      }

      // Target attribute
      if (target === '_blank') {
        context.push('new-window');
      } else if (target) {
        context.push(`target="${target}"`);
      }
    } else if (this.tagName === 'button') {
      // Button type
      if (type === 'submit') {
        context.push('submit');
      } else if (type === 'reset') {
        context.push('reset');
      } else {
        context.push('button');
      }

      // Button state
      if (disabled !== undefined) {
        context.push('disabled');
      }
    } else if (this.tagName === 'input') {
      // Input type
      const inputType = type || 'text';
      context.push(inputType);

      // Special input states
      if (inputType === 'checkbox' || inputType === 'radio') {
        if (checked !== undefined) {
          context.push('checked');
        }
        if (name) {
          context.push(`name="${name}"`);
        }
      } else if (inputType === 'file') {
        if (multiple !== undefined) {
          context.push('multiple');
        }
        if (accept) {
          context.push(`accept="${accept}"`);
        }
      } else if (inputType === 'number' || inputType === 'range') {
        if (min) {
          context.push(`min="${min}"`);
        }
        if (max) {
          context.push(`max="${max}"`);
        }
      }

      // Common input states
      if (required !== undefined) {
        context.push('required');
      }
      if (readonly !== undefined) {
        context.push('readonly');
      }
      if (placeholder) {
        context.push(`placeholder="${placeholder}"`);
      }
      if (pattern) {
        context.push('has-pattern');
      }
      if (autocomplete && autocomplete !== 'off') {
        context.push(`autocomplete="${autocomplete}"`);
      }
    } else if (this.tagName === 'select') {
      // Dropdown selection
      context.push('select');
      if (required !== undefined) {
        context.push('required');
      }
      if (multiple !== undefined) {
        context.push('multiple');
      }
      if (disabled !== undefined) {
        context.push('disabled');
      }
    } else if (this.tagName === 'textarea') {
      // Multi-line text
      context.push('textarea');
      if (placeholder) {
        context.push(`placeholder="${placeholder}"`);
      }
      if (required !== undefined) {
        context.push('required');
      }
      if (readonly !== undefined) {
        context.push('readonly');
      }
      if (disabled !== undefined) {
        context.push('disabled');
      }
    } else if (this.tagName === 'img') {
      // Image
      context.push('image');
      if (alt) {
        context.push(`alt="${alt}"`);
      }
    } else if (this.tagName === 'video') {
      // Video
      context.push('video');
      if (this.attributes['controls'] !== undefined) {
        context.push('has-controls');
      }
    } else if (this.tagName === 'audio') {
      // Audio
      context.push('audio');
      if (this.attributes['controls'] !== undefined) {
        context.push('has-controls');
      }
    } else if (this.tagName === 'iframe') {
      // iframe
      context.push('iframe');
      if (this.attributes['src']) {
        context.push(`src="${this.attributes['src']}"`);
      }
    } else if (this.tagName === 'form') {
      // Form
      context.push('form');
      if (this.attributes['method']) {
        context.push(`method="${this.attributes['method']}"`);
      }
    } else if (this.tagName === 'label') {
      // Label
      context.push('label');
      if (this.attributes['for']) {
        context.push(`for="${this.attributes['for']}"`);
      }
    } else if (role) {
      // Custom role elements
      context.push(`role=${role}`);

      // ARIA states
      if (role === 'button' || role === 'link') {
        if (disabled !== undefined) {
          context.push('disabled');
        }
      } else if (role === 'checkbox' || role === 'radio') {
        if (ariaChecked === 'true') {
          context.push('checked');
        } else if (ariaChecked === 'false') {
          context.push('unchecked');
        }
      } else if (role === 'option') {
        if (ariaSelected === 'true') {
          context.push('selected');
        }
      } else if (role === 'tab') {
        if (ariaSelected === 'true') {
          context.push('active-tab');
        }
      }
    }

    // Add ID attribute (if exists)
    if (id) {
      context.push(`id="${id}"`);
    }

    // Add title information
    if (title) {
      context.push(`title="${title}"`);
    }

    // ARIA label information (important semantic information)
    if (ariaLabel && !context.includes(`placeholder="${ariaLabel}"`)) {
      context.push(`aria-label="${ariaLabel}"`);
    }

    // Value information (for certain element types)
    if (
      value &&
      this.tagName !== 'input' &&
      this.tagName !== 'button' &&
      value.length < 50
    ) {
      context.push(`value="${value}"`);
    }

    return context;
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
