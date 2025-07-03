import React from 'react';
import './Banner.css';

export interface BannerProps {
  /**
   * Banner title
   */
  title: string;

  /**
   * Optional highlighted part of the title
   */
  highlightText?: string;

  /**
   * Optional subtitle
   */
  subtitle?: string;

  /**
   * Optional superscript text
   * @default "*"
   */
  supText?: string;

  /**
   * Whether to show the superscript
   * @default true
   */
  showSup?: boolean;

  /**
   * Primary color for highlighted text and subtitle
   * @default "var(--accent)" (cyan color)
   */
  accentColor?: string;

  /**
   * Title font family
   * @default "font-mono-bolder-italic"
   */
  titleFont?: string;

  /**
   * Subtitle font family
   * @default "font-condensed"
   */
  subtitleFont?: string;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Banner component for ultra-wide screen display
 *
 * @example
 * ```tsx
 * <Banner
 *   title="AGENT"
 *   highlightText="TARS"
 *   subtitle="AN OPEN-SOURCE MULTIMODAL AI AGENT"
 * />
 * ```
 *
 * @example With custom superscript
 * ```tsx
 * <Banner
 *   title="AGENT"
 *   highlightText="TARS"
 *   subtitle="AN OPEN-SOURCE MULTIMODAL AI AGENT"
 *   supText="v2.0"
 * />
 * ```
 *
 * @example Without superscript
 * ```tsx
 * <Banner
 *   title="AGENT"
 *   highlightText="TARS"
 *   subtitle="AN OPEN-SOURCE MULTIMODAL AI AGENT"
 *   showSup={false}
 * />
 * ```
 */
export function Banner({
  title,
  highlightText,
  subtitle,
  supText = '*',
  showSup = true,
  accentColor = 'var(--accent)',
  titleFont = 'font-mono-bolder-italic',
  subtitleFont = 'font-condensed',
  className = '',
}: BannerProps) {
  return (
    <div className={`banner-container ${className}`}>
      {/* Background elements */}
      <div className="banner-grid-bg"></div>

      {/* Main content */}
      <div className="banner-content">
        <h1 className={`banner-title ${titleFont}`}>
          {title}{' '}
          {highlightText && (
            <span
              className="banner-highlight"
              style={{
                color: accentColor,
              }}
            >
              {highlightText}
            </span>
          )}
          {showSup && <sup>{supText}</sup>}
        </h1>

        {subtitle && (
          <p
            className={`banner-subtitle ${subtitleFont}`}
            style={{
              color: accentColor,
              textShadow: `0 0 15px ${accentColor}`,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
