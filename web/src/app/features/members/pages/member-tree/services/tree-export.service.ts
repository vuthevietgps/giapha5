import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type ExportSize = 'A4' | 'A3' | 'HQ2x1' | 'ACTUAL' | 'ACTUAL_600';
export type ExportOrientation = 'portrait' | 'landscape';

export interface ExportOptions {
  size: ExportSize;
  orientation: ExportOrientation;
  paperWidth: number;
  paperHeight: number;
  backgroundUrl: string | null;
  backgroundFit: 'cover' | 'contain';
  familyName: string;
}

interface ExportDimension {
  width: number;
  height: number;
  name: string;
  fitMode: boolean;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  captureW: number;
  captureH: number;
}

@Injectable({ providedIn: 'root' })
export class TreeExportService {
  private snack = inject(MatSnackBar);

  /**
   * Export canvas element to PNG file with specified dimensions and DPI
   */
  async exportToPNG(canvas: HTMLElement, options: ExportOptions): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    
    if (!canvas) {
      this.snack.open('Không tìm thấy canvas', 'Đóng', { duration: 2000 });
      return;
    }

    const { size, orientation, paperWidth, paperHeight, backgroundUrl, backgroundFit, familyName } = options;
    const canvasRect = canvas.getBoundingClientRect();
    const dimensions = this.calculateDimensions(paperWidth, paperHeight);
    const { width, height, name } = dimensions[size][orientation];

