import React from 'react';
import { motion } from 'framer-motion';
import { Spinner, Button } from '@nextui-org/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TableOfContents } from './TableOfContents';
import { FiGithub } from 'react-icons/fi';

interface MarkdownContentProps {
  markdown: string;
  isLoading: boolean;
  contentKey?: string;
  publishDate?: string;
  author?: string;
  className?: string;
  githubEditUrl?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  markdown,
  isLoading,
  contentKey,
  publishDate,
  author,
  className = 'prose-lg prose-invert max-w-none',
  githubEditUrl,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Main content column with width constraint */}
      <div className="md:flex-1 md:max-w-[75%]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="white" />
          </div>
        ) : (
          <motion.div
            key={contentKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="markdown-body bg-transparent text-white mb-16"
          >
            <MarkdownRenderer
              content={markdown}
              publishDate={publishDate}
              author={author}
              className={className}
            />

            {/* Edit on GitHub link */}
            {githubEditUrl && (
              <div className="mt-16 pt-6 border-t border-white/10">
                <Button
                  as="a"
                  href={githubEditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="flat"
                  color="default"
                  className="bg-white/10 text-gray-300 hover:text-white"
                  startContent={<FiGithub />}
                  size="sm"
                >
                  Edit this page on GitHub
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Table of contents column - only show when not loading */}
      {!isLoading && (
        <div className="md:w-[23%] md:min-w-[200px] flex-shrink-0">
          <TableOfContents markdown={markdown} />
        </div>
      )}
    </div>
  );
};
