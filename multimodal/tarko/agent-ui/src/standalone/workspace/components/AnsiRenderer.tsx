import React from 'react';

/**
 * ANSI color codes mapping to Tailwind CSS classes
 */
const ANSI_COLORS = {
  // Standard colors (30-37, 90-97)
  30: 'text-black',
  31: 'text-red-400',
  32: 'text-green-400', 
  33: 'text-yellow-400',
  34: 'text-blue-400',
  35: 'text-purple-400',
  36: 'text-cyan-400',
  37: 'text-gray-300',
  
  // Bright colors (90-97)
  90: 'text-gray-500',
  91: 'text-red-300',
  92: 'text-green-300',
  93: 'text-yellow-300',
  94: 'text-blue-300',
  95: 'text-purple-300',
  96: 'text-cyan-300',
  97: 'text-white',
  
  // Background colors (40-47, 100-107)
  40: 'bg-black',
  41: 'bg-red-600',
  42: 'bg-green-600',
  43: 'bg-yellow-600',
  44: 'bg-blue-600',
  45: 'bg-purple-600',
  46: 'bg-cyan-600',
  47: 'bg-gray-300',
  
  // Bright background colors (100-107)
  100: 'bg-gray-700',
  101: 'bg-red-500',
  102: 'bg-green-500',
  103: 'bg-yellow-500',
  104: 'bg-blue-500',
  105: 'bg-purple-500',
  106: 'bg-cyan-500',
  107: 'bg-white',
} as const;

/**
 * ANSI text styles mapping
 */
const ANSI_STYLES = {
  1: 'font-bold',
  2: 'opacity-60', // dim
  3: 'italic',
  4: 'underline',
  9: 'line-through',
} as const;

interface AnsiSegment {
  text: string;
  classes: string[];
}

/**
 * Parse ANSI escape sequences and convert to styled segments
 */
function parseAnsiString(input: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let currentClasses: string[] = [];
  
  // ANSI escape sequence regex: \u001b[...m or \x1b[...m
  const ansiRegex = /\u001b\[(\d+(?:;\d+)*)m|\x1b\[(\d+(?:;\d+)*)m/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = ansiRegex.exec(input)) !== null) {
    // Add text before the escape sequence
    if (match.index > lastIndex) {
      const text = input.slice(lastIndex, match.index);
      if (text) {
        segments.push({ text, classes: [...currentClasses] });
      }
    }
    
    // Parse the ANSI codes
    const codes = (match[1] || match[2]).split(';').map(Number);
    
    for (const code of codes) {
      if (code === 0) {
        // Reset all styles
        currentClasses = [];
      } else if (code === 39) {
        // Reset foreground color
        currentClasses = currentClasses.filter(cls => 
          !Object.values(ANSI_COLORS).some(color => 
            cls === color && (color.startsWith('text-') || color === 'text-white')
          )
        );
      } else if (code === 49) {
        // Reset background color
        currentClasses = currentClasses.filter(cls => 
          !Object.values(ANSI_COLORS).some(color => 
            cls === color && color.startsWith('bg-')
          )
        );
      } else if (code in ANSI_COLORS) {
        const colorClass = ANSI_COLORS[code as keyof typeof ANSI_COLORS];
        
        // Remove existing color of same type (foreground/background)
        if (colorClass.startsWith('text-') || colorClass === 'text-white') {
          currentClasses = currentClasses.filter(cls => 
            !Object.values(ANSI_COLORS).some(color => 
              cls === color && (color.startsWith('text-') || color === 'text-white')
            )
          );
        } else if (colorClass.startsWith('bg-')) {
          currentClasses = currentClasses.filter(cls => 
            !Object.values(ANSI_COLORS).some(color => 
              cls === color && color.startsWith('bg-')
            )
          );
        }
        
        currentClasses.push(colorClass);
      } else if (code in ANSI_STYLES) {
        const styleClass = ANSI_STYLES[code as keyof typeof ANSI_STYLES];
        if (!currentClasses.includes(styleClass)) {
          currentClasses.push(styleClass);
        }
      }
    }
    
    lastIndex = ansiRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < input.length) {
    const text = input.slice(lastIndex);
    if (text) {
      segments.push({ text, classes: [...currentClasses] });
    }
  }
  
  // If no ANSI codes found, return the whole string as one segment
  if (segments.length === 0 && input) {
    segments.push({ text: input, classes: [] });
  }
  
  return segments;
}

interface AnsiRendererProps {
  children: string;
  className?: string;
}

/**
 * Component that renders text with ANSI escape codes as styled React elements
 */
export const AnsiRenderer: React.FC<AnsiRendererProps> = ({ 
  children, 
  className = '' 
}) => {
  const segments = parseAnsiString(children);
  
  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span 
          key={index} 
          className={segment.classes.join(' ')}
        >
          {segment.text}
        </span>
      ))}
    </span>
  );
};
