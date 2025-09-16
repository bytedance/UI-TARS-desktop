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
} from './index';

interface UseMarkdownComponentsProps {
  onImageClick: (src: string) => void;
  codeBlockStyle?: React.CSSProperties;
}

export const useMarkdownComponents = ({
  onImageClick,
  codeBlockStyle,
}: UseMarkdownComponentsProps): Components => ({
  h1: ({ children }) => <H1>{children}</H1>,
  h2: ({ children }) => <H2>{children}</H2>,
  h3: ({ children }) => <H3>{children}</H3>,
  h4: ({ children }) => <H4>{children}</H4>,
  p: ({ children }) => <Paragraph>{children}</Paragraph>,
  ul: ({ children }) => <UnorderedList>{children}</UnorderedList>,
  ol: ({ children }) => <OrderedList>{children}</OrderedList>,
  li: ({ children }) => <ListItem>{children}</ListItem>,
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  hr: () => <HorizontalRule />,
  a: ({ href, children }) => <SmartLink href={href}>{children}</SmartLink>,
  code: ({ className, children, ...props }) => (
    <CodeBlock className={className} style={codeBlockStyle} {...props}>
      {children}
    </CodeBlock>
  ),
  table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableHeaderCell>{children}</TableHeaderCell>,
  td: ({ children }) => <TableDataCell>{children}</TableDataCell>,
  img: ({ src, alt }) => <InteractiveImage src={src} alt={alt} onClick={onImageClick} />,
  del: ({ children }) => <span>{children}</span>,
});
