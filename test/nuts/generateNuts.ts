/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import * as shelljs from 'shelljs';
import { RepoConfig, TEST_REPOS_MAP } from './testMatrix';

const SEED_FILTER = process.env.PLUGIN_DEPLOY_RETRIEVE_SEED_FILTER ?? '';
const SEED_EXCLUDE = process.env.PLUGIN_DEPLOY_RETRIEVE_SEED_EXCLUDE;

function getSeedFiles(): string[] {
  const seedDir = path.join(__dirname, 'seeds');
  const files = fs.readdirSync(seedDir);
  return files
    .filter((f) => f.endsWith('.seed.ts'))
    .filter((f) => f.includes(SEED_FILTER))
    .filter((f) => !SEED_EXCLUDE || !f.includes(SEED_EXCLUDE))
    .map((f) => path.resolve(path.join(seedDir, f)));
}

function parseRepoName(repo?: RepoConfig): string {
  return repo ? repo.gitUrl.split('/').reverse()[0].replace('.git', '') : '';
}

function generateNut(generatedDir: string, seedName: string, seedContents: string, repo?: RepoConfig): void {
  const repoName = parseRepoName(repo);
  const nutFileName = repoName ? `${seedName}.${repoName}.nut.ts` : `${seedName}.nut.ts`;
  const nutFilePath = path.join(generatedDir, nutFileName);

  const contents = (repo?.gitUrl ? seedContents.replace(/%REPO_URL%/g, repo?.gitUrl) : seedContents).replace(
    /%REPO_NAME%/g,
    repoName
  );
  fs.writeFileSync(nutFilePath, contents);
}

function generateNuts(): void {
  const generatedDir = path.resolve(__dirname, 'generated');
  shelljs.rm('-rf', generatedDir);
  fs.mkdirSync(generatedDir, { recursive: true });
  const seeds = getSeedFiles();
  for (const seed of seeds) {
    const seedName = path.basename(seed).replace('.seed.ts', '');
    const seedContents = fs.readFileSync(seed).toString();
    const hasRepo = /const\sREPO\s=\s/.test(seedContents);
    if (hasRepo) {
      const repos = Array.from(TEST_REPOS_MAP.values()).filter((r) => !r.skip);
      for (const repo of repos) {
        generateNut(generatedDir, seedName, seedContents, repo);
      }
    } else {
      generateNut(generatedDir, seedName, seedContents);
    }
  }
}

void generateNuts();
