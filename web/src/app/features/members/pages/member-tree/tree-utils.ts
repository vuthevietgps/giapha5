import type { Member } from '../../models/member.model';

export interface TreeStats {
  totalMembers: number;
  totalMale: number;
  totalFemale: number;
  totalAlive: number;
  totalDeceased: number;
  totalGenerations: number;
}

export function computeStatsFromMembers(members: Member[], root: Member | null, levels: Member[][]): TreeStats {
  const male = members.filter(m=> (m.gender||'').toLowerCase()==='male').length;
  const female = members.filter(m=> (m.gender||'').toLowerCase()==='female').length;
  const deceased = members.filter(m=> !!(m as any).dod).length;
  const alive = members.length - deceased;
  const generations = root ? (1 + (levels?.length || 0)) : 0;
  return {
    totalMembers: members.length,
    totalMale: male,
    totalFemale: female,
    totalAlive: alive,
    totalDeceased: deceased,
    totalGenerations: generations
  };
}
// Tree utility functions - REAL layout + connection preparation
// NOTE: Members passed in should have shape Member { id, father?, mother?, spouse?, dob?, gender? }
// Couples are synthesized so that each (male + primary wife) occupy one box; singles appear alone.
// Multiple spouses handled via unionsByPartner (providing partner id sets).

interface MemberLike {
  id?: string; // optional to allow incomplete Member objects during early data or test fallback
  father?: string;
  mother?: string;
  spouse?: string;
  dob?: string;
  gender?: string;
  fullName?: string;
}

