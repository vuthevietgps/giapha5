import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, AfterViewInit, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BackgroundService } from '../backgrounds/services/background';
import { FamilyService } from '../families/services/family';
import type { BackgroundImage } from '../backgrounds/models/background.model';
import type { Family } from '../families/models/family.model';
import { CoupletDialog, CoupletData, CoupletDialogResult, FontItem } from './couplet.dialog';

interface DecorAsset {
  id: string;
  name: string;
  dataUrl: string;
}

type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';
type MovableLayer = 'scroll' | 'dragonLeft' | 'dragonRight' | 'coupletLeft' | 'coupletRight' | 'tree';

interface LayerPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-print-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatSnackBarModule,
  ],
  templateUrl: './print-page.html',
  styleUrl: './print-page.scss',
})
export class PrintPage implements OnInit, AfterViewInit {
  private readonly familiesApi = inject(FamilyService);
  private readonly backgroundsApi = inject(BackgroundService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('outerRef') outerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef') canvasRef?: ElementRef<HTMLDivElement>;

  readonly designWidth = 20000;  // 2:1 ratio for 2m x 1m output
  readonly designHeight = 10000;
  readonly layoutVersion = 'print-layout-2x1-v3';
  previewScale = signal(0.05);

  families: Family[] = [];
  backgrounds: BackgroundImage[] = [];
  selectedFamilyId: string | null = null;
  selectedBackgroundId: string | null = null;
  backgroundUrl: string | null = null;

  treeImageUrl: string | null = null;
  treeSvgSource: string | null = null;
  treeSvgUrl: SafeUrl | null = null;
  treeFontRem = 1.0;

  // Default anchors follow the 2:1 design space (20000 x 10000)
  readonly defaultPositions: Record<MovableLayer, LayerPosition> = {
    scroll: { x: 20000 / 2 - (20000 * 0.32) / 2, y: 220 },
    dragonLeft: { x: 900, y: 1200 },
    dragonRight: { x: 20000 - 900 - 1200, y: 1200 },
    coupletLeft: { x: 220, y: 4300 },
    coupletRight: { x: 20000 - 220 - 360, y: 4300 },
    tree: { x: 900, y: 2200 },
  };

  positions: Record<MovableLayer, LayerPosition> = JSON.parse(JSON.stringify(this.defaultPositions));
  private readonly baseTreeSize = { width: 18000, height: 6500 }; // cố định khung chứa cây
  treeZoom = 100; // percent

  get treeWidthPx(): number {
    return this.baseTreeSize.width;
  }

  get treeHeightPx(): number {
    return this.baseTreeSize.height;
  }

  private dragState: { layer: MovableLayer; startX: number; startY: number; origin: LayerPosition } | null = null;

  couplet: CoupletData = {
    leftText: '',
    rightText: '',
    fontSize: 18,
    fontFamily: 'Dancing Script',
    color: '#2c1b0f',
  };

  private readonly serverFontNames: string[] = [
    'Fz DucThuyThuPhap', 'Fz ThuPhapButBi Full', 'Fz-Thu-Phap-Giao-Long-Full', 'FzFashionSignature',
    'HL-OngDo-Unicode', 'HL-thufap1-Unicode', 'HL-thufap5-unicode', 'hlbrush2', 'hlbrush3', 'hlgiomuc', 'hlnetbut',
    'hltfap4e', 'hltphbk2', 'htf1bkup', 'htf3bkup', 'ThuPhap 1(chu dai)', 'ThuPhap 1b (chu dai)', 'ThuPhap 2(chu ngan)',
    'ThuphapXuan', 'TMC-Ong Do', 'UTM-ThuPhap-Thien An', 'Vbutlong', 'VNbrique', 'Vndisney', 'Vndiudag', 'Vnhltfap',
    'VNI-Bay buom', 'VNI-Baybuom', 'VNI-Briquet', 'VNI-Disney', 'VNI-HL Thu fap', 'VNI-HLThuphap', 'VNI-Netbut',
    'VNI-Ong do', 'VNI-Slogan', 'VNI-Thu fap2', 'VNI-Thu fap3', 'VNI-Thu fapf', 'VNI-Thufap2', 'VNI-Thufap3',
    'VNI-Thufapfan', 'VNI-Truck', 'VNI-Trung Kien', 'VNI-Viettay', 'vnibaybuom', 'Vnibbuom', 'vnibriquet', 'VNIMATIS',
    'vnimatisse', 'vniongdo', 'vnithufap', 'vnithufap2', 'vnithufap3', 'vnithufapfan', 'vnithuphapslogan', 'Vnitruck',
    'VNI_THUPHAP', 'Vnnetbut', 'Vntfap01', 'Vnthcao', 'Vnthfap2', 'Vnthfap3', 'Vnthfapf', 'Vongdohl'
  ];

  builtInFonts: FontItem[] = [
    { name: 'Dancing Script', source: 'builtin' },
    { name: 'Times New Roman', source: 'builtin' },
    { name: 'Arial', source: 'builtin' },
    // Prefill with names from server/font so user có thể chọn nhanh; cần tải font file để thực sự áp dụng.
    ...[...new Set(this.serverFontNames)].map(name => ({ name, source: 'builtin' as const })),
  ];

  customFonts: FontItem[] = [];

  decorAssets: Record<DecorSlot, DecorAsset[]> = {
    scroll: [],
    dragonLeft: [],
    dragonRight: [],
  };

  selectedDecor: Record<DecorSlot, string | null> = {
    scroll: null,
    dragonLeft: null,
    dragonRight: null,
  };

  ngOnInit(): void {
    this.loadFamilies();
    this.loadBackgrounds();
    this.loadDecorFromStorage();
    this.loadTreeZoom();
    this.loadPositions();
    const savedBg = localStorage.getItem('print:selectedBackground');
    this.selectedBackgroundId = savedBg || null;
    this.updateBackgroundUrl();
    this.loadCouplet();
    this.loadFonts();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updatePreviewScale(), 30);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updatePreviewScale();
  }

