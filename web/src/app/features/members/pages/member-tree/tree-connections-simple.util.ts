import type { Couple, Connection, LayoutPos, NodeDot } from './member-tree.types';

const COLOR_PALETTE = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
const NEUTRAL_COLOR = '#BFBFBF';

// Generate a list of N visually distinct colors using HSL; fallback when palette too small
function genLevelColors(n: number): string[] {
  if (n <= COLOR_PALETTE.length) return COLOR_PALETTE.slice(0, n);
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    const h = Math.round((360 * i) / n);
    const s = 70; // percent
    const l = 52; // percent
    const a = (s * Math.min(l, 100 - l)) / 10000;
    const f = (m: number) => {
      const k = (m + h / 30) % 12;
      const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    colors.push(`#${f(0)}${f(8)}${f(4)}`);
  }
  return colors;
}

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
  // Color assignment resets per generation level so:
  // - Mothers within the same level each get a distinct color
  // - All children of the same mother share that color
  // - Colors can repeat across different levels

  // Global dedup across the whole level to avoid duplicate lines from grid/hub artifacts
  const globalConnectedChildren = new Set<string>();

  // Color assignment per FAMILY + GENERATION + PARENT HUB (father group):
  // - Same motherId within the same family, generation, and hub -> same color
  // - Different motherIds within the same family, generation, and hub -> different colors
  // - Colors can repeat across different hubs (different fathers) even in the same generation
  // Structure: familyId -> levelIndex -> hubKey -> motherId -> color
  const motherColorMapByFamilyLevelHub = new Map<string, Map<number, Map<string, Map<string, string>>>>();
  const warn = (msg: string) => { try { console.warn('[TreeConnections]', msg); } catch { /* ignore */ } };


  // Track color indices per family+level to advance palettes independently
  const colorIndexByFamilyLevelHub = new Map<string, number>();
  // Distinct hub palettes per family+level: track hub order to offset palettes
  const hubOrderByFamilyLevel = new Map<string, Map<string, number>>(); // key: family:level -> (hubKey -> order)
  for (let levelIndex = 1; levelIndex < levels.length; levelIndex++) {
    const parentsRow = levels[levelIndex - 1];

    // Pre-collect unique motherIds per family + hub for this level
    const levelMotherIdsByFamilyHub = new Map<string, Map<string, Set<string>>>();
    for (const parent of parentsRow) {
      if (parent.hideInHub) continue;
      const familyId = parent.female?.family || parent.male?.family;
      if (!familyId) continue;
      const hubKey = parent.maleHubKey || parent.key;
      const childKeys = parentChildren.get(parent.key) || [];
      for (const childKey of childKeys) {
        const childCouple = coupleByKey.get(childKey);
        if (!childCouple) continue;
        const availableMothers = [parent.female, ...(parent.extraWives || [])].filter(Boolean);
        let motherId = childCouple.motherIdUsed as string | undefined;
        if (!motherId) {
          const childMother = childCouple.male?.mother || childCouple.female?.mother;
          motherId = childMother || undefined;
        }
        if (!motherId && availableMothers.length > 0) motherId = availableMothers[0]?.id;
        if (!levelMotherIdsByFamilyHub.has(familyId)) levelMotherIdsByFamilyHub.set(familyId, new Map<string, Set<string>>());
        const byHub = levelMotherIdsByFamilyHub.get(familyId)!;
        if (!byHub.has(hubKey)) byHub.set(hubKey, new Set<string>());
        if (motherId) byHub.get(hubKey)!.add(motherId);
      }
    }
    
    // Assign colors per family+level+hub: new motherIds get next color within that hub
    for (const [familyId, byHub] of levelMotherIdsByFamilyHub) {
      if (!motherColorMapByFamilyLevelHub.has(familyId)) motherColorMapByFamilyLevelHub.set(familyId, new Map<number, Map<string, Map<string,string>>>());
      const byLevel = motherColorMapByFamilyLevelHub.get(familyId)!;
      if (!byLevel.has(levelIndex)) byLevel.set(levelIndex, new Map<string, Map<string,string>>());
      const hubMapAll = byLevel.get(levelIndex)!;
      const hubOrderKey = `${familyId}:${levelIndex}`;
      if (!hubOrderByFamilyLevel.has(hubOrderKey)) hubOrderByFamilyLevel.set(hubOrderKey, new Map<string, number>());
      const hubOrderMap = hubOrderByFamilyLevel.get(hubOrderKey)!;
      for (const [hubKey, mids] of byHub) {
        if (!hubMapAll.has(hubKey)) hubMapAll.set(hubKey, new Map<string,string>());
        const levelHubMap = hubMapAll.get(hubKey)!;
        const colorKey = `${familyId}:${levelIndex}:${hubKey}`;
        // Assign an order to each hub to offset its palette so hubs differ
        if (!hubOrderMap.has(hubKey)) hubOrderMap.set(hubKey, hubOrderMap.size);
        const hubOrder = hubOrderMap.get(hubKey)!;
        const startIdx = colorIndexByFamilyLevelHub.get(colorKey) || 0;
        let idx = startIdx;
        // Generate palette and offset by hub order to avoid same colors across hubs
        const basePalette = genLevelColors(mids.size + startIdx + 6);
        for (const mid of mids) {
          if (!levelHubMap.has(mid)) {
            const color = basePalette[(idx + hubOrder) % basePalette.length];
            levelHubMap.set(mid, color);
            idx++;
          }
        }
        colorIndexByFamilyLevelHub.set(colorKey, idx);
      }
    }
    
    for (const parent of parentsRow) {
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

      // Prepare wife anchors for mother assignment by proximity
      const wifeAnchors: Array<{ motherId: string; x: number }> = [];
      const anchorMetrics = wifeCenter.get(anchor.key) || wifeCenter.get(parent.key);
      const availableMothers = [parent.female, ...(parent.extraWives || [])].filter(Boolean);
      for (const w of availableMothers){
        const wid = w?.id;
        if (!wid) continue;
        let rx = 0.5;
        let ax: number | undefined;
        const m = anchorMetrics?.get(wid);
        if (m){
          rx = m.rx;
          ax = m.ax;
        } else {
          rx = getMotherCenterRatio(anchor.key, wid) || getMotherCenterRatio(parent.key, wid);
        }
        const containerPos = pos[anchor.key] || pos[parent.key];
        if (!containerPos) continue;
        const mx = typeof ax === 'number' ? ax : (containerPos.x + (containerPos.width * rx));
        wifeAnchors.push({ motherId: wid, x: mx });
      }
      
      for (const childKey of childKeys) {
        const childCouple = coupleByKey.get(childKey);
        if (!childCouple) continue;

        // Prefer motherIdUsed computed during tree-data build (covers cases when child.mother is missing)
        let motherId = childCouple.motherIdUsed as string | undefined;

        if (!motherId) {
          // Derive from child's own data if available
          const childMother = childCouple.male?.mother || childCouple.female?.mother;
          motherId = childMother || undefined;
          // STRICT mode: do NOT infer by proximity to avoid mis-coloring across hubs
          // Leave motherId undefined here; we'll draw with neutral color and log
        }

        // Validate against the set of wives in this parent hub to avoid grouping with wrong mother
  const allMothers = [parent.female, ...(parent.extraWives || [])].filter(Boolean);
  const motherIds = new Set((allMothers.map(m => m?.id).filter(Boolean) as string[]));
        if (motherId && !motherIds.has(motherId)) {
          // Invalid motherId - reset for fallback
          motherId = undefined;
        }

        // STRICT mode: if still no motherId, keep undefined (will draw neutral) and log
        if (!motherId) {
          warn(`Missing motherId for child ${childKey} under parent ${parent.key}`);
        }

        // Group under determined motherId (empty key collects neutral connections)
        const key = motherId || '';
        if (!childrenByMother.has(key)) childrenByMother.set(key, []);
        childrenByMother.get(key)!.push(childKey);
      }

  // Track children already connected from this parent to avoid duplicate lines due to data anomalies
      const connectedChildren = new Set<string>();

      // Create connections per mother group
      for (const [motherId, motherChildren] of childrenByMother) {
        // Per family + generation + hub consistency
        const familyId = parent.female?.family || parent.male?.family;
        const hubKey = parent.maleHubKey || parent.key;
        const byLevel = familyId ? motherColorMapByFamilyLevelHub.get(familyId) : undefined;
        const byHub = byLevel?.get(levelIndex);
        const levelHubMap = byHub?.get(hubKey);
        const trunkColor = motherId && levelHubMap ? (levelHubMap.get(motherId) || COLOR_PALETTE[0]) : NEUTRAL_COLOR;
        if (!motherId) warn(`Drawing neutral color for children without motherId under parent ${parent.key}`);

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