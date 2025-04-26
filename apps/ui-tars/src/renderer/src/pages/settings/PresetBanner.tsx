/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Info } from 'lucide-react';

import { Card } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import {
  Tooltip as CNTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';

interface PresetBannerProps {
  url?: string;
  date?: number;
  handleUpdatePreset: (e: React.MouseEvent) => void;
  handleResetPreset: (e: React.MouseEvent) => void;
}

export function PresetBanner(props: PresetBannerProps) {
  return (
    <Card className="p-4 mb-4 bg-gray-50">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            Remote Preset Management
          </span>
          <TooltipProvider>
            <CNTooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>
                When using remote preset, settings will be read-only
              </TooltipContent>
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
          Update Preset
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-red-400 border-red-400 hover:bg-red-50 hover:text-red-500 ml-4 mb-0"
          onClick={props.handleResetPreset}
        >
          Reset to Manual
        </Button>
      </div>
    </Card>
  );
}