  get selectedFamilyName(): string {
    return this.families.find((f) => f.id === this.selectedFamilyId)?.name || 'Chưa chọn';
  }

  onFamilyChange(familyId: string | null): void {
    this.selectedFamilyId = familyId;
    this.loadTreeAssetForFamily();
  }

  backgroundLabel(bg: BackgroundImage): string {
    return bg.name || 'Ảnh nền';
  }

  onBackgroundChange(val: string | null): void {
    this.selectedBackgroundId = val;
    this.updateBackgroundUrl();
    if (val) localStorage.setItem('print:selectedBackground', val);
    else localStorage.removeItem('print:selectedBackground');
  }

  async onDecorUpload(slot: DecorSlot, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      const asset: DecorAsset = { id: `${slot}-${Date.now()}`, name: file.name, dataUrl };
      this.decorAssets[slot] = [asset, ...this.decorAssets[slot]].slice(0, 8);
      this.selectedDecor[slot] = asset.id;
      this.persistDecor(slot);
      this.snack.open('Đã tải ảnh trang trí', 'Đóng', { duration: 1500 });
    } catch (err) {
      console.error(err);
      this.snack.open('Không đọc được file ảnh', 'Đóng', { duration: 2000 });
    }
  }

  clearDecor(slot: DecorSlot): void {
    this.selectedDecor[slot] = null;
    this.persistDecor(slot);
  }

  decorSource(slot: DecorSlot): string | null {
    const id = this.selectedDecor[slot];
    if (!id) return null;
    const asset = this.decorAssets[slot].find((a) => a.id === id);
    return asset?.dataUrl || null;
  }

  clearTreeImage(): void {
    this.treeImageUrl = null;
    this.persistTreeAsset(true);
  }

  onTreeSvgSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.treeSvgSource = text;
      this.treeFontRem = 1.0;
      this.treeImageUrl = null; // Ưu tiên SVG
      this.applyTreeFontSize(this.treeFontRem);
      this.persistTreeAsset();
      this.snack.open('Đã nạp SVG cây', 'Đóng', { duration: 1500 });
    };
    reader.onerror = () => this.snack.open('Không đọc được file SVG', 'Đóng', { duration: 2000 });
    reader.readAsText(file, 'utf-8');
  }

  applyTreeFontSize(rem: number): void {
    if (!this.treeSvgSource) return;
    const px = Math.max(0.1, rem) * 16;

    // Chèn hoặc thay thế style để ép font-size cho text trong SVG
    const svg = this.treeSvgSource;
    const styleTag = `<style id="tree-font-patch">svg * { font-size: ${px}px !important; }</style>`;
    let patched: string;
    const hasStyle = svg.includes('tree-font-patch');
    if (hasStyle) {
      patched = svg.replace(/<style id="tree-font-patch">[\s\S]*?<\/style>/, styleTag);
    } else {
      const insertPos = svg.indexOf('>');
      if (insertPos !== -1) patched = svg.slice(0, insertPos + 1) + styleTag + svg.slice(insertPos + 1);
      else patched = styleTag + svg;
    }

    this.treeSvgUrl = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/svg+xml;utf8,' + encodeURIComponent(patched));
    this.persistTreeAsset();
  }

  clearTreeSvg(): void {
    this.treeSvgSource = null;
    this.treeSvgUrl = null;
    this.persistTreeAsset(true);
  }

  onTreeZoomChange(val: number): void {
    this.treeZoom = Math.max(50, Math.min(200, val));
    this.persistTreeZoom();
    this.persistTreeAsset();
  }

  resetTreeZoom(): void {
    this.treeZoom = 100;
    this.persistTreeZoom();
    this.persistTreeAsset();
  }

  async exportPoster(): Promise<void> {
    if (!this.canvasRef) {
      this.snack.open('Không tìm thấy khung in', 'Đóng', { duration: 1800 });
      return;
    }

    const html2canvas = (await import('html2canvas')).default;
    const target = this.canvasRef.nativeElement;

    try {
      this.snack.open('Đang kết xuất 18670 x 9500...', undefined, { duration: 1500 });
      const canvas = await html2canvas(target, {
        backgroundColor: this.backgroundUrl ? null : '#ffffff',
        scale: 1,
        logging: false,
        useCORS: true,
        width: this.designWidth,
        height: this.designHeight,
        windowWidth: this.designWidth,
        windowHeight: this.designHeight,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const name = (this.selectedFamilyName || 'GiaPha').replace(/\s+/g, '_');
        link.download = `${name}_in-an_${this.designWidth}x${this.designHeight}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        this.snack.open('Đã tải ảnh in ấn', 'Đóng', { duration: 1800 });
      }, 'image/png', 1.0);
    } catch (err) {
      console.error(err);
      this.snack.open('Lỗi kết xuất hình ảnh', 'Đóng', { duration: 2000 });
    }
  }

  private updatePreviewScale(): void {
    if (!this.outerRef) return;
    const host = this.outerRef.nativeElement;
    const availableW = host.clientWidth - 24;
    const availableH = host.clientHeight - 24;
    if (availableW <= 0 || availableH <= 0) return;
    const scale = Math.min(availableW / this.designWidth, availableH / this.designHeight, 1);
    this.previewScale.set(scale);
  }

  private loadFamilies(): void {
    this.familiesApi.list().subscribe((list) => {
      this.families = list || [];
      if (!this.selectedFamilyId && this.families.length) {
        this.selectedFamilyId = this.families[0].id || null;
      }
      this.loadTreeAssetForFamily();
    });
  }

  private loadBackgrounds(): void {
    this.backgroundsApi.list().subscribe((list) => {
      this.backgrounds = list || [];
      this.updateBackgroundUrl();
    });
  }

  private loadPositions(): void {
    const raw = localStorage.getItem('print:positions');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { version?: string; positions?: Record<MovableLayer, LayerPosition> };
      if (parsed.version !== this.layoutVersion || !parsed.positions) {
        this.positions = JSON.parse(JSON.stringify(this.defaultPositions));
        this.persistPositions();
        return;
      }
      this.positions = { ...this.defaultPositions, ...parsed.positions };
    } catch {
      this.positions = JSON.parse(JSON.stringify(this.defaultPositions));
      this.persistPositions();
    }
  }

  private persistPositions(): void {
    localStorage.setItem('print:positions', JSON.stringify({ version: this.layoutVersion, positions: this.positions }));
  }

  private updateBackgroundUrl(): void {
    this.backgroundUrl = this.selectedBackgroundId ? this.backgroundsApi.fileUrl(this.selectedBackgroundId) : null;
  }

  private loadDecorFromStorage(): void {
    (['scroll', 'dragonLeft', 'dragonRight'] as DecorSlot[]).forEach((slot) => {
      const raw = localStorage.getItem(this.decorKey(slot));
      if (raw) {
        try {
          this.decorAssets[slot] = JSON.parse(raw) as DecorAsset[];
        } catch {
          this.decorAssets[slot] = [];
        }
      }
      const sel = localStorage.getItem(this.decorSelectedKey(slot));
      this.selectedDecor[slot] = sel || null;
    });
  }

  persistDecor(slot: DecorSlot): void {
    localStorage.setItem(this.decorKey(slot), JSON.stringify(this.decorAssets[slot]));
    if (this.selectedDecor[slot]) localStorage.setItem(this.decorSelectedKey(slot), this.selectedDecor[slot] as string);
    else localStorage.removeItem(this.decorSelectedKey(slot));
  }

  private decorKey(slot: DecorSlot): string {
    return `print:decor:${slot}`;
  }

  private decorSelectedKey(slot: DecorSlot): string {
    return `print:selected:${slot}`;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  openCoupletDialog(): void {
    const ref = this.dialog.open(CoupletDialog, { data: { couplet: { ...this.couplet }, fonts: this.allFonts(), customFonts: [...this.customFonts] } });
    ref.afterClosed().subscribe((res: CoupletDialogResult | undefined) => {
      if (!res) return;
      this.couplet = res.couplet;
      this.customFonts = res.customFonts || [];
      this.persistCouplet();
      this.persistFonts();
      // Re-register fonts to ensure available after dialog changes
      this.customFonts.forEach(f => this.registerFontFace(f.name, f.dataUrl!));
    });
  }

  private loadCouplet(): void {
    const raw = localStorage.getItem('print:couplet');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CoupletData;
      this.couplet = { ...this.couplet, ...parsed };
    } catch {
      /* ignore */
    }
  }

  private persistCouplet(): void {
    localStorage.setItem('print:couplet', JSON.stringify(this.couplet));
  }

  private loadFonts(): void {
    const raw = localStorage.getItem('print:fonts');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FontItem[];
      this.customFonts = parsed || [];
      this.customFonts.forEach(f => { if (f.dataUrl) this.registerFontFace(f.name, f.dataUrl); });
    } catch {
      this.customFonts = [];
    }
  }

  private persistFonts(): void {
    localStorage.setItem('print:fonts', JSON.stringify(this.customFonts));
  }

  allFonts(): FontItem[] {
    return [...this.builtInFonts, ...this.customFonts];
  }

  splitWords(text: string): string[] {
    return (text || '').split(/\s+/).filter(Boolean);
  }

  private registerFontFace(name: string, dataUrl: string): void {
    if (!name || !dataUrl) return;
    const id = `font-${name.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face { font-family: '${name}'; src: url(${dataUrl}) format('opentype'); font-display: swap; }`;
    document.head.appendChild(style);
  }

  private loadTreeZoom(): void {
    const raw = localStorage.getItem('print:treeZoom');
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) this.treeZoom = Math.max(50, Math.min(200, parsed));
  }

  private persistTreeZoom(): void {
    localStorage.setItem('print:treeZoom', String(this.treeZoom));
  }

  private treeAssetKey(): string | null {
    if (!this.selectedFamilyId) return null;
    return `print:treeAsset:${this.selectedFamilyId}`;
  }

  private persistTreeAsset(clear = false): void {
    const key = this.treeAssetKey();
    if (!key) return;
    if (clear || (!this.treeSvgSource && !this.treeImageUrl)) {
      localStorage.removeItem(key);
      return;
    }
    const payload = {
      svg: this.treeSvgSource,
      image: this.treeImageUrl,
      fontRem: this.treeFontRem,
      zoom: this.treeZoom,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }

  private loadTreeAssetForFamily(): void {
    const key = this.treeAssetKey();
    if (!key) {
      this.clearTreeSvg();
      this.clearTreeImage();
      return;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.clearTreeSvg();
      this.clearTreeImage();
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { svg?: string; image?: string; fontRem?: number; zoom?: number };
      this.treeFontRem = parsed.fontRem ?? 1.0;
      this.treeZoom = Math.max(50, Math.min(200, parsed.zoom ?? this.treeZoom));
      if (parsed.svg) {
        this.treeSvgSource = parsed.svg;
        this.applyTreeFontSize(this.treeFontRem);
      } else {
        this.treeSvgSource = null;
        this.treeSvgUrl = null;
      }
      this.treeImageUrl = parsed.image || null;
      this.persistTreeZoom();
    } catch {
      this.clearTreeSvg();
      this.clearTreeImage();
    }
  }

  beginDrag(layer: MovableLayer, ev: PointerEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const pos = this.positions[layer];
    this.dragState = {
      layer,
      startX: ev.clientX,
      startY: ev.clientY,
      origin: { ...pos },
    };
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(ev: PointerEvent): void {
    if (!this.dragState) return;
    ev.preventDefault();
    const scale = this.previewScale();
    const dx = (ev.clientX - this.dragState.startX) / scale;
    const dy = (ev.clientY - this.dragState.startY) / scale;
    const { layer, origin } = this.dragState;
    this.positions = {
      ...this.positions,
      [layer]: { x: origin.x + dx, y: origin.y + dy },
    };
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    if (!this.dragState) return;
    this.persistPositions();
    this.dragState = null;
  }

  isDragging(layer: MovableLayer): boolean {
    return this.dragState?.layer === layer;
  }

  positionTransform(layer: MovableLayer): string {
    const p = this.positions[layer];
    return `translate(${p.x}px, ${p.y}px)`;
  }

  resetPositions(): void {
    this.positions = JSON.parse(JSON.stringify(this.defaultPositions));
    this.persistPositions();
  }
}
