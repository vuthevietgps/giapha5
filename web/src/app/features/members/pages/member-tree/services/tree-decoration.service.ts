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
   * Load decoration assets and instances from localStorage for a family
   */
  loadDecor(familyId: string | null): void {
    console.log('🎨 loadDecor called with familyId:', familyId);
    if (!familyId) {
      this.decorAssets.set({
        scroll: this.defaultAssets.scroll,
        dragonLeft: this.defaultAssets.dragonLeft,
        dragonRight: this.defaultAssets.dragonRight
      });
      this.decorInstances.set([]);
      console.log('🎨 Cleared decor (no family)');
      return;
    }

    const slots: DecorSlot[] = ['scroll', 'dragonLeft', 'dragonRight'];
    const assets: DecorAssets = { scroll: [], dragonLeft: [], dragonRight: [] };

    slots.forEach(slot => {
      const key = this.decorKey(familyId, slot);
      const raw = localStorage.getItem(key);
      const userAssets = raw ? (JSON.parse(raw) as DecorAsset[]) : [];
      console.log(`🎨 Loaded ${userAssets.length} assets for ${slot} from ${key}`);
      assets[slot] = this.mergeWithDefaults(slot, userAssets);
    });

    this.decorAssets.set(assets);

    // Load instances
    const instancesKey = `tree:${familyId}:decor:instances`;
    const instancesRaw = localStorage.getItem(instancesKey);
    const instances = instancesRaw ? (JSON.parse(instancesRaw) as DecorInstance[]) : [];
    console.log(`🎨 Loaded ${instances.length} decor instances from ${instancesKey}`);
    this.decorInstances.set(instances);

  }

  /**
   * Persist decoration assets and instances to localStorage
   */
  persistDecor(familyId: string | null, slot?: DecorSlot): void {
    if (!familyId) return;

    // Persist assets
    const slots: DecorSlot[] = slot ? [slot] : ['scroll', 'dragonLeft', 'dragonRight'];
    const currentAssets = this.decorAssets();

    slots.forEach(s => {
      const key = this.decorKey(familyId, s);
      localStorage.setItem(key, JSON.stringify(currentAssets[s]));
    });

    // Persist instances
    const instancesKey = `tree:${familyId}:decor:instances`;
    localStorage.setItem(instancesKey, JSON.stringify(this.decorInstances()));
  }

  /**
   * Add a new decoration asset from file
   */
  async addDecor(familyId: string | null, slot: DecorSlot, file: File): Promise<void> {
    if (!familyId) return;

    // Compress image before storing to avoid localStorage quota exceeded
    const compressedDataUrl = await this.compressImage(file);
    const asset: DecorAsset = {
      id: `${slot}-${Date.now()}`,
      name: file.name,
      dataUrl: compressedDataUrl
    };

    const current = this.decorAssets();
    const mergedSlotAssets = this.mergeWithDefaults(slot, [asset, ...current[slot]]);
    const updated = {
      ...current,
      [slot]: mergedSlotAssets.slice(0, 12) // allow a few more while keeping quota manageable
    };

    this.decorAssets.set(updated);
    
    try {
      this.persistDecor(familyId, slot);
    } catch (err: any) {
      // If storage quota exceeded, remove the asset and throw error
      this.decorAssets.set(current);
      throw new Error('Không đủ bộ nhớ. Hãy xóa bớt ảnh cũ hoặc giảm kích thước ảnh.');
    }
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

  private decorKey(familyId: string, slot: DecorSlot): string {
    return `tree:${familyId}:decor:${slot}`;
  }

  /**
   * Compress image to reduce storage size
   * Target: reduce to ~200KB max per image
   * Preserves PNG transparency by detecting file type
   */
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const isPNG = file.type === 'image/png';

      img.onload = () => {
        // Calculate new dimensions (max 1200px on longest side)
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

        // For PNG with transparency, fill transparent background
        if (isPNG && ctx) {
          ctx.clearRect(0, 0, width, height);
        }

        // Draw image
        ctx?.drawImage(img, 0, 0, width, height);
        
        // For PNG files, keep PNG format to preserve transparency
        if (isPNG) {
          let quality = 0.9;
          let dataUrl = canvas.toDataURL('image/png', quality);
          
          // If too large, try reducing quality
          while (dataUrl.length > 300000 && quality > 0.6) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/png', quality);
          }
          resolve(dataUrl);
        } else {
          // For JPEG and other formats, use JPEG compression
          let quality = 0.7;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality further
          while (dataUrl.length > 250000 && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        }
      };

      img.onerror = () => reject(new Error('Không thể đọc ảnh'));
      
      // Read file and set as image source
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Không thể đọc file'));
      reader.readAsDataURL(file);
    });
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
