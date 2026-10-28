import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createPrivateKey } from 'node:crypto';
import { normalizePrivateKey } from '../src/config/firebase';

const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const escaped = pem.replace(/\n/g, '\\n');

describe('normalizePrivateKey', () => {
  it('turns escaped newlines back into a usable key', () => {
    expect(normalizePrivateKey(escaped)).toBe(pem);
  });

  it('drops wrapping quotes and stray text from a dashboard paste', () => {
    const key = normalizePrivateKey(`"${escaped}"whi`);
    expect(key).toBe(pem);
    expect(() => createPrivateKey(key)).not.toThrow();
  });

  it('leaves a clean key untouched', () => {
    expect(normalizePrivateKey(pem)).toBe(pem);
  });
});
