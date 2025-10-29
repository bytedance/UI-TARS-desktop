import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { api } from '@/renderer/src/api';
import { toast } from 'sonner';
import { Textarea } from '@renderer/components/ui/textarea';
import { Label } from '@renderer/components/ui/label';
import { useSetting } from '@renderer/hooks/useSetting';

import { REPO_OWNER, REPO_NAME } from '@main/shared/constants';

export const GeneralSettings = () => {
  const { settings, updateSetting } = useSetting();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateDetail, setUpdateDetail] = useState<{
    currentVersion: string;
    version: string;
    link: string | null;
  } | null>();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (settings.commandSuggestions && settings.commandSuggestions.length > 0) {
      setSuggestions(settings.commandSuggestions);
    } else {
      // Set default suggestions if none are configured
      setSuggestions([
        '打开浏览器用携程搜索后天深圳飞往北京的机票',
        '用钉钉帮我创建一个今天晚上七点的会议日程',
        '打开浏览器用淘宝搜索65寸OLED电视',
        '用钉钉给谢建辉发一条消息，内容是：你好，我是GUIAgent',
        '用Word写一篇关于AI Agent的300字报告，并保存到桌面',
        '关闭所有浏览器窗口',
      ]);
    }
  }, [settings.commandSuggestions]);

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
        toast.info('Unpackaged version does not support update check!');
      } else {
        toast.success('No update available', {
          description: `current version: ${detail.currentVersion} is the latest version`,
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

  const handleSaveSuggestions = () => {
    updateSetting({ commandSuggestions: suggestions });
    toast.success('Command suggestions saved successfully');
  };

  const handleSuggestionsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setSuggestions(value.split('\n').filter((s) => s.trim() !== ''));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="command-suggestions">Command Suggestions</Label>
        <Textarea
          id="command-suggestions"
          value={suggestions.join('\n')}
          onChange={handleSuggestionsChange}
          className="min-h-[200px]"
          placeholder="Enter one command per line"
        />
        <Button onClick={handleSaveSuggestions}>Save Suggestions</Button>
      </div>

      <div className="border-t pt-6">
        <Button
          variant="outline"
          type="button"
          disabled={updateLoading}
          onClick={handleCheckForUpdates}
        >
          <RefreshCcw
            className={`h-4 w-4 mr-2 ${updateLoading ? 'animate-spin' : ''}`}
          />
          {updateLoading ? 'Checking...' : 'Check Updates'}
        </Button>
        {updateDetail?.version && (
          <div className="text-sm text-gray-500 mt-2">
            {`${updateDetail.currentVersion} -> ${updateDetail.version}(latest)`}
          </div>
        )}
        {updateDetail?.link && (
          <div className="text-sm text-gray-500 mt-1">
            Release Notes:{' '}
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
