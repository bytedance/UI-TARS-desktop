/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useRef, useState } from 'react';
import { Info } from 'lucide-react';

import { Card } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import {
  Tooltip as CNTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs';
import { useSetting } from '@renderer/hooks/useSetting';
import { useTranslation } from '@renderer/hooks/useTranslation';

interface PresetBannerProps {
  url?: string;
  date?: number;
  handleUpdatePreset: (e: React.MouseEvent) => void;
  handleResetPreset: (e: React.MouseEvent) => void;
}

interface PresetImportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PresetImport({ isOpen, onClose }: PresetImportProps) {
  const [remoteUrl, setRemoteUrl] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importPresetFromText, importPresetFromUrl } = useSetting();
  const { t } = useTranslation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      const yamlText = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      await importPresetFromText(yamlText);
      toast.success('Preset imported successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to import preset', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleRemoteImport = async () => {
    try {
      await importPresetFromUrl(remoteUrl, autoUpdate);
      toast.success('Preset imported successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to import preset', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('preset.import_title')}</DialogTitle>
          <DialogDescription>{t('preset.description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="local" className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="local">{t('preset.local_file')}</TabsTrigger>
            <TabsTrigger value="remote">{t('preset.remote_url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <DialogDescription>{t('preset.select_file')}</DialogDescription>
              <input
                type="file"
                accept=".yaml,.yml"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('preset.choose_file')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="remote" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="preset-url">{t('preset.preset_url')}</Label>
                <Input
                  id="preset-url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://example.com/preset.yaml"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="auto-update">{t('preset.auto_update')}</Label>
                <Switch
                  id="auto-update"
                  checked={autoUpdate}
                  onCheckedChange={setAutoUpdate}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('preset.cancel')}
          </Button>
          <Button onClick={handleRemoteImport} disabled={!remoteUrl}>
            {t('preset.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PresetBanner(props: PresetBannerProps) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 mb-4 bg-gray-50">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            {t('preset.remote_management')}
          </span>
          <TooltipProvider>
            <CNTooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>{t('preset.read_only_tooltip')}</TooltipContent>
            </CNTooltip>
          </TooltipProvider>
        </div>

        <div>
          <p className="text-sm text-gray-600 line-clamp-2">{props.url}</p>
          {props.date && (
            <p className="text-xs text-gray-500 mt-1">
              {`Last updated: ${new Date(props.date).toLocaleString()}`}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mb-0"
          onClick={props.handleUpdatePreset}
        >
          {t('preset.update')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-red-400 border-red-400 hover:bg-red-50 hover:text-red-500 ml-4 mb-0"
          onClick={props.handleResetPreset}
        >
          {t('preset.reset')}
        </Button>
      </div>
    </Card>
  );
}
