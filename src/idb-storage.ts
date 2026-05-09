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

// Best-effort flush of localStorage into IDB when the page hides. Acts as a
// belt-and-braces safety net in case a write-through missed; can go away once
// every writer in storage.ts is confirmed to use idbSet directly.
let visibilitySetup = false;
export function setupVisibilitySync(): void {
  if (visibilitySetup) return;
  visibilitySetup = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    const snapshot: Array<[string, string]> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k);
      if (v != null) snapshot.push([k, v]);
    }
    // Fire writes in parallel; iOS may suspend us mid-loop.
    void Promise.allSettled(snapshot.map(([k, v]) => idbSet(k, v)));
  });
}
