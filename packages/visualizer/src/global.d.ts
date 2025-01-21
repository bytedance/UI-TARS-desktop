/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
declare module '*.svg' {
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      style?: React.CSSProperties; // 确保包含 style 属性
    }
  >;

  // const content: string;
  export default ReactComponent;
}

declare module '*.png' {
  export default string;
}

declare module '*.svg?react' {
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      style?: React.CSSProperties; // 确保包含 style 属性
    }
  >;
  export default ReactComponent;
}
