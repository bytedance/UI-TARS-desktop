import { useState } from 'react';
import { SearchSettings, SearchProvider } from '@agent-infra/shared';
import { getSearchProviderLogo } from './searchUtils';
import toast from 'react-hot-toast';
import { ipcClient } from '@renderer/api';
import {
  FiAlertCircle,
  FiExternalLink,
  FiCopy,
  FiMaximize,
  FiSearch,
  FiZap,
} from 'react-icons/fi';

import {
  Button,
  Input,
  Select,
  SelectItem,
  Divider,
  Switch,
  Card,
  Link,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@nextui-org/react';
import { PasswordInput } from '@renderer/components/PasswordInput';

interface SearchSettingsTabProps {
  settings: SearchSettings;
  setSettings: (settings: SearchSettings) => void;
}

interface SearchResultPage {
  title: string;
  url: string;
  content: string;
}

interface TestSearchServiceProps {
  settings: SearchSettings;
}

function TestSearchService({ settings }: TestSearchServiceProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultPage[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResultPage | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleTestSearch = async () => {
    try {
      setIsLoading(true);
      setShowResults(false);

      const { success, message, searchResults } =
        await ipcClient.testSearchService(settings);

      if (success && searchResults?.length > 0) {
        toast.success('Search service is ready');
        setErrorMessage('');
        setSearchResults(searchResults);
        setShowResults(true);
      } else {
        setErrorMessage(message);
        setSearchResults([]);
      }
    } catch (error) {
      setErrorMessage(String(error));
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openPreviewModal = (result: SearchResultPage) => {
    setSelectedResult(result);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="w-full mt-6 flex justify-start">
        <Button
          color="primary"
          variant="shadow"
          size="md"
          isLoading={isLoading}
          onClick={handleTestSearch}
          className="mt-5 bg-gradient-to-r from-primary to-primary-600 hover:opacity-90 transition-opacity"
          startContent={
            !isLoading && <FiZap className="text-white" size={16} />
          }
        >
          Test Search Service
        </Button>
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/10 border border-danger-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertCircle className="text-danger" size={16} />
            <p className="text-danger font-medium">Search Service Error:</p>
          </div>
          <p className="text-danger-600 dark:text-danger-400 text-sm font-mono my-2">
            {errorMessage}
          </p>
          <p className="text-xs text-danger-500">
            Please check your search provider settings and try again.
          </p>
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-default-600 mb-2 font-medium flex items-center gap-2 text-left">
            <FiSearch size={14} />
            Search Results Preview
          </p>
          <div className="grid grid-cols-1 gap-3 pr-1 custom-scrollbar">
            {searchResults.map((result, index) => (
              <Card
                key={index}
                className="shadow-sm hover:shadow-md transition-all duration-200 border border-default-100 hover:border-primary-200 dark:hover:border-primary-800 w-full"
                isPressable
                onPress={() => openPreviewModal(result)}
              >
                <div className="p-4 w-full">
                  <div className="flex justify-between items-start w-full">
                    <h3 className="text-sm font-semibold text-default-800 line-clamp-1 mb-1 text-left flex-grow">
                      {result.title || 'No title'}
                    </h3>

                    <div className="flex gap-1 shrink-0 ml-2">
                      <Tooltip content="View full content">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreviewModal(result);
                          }}
                        >
                          <FiMaximize
                            size={14}
                            className="text-default-500 hover:text-primary"
                          />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Copy content">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(result.content);
                          }}
                        >
                          <FiCopy
                            size={14}
                            className="text-default-500 hover:text-primary"
                          />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>

                  {result.url && (
                    <Link
                      href={result.url}
                      target="_blank"
                      className="text-xs text-primary flex items-center gap-1 hover:underline w-fit mb-2 text-left"
                      isExternal
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="truncate max-w-[250px]">
                        {result.url}
                      </span>
                      <FiExternalLink size={12} />
                    </Link>
                  )}

                  <div className="relative overflow-hidden">
                    <p className="text-xs text-default-600 line-clamp-3 mb-0 text-left pr-12">
                      {result.content || 'No content available'}
                    </p>
                    {result.content && result.content.length > 300 && (
                      <div className="absolute bottom-0 right-0 bg-gradient-to-l from-background to-transparent px-2 text-xs text-primary">
                        more...
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Full Content Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-1">
                <h3 className="text-lg font-medium text-left">
                  {selectedResult?.title || 'Search Result'}
                </h3>
                {selectedResult?.url && (
                  <Link
                    href={selectedResult.url}
                    target="_blank"
                    className="text-xs text-primary flex items-center gap-1 hover:underline w-fit text-left"
                    isExternal
                  >
                    <span className="truncate max-w-[500px]">
                      {selectedResult.url}
                    </span>
                    <FiExternalLink size={12} />
                  </Link>
                )}
              </ModalHeader>
              <ModalBody>
                <div className="whitespace-pre-line text-sm text-default-700 p-2 bg-default-50 dark:bg-default-100/10 rounded-lg text-left">
                  {selectedResult?.content || 'No content available'}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    if (selectedResult?.content) {
                      copyToClipboard(selectedResult.content);
                    }
                  }}
                  startContent={<FiCopy size={16} />}
                >
                  Copy Content
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export function SearchSettingsTab({
  settings,
  setSettings,
}: SearchSettingsTabProps) {
  return (
    <div className="space-y-4 py-2">
      <Select
        label="Search Provider"
        disallowEmptySelection
        selectedKeys={[settings.provider]}
        onChange={(e) => {
          setSettings({
            ...settings,
            provider: e.target.value as SearchProvider,
          });
        }}
        startContent={getSearchProviderLogo(settings.provider)}
      >
        <SelectItem
          key={SearchProvider.BrowserSearch}
          startContent={getSearchProviderLogo(SearchProvider.BrowserSearch)}
        >
          Local Browser Search
        </SelectItem>
        <SelectItem
          key={SearchProvider.Tavily}
          startContent={getSearchProviderLogo(SearchProvider.Tavily)}
        >
          Tavily Search
        </SelectItem>

        <SelectItem
          key={SearchProvider.DuckduckgoSearch}
          startContent={getSearchProviderLogo(SearchProvider.DuckduckgoSearch)}
        >
          Duckduckgo Search
        </SelectItem>
        <SelectItem
          key={SearchProvider.BingSearch}
          startContent={getSearchProviderLogo(SearchProvider.BingSearch)}
        >
          Bing Search
        </SelectItem>
        <SelectItem
          key={SearchProvider.SearXNG}
          startContent={getSearchProviderLogo(SearchProvider.SearXNG)}
        >
          SearXNG Search
        </SelectItem>
      </Select>

      {[SearchProvider.Tavily, SearchProvider.BingSearch].includes(
        settings.provider,
      ) && (
        <PasswordInput
          label="API Key"
          placeholder="Enter your API key"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          isRequired
          description={
            settings.provider === SearchProvider.BingSearch
              ? 'Your Bing Search API key'
              : 'Your Tavily API key'
          }
        />
      )}

      <Divider className="my-2" />
      {(settings.provider === SearchProvider.BingSearch ||
        settings.provider === SearchProvider.BrowserSearch) && (
        <p className="text-sm text-default-500">Advanced Settings (Optional)</p>
      )}

      {settings.provider === SearchProvider.BrowserSearch && (
        <>
          <Select
            label="Default Browser Search Engine"
            placeholder="Select your default browser search engine"
            disallowEmptySelection
            selectedKeys={[settings.providerConfig?.engine]}
            onChange={(e) =>
              setSettings({
                ...settings,
                providerConfig: {
                  ...(settings.providerConfig || {}),
                  engine: e.target
                    .value as SearchSettings['providerConfig']['engine'],
                },
              })
            }
          >
            {/* <SelectItem key="bing">Bing</SelectItem> */}
            <SelectItem key="google">Google</SelectItem>
            <SelectItem key="baidu">Baidu</SelectItem>
            <SelectItem key="sogou">Sogou</SelectItem>
          </Select>

          <Switch
            isSelected={settings.providerConfig?.needVisitedUrls ?? false}
            onValueChange={(selected) =>
              setSettings({
                ...settings,
                providerConfig: {
                  ...(settings.providerConfig || {}),
                  needVisitedUrls: selected,
                },
              })
            }
            className="mt-2"
          >
            <div className="flex flex-col">
              <span>Include visited page content</span>
              <span className="text-xs text-default-500">
                When enabled, the search will include content from pages visited
                by the browser
              </span>
            </div>
          </Switch>
        </>
      )}

      {settings.provider === SearchProvider.BingSearch && (
        <Input
          label="Custom Endpoint"
          placeholder="https://api.bing.microsoft.com/"
          value={settings.baseUrl || ''}
          onChange={(e) =>
            setSettings({ ...settings, baseUrl: e.target.value })
          }
          description="Override the default Bing Search API endpoint"
        />
      )}

      {settings.provider === SearchProvider.SearXNG && (
        <Input
          label="Custom Endpoint"
          placeholder="https://127.0.0.1:8081/"
          value={settings.baseUrl || ''}
          onChange={(e) =>
            setSettings({ ...settings, baseUrl: e.target.value })
          }
          description="Override the default SearXNG API endpoint"
        />
      )}

      <TestSearchService settings={settings} />
    </div>
  );
}
