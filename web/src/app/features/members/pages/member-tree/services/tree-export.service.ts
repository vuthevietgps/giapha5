import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ExportOptions {
  backgroundUrl: string | null;
  backgroundFit: 'cover' | 'contain';
  familyName: string;
  scale?: number; // Optional: default is 2 (2x zoom)
}

@Injectable({ providedIn: 'root' })
export class TreeExportService {
  private snack = inject(MatSnackBar);

  /**
   * Export the tree area to a high-quality PNG file.
   *
   * Strategy: temporarily expand the scroll container to its full scroll dimensions
   * so html2canvas captures ALL content (not just the visible viewport).
   * This avoids cloning which breaks CSS transforms and computed styles.
   */
  async exportToPNG(element: HTMLElement, options: ExportOptions): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;

    if (!element) {
      this.snack.open('Không tìm thấy vùng cây', 'Đóng', { duration: 2000 });
      return;
    }

    const { backgroundUrl, backgroundFit, familyName, scale = 2 } = options;

    // Save original styles to restore later
    const saved = {
      overflow: element.style.overflow,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      width: element.style.width,
      maxWidth: element.style.maxWidth,
    };

    try {
      this.snack.open('Đang tạo ảnh...', undefined, { duration: 60000 });

      // Wait for all images to finish loading
      await this.waitForImages(element);
      await new Promise(r => setTimeout(r, 300));

      // Temporarily expand the element to show ALL scrollable content
      const captureW = Math.max(element.scrollWidth, element.clientWidth);
      const captureH = Math.max(element.scrollHeight, element.clientHeight);

      Object.assign(element.style, {
        overflow: 'visible',
        height: `${captureH}px`,
        maxHeight: 'none',
        width: `${captureW}px`,
        maxWidth: 'none',
      });

      // Allow the browser to reflow with the new dimensions
      await new Promise(r => setTimeout(r, 200));

      // Clamp scale to avoid exceeding browser canvas limits (16384px per side)
      const maxDimension = 16384;
      const effectiveScale = Math.min(
        scale,
        maxDimension / captureW,
        maxDimension / captureH
      );

      // Capture with html2canvas
      const captured = await html2canvas(element, {
        backgroundColor: null, // transparent so we can composite background
        scale: effectiveScale,
        width: captureW,
        height: captureH,
        windowWidth: captureW,
        windowHeight: captureH,
        scrollX: -element.scrollLeft,
        scrollY: -element.scrollTop,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
      });

      // Compose final image: background first, then captured tree on top
      const finalCanvas = await this.composeFinalCanvas(
        captured,
        backgroundUrl,
        backgroundFit
      );

      // Download
      await this.downloadCanvas(finalCanvas, familyName);
      this.snack.open('Đã tải xuống ảnh', 'Đóng', { duration: 2000 });

    } catch (error: any) {
      let errorMessage = 'Lỗi khi tạo ảnh';
      if (error?.message?.includes('tainted')) {
        errorMessage = 'Lỗi CORS: Một số ảnh không thể xuất do bảo mật trình duyệt';
      } else if (error?.message?.includes('canvas') || error?.message?.includes('memory')) {
        errorMessage = 'Lỗi canvas: Kích thước quá lớn hoặc hết bộ nhớ';
      } else if (error?.message?.includes('blob')) {
        errorMessage = 'Không thể tạo file ảnh. Thử giảm kích thước xuất';
      } else if (error?.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      this.snack.open(errorMessage, 'Đóng', { duration: 4000 });
    } finally {
      // CRITICAL: Restore original styles so the page returns to normal
      Object.assign(element.style, saved);
    }
  }

  /**
   * Wait for all <img> elements inside the container to finish loading
   */
  private async waitForImages(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(() => resolve(), 5000);
      });
    }));
  }

  /**
   * Compose the final canvas: draw background first, then overlay the captured tree content.
   */
  private async composeFinalCanvas(
    captured: HTMLCanvasElement,
    backgroundUrl: string | null,
    backgroundFit: 'cover' | 'contain'
  ): Promise<HTMLCanvasElement> {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = captured.width;
    finalCanvas.height = captured.height;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create canvas context');

    // 1) Draw background (or fallback beige fill)
    if (backgroundUrl) {
      await this.drawBackground(ctx, backgroundUrl, backgroundFit, captured.width, captured.height);
    } else {
      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(0, 0, captured.width, captured.height);
    }

    // 2) Draw captured tree content on top of the background
    ctx.drawImage(captured, 0, 0);

    return finalCanvas;
  }

  /**
   * Draw background image onto the canvas context with cover/contain fit
   */
  private async drawBackground(
    ctx: CanvasRenderingContext2D,
    backgroundUrl: string,
    backgroundFit: 'cover' | 'contain',
    targetW: number,
    targetH: number
  ): Promise<void> {
    try {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => reject(new Error('Background load failed'));
        bgImg.src = backgroundUrl;
      });

      const scale = backgroundFit === 'cover'
        ? Math.max(targetW / bgImg.width, targetH / bgImg.height)
        : Math.min(targetW / bgImg.width, targetH / bgImg.height);
      const scaledW = bgImg.width * scale;
      const scaledH = bgImg.height * scale;
      const x = (targetW - scaledW) / 2;
      const y = (targetH - scaledH) / 2;
      ctx.drawImage(bgImg, x, y, scaledW, scaledH);
    } catch {
      // Fallback: beige fill if background fails to load
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
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Không thể tạo file ảnh. Canvas có thể quá lớn hoặc hết bộ nhớ.'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${familyName}_${new Date().getTime()}.png`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 500);
          resolve();
        }, 'image/png', 1.0);
      } catch (err) {
        reject(err);
      }
    });
  }
}
