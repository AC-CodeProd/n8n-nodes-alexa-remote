import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export type CookieFileFormat = 'encrypted' | 'plain' | 'invalid' | 'missing';

/**
 * True when a parsed cookie-file payload is the encrypted envelope produced
 * by writeCookieFile() with an active N8N_ENCRYPTION_KEY.
 */
export function isEncryptedEnvelope(parsed: unknown): boolean {
  return (
    !!parsed &&
    typeof parsed === 'object' &&
    (parsed as Record<string, unknown>).__encrypted__ === true &&
    typeof (parsed as Record<string, unknown>).data === 'string'
  );
}

/**
 * Derives a 32-byte AES key from the N8N_ENCRYPTION_KEY environment variable.
 * Returns null if the variable is not set (dev/test environments).
 */
function deriveKey(): Buffer | null {
  const envKey = process.env.N8N_ENCRYPTION_KEY;
  if (!envKey) return null;
  return createHash('sha256').update(envKey).digest();
}

/**
 * Reads a cookie file from disk, decrypting it if it was previously written
 * by writeCookieFile() with an active N8N_ENCRYPTION_KEY.
 * Falls back to returning the raw content for plain-text files (backward compatibility).
 */
export function readCookieFile(filePath: string): string {
  const raw = readFileSync(filePath, 'utf8').trim();
  const key = deriveKey();
  if (!key) return raw;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (isEncryptedEnvelope(parsed)) {
      const buf = Buffer.from(parsed.data as string, 'base64');
      const iv = buf.subarray(0, IV_LENGTH);
      const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    }
  } catch {
    // Plain text file or unrecognised format — return as-is (migration path)
  }
  return raw;
}

/**
 * Writes cookie content to disk and returns the format that was written.
 * If N8N_ENCRYPTION_KEY is set, the content is encrypted with AES-256-GCM before writing.
 * Without the key (dev/test), writes plain text.
 */
export function writeCookieFile(filePath: string, content: string): CookieFileFormat {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') {
      // eslint-disable-next-line @n8n/community-nodes/require-node-api-error
      throw new Error(
        `Cannot create directory "${dir}": permission denied. ` +
        `Make sure the n8n process has write access to this path, ` +
        `or mount a Docker volume at that location (e.g. add "-v /host/path:${dir}" to your docker run command).`,
      );
    }
    // eslint-disable-next-line @n8n/community-nodes/require-node-api-error
    throw err;
  }
  const key = deriveKey();
  if (!key) {
    writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
    return 'plain';
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  const envelope = JSON.stringify({ __encrypted__: true, v: 1, data: payload });
  writeFileSync(filePath, envelope, { encoding: 'utf8', mode: 0o600 });
  return 'encrypted';
}
