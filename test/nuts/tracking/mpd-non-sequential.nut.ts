/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { AuthInfo, Connection } from '@salesforce/core';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert } from '@salesforce/ts-types';
import { DeployResultJson } from '../../../src/utils/types';

let session: TestSession;
let conn: Connection;

describe('multiple pkgDirectories pushed as one deploy', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sf',
          duration: 1,
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default')?.username,
      }),
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mpd non-sequential', () => {
    it('pushes using MPD', () => {
      const result = execCmd<DeployResultJson>('deploy:metadata --json', {
        ensureExitCode: 0,
      }).jsonOutput?.result.files;
      assert(Array.isArray(result));
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });

    it('should have 2 deployments', async () => {
      const deployments = await conn.tooling.query('SELECT Id, Status, StartDate, CompletedDate FROM DeployRequest');
      // one deployment was the scratch org settings; the other 3 are the 3 pkgDirs
      expect(deployments.totalSize).to.equal(2);
    });
  });
});
