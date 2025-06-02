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
import { SearchEngineForSettings } from '@/main/store/types';

import googleIcon from '@resources/icons/google-color.svg?url';
import bingIcon from '@resources/icons/bing-color.svg?url';
import baiduIcon from '@resources/icons/baidu-color.svg?url';

const formSchema = z.object({
  language: z.enum(['en', 'zh']),
  maxLoopCount: z.number().min(25).max(200),
  loopIntervalInMs: z.number().min(0).max(3000),
  searchEngineForBrowser: z.nativeEnum(SearchEngineForSettings),
});

export interface VLMSettingsRef {
  submit: () => Promise<z.infer<typeof formSchema>>;
}

export function LocalOperatorSettings() {
  const { settings, updateSetting } = useSetting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: undefined,
      maxLoopCount: 0,
      loopIntervalInMs: 1000,
      searchEngineForBrowser: undefined,
    },
  });

  const [newLanguage, newCount, newInterval, newSearchEngine] = form.watch([
    'language',
    'maxLoopCount',
    'loopIntervalInMs',
    'searchEngineForBrowser',
  ]);

  useEffect(() => {
    if (Object.keys(settings).length) {
      form.reset({
        language: settings.language,
        maxLoopCount: settings.maxLoopCount,
        loopIntervalInMs: settings.loopIntervalInMs,
        searchEngineForBrowser: settings.searchEngineForBrowser,
      });
    }
  }, [settings, form]);

  useEffect(() => {
    if (!Object.keys(settings).length) {
      return;
    }
    if (
      newLanguage === undefined &&
      newCount === 0 &&
      newInterval === 1000 &&
      newSearchEngine === undefined
    ) {
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

      if (newSearchEngine !== settings.searchEngineForBrowser) {
        updateSetting({
          ...settings,
          searchEngineForBrowser: newSearchEngine,
        });
      }
    };

    validAndSave();
  }, [
    newLanguage,
    newCount,
    newInterval,
    newSearchEngine,
    settings,
    updateSetting,
    form,
  ]);

  return (
    <>
      <Form {...form}>
        <form className="space-y-8">
          <h3 className="text-lg font-semibold mb-2">Common</h3>
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>Language</FormLabel>
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
          <h3 className="text-lg font-semibold mb-2">Browser Operator</h3>
          <FormField
            control={form.control}
            name="searchEngineForBrowser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Engine:</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-[124px]">
                      <SelectValue placeholder="Select a search engine" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SearchEngineForSettings.GOOGLE}>
                      <div className="flex items-center gap-2">
                        <img
                          src={googleIcon}
                          alt="Google"
                          className="w-4 h-4"
                        />
                        <span>Google</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={SearchEngineForSettings.BING}>
                      <div className="flex items-center gap-2">
                        <img src={bingIcon} alt="Bing" className="w-4 h-4" />
                        <span>Bing</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={SearchEngineForSettings.BAIDU}>
                      <div className="flex items-center gap-2">
                        <img src={baiduIcon} alt="Baidu" className="w-4 h-4" />
                        <span>Baidu</span>
                      </div>
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
