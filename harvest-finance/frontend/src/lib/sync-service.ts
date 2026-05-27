import { openDB, IDBPDatabase } from 'idb';

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: any;
  timestamp: number;
  idempotencyKey: string;
}

const DB_NAME = 'harvest-offline-db';
const STORE_NAME = 'offline-actions';

class SyncService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private getDB(): Promise<IDBPDatabase> {
    if (typeof window === 'undefined') {
      throw new Error('IndexedDB is only available in the browser');
    }
    
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async queueAction(url: string, method: string, body: any, headers: any) {
    const idempotencyKey = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      idempotencyKey,
    };

    const db = await this.getDB();
    await db.add(STORE_NAME, action);
    console.log('Action queued for offline sync:', action);
    return action;
  }

  async syncActions() {
    const db = await this.getDB();
    const actions: OfflineAction[] = await db.getAll(STORE_NAME);

    if (actions.length === 0) return;

    console.log(`Attempting to sync ${actions.length} offline actions...`);

    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: {
            ...action.headers,
            'X-Idempotency-Key': action.idempotencyKey,
          },
          body: JSON.stringify({
            ...action.body,
            idempotencyKey: action.idempotencyKey,
          }),
        });

        if (response.ok || response.status === 202) {
          await db.delete(STORE_NAME, action.id);
          console.log('Action synced successfully:', action.id);
        } else {
          console.error('Failed to sync action:', action.id, response.status);
        }
      } catch (error) {
        console.error('Network error during sync for action:', action.id, error);
        break; // Stop syncing if still offline
      }
    }
  }

  async getQueuedCount() {
    const db = await this.getDB();
    return (await db.getAll(STORE_NAME)).length;
  }
}

export const syncService = new SyncService();
