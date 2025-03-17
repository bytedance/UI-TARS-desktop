import { describe, it, expect } from 'vitest';
import { groupEventsByStep, UIGroupType } from './parseEvents';
import { EventType, EventItem } from '@renderer/type/event';

const createEvent = (type: EventType, content: any): EventItem => ({
  id: `test-${type}-${Date.now()}`,
  type,
  content,
  timestamp: Date.now(),
});

describe('parseEvents', () => {
  describe('groupEventsByStep', () => {
    it('should handle empty events array', () => {
      expect(groupEventsByStep([])).toEqual([]);
    });

    it('should group loading events before first plan update', () => {
      const events = [
        createEvent(EventType.LoadingStatus, { title: 'Loading 1' }),
        createEvent(EventType.PlanUpdate, { tasks: [] }),
      ];

      const result = groupEventsByStep(events);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(UIGroupType.Loading);
    });

    it('should group events by plan steps', () => {
      const events = [
        createEvent(EventType.PlanUpdate, { tasks: [] }),
        createEvent(EventType.NewPlanStep, { step: 1 }),
        createEvent(EventType.ToolUsed, { tool: 'test' }),
        createEvent(EventType.ToolUsed, { tool: 'test2' }),
        createEvent(EventType.ChatText, 'Hello'),
      ];

      const result = groupEventsByStep(events);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(UIGroupType.PlanStep);
      expect(result[1].type).toBe(UIGroupType.ChatText);
    });

    it('should handle chat text as separate groups', () => {
      const events = [
        createEvent(EventType.PlanUpdate, { tasks: [] }),
        createEvent(EventType.ChatText, 'Message 1'),
        createEvent(EventType.ChatText, 'Message 2'),
      ];

      const result = groupEventsByStep(events);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(UIGroupType.ChatText);
      expect(result[1].type).toBe(UIGroupType.ChatText);
    });

    it('should only include last loading status', () => {
      const events = [
        createEvent(EventType.PlanUpdate, { tasks: [] }),
        createEvent(EventType.LoadingStatus, { title: 'Loading 1' }),
        createEvent(EventType.LoadingStatus, { title: 'Loading 2' }),
      ];

      const result = groupEventsByStep(events);
      expect(result).toHaveLength(1);
      expect(result[0].events[0].content.title).toBe('Loading 2');
    });

    it('should work at the beginning', () => {
      const events = [
        createEvent(EventType.LoadingStatus, { title: 'Loading 1' }),
        createEvent(EventType.PlanUpdate, 'Message 1'),
        createEvent(EventType.NewPlanStep, { step: 1 }),
      ];

      const result = groupEventsByStep(events);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(UIGroupType.Loading);
    });
  });
});
