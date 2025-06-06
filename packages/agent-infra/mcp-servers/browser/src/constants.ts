import { KeyInput } from 'puppeteer-core';

export const keyInputValues: KeyInput[] = [
  // 控制键
  'Enter',
  'Tab',
  'Escape',
  'Backspace',
  'Delete',
  'Insert',

  // 功能键
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',

  // 导航键
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',

  // 修饰键
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight', // Command/Windows 键

  // 其他特殊键
  'CapsLock',
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'ContextMenu',
];
