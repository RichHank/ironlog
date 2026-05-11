// IndexedDB persistence layer — survives iOS Safari's 7-day localStorage
// eviction. Single shared connection per page; the per-call open/close in the
// previous version churned a connection per write, which gets expensive once
// IDB is the canonical store and not just a backup.

const DB_NAME = 'ironlog-db';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        // If the connection is closed by the browser (e.g. version change in
        // another tab), allow the next call to re-open.
        req.result.onclose = () => { dbPromise = null; };
        resolve(req.result);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function idbGetJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await idbGet(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.setItem(key, value); } catch {}
  }
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.removeItem(key); } catch {}
  }
}

// All writers in storage.ts use write-through (idbSet in writeJSON/removeKey),
// so a visibility-change flush is no longer needed. The function is kept as a
// no-op to avoid breaking the call site in App.tsx.
export function setupVisibilitySync(): void {}
