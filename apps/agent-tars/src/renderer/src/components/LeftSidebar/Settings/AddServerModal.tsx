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
  Accordion,
  AccordionItem,
} from '@nextui-org/react';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import {
  StdioMCPServer,
  SSEMCPServer,
  MCP_SERVER_TYPE,
} from '@agent-infra/mcp-shared/client';
import { MCPServerName, MCPServerSetting } from '@agent-infra/shared';
import { toast } from 'react-hot-toast';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { DeleteIcon } from 'lucide-react';

type StdioServerData = StdioMCPServer & { id?: string; type: 'stdio' };
type SSEServerData = SSEMCPServer & { id?: string; type: 'sse' };

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mode: 'create' | 'edit', serverData: MCPServerSetting) => void;
  initialData?: MCPServerSetting | null;
  mcpServerNames: string[];
}

interface FormValues {
  name: string;
  description: string;
  type: Exclude<MCP_SERVER_TYPE, 'builtin'>;
  status: 'activate' | 'disabled';
  command?: string;
  args?: string;
  env?: string;
  url?: string;
  headers: { key: string; value: string }[];
}

export function AddServerModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mcpServerNames,
}: AddServerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const mode = initialData?.id ? 'edit' : 'create';

  const defaultValues: FormValues = {
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: (initialData?.type || 'stdio') as FormValues['type'],
    status: (initialData?.status || 'activate') as 'activate' | 'disabled',
    command: (initialData as StdioServerData)?.command || '',
    args: (initialData as StdioServerData)?.args?.join('\n') || '',
    env:
      Object.entries((initialData as StdioServerData)?.env || {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') || '',
    url: (initialData as SSEServerData)?.url || '',
    headers:
      initialData?.type === 'sse' || initialData?.type === 'streamable-http'
        ? Object.entries(initialData?.headers || {}).map(([key, value]) => ({
            key,
            value,
          }))
        : [],
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const serverType = useWatch({
    control,
    name: 'type',
  });

  const onSubmitHandler = async (data: FormValues) => {
    try {
      setIsLoading(true);

      const baseData = {
        id: initialData?.id || uuidv4(),
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
      };

      let serverData: MCPServerSetting;
      if (data.type === 'stdio') {
        serverData = {
          ...baseData,
          type: 'stdio',
          command: data.command as string,
          args: data.args?.split(/[\n\s]+/).filter(Boolean),
          env: data.env
            ? data.env.split('\n').reduce(
                (acc, line) => {
                  const [key, value] = line.split('=');
                  acc[key] = value;
                  return acc;
                },
                {} as Record<string, string>,
              )
            : {},
        };
      } else if (data.type === 'sse' || data.type === 'streamable-http') {
        const headers: HeadersInit = {};
        data.headers.forEach((h) => {
          headers[h.key] = h.value;
        });
        serverData = {
          ...baseData,
          type: data.type,
          url: data.url as string,
          headers,
        };
      } else {
        toast.error('Invalid server type');
        return;
      }

      await onSubmit(mode, serverData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit(onSubmitHandler)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {mode === 'create' ? 'Add MCP Server' : 'Edit MCP Server'}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Controller
                    name="name"
                    control={control}
                    rules={
                      mode === 'create'
                        ? {
                            required: 'Server name is required',
                            validate: (value) =>
                              ![
                                ...mcpServerNames,
                                ...Object.values(MCPServerName),
                              ].includes(value as MCPServerName) ||
                              'Server name is already in use',
                          }
                        : undefined
                    }
                    render={({ field }) => (
                      <Input
                        {...field}
                        label="Name"
                        placeholder="Input server name"
                        disabled={mode === 'edit'}
                        isRequired
                        isInvalid={!!errors.name}
                        errorMessage={errors.name?.message}
                      />
                    )}
                  />

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        label="Description"
                        placeholder="Input server description"
                      />
                    )}
                  />

                  <Controller
                    name="type"
                    control={control}
                    rules={{ required: 'Server type is required' }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        label="Type"
                        disallowEmptySelection
                        placeholder="Select server type"
                        selectedKeys={[value]}
                        onChange={(e) =>
                          onChange(e.target.value as MCP_SERVER_TYPE)
                        }
                        isRequired
                        isInvalid={!!errors.type}
                        errorMessage={errors.type?.message}
                      >
                        <SelectItem key="stdio" value="stdio">
                          STDIO (Standard Input/Output)
                        </SelectItem>
                        <SelectItem key="sse" value="sse">
                          SSE (Server-Sent Events)
                        </SelectItem>
                        <SelectItem
                          key="streamable-http"
                          value="streamable-http"
                        >
                          HTTP Streamable
                        </SelectItem>
                      </Select>
                    )}
                  />

                  {serverType === 'stdio' ? (
                    <>
                      <Controller
                        name="command"
                        control={control}
                        rules={{ required: 'Command is required' }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label="Command"
                            placeholder="uvx or npx or other binary executable"
                            isRequired
                            isInvalid={!!errors.command}
                            errorMessage={errors.command?.message}
                          />
                        )}
                      />

                      <Controller
                        name="args"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            label="Arguments"
                            placeholder="Each line is a parameter"
                          />
                        )}
                      />

                      <Controller
                        name="env"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            label="Environment Variables"
                            placeholder="KEY1=value1&#10;KEY2=value2"
                            isInvalid={!!errors.env}
                            errorMessage={errors.env?.message}
                          />
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <Controller
                        name="url"
                        control={control}
                        rules={{
                          required: 'URL is required',
                          validate: (value) =>
                            !value ||
                            value.startsWith('http://') ||
                            value.startsWith('https://') ||
                            'Please enter a valid URL',
                        }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            label="URL"
                            placeholder={
                              serverType === 'sse'
                                ? 'https://example.com/sse'
                                : 'https://example.com/stream'
                            }
                            isRequired
                            isInvalid={!!errors.url}
                            errorMessage={errors.url?.message}
                          />
                        )}
                      />
                      <Accordion className="px-0">
                        <AccordionItem title="Headers" className="px-0">
                          <div className="flex flex-col gap-4">
                            <Controller
                              name="headers"
                              control={control}
                              render={({ field: { value, onChange } }) => (
                                <div className="flex flex-col gap-2">
                                  {value.map((header, index) => (
                                    <div
                                      key={index}
                                      className="flex gap-2 items-center"
                                    >
                                      <Input
                                        value={header.key}
                                        onChange={(e) => {
                                          const newHeaders = [...value];
                                          newHeaders[index].key =
                                            e.target.value;
                                          onChange(newHeaders);
                                        }}
                                        placeholder="Header Key"
                                        className="flex-1"
                                      />
                                      <Input
                                        value={header.value}
                                        onChange={(e) => {
                                          const newHeaders = [...value];
                                          newHeaders[index].value =
                                            e.target.value;
                                          onChange(newHeaders);
                                        }}
                                        placeholder="Header Value"
                                        className="flex-1"
                                      />
                                      <Button
                                        size="sm"
                                        color="danger"
                                        isIconOnly
                                        variant="light"
                                        onClick={() => {
                                          const newHeaders = value.filter(
                                            (_, i) => i !== index,
                                          );
                                          onChange(newHeaders);
                                        }}
                                      >
                                        <DeleteIcon className="w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    onClick={() => {
                                      onChange([
                                        ...value,
                                        { key: '', value: '' },
                                      ]);
                                    }}
                                  >
                                    Add Header
                                  </Button>
                                </div>
                              )}
                            />
                          </div>
                        </AccordionItem>
                      </Accordion>
                    </>
                  )}
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
      </form>
    </Modal>
  );
}
