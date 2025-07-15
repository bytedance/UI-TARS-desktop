import React, { useState, useEffect } from 'react';
import { Button } from '@nextui-org/react';
import { FaBug } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { availableDocs, getLocalDoc, getGithubEditPath } from '../../docs';
import { DocsSidebar } from '../components/DocsSidebar';
import { TwitterCardMeta } from '../components/TwitterCardMeta';
import { MarkdownContent } from '../components/Markdown';
import { ETopRoute, getDocDetailRoute } from '../../constants/routes';

const Docs: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { docId } = useParams();
  const navigate = useNavigate();

  // Find first available document for default routing
  const firstAvailableDoc = availableDocs[0].id;
  // If no docId is provided, use the first available document
  const currentDocId = docId || firstAvailableDoc;

  // If we're at the root doc URL and have no docId, redirect to the first doc
  useEffect(() => {
    if (!docId && availableDocs.length > 0) {
      navigate(getDocDetailRoute(firstAvailableDoc), { replace: true });
    }
  }, [docId, navigate, firstAvailableDoc]);

  const currentDoc = availableDocs.find(doc => doc.id === currentDocId)!;

  // Get GitHub edit URL
  const githubEditUrl = currentDocId ? getGithubEditPath(currentDocId) : undefined;

  useEffect(() => {
    const fetchMarkdown = async () => {
      setIsLoading(true);

      try {
        // Get local document content directly using ID
        const localContent = getLocalDoc(currentDocId);

        if (localContent) {
          setMarkdown(localContent);
        } else {
          setMarkdown('# Document Not Found\nThe requested document could not be loaded.');
        }
      } catch (error) {
        console.error('Failed to fetch markdown:', error);
        setMarkdown('# Error\nFailed to load documentation.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, [currentDocId]);

  return (
    <>
      <TwitterCardMeta
        title={`${currentDoc.title} | Agent TARS Docs`}
        description="Agent TARS documentation and guides"
        url={`${window.location.origin}${ETopRoute.DOC}/${currentDocId}`}
      />

      <div className="min-h-screen pt-16 bg-black text-white">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <DocsSidebar />

          {/* Main content area with a two-column layout */}
          <div className="flex-1 overflow-y-auto p-6 mt-10">
            <div className="md:mx-20">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  {/* {currentDoc.title} */}
                </h1>

                <Button
                  as="a"
                  href="https://github.com/bytedance/UI-TARS-desktop/issues"
                  target="_blank"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 transition-opacity"
                  startContent={<FaBug className="text-sm" />}
                  size="sm"
                >
                  Report Issue
                </Button>
              </div>

              <MarkdownContent
                markdown={markdown}
                isLoading={isLoading}
                contentKey={currentDocId}
                publishDate={currentDoc.publishDate}
                githubEditUrl={githubEditUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Docs;
