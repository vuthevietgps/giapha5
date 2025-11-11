// LEGACY/ADVANCED: This file contains a more advanced connection strategy and hub visualizations.
// Currently NOT used by the page. Kept for reference. The live page uses `tree-connections-simple.util.ts`.
// You can safely ignore this file if you only need the core feature set.
import type { Couple, Connection, LayoutPos } from './member-tree.types';

const COLOR_PALETTE = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
const HUB_SPREAD = 0.4;

// Calculate wife position ratio within hub spread
function calculateWifeRatio(index: number, totalCount: number): number {
  if (totalCount <= 1) return 0.5;
  const start = 0.5 - HUB_SPREAD / 2;
  const step = HUB_SPREAD / (totalCount - 1);
  return Math.min(0.8, Math.max(0.2, start + step * index));
}

// Get ordered wives for consistent coloring across hubs
function getOrderedWives(row: Couple[], parent: Couple): (Couple['female'])[] {
  const maleId = parent.male?.id;
  if (!maleId) return [parent.female].filter(Boolean);
  
  const anchor = row.find(c => c.male?.id === maleId && !c.hideInHub) || parent;
  return [anchor.female, ...(anchor.extraWives || [])].filter(Boolean);
}

// Create parent-to-children connections with separate trunks for each mother
function createParentChildConnections(
  levels: Couple[][],
  pos: Record<string, LayoutPos>,
  parentChildren: Map<string, string[]>,
  coupleColors: Record<string, string>,
  wifeCenterRatios?: Map<string, Map<string, number>>
): Connection[] {
  const connections: Connection[] = [];

  for (let levelIndex = 1; levelIndex < levels.length; levelIndex++) {
    const parentsRow = levels[levelIndex - 1];
    
    for (const parent of parentsRow) {
      const parentPos = pos[parent.key];
      if (!parentPos) continue;

      const childKeys = parentChildren.get(parent.key) || [];
      if (childKeys.length === 0) continue;

      const y1 = parentPos.y + parentPos.height;
      const y2 = pos[childKeys[0]]?.y;
      if (!y2) continue;
      
  const busY = Math.round((y1 + y2) / 2);

      // Group children by mother to create separate trunks
      const childrenByMother = new Map<string | undefined, string[]>();
      const wives = getOrderedWives(parentsRow, parent);
      const maleId = parent.male?.id;
      const anchorCouple = maleId ? (parentsRow.find(c => c.male?.id === maleId && !c.hideInHub) || parent) : parent;
      
      for (const childKey of childKeys) {
        const child = levels[levelIndex].find(c => c.key === childKey);
        // Use motherIdUsed from the couple - this is set correctly in tree-data.util.ts
        const motherId = (child as any)?.motherIdUsed;
        
        // Debug: log child and mother info
        if (parent.key.includes('69b01a')) { // Debug specific parent
          console.log(`Child ${childKey} (${child?.male?.fullName || child?.female?.fullName}) has mother: ${motherId}`);
        }
        
        const group = childrenByMother.get(motherId) || [];
        group.push(childKey);
        childrenByMother.set(motherId, group);
      }      // SIMPLE APPROACH: Just use one trunk per parent, positioned at parent center
      // All children of this parent get the same color (first wife's color)
      const trunkPositions = new Map<string | undefined, number>();
      const parentCenter = parentPos.x + parentPos.width / 2;
      
      // Use parent center for all mothers - simplify first
      for (const motherId of childrenByMother.keys()) {
        trunkPositions.set(motherId, parentCenter);
      }      // Create trunks and branches for each mother
      for (const [motherId, childKeys] of childrenByMother) {
  const trunkX = trunkPositions.get(motherId) || parentCenter;
        const motherIdx = wives.findIndex(w => w?.id === motherId);
        const trunkColor = motherIdx >= 0 ? COLOR_PALETTE[motherIdx % COLOR_PALETTE.length] : undefined;
        
        // Create trunk for this mother's children
        const trunkId = `${parent.key}-trunk-${motherId || 'unknown'}-${levelIndex}`;
        connections.push({
          fromKey: parent.key,
          toKey: trunkId,
          x1: trunkX,
          y1,
          x2: trunkX,
          y2: busY,
          d: `M ${trunkX},${y1} V ${busY}`,
          color: trunkColor,
        });

        // Create branches from trunk to each child
        for (const childKey of childKeys) {
          const childRect = pos[childKey];
          if (!childRect) continue;

          const childCenter = childRect.x + childRect.width / 2;
          
          // Set color for child border
          if (trunkColor) {
            coupleColors[childKey] = trunkColor;
          }

          connections.push({
            fromKey: trunkId,
            toKey: childKey,
            x1: trunkX,
            y1: busY,
            x2: childCenter,
            y2,
            d: `M ${trunkX},${busY} H ${childCenter} V ${y2}`,
            color: trunkColor,
          });
        }
      }
    }
  }

  return connections;
}

