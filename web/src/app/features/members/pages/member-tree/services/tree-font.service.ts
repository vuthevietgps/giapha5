import { Injectable, signal } from '@angular/core';

export interface FontItem {
  name: string;
  source: 'builtin' | 'custom';
  dataUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class TreeFontService {
  // Built-in fonts available by default
  private readonly builtInFonts: FontItem[] = [
    { name: 'Dancing Script', source: 'builtin' },
    { name: 'Times New Roman', source: 'builtin' },
    { name: 'Arial', source: 'builtin' },
    { name: 'Noto Serif', source: 'builtin' },
  ];

  // Custom uploaded fonts
  customFonts = signal<FontItem[]>([]);

  /**
   * Load custom fonts from localStorage for a family
   */
  loadFonts(familyId: string | null): void {
    const key = this.fontsKey(familyId);
    if (!key) {
      this.customFonts.set([]);
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      this.customFonts.set([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as FontItem[];
      this.customFonts.set(parsed || []);
      
      // Register all custom fonts
      parsed.forEach(font => {
        if (font.dataUrl) {
          this.registerFontFace(font.name, font.dataUrl);
        }
      });
    } catch {
      this.customFonts.set([]);
    }
  }

  /**
   * Persist custom fonts to localStorage
   */
  persistFonts(familyId: string | null): void {
    const key = this.fontsKey(familyId);
    if (!key) return;
    
    localStorage.setItem(key, JSON.stringify(this.customFonts()));
  }

  /**
   * Add a custom font from file
   */
  async addFont(familyId: string | null, file: File): Promise<void> {
    if (!familyId) return;

    const dataUrl = await this.readFileAsDataUrl(file);
    const fontName = file.name.replace(/\.(otf|ttf|woff|woff2)$/i, '');
    
    const font: FontItem = {
      name: fontName,
      source: 'custom',
      dataUrl
    };

    // Register the font face
    this.registerFontFace(fontName, dataUrl);

    // Add to custom fonts list
    const current = this.customFonts();
    this.customFonts.set([...current, font]);
    
    this.persistFonts(familyId);
  }

  /**
   * Remove a custom font
   */
  removeFont(familyId: string | null, fontName: string): void {
    const current = this.customFonts();
    this.customFonts.set(current.filter(f => f.name !== fontName));
    this.persistFonts(familyId);
    
    // Remove font face from document
    this.unregisterFontFace(fontName);
  }

  /**
   * Get all fonts (built-in + custom)
   */
  getAllFonts(): FontItem[] {
    return [...this.builtInFonts, ...this.customFonts()];
  }

  /**
   * Get built-in fonts only
   */
  getBuiltInFonts(): FontItem[] {
    return this.builtInFonts;
  }

  /**
   * Register a font face in the document
   */
  private registerFontFace(name: string, dataUrl: string): void {
    if (!name || !dataUrl) return;
    
    const id = `font-${name.replace(/\s+/g, '-')}`;
    
    // Check if already registered
    if (document.getElementById(id)) return;
    
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { 
      font-family: '${name}'; 
      src: url(${dataUrl}) format('opentype'); 
      font-display: swap; 
    }`;
    document.head.appendChild(style);
  }

  /**
   * Unregister a font face from the document
   */
  private unregisterFontFace(name: string): void {
    const id = `font-${name.replace(/\s+/g, '-')}`;
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  }

  /**
   * Read file as data URL
   */
  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get localStorage key for fonts
   */
  private fontsKey(familyId: string | null): string | null {
    return familyId ? `tree:${familyId}:fonts` : null;
  }
}
