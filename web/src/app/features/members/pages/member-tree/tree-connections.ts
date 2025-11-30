import type { Member } from '../../models/member.model';

export type ConnectionStyle = 'diagonal' | 'hub';

export interface BuildConnectionsInput {
  baseRect: DOMRect;
  anchorRects: Map<string, DOMRect>; // id -> rect for spouse anchors
  childRects: Array<{ elRect: DOMRect; childId?: string; motherId?: string; fatherId?: string }>; // child person boxes
  memberById: Map<string, Member>;
  spousesByMember: Record<string, Member[]>;
  style: ConnectionStyle;
  colors: string[];
  colorFatherMotherPair: Map<string, string>;
  colorMotherFatherPair: Map<string, string>;
}

export interface BuiltConnections {
  connections: Array<{ x1:number;y1:number;x2:number;y2:number;color:string }>;
  overlayW: number;
  overlayH: number;
  childColors: Record<string, string>; // childId -> connection color
}

// Per-family + per-generation + hub motherId -> color mapping
// familyId -> generationIndex -> hubKey(anchorId) -> motherId -> color
const MOTHER_COLOR_MAP_BY_FAMILY_LEVEL_HUB = new Map<string, Map<number, Map<string, Map<string,string>>>>();
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
// hslExpand from shared util

export function buildConnections(input: BuildConnectionsInput): BuiltConnections {
  const { baseRect, anchorRects, childRects, memberById, spousesByMember, style, colors, colorFatherMotherPair, colorMotherFatherPair } = input;
  type Conn = {x1:number;y1:number;x2:number;y2:number;color:string; anchorId?: string};
  type Piece = { anchorId: string; x1:number; y1:number; x2:number; y2:number; color:string };
  const connsRaw: Conn[] = [];
  const piecesByAnchor = new Map<string, Piece[]>();
  const childColors: Record<string, string> = {}; // Store child ID -> color mapping
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

  // Determine generationIndex for each child using their parent anchors (approximation):
  // In the DOM builder we don't have explicit levels; use the vertical position bucket as generation.
  // Bucket height chosen to be ~180px (box height + gap). This provides per-row grouping.
  const bucketH = 180;
  const generationIndexForY = (y: number) => Math.max(0, Math.floor(y / bucketH));

  // Prepare per-family per-generation per-hub palette index tracking
  const colorIndexByFamilyLevelHub = new Map<string, number>();
  const hubOrderByFamilyLevel = new Map<string, Map<string, number>>(); // key: family:level -> (hubKey -> order)

  for (const child of childRects){
    const motherId = child.motherId || '';
    const fatherId = child.fatherId || '';
    if (!motherId) continue;
    let anchorId: string | undefined;
    if (fatherId && anchorRects.has(fatherId)) anchorId = fatherId;
    else if (anchorRects.has(motherId)) anchorId = motherId;
    else {
      const maleSpouse = (spousesByMember[motherId]||[]).find(s=> s.gender==='male');
      if (maleSpouse && anchorRects.has(maleSpouse.id!)) anchorId = maleSpouse.id!;
    }
    if (!anchorId) continue;
    const w = anchorRects.get(anchorId)!;
    const c = child.elRect;
    const x1 = w.left + w.width/2 - baseRect.left;
    const y1 = w.bottom - baseRect.top;
    const x2 = c.left + c.width/2 - baseRect.left;
    const y2 = c.top - baseRect.top;
    const mother = memberById.get(motherId);
    const father = fatherId ? memberById.get(fatherId) : undefined;
    // Per-family, per-generation, per-hub rule
    let color = NEUTRAL_COLOR;
    const familyId = mother?.family || father?.family;
    if (familyId && mother?.id){
      if (!MOTHER_COLOR_MAP_BY_FAMILY_LEVEL_HUB.has(familyId)) MOTHER_COLOR_MAP_BY_FAMILY_LEVEL_HUB.set(familyId, new Map<number, Map<string, Map<string,string>>>());
      const levelIndex = generationIndexForY(y1); // parent bottom Y as generation marker
      const byLevel = MOTHER_COLOR_MAP_BY_FAMILY_LEVEL_HUB.get(familyId)!;
      if (!byLevel.has(levelIndex)) byLevel.set(levelIndex, new Map<string, Map<string,string>>());
      const byHub = byLevel.get(levelIndex)!;
      const hubKey = anchorId || 'unknown-hub';
      if (!byHub.has(hubKey)) byHub.set(hubKey, new Map<string,string>());
      const levelHubMap = byHub.get(hubKey)!;
      if (!levelHubMap.has(mother.id!)){
        const key = `${familyId}:${levelIndex}:${hubKey}`;
        const startIdx = colorIndexByFamilyLevelHub.get(key) || 0;
        const orderKey = `${familyId}:${levelIndex}`;
        if (!hubOrderByFamilyLevel.has(orderKey)) hubOrderByFamilyLevel.set(orderKey, new Map<string, number>());
        const orderMap = hubOrderByFamilyLevel.get(orderKey)!;
        if (!orderMap.has(hubKey)) orderMap.set(hubKey, orderMap.size);
        const hubOrder = orderMap.get(hubKey)!;
        const baseCount = Math.max(BASE_PALETTE.length, startIdx + 6);
        const next = startIdx < BASE_PALETTE.length
          ? BASE_PALETTE[(startIdx + hubOrder) % BASE_PALETTE.length]
          : hslColor(startIdx + hubOrder, baseCount);
        levelHubMap.set(mother.id!, next);
        colorIndexByFamilyLevelHub.set(key, startIdx + 1);
      }
      color = levelHubMap.get(mother.id!)!;
    }
    // Store child color for border styling
    if (child.childId) {
      childColors[child.childId] = color;
    }
    if (style === 'diagonal'){
      minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
      minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      connsRaw.push({ x1, y1, x2, y2, color, anchorId });
    } else {
      const piece: Piece = { anchorId, x1, y1, x2, y2, color };
      const arr = piecesByAnchor.get(anchorId) || [];
      arr.push(piece); piecesByAnchor.set(anchorId, arr);
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
      for (const p of arr){
        minX = Math.min(minX, ax); maxX = Math.max(maxX, ax);
        minY = Math.min(minY, p.y1, hubY); maxY = Math.max(maxY, p.y1, hubY);
        connsRaw.push({ x1: ax, y1: p.y1, x2: ax, y2: hubY, color: p.color, anchorId: p.anchorId });
        minX = Math.min(minX, ax, p.x2); maxX = Math.max(maxX, ax, p.x2);
        minY = Math.min(minY, hubY); maxY = Math.max(maxY, hubY);
        connsRaw.push({ x1: ax, y1: hubY, x2: p.x2, y2: hubY, color: p.color, anchorId: p.anchorId });
        minX = Math.min(minX, p.x2); maxX = Math.max(maxX, p.x2);
        minY = Math.min(minY, hubY, p.y2); maxY = Math.max(maxY, hubY, p.y2);
        connsRaw.push({ x1: p.x2, y1: hubY, x2: p.x2, y2: p.y2, color: p.color, anchorId: p.anchorId });
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