// Create marriage hub connections with trunk integration
function createHubConnections(
  levels: Couple[][],
  pos: Record<string, LayoutPos>,
  parentChildren: Map<string, string[]>,
  wifeCenterRatios?: Map<string, Map<string, number>>
): Connection[] {
  const connections: Connection[] = [];

  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const hubs = new Map<string, Couple[]>();
    
    for (const couple of levels[levelIndex]) {
      if (couple.maleHubKey) {
        const hubCouples = hubs.get(couple.maleHubKey) || [];
        hubCouples.push(couple);
        hubs.set(couple.maleHubKey, hubCouples);
      }
    }

    for (const [, hubCouples] of hubs) {
      if (hubCouples.length <= 1) continue;

      const primary = hubCouples.find(c => !c.hideInHub) || hubCouples[0];
      const primaryPos = pos[primary.key];
      if (!primaryPos) continue;

      // Check if this hub has children to determine connection strategy
      const hasChildren = (parentChildren.get(primary.key)?.length || 0) > 0;
      const wives = getOrderedWives([primary], primary);
      
      if (hasChildren) {
        // If has children, create individual connection points for each wife's trunk
        const childKeys = parentChildren.get(primary.key) || [];
        const nextLevel = levels[levelIndex + 1] || [];
        
        // Group children by mother to align hub connections with trunk positions
        const childrenByMother = new Map<string | undefined, string[]>();
        for (const childKey of childKeys) {
          const child = nextLevel.find(c => c.key === childKey);
          const motherId = (child as any)?.motherIdUsed;
          const group = childrenByMother.get(motherId) || [];
          group.push(childKey);
          childrenByMother.set(motherId, group);
        }
        
        // Create connection points aligned with future trunks
        const yHub = primaryPos.y + 12;
        const parentCenter = primaryPos.x + primaryPos.width / 2;
        
        // Hub connection points align with each wife's position in the parent box
        const motherIds = Array.from(childrenByMother.keys());
        const points: Array<{ x: number; wifeIdx: number }> = [];
        for (const motherId of motherIds) {
          const wifeIdx = wives.findIndex(w => w?.id === motherId);
          const ratioFromDom = wifeCenterRatios?.get(primary.key)?.get(motherId!);
          if (ratioFromDom !== undefined) {
            points.push({ x: primaryPos.x + primaryPos.width * ratioFromDom, wifeIdx });
          } else if (wifeIdx >= 0) {
            const ratio = calculateWifeRatio(wifeIdx, wives.length || 1);
            points.push({ x: primaryPos.x + primaryPos.width * ratio, wifeIdx });
          } else {
            points.push({ x: parentCenter, wifeIdx: -1 });
          }
        }

        if (points.length === 1) {
          const p = points[0];
          const color = p.wifeIdx >= 0 ? COLOR_PALETTE[p.wifeIdx % COLOR_PALETTE.length] : '#BFBFBF';
          connections.push({
            fromKey: `hub-${primary.male?.id}-${levelIndex}`,
            toKey: `hub-${primary.male?.id}-connection`,
            x1: p.x,
            y1: yHub,
            x2: p.x,
            y2: primaryPos.y,
            d: `M ${p.x},${yHub} V ${primaryPos.y}`,
            color,
          });
        } else if (points.length > 1) {
          const minX = Math.min(...points.map(p => p.x));
          const maxX = Math.max(...points.map(p => p.x));
          connections.push({
            fromKey: `hub-${primary.male?.id}-${levelIndex}`,
            toKey: `hub-${primary.male?.id}-${levelIndex}-bus`,
            x1: minX,
            y1: yHub,
            x2: maxX,
            y2: yHub,
            d: `M ${minX},${yHub} H ${maxX}`,
            color: '#BFBFBF',
          });
          for (const p of points) {
            const color = p.wifeIdx >= 0 ? COLOR_PALETTE[p.wifeIdx % COLOR_PALETTE.length] : '#BFBFBF';
            connections.push({
              fromKey: `hub-${primary.male?.id}-${levelIndex}-bus`,
              toKey: `${primary.key}-wife-${p.wifeIdx}`,
              x1: p.x,
              y1: yHub,
              x2: p.x,
              y2: primaryPos.y,
              d: `M ${p.x},${yHub} V ${primaryPos.y}`,
              color,
            });
          }
        }
      } else {
        // No children - use traditional hub display (neutral colors)
        const yHub = primaryPos.y + 12;
        const minX = primaryPos.x + primaryPos.width * (0.5 - HUB_SPREAD / 2);
        const maxX = primaryPos.x + primaryPos.width * (0.5 + HUB_SPREAD / 2);

        // Hub bus line
        connections.push({
          fromKey: `hub-${primary.male?.id}-${levelIndex}`,
          toKey: `hub-${primary.male?.id}-${levelIndex}`,
          x1: minX,
          y1: yHub,
          x2: maxX,
          y2: yHub,
          d: `M ${minX},${yHub} H ${maxX}`,
          color: '#BFBFBF',
        });

        // Wife connection ticks (neutral to respect "đến đời con" coloring rule)
        const wivesCount = wives.length;
        for (let idx = 0; idx < wivesCount; idx++) {
          const ratio = calculateWifeRatio(idx, wivesCount);
          const cx = primaryPos.x + primaryPos.width * ratio;
          
          connections.push({
            fromKey: `hub-${primary.male?.id}-${levelIndex}`,
            toKey: `${primary.key}-wife-${idx}`,
            x1: cx,
            y1: yHub,
            x2: cx,
            y2: primaryPos.y,
            d: `M ${cx},${yHub} V ${primaryPos.y}`,
            color: '#BFBFBF',
          });
        }
      }
    }
  }

  return connections;
}

export function computeConnections(
  levels: Couple[][],
  pos: Record<string, LayoutPos>,
  coupleByKey: Map<string, Couple>,
  parentChildren: Map<string, string[]>,
  wifeCenterRatios?: Map<string, Map<string, number>>
): { connections: Connection[]; coupleColors: Record<string, string> } {
  const coupleColors: Record<string, string> = {};
  const parentChildConnections = createParentChildConnections(levels, pos, parentChildren, coupleColors, wifeCenterRatios);
  const hubConnections = createHubConnections(levels, pos, parentChildren, wifeCenterRatios);
  
  return {
    connections: [...parentChildConnections, ...hubConnections],
    coupleColors,
  };
}
