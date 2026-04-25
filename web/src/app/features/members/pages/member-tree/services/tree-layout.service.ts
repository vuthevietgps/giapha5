import { Injectable } from '@angular/core';
import type { Couple, Connection, LayoutPos, NodeDot } from '../member-tree.types';
import { computeLayout } from '../tree-utils';
import { computeConnectionsSimple } from '../tree-connections-simple.util';

export interface TreeLayout {
  pos: Record<string, { x: number; y: number }>;
  totalWidth: number;
  totalHeight: number;
  connections: any[];
  nodes: any[];
  coupleColors: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class TreeLayoutService {
  private readonly GAP_X = 36;
  private readonly GAP_Y = 48;

  // Estimate couple box sizes before layout
  estimateCoupleBoxes(levels: Couple[][]): Map<string, { width: number; height: number }> {
    const map = new Map<string, { width: number; height: number }>();
    const baseWidth = 220;
    const avatarW = 32;
    const avatarGap = 16;
    const padding = 20;
    const rowHeight = 34;

    for (const row of levels) {
      for (const c of row) {
        const wivesCount = (c.extraWives?.length || 0) + (c.female ? 1 : 0);
        const husbandsCount = c.extraHusbands?.length ? c.extraHusbands.length : 0;
        const wivesRowWidth = wivesCount > 0 ? wivesCount * avatarW + Math.max(0, wivesCount - 1) * avatarGap + padding : 0;
        const width = Math.max(baseWidth, wivesRowWidth || baseWidth);
        let rows = 0;
        if (c.male && !c.hideMale) rows++;
        if (wivesCount > 0) rows++;
        if (husbandsCount > 0) rows++;
        const height = Math.max(rowHeight, rows * rowHeight + (rows > 0 ? 12 : 0));
        map.set(c.key, { width, height });
      }
    }
    return map;
  }

  // Measure actual rendered couple boxes
  measureCoupleBoxes(host: HTMLElement, scale: number): Map<string, { width: number; height: number }> {
    const result = new Map<string, { width: number; height: number }>();
    if (!host) return result;

    const nodes = host.querySelectorAll('.couple[data-key]');
    nodes.forEach((n) => {
      const el = n as HTMLElement;
      const key = el.getAttribute('data-key');
      if (!key) return;

      const box = el.querySelector(':scope > .box') as HTMLElement | null;
      if (!box) return;

      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const logicalWidth = rect.width / scale;
      const logicalHeight = rect.height / scale;
      result.set(key, { 
        width: Math.max(160, Math.round(logicalWidth)), 
        height: Math.round(logicalHeight) 
      });
    });
    return result;
  }

  // Compute full layout
  computeTreeLayout(
    levels: any[][], 
    widths: Map<string, { width: number; height: number }>,
    wifeCenterMetrics?: Map<string, Map<string, { rx: number; cy: number; ax?: number; boxBottom?: number }>>
  ): any {
    const layout = computeLayout(levels, widths, this.GAP_X, this.GAP_Y);
    
    const { connections, nodes, coupleColors } = computeConnectionsSimple(
      levels,
      layout.pos,
      layout.coupleByKey,
      layout.parentChildren,
      wifeCenterMetrics || new Map()
    );
    return {
      pos: layout.pos,
      totalWidth: layout.totalWidth,
      totalHeight: layout.totalHeight,
      connections,
      nodes,
      coupleColors
    };
  }

  // Calculate scroll spacer dimensions
  getScrollDimensions(totalWidth: number, totalHeight: number, scale: number): { width: number; height: number } {
    const paddingLogical = 500 / scale;
    return {
      width: paddingLogical + totalWidth + paddingLogical,
      height: paddingLogical + totalHeight + paddingLogical
    };
  }
}
