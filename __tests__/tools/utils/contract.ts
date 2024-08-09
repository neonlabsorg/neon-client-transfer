import { readFileSync } from 'fs';
import { basename, join } from 'path';

const solc = require('solc');

export async function compile(contractPath: string, pathPrefix?: string): Promise<any> {
  const root = process.cwd();
  const content = readFileSync(join(root, `${pathPrefix || 'src'}`, contractPath), { encoding: 'utf-8' });
  const name = basename(contractPath);
  const input = {
    language: 'Solidity',
    sources: { [name]: { content } },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // Optimize for how many times you intend to call the contract
      },
      outputSelection: { '*': { '*': ['*'] } }
    }
  };
  const tempFile = JSON.parse(solc.compile(JSON.stringify(input)));
  return tempFile['contracts'][name][name.replace('.sol', '')];
}
