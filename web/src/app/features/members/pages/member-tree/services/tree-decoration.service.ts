import { Injectable, signal } from '@angular/core';

export type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';

export interface DecorAsset {
  id: string;
  name: string;
  dataUrl: string;
}

export interface DecorInstance {
  id: string;
  assetId: string;
  slot: DecorSlot;
  x: number;
  y: number;
  scale: number;
}

export type DecorAssets = Record<DecorSlot, DecorAsset[]>;

// Lightweight metadata stored in localStorage (no dataUrl)
interface DecorAssetMeta {
  id: string;
  name: string;
  slot: DecorSlot;
}

// ─── IndexedDB helper ──────────────────────────────────────
const DB_NAME = 'tree-decor-db';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}
// ────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TreeDecorationService {
  // Built-in default assets (inline SVG) to ensure library is available across screens
  private readonly defaultAssets: DecorAssets = {
    scroll: [
      {
        id: 'scroll-default-1',
        name: 'Cuốn thư vàng',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZjNmMWQ2Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZWRkYjllIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgeD0iMTAiIHk9IjMwIiB3aWR0aD0iMTE4MCIgaGVpZ2h0PSIzNDAiIHJ4PSIzMCIgZmlsbD0idXJsKCNnKSIgc3Ryb2tlPSIjYzg4MzJiIiBzdHJva2Utd2lkdGg9IjYiLz48cmVjdCB4PSIyMCIgeT0iNjAiIHdpZHRoPSIxMTYwIiBoZWlnaHQ9IjI4MCIgcng9IjIwIiBmaWxsPSIjZmZmMmM1IiBvcGFjaXR5PSIwLjkiIHN0cm9rZT0iI2Q1Y2M1NiIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHJlY3QgeD0iMzAiIHk9IjkwIiB3aWR0aD0iMTE0MCIgaGVpZ2h0PSIyMjAiIHJ4PSIxNSIgZmlsbD0iI2ZmZjdlNSIgb3BhY2l0eT0iMC45IiBzdHJva2U9IiNjOGEzMzQiIHN0cm9rZS13aWR0aD0iMyIvPjwvc3ZnPg=='
      },
      {
        id: 'scroll-default-2',
        name: 'Cuốn thư đỏ',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImgiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZjRmMTAxIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZWIyOTM0Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgeD0iMTAiIHk9IjMwIiB3aWR0aD0iMTE4MCIgaGVpZ2h0PSIzNDAiIHJ4PSIzMCIgZmlsbD0idXJsKCNnKSIgc3Ryb2tlPSIjOTQwMDAwIiBzdHJva2Utd2lkdGg9IjYiLz48cmVjdCB4PSIyMCIgeT0iNjAiIHdpZHRoPSIxMTYwIiBoZWlnaHQ9IjI4MCIgcng9IjIwIiBmaWxsPSIjZmZlNmU2IiBvcGFjaXR5PSIwLjkiIHN0cm9rZT0iI2NhNTE1MCIgc3Rya2Utd2lkdGg9IjQiLz48cmVjdCB4PSIzMCIgeT0iOTAiIHdpZHRoPSIxMTQwIiBoZWlnaHQ9IjIyMCIgcng9IjE1IiBmaWxsPSIjZmZkNmQ3IiBvcGFjaXR5PSIwLjkiIHN0cm9rZT0iI2JhNDM0NCIgc3Rya2Utd2lkdGg9IjMiLz48L3N2Zz4='
      }
    ],
    dragonLeft: [
      {
        id: 'dragon-left-default',
        name: 'Rồng trái',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA2MDAgMTIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzAwIDEwIGMxNDAgNjAgMTgwIDI0MCA2MCAzMDBzLTIyMCAyNzAgLTQwIDQyMGMxMCAxMTAgMTIwIDE4MCAyNDAgMTQwIDIwMC03MCAzMC0zNzAgLTEwLTUwMCIgZmlsbD0iI2ZmNDAwMCIgc3Ryb2tlPSIjOTAwMDAwIiBzdHJva2Utd2lkdGg9IjIwIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4='
      }
    ],
    dragonRight: [
      {
        id: 'dragon-right-default',
        name: 'Rồng phải',
        dataUrl:
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjEyMDAiIHZpZXdCb3g9IjAgMCA2MDAgMTIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzAwIDEwIGMtMTQwIDYwIC0xODAgMjQwIC02MCAzMDBzIDIyMCAyNzAgNDAgNDIwYy0xMCAxMTAtMTIwIDE4MC0yNDAgMTQwLTIwMC03MCAzMC0zNzAgMTAtNTAwIiBmaWxsPSIjZmY0MDAwIiBzdHJva2U9IiM5MDAwMDAiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Rya2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+'
      }
    ]
  };

  private readonly defaultIds = new Set([
    'scroll-default-1', 'scroll-default-2',
    'dragon-left-default', 'dragon-right-default',
  ]);

  // Reactive state
  decorAssets = signal<DecorAssets>({
    scroll: [],
    dragonLeft: [],
    dragonRight: []
  });

  // Array of active decoration instances on canvas
  decorInstances = signal<DecorInstance[]>([]);

  /**
   * Merge built-in defaults with user assets, keeping unique ids
   */
  private mergeWithDefaults(slot: DecorSlot, userAssets: DecorAsset[]): DecorAsset[] {
    const defaults = this.defaultAssets[slot] || [];
    const seen = new Set<string>();
    const merged: DecorAsset[] = [];

    const pushUnique = (asset: DecorAsset) => {
      if (seen.has(asset.id)) return;
      seen.add(asset.id);
      merged.push(asset);
    };

    defaults.forEach(pushUnique);
    userAssets.forEach(pushUnique);

    return merged;
  }

  /**
   * Load decoration assets and instances for a family.
   * Metadata from localStorage, image dataUrls from IndexedDB.
   */
  loadDecor(familyId: string | null): void {
    if (!familyId) {
      this.decorAssets.set({
        scroll: [...this.defaultAssets.scroll],
        dragonLeft: [...this.defaultAssets.dragonLeft],
        dragonRight: [...this.defaultAssets.dragonRight]
      });
      this.decorInstances.set([]);
      return;
    }

    // 1) Load instances (small data, localStorage is fine)
    const instancesKey = `tree:${familyId}:decor:instances`;
    const instancesRaw = localStorage.getItem(instancesKey);
    const instances = instancesRaw ? (JSON.parse(instancesRaw) as DecorInstance[]) : [];
    this.decorInstances.set(instances);

    // 2) Load asset metadata from localStorage (no dataUrl)
    const metaKey = `tree:${familyId}:decor:meta`;
    const metaRaw = localStorage.getItem(metaKey);
    const metas: DecorAssetMeta[] = metaRaw ? JSON.parse(metaRaw) : [];

    // Start with defaults immediately
    const assets: DecorAssets = {
      scroll: [...this.defaultAssets.scroll],
      dragonLeft: [...this.defaultAssets.dragonLeft],
      dragonRight: [...this.defaultAssets.dragonRight],
    };
    this.decorAssets.set(assets);

    // 3) Load user asset dataUrls from IndexedDB (async)
    if (metas.length > 0) {
      this.loadUserAssetsFromIDB(familyId, metas);
    }

    // 4) Migrate: if old localStorage keys exist (with full dataUrl), move to IndexedDB
    this.migrateFromLocalStorage(familyId);
  }

  /**
   * Async: load user-uploaded asset dataUrls from IndexedDB and merge into signals
   */
  private async loadUserAssetsFromIDB(familyId: string, metas: DecorAssetMeta[]): Promise<void> {
    const userAssets: DecorAsset[] = [];

    for (const meta of metas) {
      const idbKey = `decor:${familyId}:${meta.id}`;
      const dataUrl = await idbGet(idbKey);
      if (dataUrl) {
        userAssets.push({ id: meta.id, name: meta.name, dataUrl });
      }
    }

    if (userAssets.length === 0) return;

    // Group by slot
    const bySlot: Record<DecorSlot, DecorAsset[]> = { scroll: [], dragonLeft: [], dragonRight: [] };
    for (const meta of metas) {
      const asset = userAssets.find(a => a.id === meta.id);
      if (asset) bySlot[meta.slot].push(asset);
    }

    // Merge with current (defaults already loaded)
    const current = this.decorAssets();
    const updated: DecorAssets = {
      scroll: this.mergeWithDefaults('scroll', bySlot.scroll),
      dragonLeft: this.mergeWithDefaults('dragonLeft', bySlot.dragonLeft),
      dragonRight: this.mergeWithDefaults('dragonRight', bySlot.dragonRight),
    };
    this.decorAssets.set(updated);
  }

  /**
   * One-time migration: move old localStorage data (with dataUrl) to IndexedDB
   */
  private async migrateFromLocalStorage(familyId: string): Promise<void> {
    const slots: DecorSlot[] = ['scroll', 'dragonLeft', 'dragonRight'];
    const allMetas: DecorAssetMeta[] = [];
    const userAssetsToMerge: Record<DecorSlot, DecorAsset[]> = { scroll: [], dragonLeft: [], dragonRight: [] };
    let migrated = false;

    for (const slot of slots) {
      const oldKey = this.oldDecorKey(familyId, slot);
      const raw = localStorage.getItem(oldKey);
      if (!raw) continue;

      try {
        const oldAssets = JSON.parse(raw) as DecorAsset[];
        for (const asset of oldAssets) {
          // Skip defaults (already available in code)
          if (this.defaultIds.has(asset.id)) continue;
          if (!asset.dataUrl) continue;

          // Store dataUrl in IndexedDB
          const idbKey = `decor:${familyId}:${asset.id}`;
          await idbPut(idbKey, asset.dataUrl);

          allMetas.push({ id: asset.id, name: asset.name, slot });
          userAssetsToMerge[slot].push(asset);
          migrated = true;
        }

        // Remove old localStorage key
        localStorage.removeItem(oldKey);
      } catch {
        // corrupted data, just remove
        localStorage.removeItem(oldKey);
      }
    }

    if (migrated) {
      // Save lightweight meta to localStorage
      const metaKey = `tree:${familyId}:decor:meta`;
      const existingRaw = localStorage.getItem(metaKey);
      const existing: DecorAssetMeta[] = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = [...existing];
      for (const m of allMetas) {
        if (!merged.some(e => e.id === m.id)) merged.push(m);
      }
      localStorage.setItem(metaKey, JSON.stringify(merged));

      // Update signal with migrated assets
      const current = this.decorAssets();
      this.decorAssets.set({
        scroll: this.mergeWithDefaults('scroll', userAssetsToMerge.scroll),
        dragonLeft: this.mergeWithDefaults('dragonLeft', userAssetsToMerge.dragonLeft),
        dragonRight: this.mergeWithDefaults('dragonRight', userAssetsToMerge.dragonRight),
      });
    }
  }

  /**
   * Sync assets from dialog result: detect new/removed assets and update IndexedDB accordingly.
   * Called when the decor dialog closes with changes.
   */
  async syncFromDialog(familyId: string | null, newAssets: DecorAssets): Promise<void> {
    if (!familyId) return;

    const oldAssets = this.decorAssets();
    const allOldIds = new Set([
      ...oldAssets.scroll.map(a => a.id),
      ...oldAssets.dragonLeft.map(a => a.id),
      ...oldAssets.dragonRight.map(a => a.id),
    ]);
    const allNewIds = new Set([
      ...newAssets.scroll.map(a => a.id),
      ...newAssets.dragonLeft.map(a => a.id),
      ...newAssets.dragonRight.map(a => a.id),
    ]);

    // Find newly added assets (in new but not in old) — store dataUrl in IndexedDB
    const slots: DecorSlot[] = ['scroll', 'dragonLeft', 'dragonRight'];
    const newMetas: DecorAssetMeta[] = [];
    for (const slot of slots) {
      for (const asset of newAssets[slot]) {
        if (!allOldIds.has(asset.id) && !this.defaultIds.has(asset.id)) {
          const idbKey = `decor:${familyId}:${asset.id}`;
          await idbPut(idbKey, asset.dataUrl);
          newMetas.push({ id: asset.id, name: asset.name, slot });
        }
      }
    }

    // Find removed assets (in old but not in new) — remove from IndexedDB
    for (const slot of slots) {
      for (const asset of oldAssets[slot]) {
        if (!allNewIds.has(asset.id) && !this.defaultIds.has(asset.id)) {
          const idbKey = `decor:${familyId}:${asset.id}`;
          await idbDelete(idbKey);
        }
      }
    }

    // Rebuild metadata list
    const metaKey = `tree:${familyId}:decor:meta`;
    const allMetas: DecorAssetMeta[] = [];
    for (const slot of slots) {
      for (const asset of newAssets[slot]) {
        if (!this.defaultIds.has(asset.id)) {
          allMetas.push({ id: asset.id, name: asset.name, slot });
        }
      }
    }
    try {
      localStorage.setItem(metaKey, JSON.stringify(allMetas));
    } catch {
      // metadata is small, this shouldn't fail
    }

    // Update signal
    this.decorAssets.set(newAssets);
  }

  /**
   * Persist decoration metadata to localStorage and instances.
   * Image dataUrls are stored in IndexedDB (not here — stored during addDecor).
   */
  persistDecor(familyId: string | null, slot?: DecorSlot): void {
    if (!familyId) return;

    try {
      // Persist instances (small data, always safe)
      const instancesKey = `tree:${familyId}:decor:instances`;
      localStorage.setItem(instancesKey, JSON.stringify(this.decorInstances()));
    } catch (err) {
      console.warn('Failed to persist decor instances:', err);
    }

    // Note: asset metadata is persisted separately in addDecor/removeAsset.
    // No need to re-persist all asset dataUrls here.
  }

  /**
   * Add a new decoration asset from file.
   * Stores image data in IndexedDB (large), metadata in localStorage (small).
   */
  async addDecor(familyId: string | null, slot: DecorSlot, file: File): Promise<void> {
    if (!familyId) return;

    // Compress image before storing
    const compressedDataUrl = await this.compressImage(file);
    const asset: DecorAsset = {
      id: `${slot}-${Date.now()}`,
      name: file.name,
      dataUrl: compressedDataUrl
    };

    // 1) Store dataUrl in IndexedDB (large capacity)
    const idbKey = `decor:${familyId}:${asset.id}`;
    await idbPut(idbKey, compressedDataUrl);

    // 2) Store lightweight metadata in localStorage
    const metaKey = `tree:${familyId}:decor:meta`;
    const metaRaw = localStorage.getItem(metaKey);
    const metas: DecorAssetMeta[] = metaRaw ? JSON.parse(metaRaw) : [];
    metas.push({ id: asset.id, name: asset.name, slot });
    localStorage.setItem(metaKey, JSON.stringify(metas));

    // 3) Update signal
    const current = this.decorAssets();
    const slotAssets = [...current[slot], asset];
    this.decorAssets.set({ ...current, [slot]: slotAssets });
  }

  /**
   * Remove a decoration asset (user-uploaded)
   */
  async removeAsset(familyId: string | null, assetId: string): Promise<void> {
    if (!familyId || this.defaultIds.has(assetId)) return;

    // Remove from IndexedDB
    const idbKey = `decor:${familyId}:${assetId}`;
    await idbDelete(idbKey);

    // Remove from metadata
    const metaKey = `tree:${familyId}:decor:meta`;
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      const metas: DecorAssetMeta[] = JSON.parse(metaRaw);
      localStorage.setItem(metaKey, JSON.stringify(metas.filter(m => m.id !== assetId)));
    }

    // Remove from signal
    const current = this.decorAssets();
    const updated: DecorAssets = {
      scroll: current.scroll.filter(a => a.id !== assetId),
      dragonLeft: current.dragonLeft.filter(a => a.id !== assetId),
      dragonRight: current.dragonRight.filter(a => a.id !== assetId),
    };
    this.decorAssets.set(updated);

    // Remove any instances using this asset
    const instances = this.decorInstances().filter(i => i.assetId !== assetId);
    this.decorInstances.set(instances);
    this.persistDecor(familyId);
  }

  /**
   * Add a decoration instance to canvas (creates visual instance of an asset)
   */
  addInstance(assetId: string, slot: DecorSlot, paperWidth: number, paperHeight: number): void {
    const instance: DecorInstance = {
      id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      slot,
      x: paperWidth / 2,
      y: paperHeight / 2,
      scale: 1
    };

    const current = this.decorInstances();
    this.decorInstances.set([...current, instance]);
  }

  /**
   * Update decoration instance position
   */
  updateInstancePosition(id: string, x: number, y: number): void {
    const current = this.decorInstances();
    const updated = current.map(inst =>
      inst.id === id ? { ...inst, x, y } : inst
    );
    this.decorInstances.set(updated);
  }

  /**
   * Update decoration instance scale
   */
  updateInstanceScale(id: string, scale: number): void {
    const current = this.decorInstances();
    const updated = current.map(inst =>
      inst.id === id ? { ...inst, scale } : inst
    );
    this.decorInstances.set(updated);
  }

  /**
   * Remove a decoration instance from canvas
   */
  removeInstance(id: string): void {
    const current = this.decorInstances();
    this.decorInstances.set(current.filter(inst => inst.id !== id));
  }

  /**
   * Get decoration instances for a specific slot
   */
  getInstancesBySlot(slot: DecorSlot): DecorInstance[] {
    return this.decorInstances().filter(inst => inst.slot === slot);
  }

  /**
   * Get data URL for a decoration instance
   */
  getInstanceSource(instance: DecorInstance): string | null {
    const assets = this.decorAssets();
    const asset = assets[instance.slot].find(a => a.id === instance.assetId);
    return asset?.dataUrl || null;
  }

  /**
   * Get all decoration assets for a slot
   */
  getDecorAssets(slot: DecorSlot): DecorAsset[] {
    return this.decorAssets()[slot];
  }

  // Private helper methods

  private oldDecorKey(familyId: string, slot: DecorSlot): string {
    return `tree:${familyId}:decor:${slot}`;
  }

  /**
   * Compress image to reduce storage size.
   * Preserves PNG transparency by detecting file type.
   */
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const isPNG = file.type === 'image/png';

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 1200;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (isPNG && ctx) {
          ctx.clearRect(0, 0, width, height);
        }

        ctx?.drawImage(img, 0, 0, width, height);

        if (isPNG) {
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } else {
          let quality = 0.7;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > 250000 && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        }
      };

      img.onerror = () => reject(new Error('Không thể đọc ảnh'));

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Không thể đọc file'));
      reader.readAsDataURL(file);
    });
  }
}
