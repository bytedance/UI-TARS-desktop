import React from 'react';
import { useNavigate } from 'rspress/runtime';
import { useLocation } from 'rspress/runtime';

export function StatusBar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.includes('blog')) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/blog/2025-06-25-introducing-agent-tars-beta.html');
  };

  return (
    <div
      className="relative py-2 px-4 text-center text-white text-sm font-medium"
      style={{
        background:
          'linear-gradient(90deg, rgba(6,182,212,0.9) 0%, rgba(59,130,246,0.9) 50%, rgba(139,92,246,0.9) 100%)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <span>📝 Documentation actively under construction. </span>
      <a
        href="/blog/2025-06-25-introducing-agent-tars-beta.html"
        onClick={handleClick}
        className="underline hover:no-underline font-semibold ml-1"
      >
        Check out our announcement blog →
      </a>
    </div>
  );
}
