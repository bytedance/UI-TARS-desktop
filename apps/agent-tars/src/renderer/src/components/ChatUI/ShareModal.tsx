import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tab,
  Tabs,
  Link,
  Tooltip,
} from '@nextui-org/react';
import { useState, useEffect } from 'react';
import { ipcClient } from '@renderer/api';

const API_URL_STORAGE_KEY = 'report-api-url';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
}

export function ShareModal({ isOpen, onClose, messages }: ShareModalProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');

  // Load saved API URL from localStorage when component mounts
  useEffect(() => {
    const savedApiUrl = localStorage.getItem(API_URL_STORAGE_KEY);
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
    }
  }, []);

  const handleShare = async (type: 'local' | 'remote') => {
    try {
      setIsLoading(true);
      setError('');

      const url = await ipcClient.saveReportHtml({
        messages,
        reportApiUrl: type === 'remote' ? apiUrl : undefined,
      });

      // Save API URL if remote upload is successful
      if (type === 'remote' && url) {
        localStorage.setItem(API_URL_STORAGE_KEY, apiUrl);
      }

      setResultUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Share Conversation</ModalHeader>
        <ModalBody>
          <Tabs>
            <Tab key="local" title="Save Locally">
              <div className="py-2">
                <Button
                  color="primary"
                  onClick={() => handleShare('local')}
                  isLoading={isLoading}
                >
                  Save to Local
                </Button>
              </div>
            </Tab>
            <Tab key="remote" title="Upload to Server">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Input
                    label={
                      <div className="flex items-center gap-1">
                        API URL
                        <Tooltip
                          content={
                            <div className="max-w-xs space-y-2 p-2">
                              <p>API Requirements:</p>
                              <ul className="list-disc pl-4 text-sm">
                                <li>Accept POST requests</li>
                                <li>Request body as multipart/form-data</li>
                                <li>File field name: 'file'</li>
                                <li>
                                  Response format:{' '}
                                  {'{ "url": "file access URL" }'}
                                </li>
                              </ul>
                            </div>
                          }
                        >
                          <span className="cursor-help text-default-400 text-sm">
                            (?)
                          </span>
                        </Tooltip>
                      </div>
                    }
                    placeholder="Enter upload API URL"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    description={
                      localStorage.getItem(API_URL_STORAGE_KEY)
                        ? 'Last used API URL auto-filled'
                        : 'API URL will be saved after successful upload'
                    }
                  />
                </div>
                <Button
                  color="primary"
                  onClick={() => handleShare('remote')}
                  isLoading={isLoading}
                  isDisabled={!apiUrl}
                >
                  Upload
                </Button>
              </div>
            </Tab>
          </Tabs>

          {error && <div className="text-danger text-sm mt-2">{error}</div>}

          {resultUrl && (
            <div className="mt-4 p-4 bg-default-100 rounded-lg">
              <div className="font-medium mb-2">Share Link:</div>
              <Link
                href={resultUrl}
                target="_blank"
                className="text-primary break-all"
              >
                {resultUrl}
              </Link>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
