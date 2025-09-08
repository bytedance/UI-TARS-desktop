import React from 'react';
import { Components } from 'react-markdown';
import {
  H1,
  H2,
  H3,
  H4,
  SmartLink,
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableDataCell,
  Paragraph,
  UnorderedList,
  OrderedList,
  ListItem,
  CodeBlock,
  Blockquote,
  HorizontalRule,
  InteractiveImage,
} from '../components';

interface UseMarkdownComponentsProps {
  onImageClick: (src: string) => void;
}

/**
 * Custom hook that provides markdown components configuration
 */
export const useMarkdownComponents = ({ onImageClick }: UseMarkdownComponentsProps): Components => {
  return React.useMemo(
    () => ({
      // Headings
      h1: ({ children }) => <H1>{children}</H1>,
      h2: ({ children }) => <H2>{children}</H2>,
      h3: ({ children }) => <H3>{children}</H3>,
      h4: ({ children }) => <H4>{children}</H4>,

      // Text elements
      p: ({ children }) => <Paragraph>{children}</Paragraph>,
      ul: ({ children }) => <UnorderedList>{children}</UnorderedList>,
      ol: ({ children }) => <OrderedList>{children}</OrderedList>,
      li: ({ children }) => <ListItem>{children}</ListItem>,
      blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
      hr: () => <HorizontalRule />,

      // Links
      a: ({ href, children }) => <SmartLink href={href}>{children}</SmartLink>,

      // Code
      code: ({ className, children, ...props }) => (
        <CodeBlock className={className} {...props}>
          {children}
        </CodeBlock>
      ),

      // Tables
      table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
      thead: ({ children }) => <TableHead>{children}</TableHead>,
      tbody: ({ children }) => <TableBody>{children}</TableBody>,
      tr: ({ children }) => <TableRow>{children}</TableRow>,
      th: ({ children }) => <TableHeaderCell>{children}</TableHeaderCell>,
      td: ({ children }) => <TableDataCell>{children}</TableDataCell>,

      // Images
      img: ({ src, alt }) => <InteractiveImage src={src} alt={alt} onClick={onImageClick} />,

      // Override strikethrough (del) to render as normal text
      del: ({ children }) => <span>{children}</span>,
    }),
    [onImageClick],
  );
};
