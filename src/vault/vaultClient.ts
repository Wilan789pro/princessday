/**
 * Browser client for THE ROYAL WISH VAULT (owner only).
 * The session token lives in memory only – never in storage – and is sent as
 * "Authorization: Bearer …". The access code is only ever sent to the server.
 */

export interface VaultWish {
  id: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export class VaultError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

type Fetch = typeof fetch;

export function createVaultClient(endpoint: string | null, fetchImpl: Fetch = (...a) => fetch(...a)) {
  const call = async <T,>(action: string, extra: Record<string, unknown> = {}, token?: string | null): Promise<T> => {
    if (!endpoint) throw new VaultError('not-connected');
    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, ...extra }),
      });
    } catch {
      throw new VaultError('network');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.status !== 'ok') throw new VaultError(typeof data?.error === 'string' ? data.error : 'generic');
    return data as T;
  };

  return {
    connected: Boolean(endpoint),
    login: async (code: string) => (await call<{ token: string }>('login', { code })).token,
    list: async (token: string) => (await call<{ wishes: VaultWish[] }>('list', {}, token)).wishes,
    read: async (token: string, id: string) => (await call<{ wish: VaultWish }>('read', { id }, token)).wish,
    mark: async (token: string, id: string, read: boolean) => void (await call('mark', { id, read }, token)),
    remove: async (token: string, id: string) => void (await call('delete', { id }, token)),
    logout: async (token: string) => void (await call('logout', {}, token)),
    /** Visitor experience only. Wishes are not touched. */
    resetExperience: async (token: string) => (await call<{ epoch: string }>('reset-experience', {}, token)).epoch,
  };
}
