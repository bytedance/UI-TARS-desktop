import { useMemo } from 'react';
import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  subWeeks,
  isSameWeek,
} from 'date-fns';
import { SessionItem } from '../SessionItem';
import { ChatSession } from '../type';

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  editingSessionId: string | null;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, sessionId: string) => void;
  onSaveEdit: (sessionId: string, e: React.MouseEvent) => void;
  onEditSession: (
    sessionId: string,
    currentName: string,
    e: React.MouseEvent,
  ) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClick: (sessionId: string) => void;
}

interface GroupedSessions {
  title: string;
  sessions: ChatSession[];
}

export function SessionList({
  sessions,
  currentSessionId,
  editingSessionId,
  editingName,
  onEditingNameChange,
  onKeyDown,
  onSaveEdit,
  onEditSession,
  onDeleteSession,
  onClick,
}: SessionListProps) {
  const groupedSessions = useMemo(() => {
    const groups: GroupedSessions[] = [
      { title: 'Today', sessions: [] },
      { title: 'Yesterday', sessions: [] },
      { title: 'This Week', sessions: [] },
      { title: 'Last Week', sessions: [] },
      { title: 'This Month', sessions: [] },
      { title: 'Earlier', sessions: [] },
    ];

    const lastWeekStart = subWeeks(new Date(), 1);

    sessions.forEach((session) => {
      const date = new Date(session.updatedAt!);

      if (isToday(date)) {
        groups[0].sessions.push(session);
      } else if (isYesterday(date)) {
        groups[1].sessions.push(session);
      } else if (isThisWeek(date)) {
        groups[2].sessions.push(session);
      } else if (isSameWeek(date, lastWeekStart)) {
        groups[3].sessions.push(session);
      } else if (isThisMonth(date)) {
        groups[4].sessions.push(session);
      } else {
        groups[5].sessions.push(session);
      }
    });

    groups.forEach((group) => {
      group.sessions.sort((a, b) => {
        const dateA = new Date(a.updatedAt!).getTime();
        const dateB = new Date(b.updatedAt!).getTime();
        return dateB - dateA;
      });
    });

    return groups.filter((group) => group.sessions.length > 0);
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        No sessions
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedSessions.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {group.title}
          </div>
          {group.sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              isEditing={session.id === editingSessionId}
              removable={sessions.length > 1}
              editingName={editingName}
              onEditingNameChange={onEditingNameChange}
              onKeyDown={onKeyDown}
              onSaveEdit={onSaveEdit}
              onEditSession={onEditSession}
              onDeleteSession={onDeleteSession}
              onClick={() => onClick(session.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
