/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { launchApp, adbClick, adbBack, adbHome, adbWake } from '../app-launcher';

describe('app-launcher argument sanitization', () => {
  describe('launchApp', () => {
    it('should reject deviceId with shell injection characters', () => {
      expect(() => launchApp('device1; rm -rf /', 'com.example.app')).toThrow();
    });

    it('should reject pkg with shell injection characters', () => {
      expect(() => launchApp('device1', 'com.example.app; rm -rf /')).toThrow();
    });

    it('should accept valid package names', () => {
      // This will fail at ADB level (no device), but should NOT throw sanitization error
      try {
        launchApp('emulator-5554', 'com.example.app');
      } catch (err: any) {
        // ADB error is expected, but NOT sanitization error
        expect(err.message).not.toContain('Invalid argument');
      }
    });

    it('should accept valid device IDs with dots and hyphens', () => {
      try {
        launchApp('192.168.1.1:5555', 'com.app');
      } catch (err: any) {
        expect(err.message).not.toContain('Invalid argument');
      }
    });

    it('should reject pkg with spaces', () => {
      expect(() => launchApp('device1', 'com.example app')).toThrow('Invalid argument');
    });
  });

  describe('adbClick', () => {
    it('should reject deviceId with injection characters', () => {
      expect(() => adbClick('device; evil', 100, 200)).toThrow('Invalid argument');
    });
  });

  describe('adbBack', () => {
    it('should reject deviceId with injection characters', () => {
      expect(() => adbBack('device; evil')).toThrow('Invalid argument');
    });
  });

  describe('adbHome', () => {
    it('should reject deviceId with injection characters', () => {
      expect(() => adbHome('device; evil')).toThrow('Invalid argument');
    });
  });

  describe('adbWake', () => {
    it('should reject deviceId with injection characters', () => {
      expect(() => adbWake('device; evil')).toThrow('Invalid argument');
    });
  });
});
