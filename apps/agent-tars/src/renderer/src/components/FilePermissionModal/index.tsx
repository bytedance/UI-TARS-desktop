import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
} from '@nextui-org/react';
import { IoWarningOutline } from 'react-icons/io5';
import { ipcClient } from '@renderer/api';
import path from 'path-browserify';
import { resolvePermission } from '@renderer/services/filePermissionService';
import { useAppSettings } from '../LeftSidebar/Settings/useAppSettings';

interface FilePermissionModalProps {
  isOpen: boolean;
  filePath: string;
}

export function FilePermissionModal({
  isOpen,
  filePath,
}: FilePermissionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { setSettings } = useAppSettings();
  const directoryPath = path.dirname(filePath);

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      // Add this directory to allowed directories
      const settings = (await ipcClient.getFileSystemSettings()) || {
        availableDirectories: [],
      };

      if (!settings.availableDirectories.includes(directoryPath)) {
        settings.availableDirectories.push(directoryPath);
        await ipcClient.updateFileSystemSettings(settings);
        setSettings((appSettings) => {
          return {
            ...appSettings,
            fileSystem: {
              ...appSettings.fileSystem,
              availableDirectories: settings.availableDirectories,
            },
          };
        });
        await ipcClient.updateFileSystemConfig(settings);
      }

      // Resolve the permission promise with true (allowed)
      resolvePermission(true);
    } catch (error) {
      console.error('Failed to update file system permissions:', error);
      resolvePermission(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = () => {
    // Resolve the permission promise with false (denied)
    resolvePermission(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDeny}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex gap-2 items-center text-warning">
              <IoWarningOutline size={24} />
              Permission Required
            </ModalHeader>
            <ModalBody>
              <p>
                The application is trying to access a file outside of allowed
                directories:
              </p>
              <div className="bg-default-100 p-2 rounded-md text-sm font-mono mt-2 mb-3 break-all">
                {filePath}
              </div>
              <p>
                Do you want to allow access to this directory and add it to the
                list of allowed directories?
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleDeny}
                disabled={isProcessing}
              >
                Deny
              </Button>
              <Button
                color="primary"
                onPress={handleAllow}
                disabled={isProcessing}
                startContent={isProcessing ? <Spinner size="sm" /> : null}
              >
                {isProcessing ? 'Processing...' : 'Allow'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
