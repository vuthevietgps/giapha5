import { Injectable, ElementRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TreeViewportService {
  // Constants
  private readonly SCALE_MIN = 0.4;
  private readonly SCALE_MAX = 2;
  
  // State
  scale = 1;
  viewportShiftX = 100;
  viewportShiftY = 100;
  scrollXEnabled = false;
  scrollYEnabled = true;

  // Pan state
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };

  // Zoom with Ctrl+Wheel
  handleZoom(ev: WheelEvent): boolean {
    if (!ev.ctrlKey && !ev.metaKey) return false;
    
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(this.SCALE_MAX, Math.max(this.SCALE_MIN, this.scale + delta));
    
    if (newScale !== this.scale) {
      this.scale = newScale;
      return true; // Signal scale changed
    }
    return false;
  }

  // Pan functionality
  startPan(ev: MouseEvent, element: HTMLElement): boolean {
    const target = ev.target as HTMLElement;
    if (target.closest('.box, .person, button')) return false;
    
    this.isDragging = true;
    this.lastMousePos = { x: ev.clientX, y: ev.clientY };
    element.style.cursor = 'grabbing';
    return true;
  }

  updatePan(ev: MouseEvent): boolean {
    if (!this.isDragging) return false;
    
    const deltaX = ev.clientX - this.lastMousePos.x;
    const deltaY = ev.clientY - this.lastMousePos.y;
    
    this.viewportShiftX += deltaX;
    this.viewportShiftY += deltaY;
    
    this.lastMousePos = { x: ev.clientX, y: ev.clientY };
    return true;
  }

  endPan(element: HTMLElement): void {
    this.isDragging = false;
    element.style.cursor = 'grab';
  }

  // Center tree
  centerTree(host: HTMLElement, totalWidth: number, totalHeight: number): void {
    this.viewportShiftX = (host.clientWidth - totalWidth * this.scale) / 2;
    this.viewportShiftY = (host.clientHeight - totalHeight * this.scale) / 2;
    
    host.scrollTo({
      top: host.scrollHeight / 2 - host.clientHeight / 2,
      left: host.scrollWidth / 2 - host.clientWidth / 2,
      behavior: 'smooth'
    });
  }

  // Update scroll enablement
  updateScrollState(
    totalWidth: number, 
    totalHeight: number, 
    containerWidth: number, 
    containerHeight: number, 
    framePad: { left: number; right: number; top: number; bottom: number }
  ): void {
    const safeAreaWidth = containerWidth - framePad.left - framePad.right;
    const safeAreaHeight = containerHeight - framePad.top - framePad.bottom;
    const scaledContentW = totalWidth * this.scale;
    
    this.scrollXEnabled = scaledContentW > safeAreaWidth + 0.5;
    this.scrollYEnabled = true; // Always allow vertical scroll
  }
  
  zoomAtPoint(factor: number, mouseX: number, mouseY: number, el: ElementRef) {
    const oldScale = this.scale;
    const delta = (factor - 1) * oldScale;
    const newScale = Math.min(this.SCALE_MAX, Math.max(this.SCALE_MIN, this.scale + delta));
    if (newScale === this.scale) return;
    
    // Adjust pan to zoom towards the mouse point
    const dx = mouseX - el.nativeElement.clientWidth / 2;
    const dy = mouseY - el.nativeElement.clientHeight / 2;
    this.viewportShiftX -= dx * (newScale - oldScale) / oldScale;
    this.viewportShiftY -= dy * (newScale - oldScale) / oldScale;
    this.scale = newScale;
  }
}