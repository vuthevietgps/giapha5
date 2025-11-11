import type { Member } from '../../models/member.model';

export type ConnectionStyle = 'diagonal' | 'hub';

export interface BuildConnectionsInput {
  baseRect: DOMRect;
  anchorRects: Map<string, DOMRect>; // id -> rect for spouse anchors
  childRects: Array<{ elRect: DOMRect; motherId?: string; fatherId?: string }>; // child person boxes
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
}

export function buildConnections(input: BuildConnectionsInput): BuiltConnections {
  const { baseRect, anchorRects, childRects, memberById, spousesByMember, style, colors, colorFatherMotherPair, colorMotherFatherPair } = input;
  type Conn = {x1:number;y1:number;x2:number;y2:number;color:string; anchorId?: string};
  type Piece = { anchorId: string; x1:number; y1:number; x2:number; y2:number; color:string };
  const connsRaw: Conn[] = [];
  const piecesByAnchor = new Map<string, Piece[]>();
  let minX = 0, minY = 0, maxX = 0, maxY = 0;

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
    let color = '#999';
    if (father && father.gender==='male'){
      const fatherWives = (spousesByMember[father.id!]||[]).filter(s=> s.gender==='female');
      if (fatherWives.length > 1 && mother){
        const key = father.id! + '|' + mother.id!;
        if (!colorFatherMotherPair.has(key)){
          const idx = colorFatherMotherPair.size % colors.length;
          colorFatherMotherPair.set(key, colors[idx]);
        }
        color = colorFatherMotherPair.get(key)!;
      } else if (mother) {
        const motherHusbands = (spousesByMember[mother.id!]||[]).filter(s=> s.gender==='male');
        if (motherHusbands.length > 1){
          const key2 = mother.id! + '|' + father.id!;
          if (!colorMotherFatherPair.has(key2)){
            const idx2 = colorMotherFatherPair.size % colors.length;
            colorMotherFatherPair.set(key2, colors[idx2]);
          }
          color = colorMotherFatherPair.get(key2)!;
        } else {
          color = '#1976d2';
        }
      } else {
        color = '#1976d2';
      }
    } else if (mother){
      const motherHusbands = (spousesByMember[mother.id!]||[]).filter(s=> s.gender==='male');
      if (motherHusbands.length > 1 && father){
        const key2 = mother.id! + '|' + father.id!;
        if (!colorMotherFatherPair.has(key2)){
          const idx2 = colorMotherFatherPair.size % colors.length;
          colorMotherFatherPair.set(key2, colors[idx2]);
        }
        color = colorMotherFatherPair.get(key2)!;
      } else {
        color = mother.gender==='female' ? '#d81b60' : '#1976d2';
      }
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
  return { connections, overlayW, overlayH };
}
