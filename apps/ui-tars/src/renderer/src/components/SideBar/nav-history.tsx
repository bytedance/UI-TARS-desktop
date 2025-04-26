/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { MoreHorizontal, Trash2, History, ChevronRight } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@renderer/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
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
import { SessionItem } from '@renderer/db/session';
import { ShareOptions } from './share';

export function NavHistory({
  currentSessionId,
  history,
  onSessionClick,
  onSessionDelete,
}: {
  currentSessionId: string;
  history: SessionItem[];
  onSessionClick: (id: string) => void;
  onSessionDelete: (id: string) => void;
}) {
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const [id, setId] = useState('');

  const handleDelte = (id: string) => {
    setIsShareConfirmOpen(true);
    setId(id);
  };

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <Collapsible
            key={'History'}
            asChild
            defaultOpen={true}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={'History'}
                  className="!pr-2 font-medium"
                >
                  <History strokeWidth={2} />
                  <span>History</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="!mr-0 !pr-1">
                  {history.map((item) => (
                    <SidebarMenuSubItem key={item.id} className="group/item">
                      <SidebarMenuSubButton
                        className={`hover:bg-neutral-100 hover:text-neutral-600 py-5 cursor-pointer ${item.id === currentSessionId ? 'text-neutral-700 bg-white hover:bg-white' : 'text-neutral-500'}`}
                        onClick={() => onSessionClick(item.id)}
                      >
                        <span className="max-w-42">{item.name}</span>
                      </SidebarMenuSubButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction className="invisible group-hover/item:visible [&[data-state=open]]:visible mt-1">
                            <MoreHorizontal />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="rounded-lg"
                          side={'right'}
                          align={'start'}
                        >
                          <ShareOptions sessionId={item.id} />
                          <DropdownMenuItem
                            className="text-red-400 focus:bg-red-50 focus:text-red-500"
                            onClick={() => handleDelte(item.id)}
                          >
                            <Trash2 className="text-red-400" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>
      <AlertDialog
        open={isShareConfirmOpen}
        onOpenChange={setIsShareConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session item? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => onSessionDelete(id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
