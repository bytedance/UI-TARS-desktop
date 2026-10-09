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
import { Switch } from '@renderer/components/ui/switch';

const formSchema = z.object({
  proxyEnabled: z.boolean(),
  proxyMode: z.enum(['system', 'custom']),
  httpProxy: z.string().optional(),
  httpsProxy: z.string().optional(),
  noProxy: z.string().optional(),
});

export function ProxySettings() {
  const { settings, updateSetting } = useSetting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proxyEnabled: false,
      proxyMode: 'system',
      httpProxy: '',
      httpsProxy: '',
      noProxy: '',
    },
  });

  const proxyEnabled = form.watch('proxyEnabled');
  const proxyMode = form.watch('proxyMode');

  useEffect(() => {
    if (Object.keys(settings).length) {
      form.reset({
        proxyEnabled: settings.proxyEnabled ?? false,
        proxyMode: settings.proxyMode ?? 'system',
        httpProxy: settings.httpProxy ?? '',
        httpsProxy: settings.httpsProxy ?? '',
        noProxy: settings.noProxy ?? '',
      });
    }
  }, [settings, form]);

  // Auto-save on change
  useEffect(() => {
    if (!Object.keys(settings).length) {
      return;
    }

    const subscription = form.watch((value) => {
      updateSetting({
        ...settings,
        proxyEnabled: value.proxyEnabled,
        proxyMode: value.proxyMode,
        httpProxy: value.httpProxy ?? '',
        httpsProxy: value.httpsProxy ?? '',
        noProxy: value.noProxy ?? '',
      });
    });

    return () => subscription.unsubscribe();
  }, [settings, updateSetting, form]);

  return (
    <>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="proxyEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Proxy</FormLabel>
                  <FormDescription>
                    Route HTTP requests through a proxy server
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {proxyEnabled && (
            <>
              <FormField
                control={form.control}
                name="proxyMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proxy Mode</FormLabel>
                    <FormDescription>
                      Use system proxy settings or configure a custom proxy
                    </FormDescription>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select proxy mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System Proxy</SelectItem>
                        <SelectItem value="custom">Custom Proxy</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {proxyMode === 'custom' && (
                <>
                  <FormField
                    control={form.control}
                    name="httpProxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTTP Proxy</FormLabel>
                        <FormDescription>
                          HTTP proxy address (e.g. http://127.0.0.1:7890)
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="http://127.0.0.1:7890"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="httpsProxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTTPS Proxy</FormLabel>
                        <FormDescription>
                          HTTPS proxy address (leave empty to use HTTP proxy)
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="http://127.0.0.1:7890"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="noProxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No Proxy</FormLabel>
                        <FormDescription>
                          Comma-separated list of hosts to bypass proxy (e.g.
                          localhost,127.0.0.1)
                        </FormDescription>
                        <FormControl>
                          <Input
                            placeholder="localhost,127.0.0.1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </>
          )}
        </form>
      </Form>
    </>
  );
}
