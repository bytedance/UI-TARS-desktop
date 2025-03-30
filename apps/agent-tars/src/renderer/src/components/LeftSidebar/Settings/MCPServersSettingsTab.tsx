// import { useState } from 'react';
// import { Button, Chip, Input } from '@nextui-org/react';
// import { IoMdAdd } from 'react-icons/io';
import { MCPServer } from '@agent-infra/mcp-client';
import { MCPServersSettings } from '@agent-infra/shared';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
} from '@nextui-org/react';
import { useEffect, useState } from 'react';

interface FileSystemSettingsTabProps {
  settings: MCPServersSettings;
  setSettings: (settings: MCPServersSettings) => void;
}

export function MCPServersSettingsTab({
  settings,
  setSettings,
}: FileSystemSettingsTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonConfig, setJsonConfig] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    try {
      const mcpServersObj: Record<string, MCPServer> = {};

      const standardFormat = {
        mcpServers: mcpServersObj,
      };

      const formattedJson = JSON.stringify(standardFormat, null, 2);
      setJsonConfig(formattedJson);
      setJsonError('');
    } catch (error) {
      console.error('Failed to format JSON:', error);
      setJsonError('Failed to format JSON');
    }
  }, [settings]);

  const onOk = async () => {
    try {
      if (!jsonConfig.trim()) {
        setJsonError('');
        handleClose();
        return;
      }

      const parsedConfig = JSON.parse(jsonConfig);

      if (
        !parsedConfig.mcpServers ||
        typeof parsedConfig.mcpServers !== 'object'
      ) {
        throw new Error('Invalid MCP servers format');
      }

      const serversArray: MCPServer[] = [];

      for (const [id, serverConfig] of Object.entries(
        parsedConfig.mcpServers,
      )) {
        const server: MCPServer = {
          id,
          isActive: false,
          ...(serverConfig as any),
        };

        if (!server.name) {
          server.name = id;
        }

        serversArray.push(server);
      }

      // dispatch(setMCPServers(serversArray));

      // window.message.success(t('settings.mcp.jsonSaveSuccess'));
      setJsonError('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to save JSON config:', error);
      setJsonError(error.message || 'Invalid JSON format');
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-sm text-default-500 mb-2">
        Configure MCP servers that the application can access.
      </div>
      <Button onPress={handleOpen}>Edit JSON</Button>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold">Edit JSON Configuration</h3>
          </ModalHeader>
          <ModalBody>
            {jsonError && <div className="text-danger mb-2">{jsonError}</div>}
            <Textarea
              value={jsonConfig}
              onValueChange={setJsonConfig}
              className="font-mono"
              maxRows={20}
              onFocus={() => setJsonError('')}
            />
            <p className="text-default-500 text-sm">
              Edit your JSON configuration here
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={handleClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={onOk}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
