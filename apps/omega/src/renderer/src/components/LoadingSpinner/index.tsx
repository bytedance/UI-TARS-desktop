import { Loader2 } from 'lucide-react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinnerWrapper = styled.div<{ size?: number; color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    animation: ${spin} 1.5s linear infinite;
    width: ${(props) => props.size || 16}px;
    height: ${(props) => props.size || 16}px;
    color: ${(props) => props.color || 'var(--ai-color-primary)'};
  }
`;

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size, color }: LoadingSpinnerProps) {
  return (
    <SpinnerWrapper size={size} color={color}>
      <Loader2 />
    </SpinnerWrapper>
  );
}
