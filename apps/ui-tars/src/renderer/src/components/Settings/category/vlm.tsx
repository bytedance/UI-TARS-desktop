/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState, useImperativeHandle } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { VLMProviderV2 } from '@main/store/types';
import { useSetting } from '@renderer/hooks/useSetting';
import { Button } from '@renderer/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@renderer/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Input } from '@renderer/components/ui/input';
import { Switch } from '@renderer/components/ui/switch';
import { cn } from '@renderer/utils';

import { PresetImport, PresetBanner } from './preset';
import { api } from '@/renderer/src/api';

const formSchema = z.object({
  vlmProvider: z.nativeEnum(VLMProviderV2, {
    message: 'Please select a VLM Provider to enhance resolution',
  }),
  vlmBaseUrl: z.string().url(),
  vlmApiKey: z.string().min(1),
  vlmModelName: z.string().min(1),
  useResponsesApi: z.boolean().default(false),
});

export interface VLMSettingsRef {
  submit: () => Promise<z.infer<typeof formSchema>>;
}

interface VLMSettingsProps {
  ref?: React.RefObject<VLMSettingsRef | null>;
  autoSave?: boolean;
  className?: string;
}

export function VLMSettings({
  ref,
  autoSave = false,
  className,
}: VLMSettingsProps) {
  const { settings, updateSetting, updatePresetFromRemote } = useSetting();
  const [isPresetModalOpen, setPresetModalOpen] = useState(false);

  const isRemoteAutoUpdatedPreset =
    settings?.presetSource?.type === 'remote' &&
    settings.presetSource.autoUpdate;

  // console.log('initialValues', settings);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vlmProvider: undefined,
      vlmBaseUrl: '',
      vlmApiKey: '',
      vlmModelName: '',
      useResponsesApi: false,
    },
  });
  useEffect(() => {
    if (Object.keys(settings).length) {
      form.reset({
        vlmProvider: settings.vlmProvider,
        vlmBaseUrl: settings.vlmBaseUrl,
        vlmApiKey: settings.vlmApiKey,
        vlmModelName: settings.vlmModelName,
        useResponsesApi: settings.useResponsesApi,
      });
    }
  }, [settings, form]);

  const [newProvider, newBaseUrl, newApiKey, newModelName, newUseResponsesApi] =
    form.watch([
      'vlmProvider',
      'vlmBaseUrl',
      'vlmApiKey',
      'vlmModelName',
      'useResponsesApi',
    ]);

  useEffect(() => {
    if (!autoSave) {
      return;
    }
    if (isRemoteAutoUpdatedPreset) {
      return;
    }

    if (!Object.keys(settings).length) {
      return;
    }
    if (
      newProvider === undefined &&
      newBaseUrl === '' &&
      newApiKey === '' &&
      newModelName === ''
    ) {
      return;
    }

    const validAndSave = async () => {
      if (newProvider !== settings.vlmProvider) {
        updateSetting({ ...settings, vlmProvider: newProvider });
      }

      const isUrlValid = await form.trigger('vlmBaseUrl');
      if (isUrlValid && newBaseUrl !== settings.vlmBaseUrl) {
        updateSetting({ ...settings, vlmBaseUrl: newBaseUrl });
      }

      const isKeyValid = await form.trigger('vlmApiKey');
      if (isKeyValid && newApiKey !== settings.vlmApiKey) {
        updateSetting({ ...settings, vlmApiKey: newApiKey });
      }

      const isNameValid = await form.trigger('vlmModelName');
      if (isNameValid && newModelName !== settings.vlmModelName) {
        updateSetting({ ...settings, vlmModelName: newModelName });
      }

      const isResponsesApiValid = await form.trigger('useResponsesApi');
      if (
        isResponsesApiValid &&
        newUseResponsesApi !== settings.useResponsesApi
      ) {
        updateSetting({
          ...settings,
          useResponsesApi: newUseResponsesApi,
        });
      }
    };

    validAndSave();
  }, [
    autoSave,
    newProvider,
    newBaseUrl,
    newApiKey,
    newModelName,
    newUseResponsesApi,
    settings,
    updateSetting,
    form,
    isRemoteAutoUpdatedPreset,
  ]);

  const handlePresetModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setPresetModalOpen(true);
  };

  const handleUpdatePreset = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await updatePresetFromRemote();
      // toast.success('Preset updated successfully');
    } catch (error) {
      toast.error('Failed to update preset', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleResetPreset = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await window.electron.setting.resetPreset();
    toast.success('Reset to manual mode successfully', {
      duration: 1500,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('onSubmit', values);

    updateSetting({ ...settings, ...values });
    toast.success('Settings saved successfully');
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      return new Promise<z.infer<typeof formSchema>>((resolve, reject) => {
        form.handleSubmit(
          (values) => {
            onSubmit(values);
            resolve(values);
          },
          (errors) => {
            reject(errors);
          },
        )();
      });
    },
  }));

  return (
    <>
      <Form {...form}>
        <form className={cn('space-y-8', className)}>
          {!isRemoteAutoUpdatedPreset && (
            <Button type="button" variant="outline" onClick={handlePresetModal}>
              Import Preset Config
            </Button>
          )}
          {isRemoteAutoUpdatedPreset && (
            <PresetBanner
              url={settings.presetSource?.url}
              date={settings.presetSource?.lastUpdated}
              handleUpdatePreset={handleUpdatePreset}
              handleResetPreset={handleResetPreset}
            />
          )}
          {/* VLM Provider */}
          <FormField
            control={form.control}
            name="vlmProvider"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>VLM Provider</FormLabel>
                  <Select
                    disabled={isRemoteAutoUpdatedPreset}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select VLM provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VLMProviderV2).map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          {/* VLM Base URL */}
          <FormField
            control={form.control}
            name="vlmBaseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VLM Base URL</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter VLM Base URL"
                    {...field}
                    disabled={isRemoteAutoUpdatedPreset}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* VLM API Key */}
          <FormField
            control={form.control}
            name="vlmApiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VLM API Key</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter VLM API_Key"
                    {...field}
                    disabled={isRemoteAutoUpdatedPreset}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {/* VLM Model Name */}
          <FormField
            control={form.control}
            name="vlmModelName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VLM Model Name</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter VLM Model Name"
                    {...field}
                    disabled={isRemoteAutoUpdatedPreset}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {/* VLM Model Responses API */}
          <FormField
            control={form.control}
            name="useResponsesApi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Use Responses API</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={async (checked) => {
                      field.onChange(checked);

                      if (checked) {
                        try {
                          const modelConfig = {
                            baseUrl: newBaseUrl,
                            apiKey: newApiKey,
                            modelName: newModelName,
                          };
                          const isSupported =
                            await api.checkVLMResponseApiSupport(modelConfig);
                          if (!isSupported) {
                            toast.error('VLM Response API not supported', {
                              description:
                                'The VLM provider does not support the Responses API',
                            });
                            field.onChange(false);
                          }
                        } catch (error) {
                          toast.error('VLM Response API not supported', {
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Unknown error',
                          });
                          field.onChange(false);
                        }
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>

      <PresetImport
        isOpen={isPresetModalOpen}
        onClose={() => setPresetModalOpen(false)}
      />
    </>
  );
}