    try {
      this.snack.open(`Đang tạo ảnh ${name}...`, undefined, { duration: 1000 });

      // Wait for all images to load
      await this.waitForImages(canvas);

      // Wait additional time for render completion
      console.log('⏳ Waiting for render to complete...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Calculate bounding box using viewport
      const bounds = this.calculateBoundingBox(canvas);
      
      // Calculate capture scale based on export size
      const captureScale = this.getCaptureScale(size);
      
      console.log('🔧 Export settings:', { 
        size, 
        captureScale, 
        captureW: bounds.captureW, 
        captureH: bounds.captureH, 
        minX: bounds.minX, 
        minY: bounds.minY 
      });

      // Step 1: Capture canvas content - full element without restrictions
      console.log('🌳 Capturing content...');
      console.log('📦 Canvas element:', {
        tagName: canvas.tagName,
        className: canvas.className,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        scrollWidth: canvas.scrollWidth,
        scrollHeight: canvas.scrollHeight,
        childElements: canvas.children.length,
        hasDecor: canvas.querySelectorAll('.decor').length,
        hasText: canvas.querySelectorAll('.text-item').length,
        hasCouplet: canvas.querySelectorAll('.couplet-text').length,
        hasTree: canvas.querySelectorAll('.tree-content').length
      });
      
      // Capture full element - let html2canvas decide bounds
      const captured = await html2canvas(canvas, {
        backgroundColor: '#f5f5dc',
        scale: captureScale,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
      });

      console.log('✅ Captured size:', captured.width, 'x', captured.height);

      // Step 2: Create final canvas with background
      const finalCanvas = await this.composeFinalCanvas(
        captured,
        backgroundUrl,
        backgroundFit
      );

      // Step 3: Download the result
      await this.downloadCanvas(finalCanvas, familyName, name);

      this.snack.open(`Đã tải xuống ${name}`, 'Đóng', { duration: 2000 });

    } catch (error: any) {
      console.error('❌ Export error:', error);
      
      let errorMessage = 'Lỗi khi tạo ảnh';
      
      if (error?.message?.includes('tainted')) {
        errorMessage = 'Lỗi CORS: Một số ảnh không thể xuất do bảo mật';
      } else if (error?.message?.includes('canvas')) {
        errorMessage = 'Lỗi canvas: Kích thước quá lớn hoặc hết bộ nhớ';
      } else if (error?.message?.includes('blob')) {
        errorMessage = 'Không thể tạo file ảnh. Thử giảm kích thước xuất';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'Quá thời gian xử lý. Thử export với kích thước nhỏ hơn';
      } else if (error?.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      
      console.error('📋 Error details:', {
        message: error?.message,
        stack: error?.stack,
        exportSize: size,
        paperSize: `${paperWidth}x${paperHeight}`
      });
      
      this.snack.open(errorMessage, 'Đóng', { duration: 4000 });
    }
  }

  /**
   * Calculate export dimensions for all paper sizes
   */
  private calculateDimensions(actualWidth: number, actualHeight: number): Record<ExportSize, Record<ExportOrientation, ExportDimension>> {
    return {
      A4: {
        portrait: { width: 2480, height: 3508, name: 'A4_Doc', fitMode: true },
        landscape: { width: 3508, height: 2480, name: 'A4_Ngang', fitMode: true }
      },
      A3: {
        portrait: { width: 3508, height: 4961, name: 'A3_Doc', fitMode: true },
        landscape: { width: 4961, height: 3508, name: 'A3_Ngang', fitMode: true }
      },
      HQ2x1: {
        portrait: { width: 9500, height: 18670, name: 'HQ2x1_9500x18670', fitMode: true },
        landscape: { width: 18670, height: 9500, name: 'HQ2x1_18670x9500', fitMode: true }
      },
      ACTUAL: {
        portrait: { width: Math.round(actualWidth * 3.125), height: Math.round(actualHeight * 3.125), name: 'Actual_300DPI', fitMode: false },
        landscape: { width: Math.round(actualWidth * 3.125), height: Math.round(actualHeight * 3.125), name: 'Actual_300DPI', fitMode: false }
      },
      ACTUAL_600: {
        portrait: { width: Math.round(actualWidth * 6.25), height: Math.round(actualHeight * 6.25), name: 'Actual_600DPI', fitMode: false },
        landscape: { width: Math.round(actualWidth * 6.25), height: Math.round(actualHeight * 6.25), name: 'Actual_600DPI', fitMode: false }
      }
    };
  }

  /**
   * Wait for all images in canvas to fully load
   */
  private async waitForImages(canvas: HTMLElement): Promise<void> {
    const imgs = Array.from(canvas.querySelectorAll('img')) as HTMLImageElement[];
    console.log('📸 Found images to export:', imgs.length);
    
    imgs.forEach((img, i) => {
      console.log(`  Image ${i + 1}:`, {
        src: img.src.substring(0, 50) + '...',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        className: img.className,
        visible: img.offsetWidth > 0 && img.offsetHeight > 0
      });
    });

    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => {
          console.warn('⚠️ Image failed to load:', img.className);
          resolve(false);
        };
        setTimeout(() => resolve(false), 5000);
      });
    }));
  }

  /**
   * Calculate bounding box including overflow elements (decorations, text)
   */
  private calculateBoundingBox(canvas: HTMLElement): BoundingBox {
    const canvasRect = canvas.getBoundingClientRect();
    // Start with the visible viewport of the canvas
    let minX = 0, minY = 0, maxX = canvasRect.width, maxY = canvasRect.height;

    // Include overflow elements (decor, texts, couplet) so they are not cropped
    const overflowElements = canvas.querySelectorAll('.decor, .text-item, .couplet-text');
    console.log('🔍 Scanning', overflowElements.length, 'overflow elements...');

    for (const el of Array.from(overflowElements) as HTMLElement[]) {
      const rect = el.getBoundingClientRect();
      const relX = rect.left - canvasRect.left;
      const relY = rect.top - canvasRect.top;

      minX = Math.min(minX, relX);
      minY = Math.min(minY, relY);
      maxX = Math.max(maxX, relX + rect.width);
      maxY = Math.max(maxY, relY + rect.height);
    }

    const captureW = maxX - minX;
    const captureH = maxY - minY;

    console.log('📐 Calculated bounds:', {
      viewport: { width: canvasRect.width.toFixed(2), height: canvasRect.height.toFixed(2) },
      bounds: { minX: minX.toFixed(2), minY: minY.toFixed(2), maxX: maxX.toFixed(2), maxY: maxY.toFixed(2) },
      capture: { captureW: captureW.toFixed(2), captureH: captureH.toFixed(2) }
    });

    return { minX, minY, maxX, maxY, captureW, captureH };
  }

  /**
   * Get capture scale based on export size
   */
  private getCaptureScale(size: ExportSize): number {
    if (size.startsWith('ACTUAL')) {
      return size === 'ACTUAL_600' ? 6.25 : 3.125;
    }
    return size === 'HQ2x1' ? 3 : 2;
  }

  /**
   * Compose final canvas with background and captured content
   */
  private async composeFinalCanvas(
    captured: HTMLCanvasElement,
    backgroundUrl: string | null,
    backgroundFit: 'cover' | 'contain'
  ): Promise<HTMLCanvasElement> {
    // Check if captured canvas exceeds browser limits
    const maxDimension = 16384;
    const needsScaling = captured.width > maxDimension || captured.height > maxDimension;
    const scaleFactor = needsScaling 
      ? Math.min(maxDimension / captured.width, maxDimension / captured.height)
      : 1;

    const finalWidth = needsScaling ? Math.floor(captured.width * scaleFactor) : captured.width;
    const finalHeight = needsScaling ? Math.floor(captured.height * scaleFactor) : captured.height;

    if (needsScaling) {
      console.warn('⚠️ Canvas too large, scaling down by', scaleFactor.toFixed(3), 'to fit browser limits');
      console.log('📐 Original:', captured.width, 'x', captured.height, '→ Scaled:', finalWidth, 'x', finalHeight);
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    const ctx = finalCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Cannot create canvas context');
    }

    // Captured already has beige background, just draw it
    // Don't redraw background to avoid overwriting content
    console.log('🎯 Drawing captured content...');
    if (needsScaling) {
      ctx.drawImage(captured, 0, 0, finalWidth, finalHeight);
    } else {
      ctx.drawImage(captured, 0, 0);
    }
    
    console.log('✅ Final canvas size:', finalCanvas.width, 'x', finalCanvas.height);

    return finalCanvas;
  }

  /**
   * Draw background image on canvas context
   */
  private async drawBackgroundSimple(
    ctx: CanvasRenderingContext2D,
    backgroundUrl: string,
    backgroundFit: 'cover' | 'contain',
    targetW: number,
    targetH: number
  ): Promise<void> {
    console.log('🎨 Drawing background...');
    try {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => reject(new Error('Background load failed'));
        bgImg.src = backgroundUrl;
      });

      if (backgroundFit === 'cover') {
        const scale = Math.max(targetW / bgImg.width, targetH / bgImg.height);
        const scaledW = bgImg.width * scale;
        const scaledH = bgImg.height * scale;
        const x = (targetW - scaledW) / 2;
        const y = (targetH - scaledH) / 2;
        ctx.drawImage(bgImg, x, y, scaledW, scaledH);
        console.log('✅ Background drawn (cover):', { x, y, scaledW, scaledH });
      } else {
        const scale = Math.min(targetW / bgImg.width, targetH / bgImg.height);
        const scaledW = bgImg.width * scale;
        const scaledH = bgImg.height * scale;
        const x = (targetW - scaledW) / 2;
        const y = (targetH - scaledH) / 2;
        ctx.drawImage(bgImg, x, y, scaledW, scaledH);
        console.log('✅ Background drawn (contain):', { x, y, scaledW, scaledH });
      }
    } catch (err) {
      console.warn('⚠️ Could not load background:', err);
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, targetW, targetH);
    }
  }

  /**
   * Download canvas as PNG file
   */
  private async downloadCanvas(canvas: HTMLCanvasElement, familyName: string, sizeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('💾 Creating blob for download...', {
          width: canvas.width,
          height: canvas.height,
          estimatedSize: `${((canvas.width * canvas.height * 4) / 1024 / 1024).toFixed(2)} MB`
        });

        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('❌ Blob creation failed');
            reject(new Error('Không thể tạo file ảnh. Canvas có thể quá lớn hoặc hết bộ nhớ.'));
            return;
          }
          
          console.log('✅ Blob created:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${familyName}_${sizeName}_${new Date().getTime()}.png`;
          link.href = url;
          link.click();
          
          // Cleanup after a short delay to ensure download starts
          setTimeout(() => URL.revokeObjectURL(url), 100);
          resolve();
        }, 'image/png', 1.0);
      } catch (err) {
        console.error('❌ Download error:', err);
        reject(err);
      }
    });
  }
}
