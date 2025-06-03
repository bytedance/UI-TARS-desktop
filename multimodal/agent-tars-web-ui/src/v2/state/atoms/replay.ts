import { atom } from 'jotai';
import { Event } from '../../types';

/**
 * Replay state interface for storing replay data
 *
 * This represents the current state of the replay functionality,
 * including timing, event positioning, and playback control
 */
export interface ReplayState {
  // Active state
  isActive: boolean;
  isPaused: boolean;

  // Events and timing
  events: Event[];
  currentEventIndex: number;
  startTimestamp: number | null;
  endTimestamp: number | null;

  // Playback control
  playbackSpeed: number; // 1 = normal, 2 = 2x speed, etc.
  autoPlayCountdown: number | null; // Countdown in seconds before autoplay starts

  // Current visible range
  visibleTimeWindow: {
    start: number;
    end: number;
  } | null;

  // Tracking processed events to avoid duplicates
  processedEvents?: Record<string, boolean>;
}

/**
 * Default replay state
 */
const DEFAULT_REPLAY_STATE: ReplayState = {
  isActive: false,
  isPaused: true,
  events: [],
  currentEventIndex: -1,
  startTimestamp: null,
  endTimestamp: null,
  playbackSpeed: 1,
  autoPlayCountdown: null,
  visibleTimeWindow: null,
  processedEvents: {},
};

/**
 * Atom for storing replay state
 * This manages the entire replay experience including timeline position and events
 */
export const replayStateAtom = atom<ReplayState>(DEFAULT_REPLAY_STATE);
