import { EventItem } from '@renderer/type/event';
import { atom } from 'jotai';
import EventEmitter from 'eventemitter3';
import { PlanTask } from '@renderer/type/agent';

export interface UserInterruptEvent {
  type: 'user-interrupt';
  text: string;
}

export interface TernimateEvent {
  type: 'terminate';
}

export type GlobalEvent = UserInterruptEvent | TernimateEvent;

export const eventsAtom = atom<EventItem[]>([]);

export const currentEventIdAtom = atom<string | null>(null);

export const globalEventEmitter = new EventEmitter<{
  [key: string]: (event: GlobalEvent) => void;
}>();
export const currentAgentFlowIdRefAtom = atom<{ current: string | null }>({
  current: null,
});
export const agentStatusTipAtom = atom('');
export const planTasksAtom = atom<PlanTask[]>([]);
