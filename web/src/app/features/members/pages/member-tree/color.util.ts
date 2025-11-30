export const BASE_PALETTE = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
export const NEUTRAL_COLOR = '#BFBFBF';

export function hslExpand(index: number, total: number): string {
  const h = Math.round((360 * index) / Math.max(1, total));
  const s = 70; const l = 52;
  const a = (s * Math.min(l, 100 - l)) / 10000;
  const f = (m: number) => {
    const k = (m + h / 30) % 12;
    const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function levelColors(n: number, offset = 0): string[] {
  if (n <= BASE_PALETTE.length) {
    // Offset within base palette for hub-level differentiation
    return Array.from({ length: n }, (_, i) => BASE_PALETTE[(i + offset) % BASE_PALETTE.length]);
  }
  const colors: string[] = [];
  const total = Math.max(n + offset, BASE_PALETTE.length + offset + 6);
  for (let i = 0; i < n; i++) {
    colors.push(hslExpand(i + offset, total));
  }
  return colors;
}
