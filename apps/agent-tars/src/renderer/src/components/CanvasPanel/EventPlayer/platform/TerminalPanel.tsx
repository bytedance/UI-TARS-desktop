import { useThemeMode } from '@renderer/hooks/useThemeMode';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalPanelProps {
  command: string;
  result?: any;
}

export function TerminalPanel({ command, result }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const isDarkMode = useThemeMode();

  useEffect(() => {
    if (!terminalRef.current) return;

    const lightTheme = {
      background: '#ffffff',
      foreground: '#2e2e2e',
      cursor: '#333333',
      selectionBackground: '#b3d7ff',
      black: '#2e2e2e',
      brightBlack: '#666666',
      red: '#e34747',
      brightRed: '#f14c4c',
      green: '#09a16d',
      brightGreen: '#23d18b',
      yellow: '#c5a332',
      brightYellow: '#f5f543',
      blue: '#0098dd',
      brightBlue: '#3b8eea',
      magenta: '#bc3fbc',
      brightMagenta: '#d670d6',
      cyan: '#11a8cd',
      brightCyan: '#29b8db',
      white: '#e5e5e5',
      brightWhite: '#ffffff',
    };

    const darkTheme = {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selectionBackground: '#264f78',
      black: '#000000',
      brightBlack: '#666666',
      red: '#cd3131',
      brightRed: '#f14c4c',
      green: '#0dbc79',
      brightGreen: '#23d18b',
      yellow: '#e5e510',
      brightYellow: '#f5f543',
      blue: '#2472c8',
      brightBlue: '#3b8eea',
      magenta: '#bc3fbc',
      brightMagenta: '#d670d6',
      cyan: '#11a8cd',
      brightCyan: '#29b8db',
      white: '#e5e5e5',
      brightWhite: '#ffffff',
    };

    const term = new Terminal({
      theme: isDarkMode.value ? darkTheme : lightTheme,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      // padding: 8,
      // rendererType: 'canvas',
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    xtermRef.current = term;
    term.open(terminalRef.current);
    fitAddon.fit();

    const updateTerminalSize = () => {
      if (terminalRef.current && xtermRef.current) {
        const { offsetWidth, offsetHeight } = terminalRef.current;
        const cols = Math.floor(offsetWidth / 9);
        const rows = Math.floor(offsetHeight / 17);
        xtermRef.current.resize(cols, rows);
        fitAddon.fit();
      }
    };

    const resizeObserver = new ResizeObserver(updateTerminalSize);
    resizeObserver.observe(terminalRef.current);

    term.writeln('\x1b[32m$\x1b[0m ' + command);

    if (result) {
      result.forEach((item) => {
        term.writeln(item.text);
      });
    }

    const resizeHandler = () => fitAddon.fit();
    window.addEventListener('resize', resizeHandler);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeHandler);
      term.dispose();
    };
  }, [command, result, isDarkMode.value]);

  return (
    <div
      className={`w-full h-full min-h-[300px] rounded-lg overflow-hidden relative border ${
        isDarkMode.value
          ? 'border-gray-700 bg-[#1e1e1e]'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="w-full h-full absolute inset-0 p-2" ref={terminalRef} />
    </div>
  );
}
