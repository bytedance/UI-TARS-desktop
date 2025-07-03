import fs from 'node:fs';

export const ensureDirExists = async (dir: string | undefined) => {
  if (dir && !fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
};
