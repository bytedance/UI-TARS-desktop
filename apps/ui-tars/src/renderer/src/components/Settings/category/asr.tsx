/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useSetting } from '@renderer/hooks/useSetting';
import {
  Form,
  FormControl,
  FormDescription,
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

const formSchema = z.object({
  asrAppKey: z.string().optional(),
  asrAccessKey: z.string().optional(),
  asrWsUrl: z.string().optional(),
});

const DEFAULT_WS_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

export function ASRSettings() {
  const { settings, updateSetting } = useSetting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      asrAppKey: '',
      asrAccessKey: '',
      asrWsUrl: DEFAULT_WS_URL,
    },
  });

  const [newAppKey, newAccessKey, newWsUrl] = form.watch([
    'asrAppKey',
    'asrAccessKey',
    'asrWsUrl',
  ]);

  useEffect(() => {
    if (Object.keys(settings).length) {
      form.reset({
        asrAppKey: settings.asrAppKey || '',
        asrAccessKey: settings.asrAccessKey || '',
        asrWsUrl: settings.asrWsUrl || DEFAULT_WS_URL,
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (!Object.keys(settings).length) {
      return;
    }

    const validAndSave = async () => {
      if (newAppKey !== settings.asrAppKey) {
        updateSetting({ ...settings, asrAppKey: newAppKey });
      }

      if (newAccessKey !== settings.asrAccessKey) {
        updateSetting({ ...settings, asrAccessKey: newAccessKey });
      }

      if (newWsUrl !== settings.asrWsUrl) {
        updateSetting({ ...settings, asrWsUrl: newWsUrl });
      }
    };

    validAndSave();
  }, [newAppKey, newAccessKey, newWsUrl, settings, updateSetting]);

  return (
    <>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="asrAppKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>APP Key</FormLabel>
                <FormDescription>
                  火山引擎语音识别服务的 APP Key
                </FormDescription>
                <FormControl>
                  <Input placeholder="Enter ASR APP Key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="asrAccessKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key</FormLabel>
                <FormDescription>
                  火山引擎语音识别服务的 Access Key
                </FormDescription>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter ASR Access Key"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="asrWsUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WebSocket URL</FormLabel>
                <FormDescription>选择语音识别模式</FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ASR WebSocket URL" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="wss://openspeech.bytedance.com/api/v3/sauc/bigmodel">
                      实时识别（bigmodel）
                    </SelectItem>
                    <SelectItem value="wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async">
                      异步识别（bigmodel_async）
                    </SelectItem>
                    <SelectItem value="wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream">
                      非流式识别（bigmodel_nostream）
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  );
}
