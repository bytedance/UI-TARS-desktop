import { atom } from 'jotai';

/**
 * Contextual item interface for workspace file/directory references
 */
export interface ContextualItem {
  id: string;
  type: 'file' | 'directory' | 'workspace';
  name: string;
  path: string;
  relativePath: string;
}

/**
 * Contextual selector state interface
 */
export interface ContextualSelectorState {
  input: string;
  contextualItems: ContextualItem[];
  showSelector: boolean;
  selectorQuery: string;
  cursorPosition: number;
}

/**
 * Default contextual selector state
 */
const DEFAULT_CONTEXTUAL_SELECTOR_STATE: ContextualSelectorState = {
  input: '',
  contextualItems: [],
  showSelector: false,
  selectorQuery: '',
  cursorPosition: 0,
};

/**
 * Atom for contextual selector state
 */
export const contextualSelectorAtom = atom<ContextualSelectorState>(
  DEFAULT_CONTEXTUAL_SELECTOR_STATE,
);

/**
 * Derived atom for input value only
 */
export const contextualInputAtom = atom(
  (get) => get(contextualSelectorAtom).input,
  (get, set, newInput: string) => {
    const currentState = get(contextualSelectorAtom);
    const parsedItems = parseContextualReferencesFromText(newInput);

    set(contextualSelectorAtom, {
      ...currentState,
      input: newInput,
      contextualItems: parsedItems,
    });
  },
);

/**
 * Derived atom for contextual items only
 */
export const contextualItemsAtom = atom(
  (get) => get(contextualSelectorAtom).contextualItems,
  (get, set, newItems: ContextualItem[]) => {
    const currentState = get(contextualSelectorAtom);

    // When items are updated, also update the input text to maintain consistency
    const newInputText = reconstructInputWithItems(currentState.input, newItems);

    set(contextualSelectorAtom, {
      ...currentState,
      input: newInputText,
      contextualItems: newItems,
    });
  },
);

/**
 * Action atom for removing a contextual item
 */
export const removeContextualItemAction = atom(null, (get, set, itemId: string) => {
  const currentState = get(contextualSelectorAtom);
  const itemToRemove = currentState.contextualItems.find((item) => item.id === itemId);

  if (!itemToRemove) return;

  // Generate the tag text that should be removed from input
  let tagText: string;
  if (itemToRemove.type === 'workspace') {
    tagText = '@workspace';
  } else {
    tagText = `${itemToRemove.type === 'directory' ? '@dir:' : '@file:'}${itemToRemove.relativePath}`;
  }

  // Remove the tag from input text using a more robust approach
  let newInput = currentState.input;

  // Create regex pattern to match the tag with optional trailing space
  const escapedTagText = tagText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagPattern = new RegExp(escapedTagText + '\\s?', 'g');

  newInput = newInput.replace(tagPattern, '');

  // Clean up any double spaces that might result from removal
  newInput = newInput.replace(/\s+/g, ' ').trim();

  // Update both input and items
  const updatedItems = currentState.contextualItems.filter((item) => item.id !== itemId);

  set(contextualSelectorAtom, {
    ...currentState,
    input: newInput,
    contextualItems: updatedItems,
  });
});

/**
 * Action atom for adding a contextual item
 */
export const addContextualItemAction = atom(null, (get, set, item: ContextualItem) => {
  const currentState = get(contextualSelectorAtom);

  // Replace the @query part from input and add tag reference
  const textBeforeCursor = currentState.input.slice(0, currentState.cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');

  if (lastAtIndex !== -1) {
    const textBefore = currentState.input.slice(0, lastAtIndex);
    const textAfter = currentState.input.slice(currentState.cursorPosition);

    let tagText: string;
    if (item.type === 'workspace') {
      tagText = '@workspace';
    } else {
      tagText = `${item.type === 'directory' ? '@dir:' : '@file:'}${item.relativePath}`;
    }

    const newInput = textBefore + tagText + ' ' + textAfter;
    const newCursorPos = lastAtIndex + tagText.length + 1;

    // Parse items from the new input to ensure consistency
    const updatedItems = parseContextualReferencesFromText(newInput);

    set(contextualSelectorAtom, {
      ...currentState,
      input: newInput,
      contextualItems: updatedItems,
      cursorPosition: newCursorPos,
      showSelector: false,
      selectorQuery: '',
    });
  }
});

/**
 * Action atom for updating selector visibility and query
 */
export const updateSelectorStateAction = atom(
  null,
  (
    get,
    set,
    updates: Partial<
      Pick<ContextualSelectorState, 'showSelector' | 'selectorQuery' | 'cursorPosition'>
    >,
  ) => {
    const currentState = get(contextualSelectorAtom);

    set(contextualSelectorAtom, {
      ...currentState,
      ...updates,
    });
  },
);

/**
 * Action atom for clearing all contextual state
 */
export const clearContextualStateAction = atom(null, (get, set) => {
  set(contextualSelectorAtom, DEFAULT_CONTEXTUAL_SELECTOR_STATE);
});

/**
 * Parse contextual references from text
 */
function parseContextualReferencesFromText(text: string): ContextualItem[] {
  const contextualReferencePattern = /@(file|dir):([^\s]+)/g;
  const workspacePattern = /@workspace/g;

  const contextualRefs = Array.from(text.matchAll(contextualReferencePattern)).map(
    (match, index) => {
      const [fullMatch, type, relativePath] = match;
      const name = relativePath.split(/[/\\]/).pop() || relativePath;

      return {
        id: `${type}-${relativePath}-${index}`,
        type: type as 'file' | 'directory',
        name,
        path: relativePath,
        relativePath,
      };
    },
  );

  const workspaceRefs = Array.from(text.matchAll(workspacePattern)).map((match, index) => ({
    id: `workspace-${index}`,
    type: 'workspace' as const,
    name: 'workspace',
    path: '/',
    relativePath: '.',
  }));

  return [...contextualRefs, ...workspaceRefs];
}

/**
 * Reconstruct input text with given items (used for consistency checks)
 */
function reconstructInputWithItems(originalInput: string, items: ContextualItem[]): string {
  // This is a simplified version - in practice, you might want more sophisticated logic
  // For now, we trust that the input text is the source of truth for the structure
  return originalInput;
}
