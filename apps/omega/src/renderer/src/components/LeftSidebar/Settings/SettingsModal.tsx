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
import { useAppSettings } from './useAppSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings, saveSettings } = useAppSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader>Settings</ModalHeader>
            <ModalBody>
              <Tabs aria-label="Settings tabs">
                <Tab key="models" title="AI Models">
                  <ModelSettingsTab
                    settings={settings.model}
                    setSettings={(modelSettings) =>
                      setSettings({ ...settings, model: modelSettings })
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
              </Tabs>
            </ModalBody>
            <ModalFooter>
              {saveSuccess ? (
                <div className="text-success">Settings saved successfully!</div>
              ) : (
                <>
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
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
