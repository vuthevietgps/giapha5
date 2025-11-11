import type { Couple, LayoutPos } from './member-tree.types';

export interface LayoutResult {
  pos: Record<string, LayoutPos>;
  parentChildren: Map<string, string[]>;
  coupleLevel: Map<string, number>;
  memberToCouple: Map<string, string>;
  coupleByKey: Map<string, Couple>;
  totalHeight: number;
  totalWidth: number;
}

// Helper: build parent-children relationship map
function buildParentChildrenMap(levels: Couple[][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let i = 1; i < levels.length; i++) {
    for (const couple of levels[i]) {
      if (couple.hideInHub) continue; // do not allocate space for hidden hub boxes
      const parentKey = couple.parentKey;
      if (parentKey) {
        const children = map.get(parentKey) || [];
        children.push(couple.key);
        map.set(parentKey, children);
      }
    }
  }
  return map;
}

// Helper: calculate row heights and Y positions
function calculateRowMetrics(
  levels: Couple[][], 
  widths: Map<string, { width: number; height: number }>, 
  gapY: number
) {
  const rowHeights = levels.map(level => {
    const visible = level.filter(c => !c.hideInHub);
    return Math.max(0, ...visible.map(c => widths.get(c.key)?.height || 0));
  });
  
  let y = 0;
  const rowY = rowHeights.map(height => {
    const current = y;
    y += height + gapY;
    return current;
  });
  
  return { rowHeights, rowY, totalHeight: y - gapY };
}

// Helper: update all maps for a couple
function updateCoupleInMaps(
  couple: Couple, 
  level: number, 
  coupleLevel: Map<string, number>,
  memberToCouple: Map<string, string>,
  coupleByKey: Map<string, Couple>
) {
  coupleLevel.set(couple.key, level);
  if (couple.male?.id) memberToCouple.set(couple.male.id, couple.key);
  if (couple.female?.id) memberToCouple.set(couple.female.id, couple.key);
  coupleByKey.set(couple.key, couple);
}

