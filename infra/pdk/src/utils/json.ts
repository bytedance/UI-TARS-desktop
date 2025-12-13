import fs from 'fs';

/**
 * Reads and parses a JSON file synchronously
 */
export const readJsonSync = (path: string) => JSON.parse(fs.readFileSync(path, 'utf8'));

/** 
 * Writes a JSON object to a file synchronously
 */
export const writeJsonSync = (path: string, data: Record<string, any>) => fs.writeFileSync(path, JSON.stringify(data, null, 2));