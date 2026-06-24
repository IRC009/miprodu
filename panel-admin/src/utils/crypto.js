const SUPPORT_SECRET = 'cartaymesa-support-key-2026';

/** Unicode-safe string → base64 using TextEncoder (replaces deprecated btoa+unescape+encodeURIComponent) */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

/** base64 → string using TextDecoder (replaces deprecated decodeURIComponent+escape+atob) */
function fromBase64(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Encrypts a password using a lightweight symmetric XOR cipher with Base64 encoding.
 * Prefixes the output with 'enc:' so we can identify encrypted entries.
 * Supports Unicode characters.
 *
 * @param {string} text - Plain text password to encrypt
 * @returns {string} Encrypted string prefixed with 'enc:'
 */
export function encryptPassword(text) {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SUPPORT_SECRET.charCodeAt(i % SUPPORT_SECRET.length);
    result += String.fromCharCode(charCode);
  }
  return 'enc:' + toBase64(result);
}

/**
 * Decrypts a password. If the input does not start with 'enc:', it is treated
 * as a legacy plain text password and returned as-is.
 *
 * @param {string} encoded - Encrypted password string
 * @returns {string} Decrypted plain text password
 */
export function decryptPassword(encoded) {
  if (!encoded) return '';
  if (!encoded.startsWith('enc:')) return encoded; // Legacy plain text
  try {
    const text = fromBase64(encoded.substring(4));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SUPPORT_SECRET.charCodeAt(i % SUPPORT_SECRET.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error('Failed to decrypt password:', e);
    return encoded; // Return as-is if something goes wrong
  }
}
