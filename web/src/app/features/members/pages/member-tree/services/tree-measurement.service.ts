import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TreeMeasurementService {
  
  // Measure wife center metrics for connections
  measureWifeCenterMetrics(
    host: HTMLElement, 
    scale: number, 
    framePad: { left: number; top: number }, 
    viewportShiftX: number
  ): Map<string, Map<string, { rx: number; cy: number; ax?: number; boxBottom?: number }>> {
    const result = new Map<string, Map<string, { rx: number; cy: number; ax?: number; boxBottom?: number }>>();
    if (!host) return result;

    const coupleNodes = host.querySelectorAll('[data-key]');
    const hostRect = host.getBoundingClientRect();
    const scrollLeft = host.scrollLeft || 0;
    const scrollTop = host.scrollTop || 0;

    coupleNodes.forEach((node) => {
      const key = (node as HTMLElement).getAttribute('data-key');
      if (!key) return;
      
      const rect = (node as HTMLElement).getBoundingClientRect();
      if (rect.width <= 0) return;

      const map = new Map<string, { rx: number; cy: number; ax?: number; boxBottom?: number }>();
  const wives = (node as HTMLElement).querySelectorAll('.wives-list .person[data-mother-id]');
      
      wives.forEach((wife) => {
        const motherId = (wife as HTMLElement).getAttribute('data-mother-id') || '';
        const avatar = (wife as HTMLElement).querySelector('.avatar') as HTMLElement | null;
        const r = (avatar || (wife as HTMLElement)).getBoundingClientRect();
        
        const centerX = r.left + r.width / 2 - rect.left;
        const rx = rect.width > 0 ? Math.min(1, Math.max(0, centerX / rect.width)) : 0.5;
        const cy = r.top + r.height / 2 - rect.top;
        
        const ax = ((r.left + r.width / 2 - hostRect.left) + scrollLeft) / scale - framePad.left - viewportShiftX;
        const boxBottom = ((rect.bottom - hostRect.top) + scrollTop) / scale - framePad.top;
        
        if (motherId) {
          map.set(motherId, { rx, cy, ax, boxBottom });
        }
      });
      
      if (map.size) result.set(key, map);
    });
    
    return result;
  }

  // Calculate container height to fill viewport
  calculateContainerHeight(element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    const bottomPadding = 16;
    return Math.max(360, Math.floor(vh - rect.top - bottomPadding));
  }
}