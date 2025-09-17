import React from 'react';

// Basic HTML primitives to replace simple MUI components

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  component?: keyof JSX.IntrinsicElements;
}

export const Box: React.FC<BoxProps> = ({
  children,
  component: Component = 'div',
  style,
  className,
  ...props
}) => {
  return React.createElement(
    Component,
    {
      ...props,
      className,
      style,
    },
    children,
  );
};

// Typography 组件已删除 - 直接使用原生 HTML 元素更简单

export interface CircularProgressProps {
  size?: number;
  thickness?: number;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 40,
  thickness = 3.6,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        animation: 'spin 1s linear infinite',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={thickness}
          fill="none"
          strokeDasharray="31.416"
          strokeDashoffset="7.854"
          strokeLinecap="round"
        />
      </svg>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `,
        }}
      />
    </div>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  style,
  className,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: '8px',
    transition: 'background-color 150ms ease-in-out',
  };

  const combinedStyle = { ...baseStyle, ...style };

  return (
    <button {...props} className={className} style={combinedStyle}>
      {children}
    </button>
  );
};

// Divider 组件已删除 - 未被使用，可直接用 <hr> 或 MenuDivider
