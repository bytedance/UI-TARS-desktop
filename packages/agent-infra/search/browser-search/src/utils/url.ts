/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safely parses a URL string into a URL object
 * @param url - The URL string to parse
 * @returns URL object or null if invalid
 */
const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/**
 * Converts a user-provided domain (with or without a scheme/path) to a
 * hostname that can be compared safely.
 */
const normalizeDomain = (domain: string) => {
  const value = domain.trim().toLowerCase().replace(/^\*\./, '');
  if (!value) return null;

  const parsed = parseUrl(value.includes('://') ? value : `https://${value}`);
  return parsed?.hostname.replace(/^\*\./, '').replace(/\.$/, '') || null;
};

/**
 * Normalizes and deduplicates excluded domains before they are used in search
 * engine queries or compared with result URLs.
 */
export const normalizeExcludedDomains = (domains: string[]) =>
  Array.from(
    new Set(
      domains
        .map(normalizeDomain)
        .filter((domain): domain is string => domain !== null),
    ),
  );

/**
 * Determines whether a URL belongs to one of the caller-provided excluded
 * domains. Subdomains are excluded as well, while lookalike hostnames such as
 * `example.com.evil.test` are not.
 */
export const shouldExcludeDomain = (url: string, excludedDomains: string[]) => {
  const hostname = parseUrl(url)?.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname) return false;

  return excludedDomains.some((domain) => {
    const excludedHostname = normalizeDomain(domain);
    return (
      excludedHostname !== null &&
      (hostname === excludedHostname ||
        hostname.endsWith(`.${excludedHostname}`))
    );
  });
};

/**
 * Determines if a domain should be skipped based on a blocklist
 * @param url - The URL to check
 * @returns True if the domain should be skipped, false otherwise
 */
export const shouldSkipDomain = (url: string) => {
  const parsed = parseUrl(url);
  if (!parsed) return true;

  const { hostname } = parsed;
  return [
    'reddit.com',
    'www.reddit.com',
    'x.com',
    'twitter.com',
    'www.twitter.com',
    'youtube.com',
    'www.youtube.com',
  ].includes(hostname);
};
