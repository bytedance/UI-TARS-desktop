import React from 'react';
import { Link } from './Link';
import { useLocation } from 'rspress/runtime';

export function StatusBar() {
  const location = useLocation();

  if (location.pathname.includes('blog')) {
    return null;
  }

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
      <Link
        href="/blog/2025-06-25-introducing-agent-tars-beta.html"
        className="underline hover:no-underline font-semibold ml-1"
      >
        Check out our announcement blog →
      </Link>
    </div>
  );
}
