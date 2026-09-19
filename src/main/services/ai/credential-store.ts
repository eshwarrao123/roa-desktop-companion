import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

export class CredentialStore {
  private filePath: string;
  private memoryKey: string | null = null;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const userData = app.getPath('userData');
      this.filePath = path.join(userData, 'credentials.enc');
    }
  }

  public async saveApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key cannot be empty');
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS credential encryption (safeStorage) is not available');
    }

    const encrypted = safeStorage.encryptString(trimmed);
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(this.filePath, encrypted);
    this.memoryKey = trimmed;
  }

  public async getApiKey(): Promise<string | null> {
    if (this.memoryKey) {
      return this.memoryKey;
    }

    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[CredentialStore] safeStorage encryption not available');
      return null;
    }

    try {
      const encrypted = await fs.promises.readFile(this.filePath);
      const decrypted = safeStorage.decryptString(encrypted);
      this.memoryKey = decrypted;
      return decrypted;
    } catch (err) {
      console.error('[CredentialStore] Failed to decrypt credentials:', err);
      return null;
    }
  }

  public async hasApiKey(): Promise<boolean> {
    if (this.memoryKey) return true;
    return fs.existsSync(this.filePath);
  }

  public async getMaskedKey(): Promise<string | null> {
    const key = await this.getApiKey();
    if (!key) return null;
    if (key.length <= 8) {
      return '••••••••';
    }
    const last4 = key.slice(-4);
    return `••••••••••••${last4}`;
  }

  public async removeApiKey(): Promise<void> {
    this.memoryKey = null;
    if (fs.existsSync(this.filePath)) {
      try {
        await fs.promises.unlink(this.filePath);
      } catch (err) {
        console.error('[CredentialStore] Failed to remove credentials file:', err);
      }
    }
  }
}

let instance: CredentialStore | null = null;
export function getCredentialStore(): CredentialStore {
  if (!instance) {
    instance = new CredentialStore();
  }
  return instance;
}
