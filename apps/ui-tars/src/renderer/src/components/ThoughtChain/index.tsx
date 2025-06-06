/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MousePointerClick } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';

import { PredictionParsed } from '@ui-tars/shared/types';
import { ActionIconMap } from '@renderer/const/actions';

interface ThoughtStepCardProps {
  step: PredictionParsed;
  index: number;
  onClick?: () => void;
  hasSomImage: boolean;
}

function ThoughtStepCard({ step, onClick, hasSomImage }: ThoughtStepCardProps) {
  const ActionIcon = ActionIconMap[step?.action_type] || MousePointerClick;

  return (
    <>
      {step.action_type && (
        <Button
          variant="outline"
          className="rounded-full mb-6"
          onClick={onClick}
          disabled={!hasSomImage}
        >
          <ActionIcon className="h-4 w-4" />
          {step.action_type === 'call_user' ? (
            'Waiting for user to take control'
          ) : (
            <>
              Action:
              <span className="text-gray-600 max-w-50 truncate">
                {step.action_type}
                {step.action_inputs?.start_box &&
                  ` (start_box: ${step.action_inputs.start_box})`}
                {step.action_inputs?.content &&
                  ` (${step.action_inputs.content})`}
                {step.action_inputs?.key && ` (${step.action_inputs.key})`}
              </span>
            </>
          )}
        </Button>
      )}
    </>
  );
}

interface ThoughtChainProps {
  steps: PredictionParsed[];
  hasSomImage: boolean;
  somImageHighlighted?: boolean;
  onClick?: () => void;
}

export default function ThoughtChain({
  steps,
  onClick,
  hasSomImage,
}: ThoughtChainProps) {
  const reflectionStep = steps?.find((step) => step.reflection);
  const thoughtStep = steps?.find((step) => step.thought);

  return (
    <div>
      {reflectionStep && (
        <div className="my-3">
          <p className="text-gray-600 whitespace-pre-wrap leading-7">
            {/* <span className="text-gray-900 font-medium">Reflection: </span> */}
            {reflectionStep.reflection}
          </p>
        </div>
      )}

      {thoughtStep?.thought && (
        <div className="my-3">
          <p className="text-gray-600 whitespace-pre-wrap leading-7">
            {thoughtStep.thought}
          </p>
        </div>
      )}

      {steps?.map?.((step, index) => (
        <ThoughtStepCard
          key={index}
          step={step}
          index={index}
          onClick={onClick}
          hasSomImage={hasSomImage}
        />
      ))}
    </div>
  );
}
