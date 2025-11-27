/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import { useSetting } from '@renderer/hooks/useSetting';

export const DebugSettings = () => {
  const { settings, updateSetting } = useSetting();

  const handleSaveRequestsToggle = (checked: boolean) => {
    updateSetting({ saveRequestsToJson: checked });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="save-requests-toggle">
            Save Model Requests to JSON
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, each model inference request will be saved as a JSON
            file in the temp folder for debugging purposes.
          </p>
        </div>
        <Switch
          id="save-requests-toggle"
          checked={settings.saveRequestsToJson ?? false}
          onCheckedChange={handleSaveRequestsToggle}
        />
      </div>
    </div>
  );
};
