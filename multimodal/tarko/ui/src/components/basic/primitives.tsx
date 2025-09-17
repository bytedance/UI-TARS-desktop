import React from 'react';

// Basic HTML primitives to replace simple MUI components

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  component?: keyof JSX.IntrinsicElements;
  sx?: React.CSSProperties;
}

export const Box: React.FC<BoxProps> = ({
  children,
  component: Component = 'div',
  sx,
  style,
  className,
  ...props
}) => {
  const combinedStyle = { ...sx, ...style };

  return React.createElement(
    Component,
    {
      ...props,
      className,
      style: combinedStyle,
    },
    children,
  );
};

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  variant?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'body1'
    | 'body2'
    | 'caption'
    | 'subtitle1'
    | 'subtitle2';
  component?: keyof JSX.IntrinsicElements;
  sx?: React.CSSProperties;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',
  component,
  sx,
  style,
  className,
  ...props
}) => {
  // Map variants to default components and styles
  const variantConfig = {
    h1: { component: 'h1', fontSize: '2rem', fontWeight: 300, lineHeight: 1.167 },
    h2: { component: 'h2', fontSize: '1.5rem', fontWeight: 300, lineHeight: 1.2 },
    h3: { component: 'h3', fontSize: '1.25rem', fontWeight: 400, lineHeight: 1.167 },
    h4: { component: 'h4', fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.235 },
    h5: { component: 'h5', fontSize: '1rem', fontWeight: 400, lineHeight: 1.334 },
    h6: { component: 'h6', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.6 },
    subtitle1: { component: 'h6', fontSize: '1rem', fontWeight: 400, lineHeight: 1.75 },
    subtitle2: { component: 'h6', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.57 },
    body1: { component: 'p', fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { component: 'p', fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43 },
    caption: { component: 'span', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.66 },
  };

  const config = variantConfig[variant];
  const Component = component || config.component;
  const variantStyle = {
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    lineHeight: config.lineHeight,
    margin: 0,
  };

  const combinedStyle = { ...variantStyle, ...sx, ...style };

  return React.createElement(
    Component,
    {
      ...props,
      className,
      style: combinedStyle,
    },
    children,
  );
};

export interface CircularProgressProps {
  size?: number;
  thickness?: number;
  className?: string;
  sx?: React.CSSProperties;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 40,
  thickness = 3.6,
  className,
  sx,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        animation: 'spin 1s linear infinite',
        ...sx,
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
  size?: 'small' | 'medium' | 'large';
  sx?: React.CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  size = 'medium',
  sx,
  style,
  className,
  ...props
}) => {
  const sizeStyles = {
    small: { padding: '5px', fontSize: '1.125rem' },
    medium: { padding: '8px', fontSize: '1.5rem' },
    large: { padding: '12px', fontSize: '1.75rem' },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
    ...sizeStyles[size],
  };

  const combinedStyle = { ...baseStyle, ...sx, ...style };

  return (
    <button {...props} className={className} style={combinedStyle}>
      {children}
    </button>
  );
};

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  sx?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ orientation = 'horizontal', className, sx }) => {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    ...(orientation === 'horizontal'
      ? { height: '1px', width: '100%' }
      : { width: '1px', height: '100%' }),
  };

  const combinedStyle = { ...baseStyle, ...sx };

  return <hr className={className} style={combinedStyle} />;
};
