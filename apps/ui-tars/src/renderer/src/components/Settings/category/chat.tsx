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
  language: z.enum(['en', 'zh']),
  maxLoopCount: z.number().min(25).max(200),
  loopIntervalInMs: z.number().min(0).max(3000),
});

export function ChatSettings() {
  const { settings, updateSetting } = useSetting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: undefined,
      maxLoopCount: 0,
      loopIntervalInMs: 1000,
    },
  });

  const [newLanguage, newCount, newInterval] = form.watch([
    'language',
    'maxLoopCount',
    'loopIntervalInMs',
  ]);

  useEffect(() => {
    if (Object.keys(settings).length) {
      form.reset({
        language: settings.language,
        maxLoopCount: settings.maxLoopCount,
        loopIntervalInMs: settings.loopIntervalInMs,
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (!Object.keys(settings).length) {
      return;
    }
    if (newLanguage === undefined && newCount === 0 && newInterval === 1000) {
      return;
    }

    const validAndSave = async () => {
      if (newLanguage !== settings.language) {
        updateSetting({ ...settings, language: newLanguage });
      }

      const isLoopValid = await form.trigger('maxLoopCount');
      if (isLoopValid && newCount !== settings.maxLoopCount) {
        updateSetting({ ...settings, maxLoopCount: newCount });
      }

      const isIntervalValid = await form.trigger('loopIntervalInMs');
      if (isIntervalValid && newInterval !== settings.loopIntervalInMs) {
        updateSetting({ ...settings, loopIntervalInMs: newInterval });
      }
    };

    validAndSave();
  }, [newLanguage, newCount, newInterval, settings, updateSetting, form]);

  return (
    <>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormDescription>
                    Control the language used in LLM conversations
                  </FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="maxLoopCount"
            render={({ field }) => {
              // console.log('field', field);
              return (
                <FormItem>
                  <FormLabel>Max Loop</FormLabel>
                  <FormDescription>
                    Enter a number between 25-200
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="loopIntervalInMs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loop Wait Time (ms)</FormLabel>
                <FormDescription>Enter a number between 0-3000</FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter a number between 0-3000"
                    {...field}
                    value={field.value === 0 ? '' : field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
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
