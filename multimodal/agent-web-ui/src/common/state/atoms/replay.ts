import { atom } from 'jotai';
import { AgentEventStream } from '@/common/types';

/**
 * Simplified replay state interface
 */
export interface ReplayState {
  // Core state
  isActive: boolean;
  events: AgentEventStream.Event[];

  // Playback control
  currentEventIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;

  // Timestamps for timeline
  startTimestamp: number | null;
  endTimestamp: number | null;

  // Auto-play countdown
  autoPlayCountdown: number | null;
}

/**
 * Default replay state
 */
const DEFAULT_REPLAY_STATE: ReplayState = {
  isActive: false,
  events: [],
  currentEventIndex: -1,
  isPlaying: false,
  playbackSpeed: 1,
  startTimestamp: null,
  endTimestamp: null,
  autoPlayCountdown: null,
};

/**
 * Simplified replay state atom
 */
export const replayStateAtom = atom<ReplayState>(DEFAULT_REPLAY_STATE);
