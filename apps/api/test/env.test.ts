import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// env.ts validates process.env at import time and exits on failure, so load it in a child process.
// cwd is a temp dir so dotenv finds no local .env file.
const envModule = path.resolve(__dirname, '../src/config/env.ts');
// tsx's loader by absolute URL, since the child runs outside the project
const tsxLoader = pathToFileURL(path.join(path.dirname(require.resolve('tsx/package.json')), 'dist/loader.mjs')).href;

function loadEnv(vars: Record<string, string>) {
  const result = spawnSync(process.execPath, ['--import', tsxLoader, '-e', `require(${JSON.stringify(envModule)})`], {
    cwd: os.tmpdir(),
    env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', ...vars },
    encoding: 'utf8',
  });
  return { code: result.status, stderr: result.stderr };
}

const firebase = {
  FIREBASE_PROJECT_ID: 'buildx-test',
  FIREBASE_CLIENT_EMAIL: 'svc@buildx-test.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n',
};

describe('environment validation', () => {
  it('refuses to start in production without the Firebase service account', () => {
    const { code, stderr } = loadEnv({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/x' });
    expect(code).toBe(1);
    expect(stderr).toContain('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  });

  it('names only the Firebase variables that are missing', () => {
    const { code, stderr } = loadEnv({
      NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/x', FIREBASE_PROJECT_ID: 'buildx-test',
    });
    expect(code).toBe(1);
    expect(stderr).toContain('FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    expect(stderr).not.toContain('FIREBASE_PROJECT_ID');
  });

  it('starts in production when the Firebase service account is set', () => {
    expect(loadEnv({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/x', ...firebase }).code).toBe(0);
  });

  it('does not require Firebase variables outside production', () => {
    expect(loadEnv({ NODE_ENV: 'development', MONGODB_URI: 'mongodb://127.0.0.1:1/x' }).code).toBe(0);
  });
});
