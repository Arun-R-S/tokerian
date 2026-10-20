// Parental Lock PIN Utilities ported and adapted from IPTVnator
// Implements WebCrypto PBKDF2-SHA256 password hashing and category matching.

export const PARENTAL_LOCK_PIN_MIN_LENGTH = 4;
export const PARENTAL_LOCK_PIN_MAX_LENGTH = 8;

const PIN_HASH_VERSION = 'v1';
const PIN_HASH_ITERATIONS = 100_000;
const PIN_HASH_SALT_BYTES = 16;
const PIN_HASH_LENGTH_BITS = 256;

export const DEFAULT_ADULT_KEYWORDS = [
  'xxx',
  'adult',
  '18+',
  '+18',
  'porn',
  'erotic',
  'nsfw',
  'mature',
  'for adults',
  'playboy',
  'redlight',
  'hustler',
  'penthouse',
  'brazzers',
];

export function isValidPin(pin: unknown): pin is string {
  return (
    typeof pin === 'string' &&
    pin.length >= PARENTAL_LOCK_PIN_MIN_LENGTH &&
    pin.length <= PARENTAL_LOCK_PIN_MAX_LENGTH &&
    /^[0-9]+$/.test(pin)
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const subtle = window.crypto.subtle;
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations,
    },
    keyMaterial,
    PIN_HASH_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

/**
 * Hashes a 4-8 digit PIN with PBKDF2-SHA256 and salt.
 */
export async function hashParentalPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw new Error('PIN must be 4 to 8 numeric digits.');
  }
  const salt = new Uint8Array(PIN_HASH_SALT_BYTES);
  window.crypto.getRandomValues(salt);
  const hash = await derivePinHash(pin, salt, PIN_HASH_ITERATIONS);
  return [
    PIN_HASH_VERSION,
    String(PIN_HASH_ITERATIONS),
    bytesToBase64(salt),
    bytesToBase64(hash),
  ].join('$');
}

/**
 * Verifies a PIN against a stored hash using constant-time comparison.
 */
export async function verifyParentalPin(
  pin: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  if (!isValidPin(pin) || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== PIN_HASH_VERSION) {
    return false;
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }
  try {
    const salt = base64ToBytes(parts[2]);
    const expected = base64ToBytes(parts[3]);
    const actual = await derivePinHash(pin, salt, iterations);

    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) {
      diff |= actual[i] ^ expected[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Checks if a channel group or name matches adult/locked keywords.
 */
export function isContentRestricted(
  groupName: string | undefined,
  channelName: string | undefined,
  customLockedKeywords: string[] = DEFAULT_ADULT_KEYWORDS
): boolean {
  const target = `${groupName || ''} ${channelName || ''}`.toLowerCase();
  return customLockedKeywords.some((kw) => {
    const cleanKw = kw.toLowerCase().trim();
    if (!cleanKw) return false;
    return target.includes(cleanKw);
  });
}
