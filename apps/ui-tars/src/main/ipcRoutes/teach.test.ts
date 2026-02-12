/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { teachRoute } from './teach';
import type {
  TeachSkillRecord,
  TeachSkillSummary,
} from '@main/services/teachSkills';
import {
  captureTeachSnapshot,
  deleteTeachSkill,
  exportTeachSkill,
  getTeachSkill,
  importTeachSkill,
  listTeachSkills,
  replayTeachSkill,
  saveTeachSkill,
} from '@main/services/teachSkills';

vi.mock('@main/services/teachSkills', () => ({
  captureTeachSnapshot: vi.fn(),
  saveTeachSkill: vi.fn(),
  listTeachSkills: vi.fn(),
  getTeachSkill: vi.fn(),
  replayTeachSkill: vi.fn(),
  exportTeachSkill: vi.fn(),
  importTeachSkill: vi.fn(),
  deleteTeachSkill: vi.fn(),
}));

describe('teachRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns captured snapshot payload', async () => {
    (
      captureTeachSnapshot as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      base64: 'abc',
      mime: 'image/jpeg',
      width: 1920,
      height: 1080,
      scaleFactor: 1,
    });

    const result = await teachRoute.teachCaptureSnapshot.handle({
      input: undefined,
      context: {} as never,
    });

    expect(result).toEqual({
      base64: 'abc',
      mime: 'image/jpeg',
      width: 1920,
      height: 1080,
      scaleFactor: 1,
    });
  });

  it('persists teach skill through service', async () => {
    const summary: TeachSkillSummary = {
      id: 'skill-1',
      name: 'Skill name',
      goal: 'Goal',
      model: 'gpt-5.3-codex',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stepCount: 1,
    };

    (saveTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      summary,
    );

    const input = {
      name: 'Skill name',
      goal: 'Goal',
      plan: 'Plan',
      model: 'gpt-5.3-codex',
      steps: [
        {
          id: 'step-1',
          title: 'Open browser',
          explanation: 'Optional explanation',
          expectedOutcome: 'Browser opened',
          capturedAt: '2026-01-01T00:00:00.000Z',
          screenshotBase64: 'abc',
        },
      ],
    };

    const result = await teachRoute.teachSaveSkill.handle({
      input,
      context: {} as never,
    });

    expect(saveTeachSkill).toHaveBeenCalledWith(input);
    expect(result).toEqual(summary);
  });

  it('returns saved skill summaries', async () => {
    const summaries: TeachSkillSummary[] = [
      {
        id: 'skill-1',
        name: 'Skill 1',
        goal: 'Goal 1',
        model: 'gpt-5.3-codex',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        stepCount: 2,
      },
    ];

    (listTeachSkills as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      summaries,
    );

    const result = await teachRoute.teachListSkills.handle({
      input: undefined,
      context: {} as never,
    });

    expect(result).toEqual(summaries);
  });

  it('returns skill detail by id', async () => {
    const detail: TeachSkillRecord = {
      version: 1,
      id: 'skill-1',
      name: 'Skill 1',
      goal: 'Goal 1',
      plan: 'Plan 1',
      model: 'gpt-5.3-codex',
      assetsDir: 'assets/skill-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      steps: [
        {
          id: 'step-1',
          title: 'Open browser',
          explanation: 'Explanation',
          expectedOutcome: 'Expected outcome',
          capturedAt: '2026-01-01T00:00:00.000Z',
          assetPath: 'assets/skill-1/step-001.jpg',
        },
      ],
    };

    (getTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      detail,
    );

    const result = await teachRoute.teachGetSkill.handle({
      input: { id: 'skill-1' },
      context: {} as never,
    });

    expect(getTeachSkill).toHaveBeenCalledWith('skill-1');
    expect(result).toEqual(detail);
  });

  it('replays teach skill by id', async () => {
    (replayTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        skillId: 'skill-1',
        totalSteps: 3,
        executedSteps: 2,
        skippedSteps: 1,
      },
    );

    const result = await teachRoute.teachReplaySkill.handle({
      input: { id: 'skill-1' },
      context: {} as never,
    });

    expect(replayTeachSkill).toHaveBeenCalledWith('skill-1');
    expect(result).toEqual({
      skillId: 'skill-1',
      totalSteps: 3,
      executedSteps: 2,
      skippedSteps: 1,
    });
  });

  it('exports teach skill to portable payload', async () => {
    const portable = {
      id: 'skill-1',
      name: 'Skill 1',
      goal: 'Goal 1',
      plan: 'Plan 1',
      model: 'gpt-5.3-codex',
      steps: [
        {
          id: 'step-1',
          title: 'Open browser',
          explanation: 'Explanation',
          expectedOutcome: 'Expected outcome',
          capturedAt: '2026-01-01T00:00:00.000Z',
          screenshotBase64: 'abc',
          actionType: 'wait',
          actionInputs: {},
        },
      ],
    };

    (exportTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      portable,
    );

    const result = await teachRoute.teachExportSkill.handle({
      input: { id: 'skill-1' },
      context: {} as never,
    });

    expect(exportTeachSkill).toHaveBeenCalledWith('skill-1');
    expect(result).toEqual(portable);
  });

  it('imports teach skill from portable payload', async () => {
    const portable = {
      id: 'skill-1',
      name: 'Skill 1',
      goal: 'Goal 1',
      plan: 'Plan 1',
      model: 'gpt-5.3-codex',
      steps: [
        {
          id: 'step-1',
          title: 'Open browser',
          explanation: 'Explanation',
          expectedOutcome: 'Expected outcome',
          capturedAt: '2026-01-01T00:00:00.000Z',
          screenshotBase64: 'abc',
          actionType: 'wait',
          actionInputs: {},
        },
      ],
    };

    (importTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: 'skill-1',
        name: 'Skill 1',
        goal: 'Goal 1',
        model: 'gpt-5.3-codex',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        stepCount: 1,
      },
    );

    const result = await teachRoute.teachImportSkill.handle({
      input: portable,
      context: {} as never,
    });

    expect(importTeachSkill).toHaveBeenCalledWith(portable);
    expect(result.stepCount).toBe(1);
  });

  it('deletes teach skill by id', async () => {
    (deleteTeachSkill as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: 'skill-1',
        deleted: true,
      },
    );

    const result = await teachRoute.teachDeleteSkill.handle({
      input: { id: 'skill-1' },
      context: {} as never,
    });

    expect(deleteTeachSkill).toHaveBeenCalledWith('skill-1');
    expect(result).toEqual({ id: 'skill-1', deleted: true });
  });
});
