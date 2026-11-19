import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { StoredAccountRecord } from '@/lib/server/auth-helpers';

const DEFAULT_ACCOUNTS_FILE = path.join(process.cwd(), '.data', 'auth-accounts.json');

// 仅 Node 运行时可用（Docker / 本地 / 自托管）；Cloudflare 等 Edge 环境使用 Upstash Redis
export function isFileAccountStoreAvailable(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

function resolveAccountsFile(): string {
  return process.env.AUTH_ACCOUNTS_FILE || DEFAULT_ACCOUNTS_FILE;
}

export async function readAccountsFile(): Promise<StoredAccountRecord[]> {
  const file = resolveAccountsFile();

  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccountRecord[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function writeAccountsFile(accounts: StoredAccountRecord[]): Promise<void> {
  const file = resolveAccountsFile();
  const tempFile = `${file}.${process.pid}.tmp`;

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tempFile, JSON.stringify(accounts, null, 2), 'utf8');
  await fs.rename(tempFile, file);
}
