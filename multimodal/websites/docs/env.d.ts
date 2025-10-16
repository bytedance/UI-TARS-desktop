/// <reference types="@rspress/theme-default" />

// Virtual module for build-time injected showcase data
declare module 'showcase-data' {
  import type { ApiShareItem } from './src/services/api';
  export const showcaseData: ApiShareItem[];
  export const lastUpdated: string;
}
