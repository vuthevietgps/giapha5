import type { Couple, Connection, LayoutPos, NodeDot } from './member-tree.types';

const COLOR_PALETTE = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];

// Group children by mother and create proper connections
type WifeCenterMetrics = Map<string, Map<string, { rx: number; cy: number; ax?: number; boxBottom?: number }>>;

function createParentChildConnections(
  levels: Couple[][],
  pos: Record<string, LayoutPos>,
  parentChildren: Map<string, string[]>,
  coupleByKey: Map<string, Couple>,
  coupleColors: Record<string, string>,
  wifeCenter: WifeCenterMetrics,
  _options?: unknown
): { connections: Connection[]; nodes: NodeDot[] } {
  const connections: Connection[] = [];
  const nodes: NodeDot[] = [];
  let colorIndex = 0;

  // Global dedup across the whole level to avoid duplicate lines from grid/hub artifacts
  const globalConnectedChildren = new Set<string>();

  for (let levelIndex = 1; levelIndex < levels.length; levelIndex++) {
  const parentsRow = levels[levelIndex - 1];
    
    for (const parent of parentsRow) {
      // Skip hidden hub boxes; only the visible anchor will render connections
      if (parent.hideInHub) continue;
      const parentPos = pos[parent.key];
      if (!parentPos) continue;

      const childKeys = parentChildren.get(parent.key) || [];
      if (childKeys.length === 0) continue;

      // Determine anchor couple: for male hubs use the visible primary couple so we can measure wives' avatar centers
      const getAnchorCouple = (parent: Couple): Couple => {
        if (parent.maleHubKey) {
          const anchor = parentsRow.find(c => c.maleHubKey === parent.maleHubKey && !c.hideInHub);
          return anchor || parent;
        }
        return parent;
      };

  const anchor = getAnchorCouple(parent);
  const anchorPos = pos[anchor.key] || pos[parent.key];

      // Group children by mother
      const childrenByMother = new Map<string, string[]>();
      
      for (const childKey of childKeys) {
        const childCouple = coupleByKey.get(childKey);
        if (!childCouple) continue;

        // Prefer motherIdUsed computed during tree-data build (covers cases when child.mother is missing)
        let motherId = childCouple.motherIdUsed as string | undefined;

        if (!motherId) {
          // Derive from child's own data if available
          const childMother = childCouple.male?.mother || childCouple.female?.mother;
          motherId = childMother || undefined;
        }

        // Validate against the set of wives in this parent hub to avoid grouping with wrong mother
  const allMothers = [parent.female, ...(parent.extraWives || [])].filter(Boolean);
  const motherIds = new Set((allMothers.map(m => m?.id).filter(Boolean) as string[]));
        if (motherId && !motherIds.has(motherId)) {
          // Do not force to any wife; keep unknown to avoid mis-grouping under a wrong mother
          motherId = undefined;
        }

        // If we cannot determine mother, skip to avoid wrong/duplicate links
        const key = motherId || '';
        if (!childrenByMother.has(key)) childrenByMother.set(key, []);
        childrenByMother.get(key)!.push(childKey);
      }

  // Track children already connected from this parent to avoid duplicate lines due to data anomalies
      const connectedChildren = new Set<string>();

      // Create connections per mother group
      for (const [motherId, motherChildren] of childrenByMother) {
        if (!motherId) continue; // only draw when mother is known
        const trunkColor = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
        colorIndex++;

        // Get mother's center position - try measured ratio on the ANCHOR couple, then fallback to direct DOM query
        let rx = 0.5;
        let cy: number | undefined;
        let ax: number | undefined;
        let boxBottom: number | undefined;
        const m = wifeCenter.get(anchor.key) || wifeCenter.get(parent.key);
        if (m && m.has(motherId)) {
          const v = m.get(motherId)!;
          rx = v.rx;
          cy = v.cy;
          ax = v.ax;
          boxBottom = v.boxBottom;
        } else {
          // Fallback: ratio by DOM query only (kept for safety); cy undefined -> use bottom of box
          rx = getMotherCenterRatio(anchor.key, motherId) || getMotherCenterRatio(parent.key, motherId);
        }
  const containerPos = anchorPos || parentPos;
  const motherX = typeof ax === 'number' ? ax : (containerPos.x + (containerPos.width * rx));

  // Start Y: center under mother's avatar but exactly on the bottom border of the parent box
  const yStart = typeof boxBottom === 'number' ? boxBottom : (containerPos.y + containerPos.height);
  // Dot under mother's avatar
  nodes.push({ x: motherX, y: yStart, color: trunkColor });

        // Draw simple mother-child connections to the top-center of each child box
        for (const childKey of motherChildren) {
          // Skip hidden hub child boxes (only draw to the primary visible couple)
          const childCouple = coupleByKey.get(childKey);
          if (childCouple?.hideInHub) continue;
          if (connectedChildren.has(childKey)) continue;
          if (globalConnectedChildren.has(childKey)) continue;
          const r = pos[childKey];
          if (!r) continue;
          const cx = r.x + r.width / 2;
          const cTop = r.y; // top border center of child box
          coupleColors[childKey] = trunkColor;
          connections.push({
            fromKey: parent.key,
            toKey: childKey,
            x1: motherX,
            y1: yStart,
            x2: cx,
            y2: cTop,
            d: `M ${motherX},${yStart} L ${cx},${cTop}`,
            color: trunkColor,
          });
          connectedChildren.add(childKey);
          globalConnectedChildren.add(childKey);
        }
      }
    }
  }

  return { connections, nodes };
}

// Function to calculate mother's center position directly from DOM
function getMotherCenterRatio(parentKey: string, motherId: string): number {
  const coupleEl = document.querySelector(`[data-key="${parentKey}"]`);
  if (!coupleEl) return 0.5;
  
  const wifeEl = coupleEl.querySelector(`.wives-list .person[data-mother-id="${motherId}"]`);
  if (!wifeEl) return 0.5;
  
  const coupleRect = coupleEl.getBoundingClientRect();
  const avatarEl = wifeEl.querySelector('.avatar');
  
  if (avatarEl) {
    const avatarRect = avatarEl.getBoundingClientRect();
    const avatarCenter = avatarRect.left + avatarRect.width / 2 - coupleRect.left;
    return coupleRect.width > 0 ? Math.max(0, Math.min(1, avatarCenter / coupleRect.width)) : 0.5;
  }
  
  const wifeRect = wifeEl.getBoundingClientRect();
  const wifeCenter = wifeRect.left + wifeRect.width / 2 - coupleRect.left;
  return coupleRect.width > 0 ? Math.max(0, Math.min(1, wifeCenter / coupleRect.width)) : 0.5;
}

export function computeConnectionsSimple(
  levels: Couple[][],
  pos: Record<string, LayoutPos>,
  coupleByKey: Map<string, Couple>,
  parentChildren: Map<string, string[]>,
  wifeCenterRatios?: WifeCenterMetrics,
  _options?: unknown
): { connections: Connection[]; nodes: NodeDot[]; coupleColors: Record<string, string> } {
  const coupleColors: Record<string, string> = {};
  
  const { connections: parentChildConnections, nodes } = createParentChildConnections(
    levels, 
    pos, 
    parentChildren, 
    coupleByKey, 
    coupleColors, 
    wifeCenterRatios || new Map(),
    _options
  );
  
  return {
    connections: parentChildConnections,
    nodes,
    coupleColors,
  };
}