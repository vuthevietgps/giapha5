import { Injectable, signal } from '@angular/core';

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  scale: number;
  curvature: number;
}

export interface CoupletData {
  leftText: string;
  rightText: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class TreeTextService {
  // Reactive state
  textItems = signal<TextItem[]>([]);
  
  couplet = signal<CoupletData>({
    leftText: '',
    rightText: '',
    fontFamily: 'Dancing Script',
    fontSize: 18,
    color: '#2c1b0f'
  });

  /**
   * Load text items from localStorage for a family
   */
  loadTextItems(familyId: string | null): void {
    const key = this.textsKey(familyId);
    if (!key) {
      this.textItems.set([]);
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      this.textItems.set([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TextItem[];
      if (!Array.isArray(parsed)) {
        this.textItems.set([]);
        return;
      }
      
      // Ensure curvature property exists
      const items = parsed.map(it => ({
        ...it,
        curvature: typeof (it as any).curvature === 'number' ? (it as any).curvature : 0,
      }));
      
      this.textItems.set(items);
    } catch {
      this.textItems.set([]);
    }
  }

  /**
   * Persist text items to localStorage
   */
  persistTextItems(familyId: string | null): void {
    const key = this.textsKey(familyId);
    if (!key) return;
    
    localStorage.setItem(key, JSON.stringify(this.textItems()));
  }

  /**
   * Create a new text item
   */
  createTextItem(opts: {
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    paperWidth: number;
    paperHeight: number;
  }): TextItem {
    return {
      id: `txt-${Date.now()}`,
      text: opts.text,
      fontFamily: opts.fontFamily,
      fontSize: opts.fontSize,
      color: opts.color,
      x: opts.paperWidth / 2,
      y: opts.paperHeight / 2,
      scale: 1,
      curvature: 0
    };
  }

  /**
   * Add a new text item
   */
  addTextItem(item: TextItem): void {
    const current = this.textItems();
    this.textItems.set([...current, item]);
  }

  /**
   * Update an existing text item
   */
  updateTextItem(id: string, updates: Partial<TextItem>): void {
    const current = this.textItems();
    const updated = current.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    this.textItems.set(updated);
  }

  /**
   * Move a text item to new position
   */
  moveTextItem(id: string, x: number, y: number): void {
    this.updateTextItem(id, { x, y });
  }

  /**
   * Delete a text item
   */
  deleteTextItem(id: string): void {
    const current = this.textItems();
    this.textItems.set(current.filter(item => item.id !== id));
  }

  /**
   * Get a text item by ID
   */
  getTextItem(id: string): TextItem | undefined {
    return this.textItems().find(item => item.id === id);
  }

  /**
   * Clear all text items
   */
  clearTextItems(): void {
    this.textItems.set([]);
  }

  // Couplet management

  /**
   * Load couplet data from localStorage
   */
  loadCouplet(familyId: string | null): void {
    const key = this.coupletKey(familyId);
    if (!key) return;

    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<CoupletData>;
      this.couplet.update(current => ({ ...current, ...parsed }));
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Persist couplet data to localStorage
   */
  persistCouplet(familyId: string | null): void {
    const key = this.coupletKey(familyId);
    if (!key) return;
    
    localStorage.setItem(key, JSON.stringify(this.couplet()));
  }

  /**
   * Update couplet data
   */
  updateCouplet(data: Partial<CoupletData>): void {
    this.couplet.update(current => ({ ...current, ...data }));
  }

  /**
   * Set complete couplet data
   */
  setCouplet(data: CoupletData): void {
    this.couplet.set(data);
  }

  // Private helper methods

  private textsKey(familyId: string | null): string | null {
    return familyId ? `tree:${familyId}:texts` : null;
  }

  private coupletKey(familyId: string | null): string | null {
    return familyId ? `tree:${familyId}:couplet` : null;
  }

  /**
   * Split text into words for curved text rendering
   */
  splitWords(text: string): string[] {
    return (text || '').split(/\s+/).filter(Boolean);
  }
}
