import { Button } from '@renderer/components/ui/button';
import { useTranslation } from '@renderer/hooks/useTranslation';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';

interface VLMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VLMDialog({ open, onOpenChange }: VLMDialogProps) {
  const { t } = useTranslation();

  const handleConfigureClick = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('vlm_dialog.title')}</DialogTitle>
          <DialogDescription className="text-foreground">
            {t('vlm_dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="button" onClick={handleConfigureClick}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
