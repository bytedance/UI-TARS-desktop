/**
 * The following code is modified based on
 * https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/util.ts
 *
 * The MIT License (MIT)
 * Copyright (c) 2015 Loopline Systems
 * https://github.com/electron-userland/electron-builder/blob/master/LICENSE
 */

// if baseUrl path doesn't ends with /, this path will be not prepended to passed pathname for new URL(input, base)
import { URL } from 'url';

// addRandomQueryToAvoidCaching is false by default because in most cases URL already contains version number,
// so, it makes sense only for Generic Provider for channel files
export function newUrlFromBase(
  pathname: string,
  baseUrl: URL,
  addRandomQueryToAvoidCaching = false,
): URL {
  const result = new URL(pathname, baseUrl);
  // search is not propagated (search is an empty string if not specified)
  const search = baseUrl.search;
  if (search != null && search.length !== 0) {
    result.search = search;
  } else if (addRandomQueryToAvoidCaching) {
    result.search = `noCache=${Date.now().toString(32)}`;
  }
  return result;
}

export function getChannelFilename(channel: string): string {
  return `${channel}.yml`;
}
