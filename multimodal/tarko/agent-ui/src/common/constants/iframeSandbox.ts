/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sandbox policies for frames that carry content the UI does not author.
 *
 * `allow-same-origin` lets a framed document keep its own origin. Whether that is safe
 * depends entirely on what "its own origin" resolves to:
 *
 * - `srcdoc` documents inherit the embedder's origin, so granting it there hands the UI's
 *   origin to the framed content. Combined with `allow-scripts` the sandbox is void and the
 *   content can reach `parent.document`, storage and same-origin APIs.
 * - A document loaded from a cross-origin URL keeps that remote origin, which the embedder is
 *   already walled off from, so the flag buys the framed app its own storage without giving it
 *   any reach into the UI.
 */

/** Preview of agent-authored HTML, always handed over through `srcDoc`: opaque origin only. */
export const HTML_PREVIEW_SANDBOX = 'allow-scripts';

/** Embedded tools (code-server, VNC) drive their own forms, popups and dialogs. */
const EMBED_FRAME_SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals';

/**
 * Sandbox for an embedded tool, decided per URL.
 *
 * Cross-origin `http(s)` targets keep `allow-same-origin`, because losing their origin also
 * loses their cookies, `localStorage` and same-origin requests. Anything that could end up
 * sharing this page's origin — a relative or same-origin URL, an unparsable one, or a scheme
 * such as `javascript:` or `data:` that inherits or opaques the origin — gets the strict policy.
 */
export function resolveEmbedFrameSandbox(src: string): string {
  try {
    const target = new URL(src, window.location.href);
    const isRemoteHttpOrigin =
      (target.protocol === 'https:' || target.protocol === 'http:') &&
      target.origin !== window.location.origin;

    if (isRemoteHttpOrigin) {
      return `${EMBED_FRAME_SANDBOX} allow-same-origin`;
    }
  } catch {
    // Unparsable URL: fall through to the strict policy
  }

  return EMBED_FRAME_SANDBOX;
}
