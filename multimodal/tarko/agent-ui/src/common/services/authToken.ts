/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Access token the server asks for when it is reachable beyond the machine it
 * runs on.
 *
 * The server prints a link carrying `?token=`, so the token arrives once in the
 * page URL. It is kept in `sessionStorage` and stripped from the address bar
 * afterwards, which keeps it out of shared links, bookmarks and the browser
 * history while surviving reloads within the tab.
 *
 * Servers bound to loopback require no token, and there this module stays
 * inert: nothing is stored and no header is added.
 */

const STORAGE_KEY = 'tarko.auth.token';
const QUERY_KEY = 'token';

let cachedToken: string | null = null;
let initialized = false;

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Private modes and embedded webviews can refuse storage; the token still
    // works for this page load through the in-memory copy.
    return null;
  }
}

function persistToken(token: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Ignored for the same reason as above.
  }
}

function stripTokenFromLocation(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(QUERY_KEY)) {
    return;
  }
  url.searchParams.delete(QUERY_KEY);
  window.history.replaceState(window.history.state, '', url.toString());
}

function initialize(): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  const fromQuery = new URL(window.location.href).searchParams.get(QUERY_KEY);
  if (fromQuery) {
    cachedToken = fromQuery;
    persistToken(fromQuery);
    stripTokenFromLocation();
    return;
  }

  cachedToken = readStoredToken();
}

export function getAuthToken(): string | null {
  initialize();
  return cachedToken;
}

/**
 * Authorization header for API calls, empty when the server wants no token.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
