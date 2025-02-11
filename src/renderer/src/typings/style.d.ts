/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
declare module '*.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*?url' {
  const value: string;
  export default value;
}

declare module '*.png?asset' {
  export default string;
}
