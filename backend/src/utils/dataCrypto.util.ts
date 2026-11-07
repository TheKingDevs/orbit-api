import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes
} from 'node:crypto';

const ENCRYPTION_INFO = 'orbit-mongo-encryption-v1';
const HASH_INFO = 'orbit-mongo-hash-v1';
const ENCRYPTION_VERSION = 'v1';

let encryptionKey: Buffer | null = null;
let hashKey: Buffer | null = null;

function rawSecret(): string {
  const configured = process.env.DATA_ENCRYPTION_KEY?.trim();

  if (!configured) {
    throw new Error(
      'DATA_ENCRYPTION_KEY é obrigatória para persistir dados sensíveis no MongoDB.'
    );
  }

  return configured;
}

function deriveKey(info: string): Buffer {
  const secret = Buffer.from(rawSecret(), 'utf8');
  return Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), info, 32));
}

function getEncryptionKey(): Buffer {
  if (!encryptionKey) encryptionKey = deriveKey(ENCRYPTION_INFO);
  return encryptionKey;
}

function getHashKey(): Buffer {
  if (!hashKey) hashKey = deriveKey(HASH_INFO);
  return hashKey;
}

export function ensureDataSecurityConfigured(): void {
  getEncryptionKey();
  getHashKey();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashSensitive(value: string): string {
  return createHmac('sha256', getHashKey()).update(value).digest('hex');
}

export function hashEmail(email: string): string {
  return hashSensitive(normalizeEmail(email));
}

export function encryptSensitive(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

export function decryptSensitive(value: string): string {
  const [version, ivPart, tagPart, dataPart] = value.split('.');

  if (
    version !== ENCRYPTION_VERSION ||
    !ivPart ||
    !tagPart ||
    !dataPart
  ) {
    throw new Error('Formato de dado criptografado inválido.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivPart, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export function isEncryptedSensitive(value: string | undefined): boolean {
  return Boolean(value && value.startsWith(`${ENCRYPTION_VERSION}.`));
}
