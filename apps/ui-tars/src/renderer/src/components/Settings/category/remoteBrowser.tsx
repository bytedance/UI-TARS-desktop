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
});

export interface RemoteBrowserSettingsRef {
  submit: () => Promise<z.infer<typeof formSchema>>;
}

interface RemoteBrowserSettingsProps {
  ref?: React.RefObject<RemoteBrowserSettingsRef | null>;
  autoSave?: boolean;
  className?: string;
}

export function RemoteBrowserSettings({
  ref,
  autoSave = false,
  className,
}: RemoteBrowserSettingsProps) {
  const { settings } = useSetting();

  // console.log('initialValues', settings);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
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

  const [newUrl] = form.watch(['url']);

  useEffect(() => {
    if (!autoSave) {
      return;
    }
    if (!Object.keys(settings).length) {
      return;
    }
    if (newUrl === '') {
      return;
    }

    const validAndSave = async () => {
      const isUrlValid = await form.trigger('url');
      if (isUrlValid && newUrl !== settings.vlmBaseUrl) {
        // updateSetting({ ...settings, vlmBaseUrl: newBaseUrl });
      }
    };

    validAndSave();
  }, [
    autoSave,
    newUrl,
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
                <FormLabel>Browser Session Manager URL</FormLabel>
                <FormControl>
                  <Input
                    className="bg-white"
                    placeholder="Enter Browser Session Manager URL"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  );
}
