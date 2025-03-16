/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/dom/history/views.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
export interface Coordinates {
  x: number;
  y: number;
}

export interface CoordinateSet {
  topLeft: Coordinates;
  topRight: Coordinates;
  bottomLeft: Coordinates;
  bottomRight: Coordinates;
  center: Coordinates;
  width: number;
  height: number;
}

export interface ViewportInfo {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}