export function computeLayout(
  levels: Couple[][],
  widths: Map<string, { width: number; height: number }>,
  gapX: number,
  gapY: number
): LayoutResult {
  const parentChildren = buildParentChildrenMap(levels);
  const { rowHeights, rowY, totalHeight } = calculateRowMetrics(levels, widths, gapY);
  
  const pos: Record<string, LayoutPos> = {};
  const coupleLevel = new Map<string, number>();
  const memberToCouple = new Map<string, string>();
  const coupleByKey = new Map<string, Couple>();

  // Place root level couples (skip hidden hub boxes)
  let cursor = 0;
  for (const couple of (levels[0] || []).filter(c => !c.hideInHub)) {
    const width = widths.get(couple.key)?.width || 220;
    pos[couple.key] = { x: cursor, y: rowY[0] || 0, width, height: rowHeights[0] || 0 };
    updateCoupleInMaps(couple, 0, coupleLevel, memberToCouple, coupleByKey);
    cursor += width + gapX;
  }

  // Place subsequent levels
  for (let levelIndex = 1; levelIndex < levels.length; levelIndex++) {
    // Determine center of parent row to decide which parents are considered "right-side"
    const parentRow = levels[levelIndex - 1].filter(p => !p.hideInHub);
    let pMin = Number.POSITIVE_INFINITY;
    let pMax = Number.NEGATIVE_INFINITY;
    for (const p of parentRow) {
      const pPos = pos[p.key];
      if (!pPos) continue;
      pMin = Math.min(pMin, pPos.x);
      pMax = Math.max(pMax, pPos.x + pPos.width);
    }
    const parentRowCenter = (pMin + pMax) / 2;
    const rightAnchoredParents = new Set<string>();
    const items: Array<{ 
      couple: Couple; 
      width: number; 
      desiredX: number; 
      parentKey?: string; 
    }> = [];

    // Calculate positions for children of each parent
    for (const parent of levels[levelIndex - 1]) {
      const children = levels[levelIndex].filter(c => c.parentKey === parent.key && !c.hideInHub);
      if (children.length === 0) continue;

      const parentPos = pos[parent.key];
      const parentCenter = parentPos.x + parentPos.width / 2;
      
      // Group by maleHubKey to keep multiple-wives of the same child together,
      // then sort groups by the child's birth time ascending.
      type Group = { key: string; items: Couple[]; sortTs: number; index: number };
      const groupMap = new Map<string, Group>();
      let insertion = 0;
      for (const child of children) {
        const gkey = child.maleHubKey || child.key;
        let g = groupMap.get(gkey);
        if (!g) {
          g = { key: gkey, items: [], sortTs: Number.POSITIVE_INFINITY, index: insertion++ };
          groupMap.set(gkey, g);
        }
  const ts = child.childBirthTs ?? Number.POSITIVE_INFINITY;
        if (ts < g.sortTs) g.sortTs = ts;
        g.items.push(child);
      }
      const orderedGroups = Array.from(groupMap.values()).sort((a, b) =>
        a.sortTs === b.sortTs ? a.index - b.index : a.sortTs - b.sortTs
      );
      const ordered: Couple[] = orderedGroups.flatMap(g => g.items);

      const childWidths = ordered.map(c => widths.get(c.key)?.width || 220);

      // Sort children by birth time ascending already done (ordered)
      // Decide anchoring strategy:
      // If parent is to the right of the parent row center, force all children to the right side of the parent
      const parentIsRightSide = isFinite(parentRowCenter) && (parentPos.x > parentRowCenter);

      if (parentIsRightSide) {
        // Force cluster to start at parent's right edge + gapX
        let startX = parentPos.x + parentPos.width + gapX;
        ordered.forEach((child, idx) => {
          items.push({
            couple: child,
            width: childWidths[idx],
            desiredX: startX,
            parentKey: parent.key,
          });
          startX += childWidths[idx] + gapX;
        });
        rightAnchoredParents.add(parent.key);
      } else if (children.length === 1) {
        items.push({
          couple: ordered[0],
          width: childWidths[0],
          desiredX: Math.round(parentCenter - childWidths[0] / 2),
          parentKey: parent.key,
        });
      } else {
        const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + gapX * (children.length - 1);
        let startX = Math.round(parentCenter - totalWidth / 2);
        ordered.forEach((child, idx) => {
          items.push({
            couple: child,
            width: childWidths[idx],
            desiredX: startX,
            parentKey: parent.key,
          });
          startX += childWidths[idx] + gapX;
        });
      }
    }

    // Add orphans (visible only)
    const orphans = levels[levelIndex].filter(c => !c.parentKey && !c.hideInHub);
    orphans.forEach(orphan => {
      items.push({
        couple: orphan,
        width: widths.get(orphan.key)?.width || 220,
        desiredX: cursor,
      });
    });

    // Sort by desired position and resolve overlaps
    items.sort((a, b) => a.desiredX - b.desiredX);
    let currentX = 0;

    for (const item of items) {
      const finalX = Math.max(item.desiredX, currentX);
      pos[item.couple.key] = {
        x: finalX,
        y: rowY[levelIndex],
        width: item.width,
        height: rowHeights[levelIndex],
      };
      updateCoupleInMaps(item.couple, levelIndex, coupleLevel, memberToCouple, coupleByKey);
      currentX = finalX + item.width + gapX;
    }
    
    cursor = Math.max(cursor, currentX);

    // Compact this level horizontally (visible couples only) to remove gaps left by hidden hub boxes
    const visibleCouples = levels[levelIndex].filter(c => !c.hideInHub);
    visibleCouples.sort((a,b) => (pos[a.key]?.x || 0) - (pos[b.key]?.x || 0));
    let lastRight = -gapX; // so first gets placed at 0
    for (const c of visibleCouples) {
      const p = pos[c.key];
      if (!p) continue;
      // Enforce minimal gap: shift box if it would overlap previous
      const minX = lastRight + gapX;
      if (p.x < minX) p.x = minX;
      lastRight = p.x + p.width;
    }
    cursor = Math.max(cursor, lastRight + gapX);
  }
  // Second pass: recentre parent boxes over the span of their children (reduces long horizontal connectors)
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
    const parents = levels[levelIndex];
    if (!parents?.length) continue;

    // Compute desired X for each parent based on the bounding box of its children
    type PItem = { key: string; width: number; desiredX: number; y: number };
    const items: PItem[] = [];
    for (const p of parents) {
      const pPos = pos[p.key];
      if (!pPos) continue;
      const childKeys = parentChildren.get(p.key) || [];
      if (childKeys.length === 0) {
        items.push({ key: p.key, width: pPos.width, desiredX: pPos.x, y: pPos.y });
        continue;
      }
      // Skip re-centering if this parent was right-anchored previously (maintain forced-right rule)
      // We detect right anchoring by checking if its children are all strictly to the right of parent box
      const childrenRects = childKeys.map(ck => pos[ck]).filter(Boolean);
      const allChildrenRight = childrenRects.length > 0 && childrenRects.every(cr => cr.x >= pPos.x + pPos.width + gapX - 1);
      if (allChildrenRight) {
        items.push({ key: p.key, width: pPos.width, desiredX: pPos.x, y: pPos.y });
        continue;
      }
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      for (const ck of childKeys) {
        const cRect = pos[ck];
        if (!cRect) continue;
        minX = Math.min(minX, cRect.x);
        maxX = Math.max(maxX, cRect.x + cRect.width);
      }
      if (!isFinite(minX) || !isFinite(maxX)) {
        items.push({ key: p.key, width: pPos.width, desiredX: pPos.x, y: pPos.y });
      } else {
        const desiredCenter = (minX + maxX) / 2;
        const desiredX = Math.round(desiredCenter - pPos.width / 2);
        items.push({ key: p.key, width: pPos.width, desiredX, y: pPos.y });
      }
    }

    // Sort by desired position and resolve overlaps left-to-right
    items.sort((a, b) => a.desiredX - b.desiredX);
    let currentX = 0;
    for (const it of items) {
      const finalX = Math.max(it.desiredX, currentX);
      pos[it.key].x = finalX;
      // keep y/height as-is
      currentX = finalX + it.width + gapX;
    }
    cursor = Math.max(cursor, currentX);
  }

  // Compute total width from positions
  // New: Per-row centering and even spacing pass
  // 1) Compute each row's natural width using gapX and the measured box widths
  const rowNaturalWidths: number[] = levels.map((level, idx) => {
    const vis = level.filter(c => !c.hideInHub);
    if (vis.length === 0) return 0;
    const sumW = vis.reduce((s, c) => s + (pos[c.key]?.width || widths.get(c.key)?.width || 220), 0);
    return sumW + gapX * Math.max(0, vis.length - 1);
  });
  const unifiedWidth = Math.max(0, ...rowNaturalWidths);

  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const row = levels[levelIndex].filter(c => !c.hideInHub);
    if (row.length === 0) continue;
    // Keep current left-to-right order
    row.sort((a, b) => (pos[a.key]?.x || 0) - (pos[b.key]?.x || 0));
    const rowWidth = rowNaturalWidths[levelIndex] || 0;
    const startX = Math.max(0, Math.round((unifiedWidth - rowWidth) / 2));
    let x = startX;
    for (const c of row) {
      const r = pos[c.key];
      if (!r) continue;
      r.x = x;
      x += r.width + gapX;
    }
  }

  const totalWidth = unifiedWidth;
  return { pos, parentChildren, coupleLevel, memberToCouple, coupleByKey, totalHeight, totalWidth };
}
