import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const cwd = path.join(__dirname);
const x64Content = fs.readFileSync(
  path.join(cwd, './latest-mac-x64.yml'),
  'utf8',
);
const arm64Content = fs.readFileSync(
  path.join(cwd, './latest-mac-arm64.yml'),
  'utf8',
);

interface YamlData {
  version?: string;
  files: {
    url: string;
    sha512: string;
    size: number;
  }[];
  releaseDate?: string;
}

const x64Data = yaml.load(x64Content) as YamlData;
const arm64Data = yaml.load(arm64Content) as YamlData;

// Merge files field from both x64 and arm64
const mergedFiles = [...(x64Data.files || []), ...(arm64Data.files || [])];

// Combine other fields
const combinedData = {
  version: x64Data.version || '0.0.0',
  files: mergedFiles,
  releaseDate: x64Data.releaseDate || '',
};

const resultYaml = yaml.dump(combinedData, { lineWidth: 120 });

fs.writeFileSync(path.join(cwd, './latest-mac.yml'), resultYaml, 'utf8');
