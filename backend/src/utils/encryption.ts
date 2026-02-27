// CloudGuard Pro - Encryption Utility
// AES-256-GCM encryption for sensitive data

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment (64-char hex string = 32 bytes)
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: IV:AuthTag:Ciphertext (all hex-encoded)
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: IV:AuthTag:Ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param encryptedText - Encrypted string in format: IV:AuthTag:Ciphertext
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash data using SHA-256 (one-way, for passwords and API keys)
 * @param text - Plain text to hash
 * @returns Hex-encoded hash
 */
export const hash = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate cryptographically secure random string
 * @param length - Length of the random string
 * @returns Hex-encoded random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate API key with prefix
 * @returns Object with full key and prefix
 */
export const generateApiKey = (): { key: string; prefix: string; hash: string } => {
  const key = `cgp_${generateRandomString(32)}`; // cgp_ prefix for CloudGuard Pro
  const prefix = key.substring(0, 12); // First 12 chars for identification
  const keyHash = hash(key);
  
  return { key, prefix, hash: keyHash };
};

/**
 * Verify if a key matches its hash
 * @param key - Plain text key
 * @param keyHash - Hash to compare against
 * @returns True if key matches hash
 */
export const verifyHash = (key: string, keyHash: string): boolean => {
  return hash(key) === keyHash;
};
