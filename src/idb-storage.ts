// IndexedDB persistence layer — supersedes localStorage for iOS PWA reliability.
// iOS 7-day data eviction can wipe localStorage; IndexedDB is more persistent.

const DB_NAME = 'ironlog-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage silently
    try { localStorage.setItem(key, value); } catch {}
  }
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.removeItem(key); } catch {}
  }
}

// Auto-sync on visibility change — flush localStorage to IndexedDB when app backgrounds
let visibilitySetup = false;

export function setupVisibilitySync(): void {
  if (visibilitySetup) return;
  visibilitySetup = true;

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      // Flush all localStorage keys to IndexedDB
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) await idbSet(key, value);
      }
    }
    // When becoming visible again, restore from IndexedDB to localStorage
    if (document.visibilityState === 'visible') {
      try {
        const db = await openDB();
        const tx = db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const keys = await new Promise<string[]>((resolve, reject) => {
          const req = store.getAllKeys();
          req.onsuccess = () => resolve(req.result as string[]);
          req.onerror = () => reject(req.error);
        });
        for (const key of keys) {
          const stored = localStorage.getItem(key);
          if (!stored) {
            const req = store.get(key);
            const value = await new Promise<string | null>((resolve) => {
              req.onsuccess = () => resolve(req.result ?? null);
              req.onerror = () => resolve(null);
            });
            if (value) try { localStorage.setItem(key, value); } catch {}
          }
        }
        db.close();
      } catch {}
    }
  });
}
