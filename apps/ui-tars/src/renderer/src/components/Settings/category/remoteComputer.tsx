/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useImperativeHandle } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useSetting } from '@renderer/hooks/useSetting';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@renderer/components/ui/form';
import { Input } from '@renderer/components/ui/input';
import { cn } from '@renderer/utils';

const formSchema = z.object({
  url: z.string().url(),
  credential: z.string().min(1),
  server: z.string().min(1),
  ip: z.string().min(1),
});

type RemoteComputerFormValues = z.infer<typeof formSchema>;

export interface RemoteComputerSettingsRef {
  submit: () => Promise<z.infer<typeof formSchema>>;
}

interface RemoteComputerSettingsProps {
  ref?: React.RefObject<RemoteComputerSettingsRef | null>;
  autoSave?: boolean;
  className?: string;
}

export function RemoteComputerSettings({
  ref,
  autoSave = false,
  className,
}: RemoteComputerSettingsProps) {
  const { settings } = useSetting();

  // console.log('initialValues', settings);

  const form = useForm<RemoteComputerFormValues>({
    resolver: zodResolver<
      RemoteComputerFormValues,
      unknown,
      RemoteComputerFormValues
    >(formSchema as never),
    defaultValues: {
      url: '',
      credential: '',
      server: '',
      ip: '',
    },
  });
  // useEffect(() => {
  //   if (Object.keys(settings).length) {
  //     form.reset({
  //       vlmBaseUrl: settings.vlmBaseUrl,
  //       vlmApiKey: settings.vlmApiKey,
  //       vlmModelName: settings.vlmModelName,
  //     });
  //   }
  // }, [settings, form]);

  const [newUrl, newCredential, newServer, newIP] = form.watch([
    'url',
    'credential',
    'server',
    'ip',
  ]);

  useEffect(() => {
    if (!autoSave) {
      return;
    }
    if (!Object.keys(settings).length) {
      return;
    }
    if (
      newUrl === '' &&
      newCredential === '' &&
      newServer === '' &&
      newIP === ''
    ) {
      return;
    }

    const validAndSave = async () => {
      const isUrlValid = await form.trigger('url');
      if (isUrlValid && newUrl !== settings.vlmBaseUrl) {
        // updateSetting({ ...settings, vlmBaseUrl: newBaseUrl });
      }

      const isCredentialValid = await form.trigger('credential');
      if (isCredentialValid && newCredential !== settings.vlmApiKey) {
        // updateSetting({ ...settings, vlmApiKey: newApiKey });
      }

      const isServerValid = await form.trigger('server');
      if (isServerValid && newServer !== settings.vlmModelName) {
        // updateSetting({ ...settings, vlmModelName: newModelName });
      }

      const isIPValid = await form.trigger('ip');
      if (isIPValid && newIP !== settings.vlmModelName) {
        // updateSetting({ ...settings, vlmModelName: newModelName });
      }
    };

    validAndSave();
  }, [
    autoSave,
    newUrl,
    newCredential,
    newServer,
    newIP,
    settings,
    // updateSetting,
    form,
  ]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('onSubmit', values);

    // updateSetting({ ...settings, ...values });
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
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sandbox Manager URL</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter Sandbox Manager URL"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="credential"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Credential</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter User Credential"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="server"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VNC Proxy Server</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter VNC Proxy Server"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Establish IP</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter Establish IP"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  );
}
