import type { Member } from '../../models/member.model';

export interface FocusOptions { includeSpouses: boolean; }

export interface FocusResult {
  visibleIds: Set<string>;
  root: Member | null;
}

// Build the set of visible member IDs for a subtree starting at rootId.
// Only descendants are included; optionally include each descendant's spouses.
export function collectSubtree(
  members: Member[],
  rootId: string,
  spousesByMember: Record<string, Member[]>,
  opts: FocusOptions
): FocusResult {
  const mapById = new Map(members.map(m => [m.id!, m] as const));
  const root = mapById.get(rootId) || null;
  const visibleIds = new Set<string>();
  if (!root) return { visibleIds, root };
  const childrenByMother = new Map<string, Member[]>();
  const childrenByFather = new Map<string, Member[]>();
  for (const m of members){
    if (m.mother) {
      const arr = childrenByMother.get(m.mother) || []; arr.push(m); childrenByMother.set(m.mother, arr);
    }
    if (m.father) {
      const arr = childrenByFather.get(m.father) || []; arr.push(m); childrenByFather.set(m.father, arr);
    }
  }
  const q: string[] = [rootId];
  visibleIds.add(rootId);
  while (q.length){
    const cur = q.shift()!;
    const children = [ ...(childrenByMother.get(cur) || []), ...(childrenByFather.get(cur) || []) ];
    for (const c of children){
      if (!visibleIds.has(c.id!)){
        visibleIds.add(c.id!);
        q.push(c.id!);
      }
    }
    if (opts.includeSpouses){
      const partners = spousesByMember[cur] || [];
      for (const p of partners){
        if (!visibleIds.has(p.id!)) visibleIds.add(p.id!);
      }
    }
  }
  return { visibleIds, root };
}
