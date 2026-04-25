import type { Member } from '../../models/member.model';

export type ConnectionStyle = 'diagonal' | 'hub';

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface ConnectionAnchor extends ConnectionPoint {
  key: string;
  memberId: string;
}

export interface BuildConnectionsInput {
  baseRect: DOMRect;
  anchorCandidates: Map<string, ConnectionAnchor[]>;
  childTargets: Array<{ point: ConnectionPoint; childId?: string; motherId?: string; fatherId?: string }>;
  memberById: Map<string, Member>;
  spousesByMember: Record<string, Member[]>;
  style: ConnectionStyle;
  colors: string[];
  colorFatherMotherPair: Map<string, string>;
  colorMotherFatherPair: Map<string, string>;
  /** Effective CSS transform scale on the canvas (zoom * extraScale). Default 1. */
  scale?: number;
}

export interface BuiltConnections {
  connections: Array<{ x1:number;y1:number;x2:number;y2:number;color:string }>;
  overlayW: number;
  overlayH: number;
  childColors: Record<string, string>; // childId -> connection color
}

// Per-call local color tracking (no more global mutable state)
const BASE_PALETTE = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
const NEUTRAL_COLOR = '#BFBFBF';
function hslColor(index: number, total: number): string {
  const h = Math.round((360 * index) / Math.max(1, total));
  const s = 70; const l = 52;
  const a = s * Math.min(l, 100 - l) / 10000;
  const f = (m: number) => {
    const k = (m + h / 30) % 12;
    const c = l/100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function buildConnections(input: BuildConnectionsInput): BuiltConnections {
  const { baseRect, anchorCandidates, childTargets, memberById, spousesByMember, style } = input;
  type Conn = {x1:number;y1:number;x2:number;y2:number;color:string; anchorKey?: string};
  type Piece = { anchorKey: string; x1:number; y1:number; x2:number; y2:number; color:string };
  const connsRaw: Conn[] = [];
  const piecesByAnchor = new Map<string, Piece[]>();
  const childColors: Record<string, string> = {}; // Store child ID -> color mapping
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  // Determine generationIndex for each child using their parent anchors (approximation):
  // In the DOM builder we don't have explicit levels; use the vertical position bucket as generation.
  // Bucket height chosen to be ~180px (box height + gap). This provides per-row grouping.
  const bucketH = 180;
  const generationIndexForY = (y: number) => Math.max(0, Math.floor(y / bucketH));

  // Prepare per-call local palette index tracking (no global state leak)
  const colorIndexByFamilyLevelHub = new Map<string, number>();
  const hubOrderByFamilyLevel = new Map<string, Map<string, number>>();
  // Local per-call mother color mapping: levelIndex -> hubKey -> motherId -> color
  const localMotherColorMap = new Map<number, Map<string, Map<string, string>>>();

  const anchorScore = (anchor: ConnectionAnchor, point: ConnectionPoint): number => {
    const dy = point.y - anchor.y;
    const verticalPenalty = dy >= 0 ? dy : (Math.abs(dy) + 10000);
    return (verticalPenalty * 1000) + Math.abs(point.x - anchor.x);
  };

  const pickClosestAnchor = (memberId?: string, point?: ConnectionPoint): ConnectionAnchor | undefined => {
    if (!memberId || !point) return undefined;
    const candidates = anchorCandidates.get(memberId) || [];
    if (!candidates.length) return undefined;
    return candidates.reduce<ConnectionAnchor | undefined>((best, current) => {
      if (!best) return current;
      return anchorScore(current, point) < anchorScore(best, point) ? current : best;
    }, undefined);
  };

  for (const child of childTargets){
    const motherId = child.motherId || '';
    const fatherId = child.fatherId || '';
    if (!motherId && !fatherId) continue; // skip only if neither parent is known
    let anchor = pickClosestAnchor(motherId, child.point);
    if (!anchor) anchor = pickClosestAnchor(fatherId, child.point);
    if (!anchor && motherId) {
      const maleSpouse = (spousesByMember[motherId] || []).find((s) => s.gender === 'male');
      anchor = pickClosestAnchor(maleSpouse?.id, child.point);
    }
    if (!anchor && fatherId) {
      const femaleSpouse = (spousesByMember[fatherId] || []).find((s) => s.gender === 'female');
      anchor = pickClosestAnchor(femaleSpouse?.id, child.point);
    }
    if (!anchor) continue;
    const x1 = anchor.x;
    const y1 = anchor.y;
    const x2 = child.point.x;
    const y2 = child.point.y;
    const mother = motherId ? memberById.get(motherId) : undefined;
    const father = fatherId ? memberById.get(fatherId) : undefined;
    // Per-generation, per-hub color assignment (local to this call)
    // Use mother as color key; fallback to father if no mother
    const colorKeyMember = mother || father;
    let color = NEUTRAL_COLOR;
    if (colorKeyMember?.id) {
      const levelIndex = generationIndexForY(y1);
      if (!localMotherColorMap.has(levelIndex)) localMotherColorMap.set(levelIndex, new Map());
      const byHub = localMotherColorMap.get(levelIndex)!;
      const hubKey = anchor.key || 'unknown-hub';
      if (!byHub.has(hubKey)) byHub.set(hubKey, new Map());
      const levelHubMap = byHub.get(hubKey)!;
      if (!levelHubMap.has(colorKeyMember.id!)) {
        const key = `${levelIndex}:${hubKey}`;
        const startIdx = colorIndexByFamilyLevelHub.get(key) || 0;
        const orderKey = `${levelIndex}`;
        if (!hubOrderByFamilyLevel.has(orderKey)) hubOrderByFamilyLevel.set(orderKey, new Map());
        const orderMap = hubOrderByFamilyLevel.get(orderKey)!;
        if (!orderMap.has(hubKey)) orderMap.set(hubKey, orderMap.size);
        const hubOrder = orderMap.get(hubKey)!;
        const baseCount = Math.max(BASE_PALETTE.length, startIdx + 6);
        const next = startIdx < BASE_PALETTE.length
          ? BASE_PALETTE[(startIdx + hubOrder) % BASE_PALETTE.length]
          : hslColor(startIdx + hubOrder, baseCount);
        levelHubMap.set(colorKeyMember.id!, next);
        colorIndexByFamilyLevelHub.set(key, startIdx + 1);
      }
      color = levelHubMap.get(colorKeyMember.id!)!;
    }
    // Store child color for border styling
    if (child.childId) {
      childColors[child.childId] = color;
    }
    if (style === 'diagonal'){
      minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
      minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      connsRaw.push({ x1, y1, x2, y2, color, anchorKey: anchor.key });
    } else {
      const piece: Piece = { anchorKey: anchor.key, x1, y1, x2, y2, color };
      const arr = piecesByAnchor.get(anchor.key) || [];
      arr.push(piece); piecesByAnchor.set(anchor.key, arr);
    }
  }

  if (style === 'hub'){
    for (const arr of piecesByAnchor.values()){
      if (!arr.length) continue;
      // Đặt thanh ngang ở giữa khoảng cách từ điểm neo (y1) đến đỉnh các hộp con (y2 min)
      const childTopMin = Math.min(...arr.map(p=>p.y2));
      const parentY = arr[0].y1; // cùng anchor nên y1 như nhau
      const hubY = parentY + (childTopMin - parentY) / 2;
      const ax = arr[0].x1;
      // 1) Draw vertical trunk from parent to hub-Y ONCE (not per child)
      const trunkColor = arr[0].color;
      minX = Math.min(minX, ax); maxX = Math.max(maxX, ax);
      minY = Math.min(minY, parentY, hubY); maxY = Math.max(maxY, parentY, hubY);
      connsRaw.push({ x1: ax, y1: parentY, x2: ax, y2: hubY, color: trunkColor, anchorKey: arr[0].anchorKey });
      // 2) For each child: horizontal from trunk to child-x, then vertical down to child
      for (const p of arr){
        minX = Math.min(minX, ax, p.x2); maxX = Math.max(maxX, ax, p.x2);
        minY = Math.min(minY, hubY); maxY = Math.max(maxY, hubY);
        connsRaw.push({ x1: ax, y1: hubY, x2: p.x2, y2: hubY, color: p.color, anchorKey: p.anchorKey });
        minX = Math.min(minX, p.x2); maxX = Math.max(maxX, p.x2);
        minY = Math.min(minY, hubY, p.y2); maxY = Math.max(maxY, hubY, p.y2);
        connsRaw.push({ x1: p.x2, y1: hubY, x2: p.x2, y2: p.y2, color: p.color, anchorKey: p.anchorKey });
      }
    }
  }

  const offX = minX < 0 ? -minX + 10 : 0;
  const offY = minY < 0 ? -minY + 10 : 0;
  const connections = connsRaw.map(c=> ({ ...c, x1: c.x1 + offX, x2: c.x2 + offX, y1: c.y1 + offY, y2: c.y2 + offY }));
  const overlayW = Math.max(baseRect.width, (maxX - Math.min(0, minX)) + 40);
  const overlayH = Math.max(baseRect.height, (maxY - Math.min(0, minY)) + 120);
  return { connections, overlayW, overlayH, childColors };
}
