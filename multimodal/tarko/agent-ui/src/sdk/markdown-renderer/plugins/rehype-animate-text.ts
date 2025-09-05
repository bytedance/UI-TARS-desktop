import type { Element, Root, ElementContent } from 'hast';
import { visit } from 'unist-util-visit';
import type { BuildVisitor } from 'unist-util-visit';

export function rehypeSplitWordsIntoSpans() {
  return (tree: Root) => {
    visit(tree, 'element', ((node: Element) => {
      if (
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'strong', 'em'].includes(node.tagName) &&
        node.children
      ) {
        const newChildren: Array<ElementContent> = [];
        let wordIndex = 0;

        node.children.forEach((child) => {
          if (child.type === 'text') {
            const text = child.value;
            // Split by words but keep larger chunks to reduce span count
            const chunks = text.split(/(\s{2,}|\n)/).filter(Boolean);

            chunks.forEach((chunk: string) => {
              if (chunk.trim() && chunk.length > 1) {
                // Create spans for meaningful text chunks
                newChildren.push({
                  type: 'element',
                  tagName: 'span',
                  properties: {
                    className: 'animate-fade-in',
                    'data-word-index': wordIndex++,
                  },
                  children: [{ type: 'text', value: chunk }],
                });
              } else {
                // Preserve whitespace and single chars as regular text
                newChildren.push({
                  type: 'text',
                  value: chunk,
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
