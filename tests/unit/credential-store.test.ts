import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CredentialStore } from '../../src/main/services/ai/credential-store';

let mockEncryptionAvailable = true;

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userdata',
  },
  safeStorage: {
    isEncryptionAvailable: () => mockEncryptionAvailable,
    encryptString: (str: string) => Buffer.from(`ENC:${str}`),
    decryptString: (buf: Buffer) => buf.toString().replace(/^ENC:/, ''),
  },
}));

describe('CredentialStore', () => {
  const testFilePath = path.join(__dirname, '../temp-credentials.enc');
  let store: CredentialStore;

  beforeEach(() => {
    mockEncryptionAvailable = true;
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    store = new CredentialStore(testFilePath);
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('saves and retrieves an encrypted API key', async () => {
    expect(await store.hasApiKey()).toBe(false);
    expect(await store.getApiKey()).toBeNull();

    await store.saveApiKey('AIzaSyTestKey1234567890');
    expect(await store.hasApiKey()).toBe(true);

    const key = await store.getApiKey();
    expect(key).toBe('AIzaSyTestKey1234567890');
  });

  it('masks the API key preserving only the last 4 characters', async () => {
    await store.saveApiKey('AIzaSy1234567890abcd');
    const masked = await store.getMaskedKey();
    expect(masked).toBe('••••••••••••abcd');
  });

  it('removes the API key and deletes the encrypted file', async () => {
    await store.saveApiKey('AIzaSyToDelete');
    expect(await store.hasApiKey()).toBe(true);

    await store.removeApiKey();
    expect(await store.hasApiKey()).toBe(false);
    expect(await store.getApiKey()).toBeNull();
    expect(await store.getMaskedKey()).toBeNull();
  });

  it('rejects empty API keys', async () => {
    await expect(store.saveApiKey('')).rejects.toThrow('API key cannot be empty');
    await expect(store.saveApiKey('   ')).rejects.toThrow('API key cannot be empty');
  });

  it('throws an error if safeStorage is unavailable', async () => {
    mockEncryptionAvailable = false;
    await expect(store.saveApiKey('AIzaSyTest')).rejects.toThrow('safeStorage');
  });
});
