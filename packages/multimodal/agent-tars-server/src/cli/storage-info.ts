/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSServer } from '../server';

/**
 * Print storage information for the Agent TARS Server
 * @param port Server port
 */
export async function printStorageInfo(port: number = 3000): Promise<void> {
  // Create a temporary server instance to get storage info
  const server = new AgentTARSServer({ port });

  // Get storage information
  const storageInfo = server.getStorageInfo();

  console.log('\nAgent TARS Server Storage Information:');
  console.log('---------------------------------------');
  console.log(`Storage Type: ${storageInfo.type}`);

  if (storageInfo.path) {
    console.log(`Storage Path: ${storageInfo.path}`);
  }

  if (storageInfo.type === 'file') {
    console.log('\nNote: This file contains your session data and events.');
    console.log('To back up your data, simply copy this file to another location.');
  } else if (storageInfo.type === 'sqlite') {
    console.log('\nNote: Using SQLite database for storage.');
    console.log('Benefits include improved performance for high-volume data writes.');
    console.log('To back up your data, copy the database file or use SQLite backup commands.');
  } else if (storageInfo.type === 'memory') {
    console.log('\nWarning: Using memory storage. All data will be lost when the server stops.');
    console.log('To persist data, configure file or SQLite storage in your server options.');
  }

  console.log('---------------------------------------\n');
}

// Allow direct execution from command line
if (require.main === module) {
  printStorageInfo();
}