// Build generations using parent links (BFS from root ancestors)
export function buildGenerations(members: MemberLike[], unionsByPartner?: Map<string, Set<string>>): any[][] {
  if (!members || members.length === 0) return [];

  const byId = new Map<string, MemberLike>();
  members.forEach(m => { if (m.id) byId.set(m.id, m); });

  // Roots: no father & no mother
  const roots = members.filter(m => !m.father && !m.mother);
  if (roots.length === 0) {
    // Fallback: pick earliest dob member as root
    const sorted = [...members].sort((a,b) => (dateTs(a.dob) - dateTs(b.dob)));
    roots.push(sorted[0]);
  }

  // Choose a single main root (prefer male, earliest dob)
  const mainRoot = (() => {
    const maleRoots = roots.filter(r => (r.gender || '').toLowerCase() === 'male');
    const arr = (maleRoots.length ? maleRoots : roots).filter(r => !!r.id);
    arr.sort((a,b) => dateTs(a.dob) - dateTs(b.dob));
    return arr[0];
  })();

  const generationById = new Map<string, number>();
  const queue: MemberLike[] = [];
  if (mainRoot?.id) { generationById.set(mainRoot.id, 0); queue.push(mainRoot); }

  while (queue.length) {
    const cur = queue.shift()!;
    if (!cur.id) continue;
    const g = generationById.get(cur.id)!;
    // Children: members whose father or mother equals cur.id
    for (const child of members) {
      if (!child.id) continue;
      if (generationById.has(child.id)) continue;
      if (child.father === cur.id || child.mother === cur.id) {
        const parentGenCandidates: number[] = [];
        if (child.father && generationById.has(child.father)) parentGenCandidates.push(generationById.get(child.father)!);
        if (child.mother && generationById.has(child.mother)) parentGenCandidates.push(generationById.get(child.mother)!);
        const parentGen = parentGenCandidates.length ? Math.max(...parentGenCandidates) : g; // choose deepest
        generationById.set(child.id, parentGen + 1);
        queue.push(child);
      }
    }
  }

  // Build spouse map from unions, explicit spouse property, and child father/mother pairs
  const spouseMap = new Map<string, Set<string>>();
  const addSpouse = (a?: string, b?: string) => {
    if (!a || !b || a === b) return;
    const s1 = spouseMap.get(a) || new Set<string>(); s1.add(b); spouseMap.set(a, s1);
    const s2 = spouseMap.get(b) || new Set<string>(); s2.add(a); spouseMap.set(b, s2);
  };
  // unions
  unionsByPartner?.forEach((set, k) => set.forEach(v => addSpouse(k, v)));
  // explicit spouse field
  for (const m of members) addSpouse(m.id, m.spouse);
  // infer from children
  for (const ch of members) addSpouse(ch.father, ch.mother);

  // Group members into couples by generation, merging multi-spouse into a single box (primary + extraWives/extraHusbands)
  const couplesByGen = new Map<number, any[]>();
  const usedInCouple = new Set<string>();

  // Stable iteration order: by generation, then by DOB, then by id
  const orderedMembers = [...members].filter(m => !!m.id).sort((a,b) => {
    const ga = generationById.get(a.id!) ?? 0; const gb = generationById.get(b.id!) ?? 0;
    if (ga !== gb) return ga - gb;
    const dt = dateTs(a.dob) - dateTs(b.dob); if (dt) return dt;
    return (a.id! < b.id! ? -1 : 1);
  });

  for (const m of orderedMembers) {
    const id = m.id!;
    const gen = generationById.get(id) ?? 0;
    if (usedInCouple.has(id)) continue;

    // Collect spouse candidates from map
    const spouseIds = [...(spouseMap.get(id) || new Set<string>())];
    const spouses = spouseIds.map(sid => byId.get(sid)).filter(Boolean) as MemberLike[];

    // Prefer male as anchor; if female anchors, we'll still place male first in couple
    if ((m.gender || '').toLowerCase() === 'male') {
      const wives = spouses.filter(s => (s.gender || '').toLowerCase() === 'female');
      if (wives.length) {
        const [primary, ...rest] = wives.sort((a,b) => dateTs(a.dob) - dateTs(b.dob) || (a.id! < b.id! ? -1 : 1));
        const couple: any = makeCouple(m, primary);
        couple.extraWives = rest;
        couple.level = gen;
        couplesByGen.set(gen, [...(couplesByGen.get(gen) || []), couple]);
        usedInCouple.add(id); usedInCouple.add(primary.id!); rest.forEach(w => usedInCouple.add(w.id!));
        continue;
      }
      // No wives known
      const single = makeCouple(m, undefined); single.level = gen;
      couplesByGen.set(gen, [...(couplesByGen.get(gen) || []), single]);
      usedInCouple.add(id);
    } else if ((m.gender || '').toLowerCase() === 'female') {
      const husbands = spouses.filter(s => (s.gender || '').toLowerCase() === 'male' && !usedInCouple.has(s.id!));
      if (husbands.length) {
        const [primary, ...rest] = husbands.sort((a,b) => dateTs(a.dob) - dateTs(b.dob) || (a.id! < b.id! ? -1 : 1));
        const couple: any = makeCouple(primary, m);
        couple.extraHusbands = rest;
        couple.level = gen;
        couplesByGen.set(gen, [...(couplesByGen.get(gen) || []), couple]);
        usedInCouple.add(id); usedInCouple.add(primary.id!); rest.forEach(h => usedInCouple.add(h.id!));
        continue;
      }
      const single = makeCouple(undefined, m); single.level = gen;
      couplesByGen.set(gen, [...(couplesByGen.get(gen) || []), single]);
      usedInCouple.add(id);
    } else {
      const single = makeCouple(undefined, m); single.level = gen;
      couplesByGen.set(gen, [...(couplesByGen.get(gen) || []), single]);
      usedInCouple.add(id);
    }
  }

  // Assign parentKey to child couples based on father+mother combination when possible
  const coupleKeyByMembers = new Map<string, string>();
  let rootCoupleKey: string | undefined;
  for (const [, arr] of couplesByGen) {
    for (const c of arr) {
      for (const id of c.members) coupleKeyByMembers.set(id, c.key);
      // Map extra spouses to the same couple so children with only mother/father still resolve
      (c.extraWives || []).forEach((w: MemberLike) => { if (w?.id) coupleKeyByMembers.set(w.id, c.key); });
      (c.extraHusbands || []).forEach((h: MemberLike) => { if (h?.id) coupleKeyByMembers.set(h.id, c.key); });
      if (mainRoot?.id && c.members.includes(mainRoot.id)) rootCoupleKey = c.key;
    }
  }
  for (const [, arr] of couplesByGen) {
    for (const c of arr) {
      const firstMember = c.male || c.female; // representative
      if (!firstMember) continue;
      const fId = firstMember.father;
      const mId = firstMember.mother;
      let parentKey: string | undefined;
      if (fId && mId) {
        const fatherCouple = coupleKeyByMembers.get(fId);
        const motherCouple = coupleKeyByMembers.get(mId);
        if (fatherCouple && motherCouple && fatherCouple === motherCouple) parentKey = fatherCouple;
        else parentKey = fatherCouple || motherCouple;
      } else parentKey = coupleKeyByMembers.get(fId || mId || '');
      if (parentKey) c.parentKey = parentKey;
      // Sort siblings by actual child birth: choose the earlier DOB among male/female in this couple
      const maleTs = dateTs(c.male?.dob);
      const femaleTs = dateTs(c.female?.dob);
      const ts = Math.min(maleTs || Infinity, femaleTs || Infinity);
      c.childBirthTs = isFinite(ts) ? ts : 0;
    }
  }

  // Fallback: attach orphan couples (no parentKey) under the root couple to ensure single top-level
  if (rootCoupleKey) {
    for (const [, arr] of couplesByGen) {
      for (const c of arr) {
        if (!c.parentKey && c.key !== rootCoupleKey) c.parentKey = rootCoupleKey;
      }
    }
  }

  // Sort couples inside generation by birth timestamp then by key for stability
  for (const [gen, arr] of couplesByGen) {
    arr.sort((a,b) => (a.childBirthTs - b.childBirthTs) || a.key.localeCompare(b.key));
    couplesByGen.set(gen, arr);
  }

  // Build final levels array
  const maxGen = Math.max(...couplesByGen.keys());
  const levels: any[][] = [];
  for (let g = 0; g <= maxGen; g++) {
    levels.push(couplesByGen.get(g) || []);
  }
  return levels;
}

