import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Tooltip,
  Link,
} from '@nextui-org/react';
import { useState } from 'react';
import { ModelSettingsTab } from './ModelSettingsTab';
import { FileSystemSettingsTab } from './FileSystemSettingsTab';
import { SearchSettingsTab } from './SearchSettingsTab';
import { useAppSettings } from './useAppSettings';
import { MCPServersSettingsTab } from './MCPServersSettingsTab';
import {
  FiSettings,
  FiBox,
  FiSearch,
  FiFolder,
  FiServer,
  FiHelpCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import styles from './SettingsModal.module.scss';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    settings,
    setSettings,
    saveSettings,
    validateSettings,
    resetToDefaults,
  } = useAppSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('models');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate settings and get error information
      const validationResult = validateSettings();
      if (validationResult.hasError) {
        // Switch to the tab with the error
        if (validationResult.errorTab) {
          setSelectedTab(validationResult.errorTab);
        }
        return;
      }

      await saveSettings();
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setIsResetting(true);
    try {
      await resetToDefaults();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      scrollBehavior="outside"
      classNames={{
        base: `${styles.settingsModal} h-[100vh] max-h-[100vh]`,
        body: 'p-0 h-[calc(100vh-10rem)] overflow-hidden',
        backdrop: 'bg-black/50 backdrop-blur-sm',
      }}
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader className="border-b border-divider">
              <div className="flex justify-center items-center gap-2 w-full">
                <FiSettings className="text-primary" />
                <span className="text-xl">Settings</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex h-full">
                {/* Vertical tabs */}
                <div className="w-48 border-r border-divider bg-default-50 dark:bg-default-100/5 flex flex-col h-full">
                  <div
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      selectedTab === 'models'
                        ? 'bg-primary-100/50 dark:bg-primary-900/20 text-primary border-r-2 border-primary'
                        : 'hover:bg-default-100 dark:hover:bg-default-100/10'
                    }`}
                    onClick={() => setSelectedTab('models')}
                  >
                    <FiBox size={16} />
                    <span className="text-sm">AI Models</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      selectedTab === 'search'
                        ? 'bg-primary-100/50 dark:bg-primary-900/20 text-primary border-r-2 border-primary'
                        : 'hover:bg-default-100 dark:hover:bg-default-100/10'
                    }`}
                    onClick={() => setSelectedTab('search')}
                  >
                    <FiSearch size={16} />
                    <span className="text-sm">Search</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      selectedTab === 'filesystem'
                        ? 'bg-primary-100/50 dark:bg-primary-900/20 text-primary border-r-2 border-primary'
                        : 'hover:bg-default-100 dark:hover:bg-default-100/10'
                    }`}
                    onClick={() => setSelectedTab('filesystem')}
                  >
                    <FiFolder size={16} />
                    <span className="text-sm">File System</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      selectedTab === 'mcp-servers'
                        ? 'bg-primary-100/50 dark:bg-primary-900/20 text-primary border-r-2 border-primary'
                        : 'hover:bg-default-100 dark:hover:bg-default-100/10'
                    }`}
                    onClick={() => setSelectedTab('mcp-servers')}
                  >
                    <FiServer size={16} />
                    <span className="text-sm">MCP Servers</span>
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="max-w-3xl mx-auto">
                    {selectedTab === 'models' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold pt-2 text-left">
                          AI Models Settings
                        </h2>
                        <ModelSettingsTab
                          settings={settings.model}
                          setSettings={(modelSettings) =>
                            setSettings({ ...settings, model: modelSettings })
                          }
                        />
                      </div>
                    )}
                    {selectedTab === 'search' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold pt-2 text-left">
                          Search Settings
                        </h2>
                        <SearchSettingsTab
                          settings={settings.search}
                          setSettings={(searchSettings) =>
                            setSettings({ ...settings, search: searchSettings })
                          }
                        />
                      </div>
                    )}
                    {selectedTab === 'filesystem' && (
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold pt-2 text-left">
                          File System Settings
                        </h2>
                        <FileSystemSettingsTab
                          settings={settings.fileSystem}
                          setSettings={(fsSettings) =>
                            setSettings({ ...settings, fileSystem: fsSettings })
                          }
                        />
                      </div>
                    )}
                    {selectedTab === 'mcp-servers' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold pt-2 text-left">
                            MCP Servers Settings
                          </h2>
                          <Tooltip content="MCP Servers Help" placement="top">
                            <Link
                              href="https://agent-tars.com/doc/mcp"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FiHelpCircle
                                size={12}
                                className="text-gray-400 cursor-pointer outline-none"
                              />
                            </Link>
                          </Tooltip>
                        </div>
                        <MCPServersSettingsTab
                          settings={settings.mcp}
                          setSettings={(mcpSettings) =>
                            setSettings({ ...settings, mcp: mcpSettings })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-divider flex justify-between">
              <Button
                color="danger"
                variant="light"
                onPress={handleResetToDefaults}
                disabled={isResetting || isSaving}
                startContent={
                  isResetting ? <Spinner size="sm" /> : <FiRefreshCw />
                }
              >
                {isResetting ? 'Resetting...' : 'Reset to Default Settings'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="light"
                  onPress={onModalClose}
                  disabled={isSaving || isResetting}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSave}
                  disabled={isSaving || isResetting}
                  startContent={isSaving ? <Spinner size="sm" /> : null}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
