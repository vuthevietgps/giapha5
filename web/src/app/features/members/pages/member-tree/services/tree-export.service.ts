import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ExportOptions {
  backgroundUrl: string | null;
  backgroundFit: 'cover' | 'contain';
  familyName: string;
  scale?: number; // Optional: default is 2 (2x zoom)
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
  private cloneRef: HTMLElement | null = null;

  /**
   * Export canvas element to PNG file with specified dimensions and DPI
   */
  async exportToPNG(canvas: HTMLElement, options: ExportOptions): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    
    if (!canvas) {
      this.snack.open('Không tìm thấy canvas', 'Đóng', { duration: 2000 });
      return;
    }

    const { backgroundUrl, backgroundFit, familyName, scale = 2 } = options;

    try {
      this.snack.open(`Đang tạo ảnh...`, undefined, { duration: 1000 });

      // Wait for all images to load
      await this.waitForImages(canvas);

      // Wait additional time for render completion
      console.log('⏳ Waiting for render to complete...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Create an offscreen clone with full scroll size to capture everything
      const fullClone = this.createFullHeightClone(canvas);
      const captureW = Math.max(fullClone.scrollWidth, fullClone.clientWidth, canvas.scrollWidth);
      const captureH = Math.max(fullClone.scrollHeight, fullClone.clientHeight, canvas.scrollHeight);

      console.log('🔧 Export settings:', { 
        scale,
        captureW,
        captureH,
        estimatedOutput: `${(captureW * scale).toFixed(0)} x ${(captureH * scale).toFixed(0)}`
      });

      // Step 1: Capture full element using the offscreen clone
      console.log('🌳 Capturing content...');
      console.log('📦 Clone element:', {
        tagName: fullClone.tagName,
        scrollWidth: fullClone.scrollWidth,
        scrollHeight: fullClone.scrollHeight,
        childElements: fullClone.children.length
      });
      
      const captured = await html2canvas(fullClone, {
        backgroundColor: '#f5f5dc',
        scale: scale,
        width: captureW,
        height: captureH,
        windowWidth: captureW,
        windowHeight: captureH,
        scrollX: 0,
        scrollY: 0,
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
      await this.downloadCanvas(finalCanvas, familyName);

      this.snack.open(`Đã tải xuống ảnh`, 'Đóng', { duration: 2000 });

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
        scale: scale
      });
      
      this.snack.open(errorMessage, 'Đóng', { duration: 4000 });
    } finally {
      // Clean up cloned node if it exists
      this.removeClone();
    }
  }

  /**
   * Create an offscreen clone with full scroll dimensions so html2canvas captures all content
   */
  private createFullHeightClone(canvas: HTMLElement): HTMLElement {
    // Clean up any existing clone first
    this.removeClone();

    const clone = canvas.cloneNode(true) as HTMLElement;
    const width = Math.max(canvas.scrollWidth, canvas.clientWidth, canvas.offsetWidth);
    const height = Math.max(canvas.scrollHeight, canvas.clientHeight, canvas.offsetHeight);

    Object.assign(clone.style, {
      position: 'absolute',
      left: '-99999px',
      top: '0px',
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: 'unset',
      maxHeight: 'unset',
      overflow: 'visible',
      transform: 'none',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    document.body.appendChild(clone);
    this.cloneRef = clone;
    return clone;
  }

  /**
   * Remove previously created clone
   */
  private removeClone(): void {
    if (this.cloneRef && this.cloneRef.parentElement) {
      this.cloneRef.parentElement.removeChild(this.cloneRef);
    }
    this.cloneRef = null;
  }

  /**
   * Calculate bounding box including overflow elements (decorations, text)
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
   * Doubles the height to include scrollable content
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

    // Use scrollHeight to include all scrollable content
    const scrollHeight = canvas.scrollHeight || maxY;
    maxY = Math.max(maxY, scrollHeight);
    
    // Double the height to capture more vertical content
    maxY = maxY * 2;

    const captureW = maxX - minX;
    const captureH = maxY - minY;

    console.log('📐 Calculated bounds:', {
      viewport: { width: canvasRect.width.toFixed(2), height: canvasRect.height.toFixed(2) },
      scrollHeight: scrollHeight.toFixed(2),
      bounds: { minX: minX.toFixed(2), minY: minY.toFixed(2), maxX: maxX.toFixed(2), maxY: maxY.toFixed(2) },
      capture: { captureW: captureW.toFixed(2), captureH: captureH.toFixed(2) }
    });

    return { minX, minY, maxX, maxY, captureW, captureH };
  }

  /**
   * Download canvas as PNG file
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
  private async downloadCanvas(canvas: HTMLCanvasElement, familyName: string): Promise<void> {
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
          link.download = `${familyName}_${new Date().getTime()}.png`;
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
