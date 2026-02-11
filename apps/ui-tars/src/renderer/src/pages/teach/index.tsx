/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Loader2, Plus, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@renderer/api';
import { useSetting } from '@renderer/hooks/useSetting';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Separator } from '@renderer/components/ui/separator';
import { Textarea } from '@renderer/components/ui/textarea';
import type {
  TeachSkillPortable,
  TeachSkillRecord,
  TeachSkillStepInput,
  TeachSkillSummary,
} from '@main/services/teachSkills';

type TeachPhase = 'planning' | 'recording' | 'review';

type StepDraft = TeachSkillStepInput & {
  screenshotDataUrl: string;
  actionInputsRaw: string;
};

const createStepId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

export default function TeachModePage() {
  const { settings } = useSetting();

  const [phase, setPhase] = useState<TeachPhase>('planning');
  const [skillName, setSkillName] = useState('');
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [pendingStep, setPendingStep] = useState<StepDraft | null>(null);
  const [savedSkills, setSavedSkills] = useState<TeachSkillSummary[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<TeachSkillRecord | null>(
    null,
  );

  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [replayingSkillId, setReplayingSkillId] = useState<string | null>(null);
  const [exportingSkillId, setExportingSkillId] = useState<string | null>(null);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const modelName = settings.vlmModelName || 'unknown-model';

  const refreshSavedSkills = useCallback(async () => {
    setIsLoadingSkills(true);
    try {
      const skills = await api.teachListSkills();
      setSavedSkills(skills);
    } catch (error) {
      toast.error('Failed to load saved teach skills', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    refreshSavedSkills();
  }, [refreshSavedSkills]);

  const startRecording = () => {
    if (!goal.trim()) {
      toast.error('Please set a learning goal before starting Teach mode');
      return;
    }
    setPhase('recording');
  };

  const captureStep = async () => {
    setIsCapturing(true);
    try {
      const snapshot = await api.teachCaptureSnapshot();
      const nextStepIndex = steps.length + 1;
      setPendingStep({
        id: createStepId(),
        title: `Step ${nextStepIndex}`,
        explanation: '',
        expectedOutcome: '',
        actionType: '',
        actionInputs: {},
        actionInputsRaw: '',
        capturedAt: new Date().toISOString(),
        screenshotBase64: snapshot.base64,
        screenshotDataUrl: `data:${snapshot.mime};base64,${snapshot.base64}`,
      });
    } catch (error) {
      toast.error('Failed to capture step screenshot', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const commitPendingStep = (skipExplanation = false) => {
    if (!pendingStep) {
      return;
    }

    let parsedActionInputs: Record<string, unknown> = {};
    if (pendingStep.actionInputsRaw.trim()) {
      try {
        parsedActionInputs = JSON.parse(pendingStep.actionInputsRaw) as Record<
          string,
          unknown
        >;
      } catch {
        toast.error('Action inputs must be valid JSON');
        return;
      }
    }

    setSteps((current) => [
      ...current,
      {
        ...pendingStep,
        explanation: skipExplanation ? '' : pendingStep.explanation,
        actionInputs: parsedActionInputs,
      },
    ]);
    setPendingStep(null);
  };

  const replaySkill = async (skillId: string) => {
    if (!window.confirm('Replay this skill on local computer now?')) {
      return;
    }

    setReplayingSkillId(skillId);
    try {
      const result = await api.teachReplaySkill({ id: skillId });
      toast.success('Teach skill replay completed', {
        description: `Executed ${result.executedSteps}/${result.totalSteps} steps (${result.skippedSteps} skipped)`,
      });
    } catch (error) {
      toast.error('Teach skill replay failed', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setReplayingSkillId(null);
    }
  };

  const exportSkill = async (skillId: string) => {
    setExportingSkillId(skillId);
    try {
      const portableSkill = await api.teachExportSkill({ id: skillId });
      const blob = new Blob([JSON.stringify(portableSkill, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${portableSkill.id}.skill.export.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Skill exported');
    } catch (error) {
      toast.error('Failed to export skill', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setExportingSkillId(null);
    }
  };

  const importSkill = async (event: ChangeEvent<HTMLInputElement>) => {
    const targetFile = event.target.files?.[0];
    if (!targetFile) {
      return;
    }

    setIsImporting(true);
    try {
      const content = await targetFile.text();
      const payload = JSON.parse(content) as TeachSkillPortable;
      const summary = await api.teachImportSkill(payload);
      toast.success('Skill imported', {
        description: summary.name,
      });
      await refreshSavedSkills();
    } catch (error) {
      toast.error('Failed to import skill', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  const deleteSkill = async (skillId: string) => {
    if (!window.confirm('Delete this teach skill and all saved screenshots?')) {
      return;
    }

    setDeletingSkillId(skillId);
    try {
      await api.teachDeleteSkill({ id: skillId });
      toast.success('Skill deleted');
      if (selectedSkill?.id === skillId) {
        setSelectedSkill(null);
      }
      await refreshSavedSkills();
    } catch (error) {
      toast.error('Failed to delete skill', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setDeletingSkillId(null);
    }
  };

  const finishTraining = async () => {
    if (!steps.length) {
      toast.error('Record at least one step before finishing training');
      return;
    }

    setIsSaving(true);
    try {
      const payloadSteps: TeachSkillStepInput[] = steps.map((step) => ({
        id: step.id,
        title: step.title,
        explanation: step.explanation,
        expectedOutcome: step.expectedOutcome,
        capturedAt: step.capturedAt,
        screenshotBase64: step.screenshotBase64,
        actionType: step.actionType,
        actionInputs: step.actionInputs,
      }));

      const summary = await api.teachSaveSkill({
        name: skillName.trim() || `Teach Skill ${new Date().toLocaleString()}`,
        goal: goal.trim(),
        plan: plan.trim(),
        model: modelName,
        steps: payloadSteps,
      });

      const detail = await api.teachGetSkill({ id: summary.id });
      setSelectedSkill(detail);
      setPhase('review');
      toast.success('Teach skill saved');
      await refreshSavedSkills();
    } catch (error) {
      toast.error('Failed to save teach skill', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const beginNewTraining = () => {
    setSteps([]);
    setPendingStep(null);
    setSelectedSkill(null);
    setPhase('planning');
  };

  const stepCountBadge = useMemo(
    () => `${steps.length} step(s)`,
    [steps.length],
  );

  return (
    <div className="h-full w-full p-6 space-y-4 overflow-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Teach Mode
          </CardTitle>
          <CardDescription>
            Demonstrate your workflow step-by-step. Capture the screen,
            optionally explain each action, and save a reusable skill file.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-12 gap-4 h-[calc(100%-120px)]">
        <Card className="col-span-8 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline">Phase: {phase}</Badge>
              <Badge variant="secondary">Model: {modelName}</Badge>
              <Badge variant="outline">{stepCountBadge}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden space-y-4">
            {phase === 'planning' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill name</label>
                  <Input
                    value={skillName}
                    onChange={(event) => setSkillName(event.target.value)}
                    placeholder="Example: Booking travel through browser"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Learning goal</label>
                  <Textarea
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="What should the skill accomplish?"
                    className="min-h-28"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Suggested plan (optional)
                  </label>
                  <Textarea
                    value={plan}
                    onChange={(event) => setPlan(event.target.value)}
                    placeholder="Optional checklist that the model should follow while learning"
                    className="min-h-28"
                  />
                </div>
                <Button onClick={startRecording}>Start training session</Button>
              </div>
            )}

            {phase === 'recording' && (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Perform one action on your desktop, then capture it. The
                    model will ask for optional explanation before the step is
                    saved.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={captureStep}
                      disabled={isCapturing || !!pendingStep}
                    >
                      {isCapturing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Capture step
                    </Button>
                    <Button
                      onClick={finishTraining}
                      disabled={isSaving || !steps.length}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Finish training
                    </Button>
                  </div>
                </div>

                {pendingStep && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Pending step</CardTitle>
                      <CardDescription>
                        Do you want to add explanation for this step?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <img
                        src={pendingStep.screenshotDataUrl}
                        alt="Captured step"
                        className="w-full max-h-56 object-contain border rounded-md bg-white"
                      />
                      <Input
                        value={pendingStep.title}
                        onChange={(event) =>
                          setPendingStep({
                            ...pendingStep,
                            title: event.target.value,
                          })
                        }
                        placeholder="Step title"
                      />
                      <Textarea
                        value={pendingStep.explanation}
                        onChange={(event) =>
                          setPendingStep({
                            ...pendingStep,
                            explanation: event.target.value,
                          })
                        }
                        placeholder="Optional explanation of why this action is needed"
                      />
                      <Input
                        value={pendingStep.expectedOutcome}
                        onChange={(event) =>
                          setPendingStep({
                            ...pendingStep,
                            expectedOutcome: event.target.value,
                          })
                        }
                        placeholder="Optional expected outcome"
                      />
                      <Input
                        value={pendingStep.actionType || ''}
                        onChange={(event) =>
                          setPendingStep({
                            ...pendingStep,
                            actionType: event.target.value,
                          })
                        }
                        placeholder="Optional action type for replay (e.g. click, type, hotkey, wait)"
                      />
                      <Textarea
                        value={pendingStep.actionInputsRaw}
                        onChange={(event) =>
                          setPendingStep({
                            ...pendingStep,
                            actionInputsRaw: event.target.value,
                          })
                        }
                        placeholder='Optional action inputs JSON for replay (e.g. {"content":"hello"})'
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => commitPendingStep(false)}>
                          Save with explanation
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => commitPendingStep(true)}
                        >
                          Skip explanation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <ScrollArea className="flex-1 rounded-md border">
                  <div className="p-3 space-y-2">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="border rounded-md p-2 bg-background space-y-1"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {index + 1}. {step.title}
                          </span>
                          <Badge variant="outline">
                            {new Date(step.capturedAt).toLocaleTimeString()}
                          </Badge>
                        </div>
                        {step.explanation && (
                          <p className="text-xs text-muted-foreground">
                            {step.explanation}
                          </p>
                        )}
                        {step.actionType && (
                          <p className="text-xs text-muted-foreground">
                            Replay action: {step.actionType}
                          </p>
                        )}
                      </div>
                    ))}
                    {!steps.length && (
                      <p className="text-sm text-muted-foreground">
                        No saved steps yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {phase === 'review' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Skill file saved successfully. You can review metadata and
                    start another training session.
                  </p>
                  <Button variant="outline" onClick={beginNewTraining}>
                    Start new training
                  </Button>
                </div>

                {selectedSkill && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {selectedSkill.name}
                      </CardTitle>
                      <CardDescription>{selectedSkill.goal}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Version {selectedSkill.version} •{' '}
                        {selectedSkill.steps.length} steps • Updated{' '}
                        {new Date(selectedSkill.updatedAt).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Skill library</CardTitle>
            <CardDescription>
              Saved teach sessions on this machine
            </CardDescription>
            <div className="pt-1">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={importSkill}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import skill file
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full rounded-md border">
              <div className="p-3 space-y-2">
                {savedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-md border p-2 space-y-2"
                  >
                    <button
                      type="button"
                      className="w-full text-left hover:bg-accent rounded-sm p-1 transition"
                      onClick={async () => {
                        const detail = await api.teachGetSkill({
                          id: skill.id,
                        });
                        setSelectedSkill(detail);
                        setPhase('review');
                      }}
                    >
                      <p className="text-sm font-medium truncate">
                        {skill.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {skill.stepCount} step(s) • {skill.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(skill.updatedAt).toLocaleString()}
                      </p>
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => replaySkill(skill.id)}
                      disabled={replayingSkillId === skill.id}
                    >
                      {replayingSkillId === skill.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Replay on local computer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full"
                      onClick={() => exportSkill(skill.id)}
                      disabled={exportingSkillId === skill.id}
                    >
                      {exportingSkillId === skill.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Export portable file
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={() => deleteSkill(skill.id)}
                      disabled={deletingSkillId === skill.id}
                    >
                      {deletingSkillId === skill.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Delete skill
                    </Button>
                  </div>
                ))}

                {!savedSkills.length && !isLoadingSkills && (
                  <p className="text-sm text-muted-foreground">
                    No skills saved yet.
                  </p>
                )}

                {isLoadingSkills && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading skills...
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
