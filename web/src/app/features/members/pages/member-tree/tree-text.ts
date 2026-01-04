export type TextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  scale: number;
  curvature: number;
};

const keyFor = (familyId: string | null) => (familyId ? `tree:${familyId}:texts` : null);

export function loadTextItems(familyId: string | null): TextItem[] {
  const key = keyFor(familyId);
  if (!key) return [];
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TextItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(it => ({
      ...it,
      curvature: typeof (it as any).curvature === 'number' ? (it as any).curvature : 0,
    }));
  } catch {
    return [];
  }
}

export function persistTextItems(familyId: string | null, items: TextItem[]): void {
  const key = keyFor(familyId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
}

export function createTextItem(opts: {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  paperWidth: number;
  paperHeight: number;
}): TextItem {
  return {
    id: `txt-${Date.now()}`,
    text: opts.text,
    fontFamily: opts.fontFamily,
    fontSize: opts.fontSize,
    color: opts.color,
    scale: 1,
    curvature: 0,
    x: opts.paperWidth / 2 - 80,
    y: opts.paperHeight / 2 - 20,
  };
}

export function moveTextItem(items: TextItem[], id: string, dx: number, dy: number): TextItem[] {
  return items.map(t => t.id === id ? { ...t, x: t.x + dx, y: t.y + dy } : t);
}

export function setTextItem(items: TextItem[], id: string, update: Partial<TextItem>): TextItem[] {
  return items.map(t => t.id === id ? { ...t, ...update } : t);
}
