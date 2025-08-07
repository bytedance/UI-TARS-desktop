import { it } from 'vitest';
import { pack } from 'repomix';
import path from 'path';

const AgentServer = path.join(__dirname, '../../agent-server/src');

/**
 * TODO: figure it out
 *
 * Error: Failed to filter files in directory /multimodal/tarko/agent-server.
 *  Reason: The "paths[0]" argument must be of type string. Received undefined
 *
 * @see https://github.com/eastlondoner/vibe-tools/blob/452c89133bb317b7cb9c0a86280a277b770ca9d7/src/commands/doc.ts#L113
 */
it.skip('repomix', async () => {
  const tempFilePath = '.repomix-output.txt';

  // Build repomix configuration with all required properties

  // @ts-expect-error
  const reslt = await pack([AgentServer], {
    input: {
      maxFileSize: 1000000000,
    },
    output: {
      filePath: tempFilePath,
      style: 'xml',
      compress: false,
      removeComments: false,
      removeEmptyLines: false,
      showLineNumbers: false,
      headerText: '',
      instructionFilePath: '',
      topFilesLength: 20,
      parsableStyle: false,
      fileSummary: true,
      directoryStructure: true,
      includeEmptyDirectories: false,
      copyToClipboard: false,
      git: {
        sortByChanges: false,
        sortByChangesMaxCommits: undefined,
        includeDiffs: true,
      },
      files: true,
      truncateBase64: false,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: [],
    },
    include: ['**'],
    security: {
      enableSecurityCheck: true,
    },
  });
});
