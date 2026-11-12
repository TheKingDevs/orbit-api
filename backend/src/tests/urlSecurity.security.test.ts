import { describe, expect, test } from 'bun:test';
import { isPublicIp, validateSafeUrl } from '@utils/urlSecurity.util';

describe('security: outbound URL validation', () => {
  test('accepts public IPv4/IPv6 and rejects private, link-local, and documentation ranges', () => {
    expect(isPublicIp('8.8.8.8')).toBe(true);
    expect(isPublicIp('2606:4700:4700::1111')).toBe(true);
    for (const address of [
      '127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.10',
      '::1', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1'
    ]) {
      expect(isPublicIp(address)).toBe(false);
    }
  });

  test('rejects URL userinfo and literal private IPs before connecting', () => {
    expect(() => validateSafeUrl('https://user:pass@example.com/image.png')).toThrow();
    expect(() => validateSafeUrl('http://127.0.0.1/latest/meta-data')).toThrow();
  });
});
