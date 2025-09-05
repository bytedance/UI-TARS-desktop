/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const parseBoxToScreenCoords = ({
  boxStr,
  screenWidth,
  screenHeight,
  factors = [1000, 1000],
}: {
  boxStr: string; // the box string has been normalized, the value is the percentage of the actual width and height
  screenWidth: number;
  screenHeight: number;
  factors?: [number, number];
}) => {
  if (!boxStr) {
    return { x: null, y: null };
  }
  const coords = boxStr
    .replace('[', '')
    .replace(']', '')
    .split(',')
    .map((num) => parseFloat(num.trim()));

  const [x1, y1, x2 = x1, y2 = y1] = coords;
  // console.log('parseBoxToScreenCoords x1, y1, x2, y2:', x1, y1, x2, y2);

  const [widthFactor, heightFactor] = factors;
  // console.log('parseBoxToScreenCoords widthFactor, heightFactor:', widthFactor, heightFactor);

  return {
    x: Math.round(((x1 + x2) / 2) * screenWidth * widthFactor) / widthFactor,
    y: Math.round(((y1 + y2) / 2) * screenHeight * heightFactor) / heightFactor,
    percentX: x1,
    percentY: y1,
  };
};
