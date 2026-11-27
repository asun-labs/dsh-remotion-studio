import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {createProject} from '../src/scaffold.js';

test('fresh project compiles its provider helpers with regexes intact', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'remotion-scaffold-'));
  try {
    createProject({dir, name: 'first-video', remotionVersion: '4.0.546'});
    const file = readFileSync(join(dir, 'src', 'dsh', 'providers.ts'), 'utf8');
    const isolated = file.replace(/^(import .* from 'remotion';)$/m, '');
    const source = stripTypeScriptTypes(isolated + '\nexport {nativeBase, protocolOf};');
    const {nativeBase, protocolOf} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

    const host = 'https://token-plan.cn-beijing.example.com';
    assert.equal(nativeBase(host + '/compatible-mode/v12/'), host);
    assert.equal(nativeBase(host + '/compatible-mode'), host);
    assert.equal(nativeBase(host + '/compatible-mode/vnext'), host + '/compatible-mode/vnext');
    assert.equal(protocolOf({baseURL: host}), 'tokenplan');
    assert.equal(protocolOf({baseURL: 'https://token-planXexample.com'}), 'openai');
    assert.equal(protocolOf({baseURL: 'https://example.com/api/plan/v3'}), 'arkplan');
    assert.equal(protocolOf({baseURL: 'https://example.com/api/planet'}), 'openai');
    assert.equal(protocolOf({baseURL: 'https://ark.cn-beijing.volces.com/api/v3'}), 'ark');
    assert.equal(protocolOf({baseURL: 'https://arkXcn-beijingYvolcesZcom/api/v3'}), 'openai');
    assert.equal(protocolOf({baseURL: host, protocol: 'OpenAI'}), 'openai');
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});