import type { Element, Root, ElementContent } from 'hast';
import { visit } from 'unist-util-visit';
import type { BuildVisitor } from 'unist-util-visit';

export function rehypeSplitWordsIntoSpans() {
  return (tree: Root) => {
    visit(tree, 'element', ((node: Element) => {
      if (
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'strong'].includes(node.tagName) &&
        node.children
      ) {
        const newChildren: Array<ElementContent> = [];
        let wordIndex = 0;

        node.children.forEach((child) => {
          if (child.type === 'text') {
            // Improved text segmentation to reduce excessive span creation
            const text = child.value;
            const words = text.split(/(\s+)/).filter(Boolean);

            words.forEach((word: string) => {
              if (word.trim()) {
                // Only create spans for actual words, not whitespace
                newChildren.push({
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    className: 'animate-fade-in',
                    'data-word-index': wordIndex++,
                  },
                  children: [{ type: 'text', value: word }],
                });
              } else {
                // Preserve whitespace as regular text nodes
                newChildren.push({
                  type: 'text',
                  value: word,
                });
              }
            });
          } else {
            newChildren.push(child);
          }
        });
        node.children = newChildren;
      }
    }) as BuildVisitor<Root, 'element'>);
  };
}
