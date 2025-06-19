import React, { useState, useEffect, useRef } from 'react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  markdown: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ markdown }) => {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Observer reference
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Reference to the TOC container
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Extract headings from markdown
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = [...markdown.matchAll(headingRegex)];

    const tocItems: TOCItem[] = matches
      .map(match => {
        const level = match[1].length;
        const text = match[2];
        const id = text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '-');

        return {
          id,
          text,
          level,
        };
      })
      // Filter out h1 headings
      .filter((item, index) => {
        if (index === 0 && item.level === 1) {
          return false;
        }
        return true;
      });

    setItems(tocItems);
  }, [markdown]);

  // Set up intersection observer to track visible headings
  useEffect(() => {
    if (items.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create a new intersection observer
    const observer = new IntersectionObserver(
      entries => {
        // Get all entries that are currently visible
        const visibleEntries = entries.filter(entry => entry.isIntersecting);

        // If we have visible entries, use the first one (topmost)
        if (visibleEntries.length > 0) {
          // Get the ID from the element
          const id = visibleEntries[0].target.id;
          setActiveId(id);
        }
      },
      {
        rootMargin: '-60px 0px -80% 0px', // Adjust rootMargin to fine-tune when headings are considered visible
        threshold: 0.1, // Trigger when at least 10% of the heading is visible
      },
    );

    // Observe all section headings
    items.forEach(item => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    // Store observer reference
    observerRef.current = observer;

    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, [items]);

  // Handle initial active heading when page loads with a hash
  useEffect(() => {
    if (window.location.hash && items.length > 0) {
      const hash = window.location.hash.substring(1);
      setActiveId(hash);
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div ref={tocRef} className="sticky top-0 max-h-[calc(100vh-8rem)] overflow-y-auto z-10">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 shadow-lg">
        <h4 className="text-sm font-medium text-white/70 mb-3">Table of Contents</h4>
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={index} style={{ paddingLeft: `${(item.level - 2) * 12}px` }}>
              <a
                href={`#${item.id}`}
                className={`text-sm block py-1 transition-colors ${
                  activeId === item.id
                    ? 'text-purple-400 font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={e => {
                  e.preventDefault();
                  const element = document.getElementById(item.id);
                  if (element) {
                    // Update URL without page reload
                    window.history.pushState(null, '', `#${item.id}`);
                    // Scroll to target element with smooth behavior
                    element.scrollIntoView({ behavior: 'smooth' });
                    // Update active ID
                    setActiveId(item.id);
                  }
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TableOfContents;
