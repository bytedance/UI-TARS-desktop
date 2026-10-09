/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { memo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Label } from '@renderer/components/ui/label';
import { useTranslation } from '@renderer/hooks/useTranslation';

interface FreeTrialDialog {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const FreeTrialDialog = memo(
  ({ open, onOpenChange, onConfirm }: FreeTrialDialog) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const { t } = useTranslation();

    const onCheck = (status: boolean) => {
      setDontShowAgain(status);
    };

    const onClick = () => {
      if (dontShowAgain) {
        localStorage.setItem('isAgreeFreeTrialAgreement', 'true');
      }
      onConfirm();
    };

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('free_trial.title')}</AlertDialogTitle>
            <AlertDialogDescription className="hidden" />
            <div className="text-muted-foreground text-sm">
              <p>{t('free_trial.p1')}</p>
              <p className="my-4">
                <b>{t('free_trial.p2_bold')}</b> {t('free_trial.p2')}
              </p>
              <p className="my-4">{t('free_trial.p3')}</p>
              <div className="flex items-center gap-2 mb-4 text-foreground">
                <Checkbox
                  id="free"
                  checked={dontShowAgain}
                  onCheckedChange={onCheck}
                />
                <Label htmlFor="free">{t('free_trial.checkbox_label')}</Label>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onClick}>
              {t('common.agree')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);
