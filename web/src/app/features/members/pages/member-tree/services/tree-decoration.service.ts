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
  // Reactive state
  decorAssets = signal<DecorAssets>({
    scroll: [],
    dragonLeft: [],
    dragonRight: []
  });

  // Array of active decoration instances on canvas
  decorInstances = signal<DecorInstance[]>([]);

  /**
   * Load decoration assets and instances from localStorage for a family
   */
  loadDecor(familyId: string | null): void {
    console.log('🎨 loadDecor called with familyId:', familyId);
    if (!familyId) {
      this.decorAssets.set({ scroll: [], dragonLeft: [], dragonRight: [] });
      this.decorInstances.set([]);
      console.log('🎨 Cleared decor (no family)');
      return;
    }

    const slots: DecorSlot[] = ['scroll', 'dragonLeft', 'dragonRight'];
    const assets: DecorAssets = { scroll: [], dragonLeft: [], dragonRight: [] };

    slots.forEach(slot => {
      const key = this.decorKey(familyId, slot);
      const raw = localStorage.getItem(key);
      assets[slot] = raw ? (JSON.parse(raw) as DecorAsset[]) : [];
      console.log(`🎨 Loaded ${assets[slot].length} assets for ${slot} from ${key}`);
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
    const updated = {
      ...current,
      [slot]: [asset, ...current[slot]].slice(0, 8) // Keep max 8 assets per slot
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
