import React from 'react';
import { useI18n } from 'rspress/runtime';
import { FaGithub, FaTwitter } from 'react-icons/fa';
import { ActionCard } from './ActionCard';
import { ActionCardContainer } from './ActionCardContainer';

export interface SocialCalloutProps {
  /**
   * Custom class name
   */
  className?: string;

  /**
   * Whether to show GitHub call-to-action
   * @default true
   */
  showGitHub?: boolean;

  /**
   * Whether to show Twitter call-to-action
   * @default true
   */
  showTwitter?: boolean;

  /**
   * Custom GitHub repository URL
   * @default "https://github.com/bytedance/UI-TARS-desktop"
   */
  githubUrl?: string;

  /**
   * Custom Twitter profile URL
   * @default "https://x.com/agent_tars"
   */
  twitterUrl?: string;

  /**
   * Title for the section
   */
  title?: string;

  /**
   * Description for the section
   */
  description?: string;
}

export function SocialCallout({
  className = '',
  showGitHub = true,
  showTwitter = true,
  githubUrl = 'https://github.com/bytedance/UI-TARS-desktop',
  twitterUrl = 'https://x.com/agent_tars',
  title,
  description,
}: SocialCalloutProps) {
  const t = useI18n<typeof import('i18n')>();

  // Fallback to translation keys if title/description are not provided
  const displayTitle = title || 'Support the Project';
  const displayDescription =
    description || 'Your attention will make Agent TARS better and better ❤️';

  return (
    <div className={`my-8 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">{displayTitle}</h3>
        <p className="text-gray-600 dark:text-gray-400">{displayDescription}</p>
      </div>

      <ActionCardContainer minCardWidth="200px" gap="1.5rem">
        {showGitHub && (
          <ActionCard
            title="Star on GitHub"
            description="Help us reach more developers by starring our project"
            icon={<GithubIcon />}
            href={githubUrl}
            color="blue"
            className="github-card transform transition-transform hover:scale-105"
            forceTraditionalLink={true}
          />
        )}

        {showTwitter && (
          <ActionCard
            title="Follow on Twitter"
            description="Get the latest updates and announcements"
            icon={<TwitterIcon />}
            href={twitterUrl}
            color="purple"
            className="twitter-card transform transition-transform hover:scale-105"
            forceTraditionalLink={true}
          />
        )}
      </ActionCardContainer>
    </div>
  );
}

// Custom styled GitHub icon
function GithubIcon() {
  return (
    <div className="flex items-center justify-center">
      <FaGithub className="text-2xl" />
    </div>
  );
}

// Custom styled Twitter icon
function TwitterIcon() {
  return (
    <div className="flex items-center justify-center">
      <FaTwitter className="text-2xl" />
    </div>
  );
}
