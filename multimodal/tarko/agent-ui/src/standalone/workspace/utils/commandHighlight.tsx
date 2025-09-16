import React from 'react';

/**
 * Custom command highlighting function
 * Breaks down command line syntax into highlightable fragments
 */
export const highlightCommand = (command: string) => {
  // Split the command line, preserving content within quotes
  const tokenize = (cmd: string) => {
    const parts: React.ReactNode[] = [];

    // Regular expression patterns
    const patterns = [
      // Commands and subcommands (usually the first word)
      {
        pattern: /^[\w.-]+|(?<=\s|;|&&|\|\|)[\w.-]+(?=\s|$)/,
        className: 'text-cyan-400 font-bold',
      },
      // Option flags (-v, --version etc.)
      { pattern: /(?<=\s|^)(-{1,2}[\w-]+)(?=\s|=|$)/, className: 'text-yellow-300' },
      // Paths and files
      {
        pattern: /(?<=\s|=|:|^)\/[\w./\\_-]+|\.\/?[\w./\\_-]+|~\/[\w./\\_-]+/,
        className: 'text-green-400',
      },
      // Quoted strings
      { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/, className: 'text-orange-300' },
      // Environment variables
      { pattern: /\$\w+|\$\{\w+\}/, className: 'text-accent-400' },
      // Output redirection
      { pattern: /(?<=\s)(>|>>|<|<<|2>|2>>|&>)(?=\s|$)/, className: 'text-blue-400 font-bold' },
      // Pipes and operators
      { pattern: /(?<=\s)(\||;|&&|\|\|)(?=\s|$)/, className: 'text-red-400 font-bold' },
    ];

    let remainingCmd = cmd;
    let lastIndex = 0;

    // Iterate to parse the command line
    while (remainingCmd) {
      let foundMatch = false;

      for (const { pattern, className } of patterns) {
        const match = remainingCmd.match(pattern);
        if (match && match.index === 0) {
          const value = match[0];
          if (lastIndex < match.index) {
            parts.push(
              <span key={`plain-${lastIndex}`}>{remainingCmd.slice(0, match.index)}</span>,
            );
          }

          parts.push(
            <span key={`highlight-${lastIndex}`} className={className}>
              {value}
            </span>,
          );

          remainingCmd = remainingCmd.slice(match.index + value.length);
          lastIndex += match.index + value.length;
          foundMatch = true;
          break;
        }
      }

      // If no pattern matches, add a plain character and continue
      if (!foundMatch) {
        parts.push(<span key={`char-${lastIndex}`}>{remainingCmd[0]}</span>);
        remainingCmd = remainingCmd.slice(1);
        lastIndex += 1;
      }
    }

    return parts;
  };

  const lines = command.split('\n');
  return lines.map((line, index) => (
    <div key={index} className="command-line whitespace-pre-wrap break-words">
      {tokenize(line)}
    </div>
  ));
};

/**
 * Simple command highlighting for script display
 */
export const highlightSimpleCommand = (command: string) => {
  return (
    <div className="command-line whitespace-nowrap">
      <span className="text-cyan-400 font-bold">{command}</span>
    </div>
  );
};
