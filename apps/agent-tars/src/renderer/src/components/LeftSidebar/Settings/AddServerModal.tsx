import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Accordion,
  AccordionItem,
} from '@nextui-org/react';
import { v4 as uuidv4 } from 'uuid';
import { Form } from '@nextui-org/form';
import { useState } from 'react';
import { StdioMCPServer, SSEMCPServer } from '@agent-infra/mcp-shared/client';
import { MCPServerName, MCPServerSetting } from '@agent-infra/shared';
import { toast } from 'react-hot-toast';

type StdioServerData = StdioMCPServer & { id?: string; type: 'stdio' };
type SSEServerData = SSEMCPServer & { id?: string; type: 'sse' };

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mode: 'create' | 'edit', serverData: MCPServerSetting) => void;
  initialData?: MCPServerSetting | null;
}

export function AddServerModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: AddServerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const mode = initialData?.id ? 'edit' : 'create';
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverType, setServerType] = useState<MCPServerSetting['type']>(
    initialData?.type || 'stdio',
  );
  const [status, setStatus] = useState<MCPServerSetting['status']>(
    initialData?.status || 'activate',
  );

  console.log('mode', mode, 'initialData', initialData);

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};

    const name = formData.get('name') as string;
    if (!name?.trim()) {
      newErrors.name = 'Server name is required';
    }

    if (Object.values(MCPServerName).includes(name as MCPServerName)) {
      newErrors.name = 'Server name is already in use';
    }

    if (serverType === 'stdio') {
      const command = formData.get('command') as string;
      if (!command?.trim()) {
        newErrors.command = 'Command is required';
      }
    } else {
      const url = formData.get('url') as string;
      if (!url?.trim()) {
        newErrors.url = 'URL is required';
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    console.log('newErrors', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('onSubmitHandler', e);
    e.preventDefault();

    try {
      setIsLoading(true);
      const formData = new FormData(e.currentTarget);

      if (!validateForm(formData)) {
        return;
      }

      const baseData = {
        id: initialData?.id || uuidv4(),
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: serverType,
        status: status,
      };

      let serverData: MCPServerSetting;
      if (serverType === 'stdio') {
        serverData = {
          ...baseData,
          type: 'stdio',
          command: formData.get('command') as string,
          // split args by \n or space
          args: formData
            .get('args')
            ?.toString()
            .split(/[\n\s]+/)
            .filter(Boolean),
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
        };
      } else if (serverType === 'sse') {
        const headers: HeadersInit = {};
        const token = formData.get('authorization');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        serverData = {
          ...baseData,
          type: 'sse',
          url: formData.get('url') as string,
          headers,
        };
      } else {
        toast.error('Invalid server type');
        return;
      }

      await onSubmit(mode, serverData);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <Form onSubmit={onSubmitHandler} validationBehavior="native">
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
                    disabled={mode === 'edit'}
                    isRequired
                    isInvalid={!!errors.name}
                    errorMessage={errors.name}
                    defaultValue={initialData?.name}
                    onChange={(_) => {
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }}
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
                    disallowEmptySelection
                    placeholder="Select server type"
                    selectedKeys={[serverType] as any}
                    onChange={(e) => {
                      setServerType(e.target.value as 'stdio' | 'sse');
                      setErrors((prev) => ({ ...prev, type: '' }));
                    }}
                    isRequired
                    isInvalid={!!errors.type}
                    errorMessage={errors.type}
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
                        placeholder="uvx or npx or other binary executable"
                        isRequired
                        isInvalid={!!errors.command}
                        errorMessage={errors.command}
                        onChange={(_) => {
                          setErrors((prev) => ({ ...prev, command: '' }));
                        }}
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
                        isInvalid={!!errors.env}
                        errorMessage={errors.env}
                        onChange={(_) => {
                          setErrors((prev) => ({ ...prev, env: '' }));
                        }}
                        defaultValue={Object.entries(
                          (initialData as StdioServerData)?.env || {},
                        )
                          .map(([key, value]) => `${key}=${value}`)
                          .join('\n')}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        name="url"
                        label="URL"
                        placeholder="https://example.com/sse"
                        isRequired
                        isInvalid={!!errors.url}
                        errorMessage={errors.url}
                        onChange={(_) => {
                          setErrors((prev) => ({ ...prev, url: '' }));
                        }}
                        defaultValue={(initialData as SSEServerData)?.url}
                      />
                      <Accordion className="px-0">
                        <AccordionItem title="Authorization" className="px-0">
                          <Input
                            name="authorization"
                            label="Bearer Token"
                            placeholder="Bearer Token"
                            defaultValue={
                              (initialData as SSEServerData)?.headers?.[
                                'Authorization'
                              ]
                            }
                            startContent={
                              <div className="pointer-events-none flex items-center">
                                <span className="text-default-400 text-small">
                                  Bearer
                                </span>
                              </div>
                            }
                          />
                        </AccordionItem>
                      </Accordion>
                    </>
                  )}

                  <div className="flex flex-col gap-1">
                    <p className="text-small">Enable</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        name="status"
                        size="sm"
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
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
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
