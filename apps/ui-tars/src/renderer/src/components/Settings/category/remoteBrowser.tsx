/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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

const formSchema = z.object({
  remoteBrowserType: z.enum(['vnc', 'canvas']),
});

export function RemoteBrowserSettings() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      remoteBrowserType:
        (localStorage.getItem('remoteBrowserType') as '') || 'vnc',
    },
  });

  const [newType] = form.watch(['remoteBrowserType']);

  useEffect(() => {
    const validAndSave = async () => {
      if (newType !== localStorage.getItem('remoteBrowserType')) {
        localStorage.setItem('remoteBrowserType', newType);
      }
    };

    validAndSave();
  }, [newType]);

  return (
    <>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="remoteBrowserType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Cast Type:</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select browser cast type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={'vnc'}>VNC Browser</SelectItem>
                    <SelectItem value={'canvas'}>Canvas Browser</SelectItem>
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