function dateTs(d?: string) { return d ? Date.parse(d) || 0 : 0; }
function makeCouple(male?: MemberLike, female?: MemberLike) {
  const members: string[] = [];
  if (male?.id) members.push(male.id);
  if (female?.id && female.id !== male?.id) members.push(female.id);
  let key = members.length === 2 ? members.slice().sort().join('-') : members[0];
  if (!key) {
    const base = (male?.fullName || female?.fullName || 'unknown').replace(/\s+/g, '-').toLowerCase();
    key = `tmp-${base}`;
  }
  return { key, members, male, female, level: 0 } as any; // attach default level
}
function pickSpouse(m: MemberLike, unionsByPartner?: Map<string, Set<string>>): string | undefined {
  if (!m.id) return m.spouse; // fallback
  const set = unionsByPartner?.get(m.id);
  if (set && set.size) {
    // Choose deterministic first sorted spouse id
    return [...set].sort()[0];
  }
  return m.spouse;
}

export function computeLayout(
  levels: any[][],
  widths: Map<string, { width: number; height: number }>,
  GAP_X: number,
  GAP_Y: number
) {
  const pos: Record<string, { x: number; y: number; width: number; height: number }> = {};
  const coupleByKey = new Map<string, any>();
  const parentChildren = new Map<string, string[]>();

  let totalWidth = 0;
  let currentY = 0;

  // First pass: measure & store couples (no x yet for later generations)
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];
    let maxHeightInLevel = 80;
    // Allocate temp widths/heights; x will be assigned later for non-root generations
    for (const couple of level) {
      const dimensions = widths.get(couple.key) || { width: 160, height: 80 };
      pos[couple.key] = { x: 0, y: currentY, width: dimensions.width, height: dimensions.height };
      coupleByKey.set(couple.key, couple);
      if (couple.parentKey) {
        const arr = parentChildren.get(couple.parentKey) || [];
        arr.push(couple.key);
        parentChildren.set(couple.parentKey, arr);
      }
      maxHeightInLevel = Math.max(maxHeightInLevel, dimensions.height);
    }
    currentY += maxHeightInLevel + GAP_Y;
  }
  const totalHeight = currentY - GAP_Y;

  // Second pass: assign X positions generation by generation
  let rootMaxWidth = 0;
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const level = levels[levelIndex];
    if (levelIndex === 0) {
      // Root: simple left-to-right packing
      let xCursor = 0;
      for (const couple of level) {
        const box = pos[couple.key];
        box.x = xCursor;
        xCursor += box.width + GAP_X;
      }
      rootMaxWidth = Math.max(0, xCursor - GAP_X);
      totalWidth = Math.max(totalWidth, rootMaxWidth);
      continue;
    }

    // Build groups by parentKey
    const prevLevel = levels[levelIndex - 1];
    const groups: Array<{ parentKey: string; couples: any[]; width: number }> = [];
    const orphanCouples: any[] = [];
    for (const couple of level) {
      if (couple.parentKey && pos[couple.parentKey]) {
        let g = groups.find(gr => gr.parentKey === couple.parentKey);
        if (!g) {
          g = { parentKey: couple.parentKey, couples: [], width: 0 };
          groups.push(g);
        }
        g.couples.push(couple);
      } else {
        orphanCouples.push(couple);
      }
    }
    // Order groups by order of parent appearance in previous level
    groups.sort((a,b) => {
      const ai = prevLevel.findIndex(c => c.key === a.parentKey);
      const bi = prevLevel.findIndex(c => c.key === b.parentKey);
      return ai - bi;
    });
    // Compute width of each group (sum of couple widths + GAP_X between)
    for (const g of groups) {
      g.width = g.couples.reduce((sum, c) => sum + pos[c.key].width, 0) + GAP_X * Math.max(0, g.couples.length - 1);
    }
    // Layout groups: center under parent, resolve overlaps by pushing to the right
    let occupiedSegments: Array<{ start: number; end: number }> = [];
    const ensureNoOverlap = (desiredStart: number, desiredWidth: number): number => {
      let start = desiredStart;
      const end = () => start + desiredWidth;
      // Push right while overlapping any existing segment
      let changed = true;
      while (changed) {
        changed = false;
        for (const seg of occupiedSegments) {
          if (!(end() <= seg.start || start >= seg.end)) { // overlap
            start = seg.end + GAP_X; // push right just after segment
            changed = true;
          }
        }
      }
      occupiedSegments.push({ start, end: end() });
      return start;
    };

    for (const g of groups) {
      const parentBox = pos[g.parentKey];
      const parentCenter = parentBox.x + parentBox.width / 2;
      const desiredStart = parentCenter - g.width / 2;
      const start = ensureNoOverlap(Math.max(0, desiredStart), g.width);
      // Assign x positions to couples inside the group sequentially
      let xCursor = start;
      // Sort siblings by the DOB of the child who has this group's father as father
      const fatherId = (coupleByKey.get(g.parentKey)?.male?.id) as string | undefined;
      const childTsFor = (c: any) => {
        const maleTs = (fatherId && c.male?.father === fatherId) ? dateTs(c.male?.dob) : Infinity;
        const femaleTs = (fatherId && c.female?.father === fatherId) ? dateTs(c.female?.dob) : Infinity;
        const ts = Math.min(maleTs, femaleTs);
        return isFinite(ts) ? ts : (c.childBirthTs ?? 0);
      };
      g.couples.sort((a,b) => (childTsFor(a) - childTsFor(b)) || a.key.localeCompare(b.key));
      for (const couple of g.couples) {
        const box = pos[couple.key];
        box.x = xCursor;
        xCursor += box.width + GAP_X;
      }
    }
    // Place orphans to the far right after all groups
    let orphanStart = occupiedSegments.reduce((max, s) => Math.max(max, s.end), 0);
    for (const orphan of orphanCouples) {
      const box = pos[orphan.key];
      box.x = orphanStart;
      orphanStart += box.width + GAP_X;
      occupiedSegments.push({ start: box.x, end: box.x + box.width });
    }
    const levelRightEdge = occupiedSegments.reduce((max, s) => Math.max(max, s.end), 0);
    totalWidth = Math.max(totalWidth, levelRightEdge);
  }

  return { pos, totalWidth, totalHeight, coupleByKey, parentChildren };
}

// KEEP: computeConnectionsSimple imported by TreeLayoutService (advanced grouping done elsewhere)
export function computeConnectionsSimple(
  levels: any[][],
  pos: Record<string, any>,
  coupleByKey: Map<string, any>,
  parentChildren: Map<string, string[]>,
  centerMetrics: any
) {
  // Delegate to tree-connections-simple.util.ts via TreeLayoutService; this placeholder kept for backwards compatibility.
  // If reached, return empty to avoid random lines.
  return { connections: [], nodes: [], coupleColors: {} };
}