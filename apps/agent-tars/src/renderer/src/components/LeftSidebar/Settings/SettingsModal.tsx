import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  Tab,
  Spinner,
} from '@nextui-org/react';
import { useState } from 'react';
import { ModelSettingsTab } from './ModelSettingsTab';
import { FileSystemSettingsTab } from './FileSystemSettingsTab';
import { SearchSettingsTab } from './SearchSettingsTab';
import { useAppSettings } from './useAppSettings';
import { MCPServersSettingsTab } from './MCPServersSettingsTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings, saveSettings, validateSettings } =
    useAppSettings();
  const [isSaving, setIsSaving] = useState(false);
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

  console.log('settings', settings);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader>Settings</ModalHeader>
            <ModalBody>
              <Tabs
                aria-label="Settings tabs"
                selectedKey={selectedTab}
                onSelectionChange={(key) => setSelectedTab(key as string)}
              >
                <Tab key="models" title="AI Models">
                  <ModelSettingsTab
                    settings={settings.model}
                    setSettings={(modelSettings) =>
                      setSettings({ ...settings, model: modelSettings })
                    }
                  />
                </Tab>
                <Tab key="search" title="Search">
                  <SearchSettingsTab
                    settings={settings.search}
                    setSettings={(searchSettings) =>
                      setSettings({ ...settings, search: searchSettings })
                    }
                  />
                </Tab>
                <Tab key="filesystem" title="File System">
                  <FileSystemSettingsTab
                    settings={settings.fileSystem}
                    setSettings={(fsSettings) =>
                      setSettings({ ...settings, fileSystem: fsSettings })
                    }
                  />
                </Tab>
                <Tab key="mcp-servers" title="MCP Servers">
                  <MCPServersSettingsTab
                    settings={settings.mcp}
                    setSettings={(mcpSettings) =>
                      setSettings({ ...settings, mcp: mcpSettings })
                    }
                  />
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onModalClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSave}
                disabled={isSaving}
                startContent={isSaving ? <Spinner size="sm" /> : null}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
