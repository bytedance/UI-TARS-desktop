import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Switch,
} from '@nextui-org/react';
import { Form } from '@nextui-org/form';
import { useState } from 'react';
import { StdioMCPServer, SSEMCPServer } from '@agent-infra/mcp-shared/client';

type StdioServerData = StdioMCPServer & { type: 'stdio' };
type SSEServerData = SSEMCPServer & { type: 'sse' };

export type ServerData = StdioServerData | SSEServerData;

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serverData: ServerData) => void;
  initialData?: ServerData;
  mode?: 'create' | 'edit';
}

export function AddServerModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: AddServerModalProps) {
  const [serverType, setServerType] = useState<'stdio' | 'sse'>(
    initialData?.type || 'stdio',
  );
  const [status, setStatus] = useState<ServerData['status']>(
    initialData?.status || 'activate',
  );

  const onSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const baseData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      type: serverType,
    };

    const serverData: ServerData =
      serverType === 'stdio'
        ? {
            ...baseData,
            type: 'stdio',
            command: formData.get('command') as string,
            args: formData.get('args')?.toString().split('\n'),
            env: formData.get('env')
              ? formData
                  .get('env')
                  ?.toString()
                  .split('\n')
                  .reduce(
                    (acc, line) => {
                      const [key, value] = line.split('=');
                      acc[key] = value;
                      return acc;
                    },
                    {} as Record<string, string>,
                  )
              : {},
          }
        : {
            ...baseData,
            type: 'sse',
            url: formData.get('url') as string,
          };

    onSubmit(serverData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <Form onSubmit={onSubmitHandler}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {mode === 'create' ? 'Add MCP Server' : 'Edit MCP Server'}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    name="name"
                    label="Name"
                    placeholder="Input server name"
                    isRequired
                    defaultValue={initialData?.name}
                  />

                  <Textarea
                    name="description"
                    label="Description"
                    placeholder="Input server description"
                    defaultValue={initialData?.description}
                  />

                  <Select
                    name="type"
                    label="Type"
                    placeholder="Select server type"
                    selectedKeys={[serverType]}
                    onChange={(e) =>
                      setServerType(e.target.value as 'stdio' | 'sse')
                    }
                    isRequired
                  >
                    <SelectItem key="stdio" value="stdio">
                      STDIO (Standard Input/Output)
                    </SelectItem>
                    <SelectItem key="sse" value="sse">
                      SSE (Server-Sent Events)
                    </SelectItem>
                  </Select>

                  {serverType === 'stdio' ? (
                    <>
                      <Input
                        name="command"
                        label="Command"
                        placeholder="uvx or npx"
                        isRequired
                        defaultValue={(initialData as StdioServerData)?.command}
                      />

                      <Textarea
                        name="args"
                        label="Arguments"
                        placeholder="Each line is a parameter"
                        defaultValue={(
                          initialData as StdioServerData
                        )?.args?.join('\n')}
                      />

                      <Textarea
                        name="env"
                        label="Environment Variables"
                        placeholder="KEY1=value1&#10;KEY2=value2"
                        defaultValue={Object.entries(
                          (initialData as StdioServerData)?.env || {},
                        )
                          .map(([key, value]) => `${key}=${value}`)
                          .join('\n')}
                      />
                    </>
                  ) : (
                    <Input
                      name="url"
                      label="URL"
                      placeholder="http://localhost:3000/sse"
                      isRequired
                      defaultValue={(initialData as SSEServerData)?.url}
                    />
                  )}

                  <div className="flex flex-col gap-1">
                    <p className="text-small">Enable</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        name="status"
                        isSelected={status === 'activate'}
                        onValueChange={(checked) =>
                          setStatus(checked ? 'activate' : 'disabled')
                        }
                        aria-label="Server status"
                      />
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit">
                  {mode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Form>
    </Modal>
  );
}
