// 브라우저 내장 IndexedDB를 활용한 대용량 파일 저장소 (최대 수백 MB ~ 수 GB 지원)
// localStorage의 5MB 한계(QuotaExceededError)를 극복하여 8~10MB 이상 파일도 완벽하게 저장

const DB_NAME = 'SchoolPadletDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const fileStorage = {
  // 파일 저장 (Key-Value)
  async set(key: string, value: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB set error:', e);
    }
  },

  // 파일 조회
  async get(key: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB get error:', e);
      return null;
    }
  },

  // 파일 삭제
  async delete(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB delete error:', e);
    }
  },
};
