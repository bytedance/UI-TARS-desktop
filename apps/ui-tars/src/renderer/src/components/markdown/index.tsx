import ReactMarkdown from 'react-markdown';
import { memo } from 'react';

export const Markdown = memo(({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="font-bold text-2xl mb-2 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-bold text-xl mb-2 mt-4 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-bold text-lg mb-2 mt-4 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-bold text-base mb-2 mt-4 first:mt-0">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3">{children}</ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        p: ({ children }) => <p className="mb-2">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-300 pl-4 py-2 mb-3 bg-blue-50 italic text-gray-700">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-0 border-t border-gray-300 my-6" />,
        a: ({ children, href, title }) => (
          <a
            href={href}
            title={title}
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        del: ({ children }) => <del className="line-through">{children}</del>,
        code: ({ children, className }) => {
          if (!className) {
            return (
              <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3 overflow-x-auto whitespace-pre-wrap">
            <code className="text-sm font-mono text-gray-800">{children}</code>
          </pre>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
});
