import { describe, expect, test } from 'bun:test';

process.env.DATA_ENCRYPTION_KEY =
  'orbit-test-only-secret-with-at-least-32-characters';

const {
  decryptSensitive,
  encryptSensitive,
  hashEmail,
  hashSensitive,
  isEncryptedSensitive
} = await import('@utils/dataCrypto.util');

describe('dataCrypto', () => {
  test('hashes values deterministically without storing plaintext', () => {
    const first = hashSensitive('orb_test_token');
    const second = hashSensitive('orb_test_token');

    expect(first).toBe(second);
    expect(first).not.toBe('orb_test_token');
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  test('normalizes e-mail before hashing', () => {
    expect(hashEmail('  User@Example.com ')).toBe(hashEmail('user@example.com'));
  });

  test('encrypts and decrypts recoverable values', () => {
    const value = 'dado-sensível-de-teste';
    const encrypted = encryptSensitive(value);

    expect(isEncryptedSensitive(encrypted)).toBe(true);
    expect(encrypted).not.toContain(value);
    expect(decryptSensitive(encrypted)).toBe(value);
  });

  test('rejects tampered encrypted values', () => {
    const encrypted = encryptSensitive('segredo');
    const lastCharacter = encrypted.at(-1) === 'A' ? 'B' : 'A';
    const tampered = `${encrypted.slice(0, -1)}${lastCharacter}`;

    expect(() => decryptSensitive(tampered)).toThrow();
  });
});
