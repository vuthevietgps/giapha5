export type MovableLayer = 'scroll' | 'dragonLeft' | 'dragonRight' | 'coupletLeft' | 'coupletRight' | 'tree';
export type LayerPosition = { x: number; y: number };

export const DEFAULT_POSITIONS: Record<MovableLayer, LayerPosition> = {
  scroll: { x: 0, y: -10 },
  dragonLeft: { x: -1100, y: 200 },
  dragonRight: { x: 1100, y: 200 },
  coupletLeft: { x: -620, y: 240 },
  coupletRight: { x: 620, y: 240 },
  tree: { x: 0, y: 0 },
};

export const DEFAULT_SCALES: Record<MovableLayer, number> = {
  scroll: 1,
  dragonLeft: 1,
  dragonRight: 1,
  coupletLeft: 1,
  coupletRight: 1,
  tree: 1,
};

export function cloneDefaultPositions(): Record<MovableLayer, LayerPosition> {
  return JSON.parse(JSON.stringify(DEFAULT_POSITIONS));
}

export function cloneDefaultScales(): Record<MovableLayer, number> {
  return { ...DEFAULT_SCALES };
}

export function loadPositions(key: string | null): Record<MovableLayer, LayerPosition> {
  if (!key) return cloneDefaultPositions();
  const raw = localStorage.getItem(key);
  if (!raw) return cloneDefaultPositions();
  try {
    const parsed = JSON.parse(raw) as Partial<Record<MovableLayer, LayerPosition>>;
    const merged = { ...cloneDefaultPositions(), ...parsed } as Record<MovableLayer, LayerPosition>;
    // migrate legacy couplet offsets 200 -> 240
    if (merged.coupletLeft?.y === 200) merged.coupletLeft = { ...merged.coupletLeft, y: 240 };
    if (merged.coupletRight?.y === 200) merged.coupletRight = { ...merged.coupletRight, y: 240 };
    return merged;
  } catch {
    return cloneDefaultPositions();
  }
}

export function persistPositions(key: string | null, positions: Record<MovableLayer, LayerPosition>): void {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(positions));
}

export function loadScales(key: string | null): Record<MovableLayer, number> {
  if (!key) return cloneDefaultScales();
  const raw = localStorage.getItem(key);
  if (!raw) return cloneDefaultScales();
  try {
    const parsed = JSON.parse(raw) as Partial<Record<MovableLayer, number>>;
    return { ...cloneDefaultScales(), ...parsed } as Record<MovableLayer, number>;
  } catch {
    return cloneDefaultScales();
  }
}

export function persistScales(key: string | null, scales: Record<MovableLayer, number>): void {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(scales));
}
