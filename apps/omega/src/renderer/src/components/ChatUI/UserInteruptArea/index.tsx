import { useState } from 'react';
import {
  currentAgentFlowIdRefAtom,
  globalEventEmitter,
} from '@renderer/state/chat';
import { useAtom } from 'jotai';
import styled, { keyframes } from 'styled-components';
import { Send } from 'lucide-react';

interface UserInteruptAreaProps {
  isDark?: boolean;
  onSubmit?: (value: string) => void;
}

const flowAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const FlowContainer = styled.div<{ isDark: boolean }>`
  position: relative;
  width: 100%;
  padding: 2px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    rgba(160, 124, 254, 0.8),
    rgba(254, 143, 181, 0.8),
    rgba(1, 111, 238, 0.8),
    rgba(160, 124, 254, 0.8)
  );
  background-size: 300% 300%;
  animation: ${flowAnimation} 8s linear infinite;

  &::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 15px;
    background: ${(props) => (props.isDark ? '#1a1a1a' : '#ffffff')};
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding-left: 16px;
  padding-right: 8px;
`;

const StyledInput = styled.input<{ isDark: boolean }>`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${(props) => (props.isDark ? '#ffffff' : '#000000')};
  font-size: 0.95rem;
  padding: 2px 0;
  &::placeholder {
    color: ${(props) => (props.isDark ? '#666666' : '#999999')};
  }
`;

const StyledButton = styled.button<{ isDark: boolean; disabled?: boolean }>`
  position: relative;
  background: ${(props) =>
    props.isDark
      ? 'linear-gradient(135deg, rgba(1, 111, 238, 0.9), rgba(1, 86, 208, 0.9))'
      : 'linear-gradient(135deg, rgba(1, 119, 255, 0.9), rgba(1, 111, 238, 0.9))'};
  color: white;
  border: none;
  padding: 8px;
  margin: 2px;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px
    ${(props) =>
      props.isDark ? 'rgba(1, 111, 238, 0.2)' : 'rgba(1, 111, 238, 0.15)'};

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 16px
      ${(props) =>
        props.isDark ? 'rgba(1, 111, 238, 0.4)' : 'rgba(1, 111, 238, 0.25)'};
    background: ${(props) =>
      props.isDark
        ? 'linear-gradient(135deg, rgba(1, 119, 255, 0.95), rgba(1, 86, 208, 0.95))'
        : 'linear-gradient(135deg, rgba(1, 127, 255, 0.95), rgba(1, 111, 238, 0.95))'};

    svg {
      transform: translate(1px, -1px);
    }
  }

  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow: 0 2px 4px
      ${(props) =>
        props.isDark ? 'rgba(1, 111, 238, 0.3)' : 'rgba(1, 111, 238, 0.2)'};
  }

  &::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1),
      transparent 50%
    );
    pointer-events: none;
  }
`;

export function UserInteruptArea({
  isDark = true,
  onSubmit,
}: UserInteruptAreaProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAgentFlowIdRef] = useAtom(currentAgentFlowIdRefAtom);

  const handleSubmit = async () => {
    if (input.trim() && currentAgentFlowIdRef.current && !isSubmitting) {
      setIsSubmitting(true);
      try {
        onSubmit?.(input);
        globalEventEmitter.emit(currentAgentFlowIdRef.current, {
          type: 'user-interrupt',
          text: input.trim(),
        });
        setInput('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full px-4 py-2">
      <FlowContainer isDark={isDark}>
        <ContentWrapper>
          <StyledInput
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Insert new instructions in the process..."
            isDark={isDark}
            disabled={isSubmitting}
          />
          <StyledButton
            onClick={handleSubmit}
            isDark={isDark}
            disabled={isSubmitting}
          >
            <Send />
          </StyledButton>
        </ContentWrapper>
      </FlowContainer>
    </div>
  );
}
