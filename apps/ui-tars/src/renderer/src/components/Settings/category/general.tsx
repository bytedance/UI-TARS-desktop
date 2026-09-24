import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { api } from '@/renderer/src/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Label } from '@renderer/components/ui/label';
import { useSetting } from '@renderer/hooks/useSetting';
import { useTranslation } from '@renderer/hooks/useTranslation';

import { REPO_OWNER, REPO_NAME } from '@main/shared/constants';

export const GeneralSettings = () => {
  const { settings, updateSetting } = useSetting();
  const { t } = useTranslation();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateDetail, setUpdateDetail] = useState<{
    currentVersion: string;
    version: string;
    link: string | null;
  } | null>();

  const handleCheckForUpdates = async () => {
    setUpdateLoading(true);
    try {
      const detail = await api.checkForUpdatesDetail();
      console.log('detail', detail);

      if (detail.updateInfo) {
        setUpdateDetail({
          currentVersion: detail.currentVersion,
          version: detail.updateInfo.version,
          link: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${detail.updateInfo.version}`,
        });
        return;
      } else if (!detail.isPackaged) {
        toast.info(t('general.unpackaged'));
      } else {
        toast.success(t('general.no_update'), {
          description: `${t('general.current_version')}: ${detail.currentVersion} ${t('general.no_update')}`,
          position: 'top-right',
          richColors: true,
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('general.language')}</Label>
        <Select
          value={settings.uiLanguage || 'en'}
          onValueChange={(val: 'en' | 'zh') =>
            updateSetting({ ...settings, uiLanguage: val })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('common.select_language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            type="button"
            disabled={updateLoading}
            onClick={handleCheckForUpdates}
          >
            <RefreshCcw
              className={`h-4 w-4 mr-2 ${updateLoading ? 'animate-spin' : ''}`}
            />
            {updateLoading ? t('general.checking') : t('general.check_updates')}
          </Button>
          {updateDetail?.version && (
            <div className="text-sm text-gray-500">
              {`${updateDetail.currentVersion} -> ${updateDetail.version}(latest)`}
            </div>
          )}
        </div>
        {updateDetail?.link && (
          <div className="text-sm text-gray-500">
            {t('general.release_notes')}:{' '}
            <a
              href={updateDetail.link}
              target="_blank"
              className="underline"
              rel="noreferrer"
            >
              {updateDetail.link}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
