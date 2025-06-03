import React from 'react';

interface HeaderAnchorProps {
  id: string;
}

/**
 * Component that renders an anchor link for headers
 * Allows users to copy direct links to specific sections
 */
export const HeaderAnchor: React.FC<HeaderAnchorProps> = ({ id }) => {
  // Copy the full URL with hash to clipboard
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
  };

  // Handle anchor click to update URL and scroll smoothly
  const handleAnchorClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Update URL without page reload
    window.history.pushState(null, '', `#${id}`);

    // Scroll to target element
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${id}`}
      onClick={handleAnchorClick}
      className="opacity-0 group-hover:opacity-100 ml-2 text-gray-500 hover:text-blue-400 transition-all"
      title="Copy link to this section"
      aria-label="Copy link to this section"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
        onClick={e => {
          e.preventDefault();
          handleCopyLink();
        }}
      >
        <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
        <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
      </svg>
    </a>
  );
};
