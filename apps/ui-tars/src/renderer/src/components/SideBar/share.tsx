/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Loader2, SquareArrowOutUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import dayjs from 'dayjs';

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
import { DropdownMenuItem } from '@renderer/components/ui/dropdown-menu';
import { ComputerUseUserData } from '@ui-tars/shared/types';
import { reportHTMLContent } from '@renderer/utils/html';
import { uploadReport } from '@renderer/utils/share';
import { useStore } from '@renderer/hooks/useStore';
import { useSetting } from '@renderer/hooks/useSetting';
import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { useSession } from '@renderer/hooks/useSession';
import { chatManager } from '@renderer/db/chat';

const SHARE_TIMEOUT = 100000;

export function ShareOptions({ sessionId }: { sessionId: string }) {
  const { status } = useStore();
  const { sessions } = useSession();
  const { settings } = useSetting();

  const [isSharing, setIsSharing] = useState(false);
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);

  const isSharePending = useRef(false);
  const shareTimeoutRef = useRef<NodeJS.Timeout>(null);

  const processShare = async (allowCollectShareReport: boolean, e) => {
    e.stopPropagation();
    e.preventDefault();

    setIsShareConfirmOpen(false);

    const chatMessages =
      (await chatManager.getSessionMessages(sessionId)) || [];
    const lastHumanMessage =
      [...(chatMessages || [])]
        .reverse()
        .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
        ?.value || '';

    if (isSharePending.current) return;

    try {
      setIsSharing(true);
      isSharePending.current = true;

      shareTimeoutRef.current = setTimeout(() => {
        setIsSharing(false);
        isSharePending.current = false;
        toast.error('Share timeout', {
          description: 'Please try again later',
        });
      }, SHARE_TIMEOUT);

      const response = await fetch(
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/eojfrzeh7vhouloj/ai_labs/ui_tars_desktop/share/v011/index.html',
      );
      const html = await response.text();

      const restUserData =
        sessions.find((item) => item.id === sessionId)?.meta || {};

      const userData = {
        ...restUserData,
        status,
        conversations: chatMessages,
        modelDetail: {
          name: settings.vlmModelName,
          provider: settings.vlmProvider,
          baseUrl: settings.vlmBaseUrl,
          maxLoop: settings.maxLoopCount,
        },
      } as unknown as ComputerUseUserData;

      console.log('userData', userData);

      const htmlContent = reportHTMLContent(html, [userData]);

      let uploadSuccess = false;

      if (allowCollectShareReport) {
        let reportUrl: string | undefined;

        if (settings?.reportStorageBaseUrl) {
          try {
            const { url } = await uploadReport(
              htmlContent,
              settings.reportStorageBaseUrl,
            );
            reportUrl = url;
            uploadSuccess = true;
            await navigator.clipboard.writeText(url);
            toast.success('Report link copied to clipboard!');
          } catch (error) {
            console.error('Upload report failed:', error);
            toast.error('Failed to upload report', {
              description:
                error instanceof Error ? error.message : JSON.stringify(error),
            });
          }
        }

        // Only send UTIO data if user consented
        if (settings?.utioBaseUrl) {
          const lastScreenshot = chatMessages
            .filter((m) => m.screenshotBase64)
            .pop()?.screenshotBase64;

          await window.electron.utio.shareReport({
            type: 'shareReport',
            instruction: lastHumanMessage,
            lastScreenshot,
            report: reportUrl,
          });
        }
      }

      // Only fall back to file download if upload was not configured or failed
      if (!settings?.reportStorageBaseUrl || !uploadSuccess) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to generate share content', {
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
      setIsSharing(false);
      isSharePending.current = false;
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isSharePending.current) return;

    if (settings?.reportStorageBaseUrl) {
      setIsShareConfirmOpen(true);
      return;
    }

    await processShare(false, e);
  };

  return (
    <>
      <DropdownMenuItem
        // onChange={(e) => e.preventDefault()}
        onClick={(e) => handleShare(e)}
      >
        {isSharing ? (
          <Loader2 className="animate-spin" />
        ) : (
          <SquareArrowOutUpRight />
        )}
        <span>Share</span>
      </DropdownMenuItem>
      <AlertDialog
        open={isShareConfirmOpen}
        onOpenChange={setIsShareConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share Report</AlertDialogTitle>
            <AlertDialogDescription>
              📢 Would you like to share your report to help us improve{' '}
              <b>UI-TARS</b>? This includes your screen recordings and actions.
              <br />
              <br />
              💡 We encourage you to create a clean and privacy-free desktop
              environment before each use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => processShare(false, e)}>
              No, just download
            </AlertDialogCancel>
            <AlertDialogAction onClick={(e) => processShare(true, e)}>
              Yes, continue!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
