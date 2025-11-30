import type { Member } from '../../models/member.model';

// Builds generational levels from a root member.
// Keeps ordering of siblings by ascending DOB and groups children by mothers (root wives or female spouses).
export function buildLevels(members: Member[], root: Member, spousesByMember: Record<string, Member[]>, femaleFirst = false): Member[][] {
  const levels: Member[][] = [];
  const visited = new Set<string>();
  const getFemaleSpouses = (m: Member) => (spousesByMember[m.id!]||[]).filter(s=> s.gender==='female');
  const sortByDobAsc = (arr: Member[]) => arr.sort((a,b)=>{
    const da = a.dob ? new Date(a.dob as any).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dob ? new Date(b.dob as any).getTime() : Number.POSITIVE_INFINITY;
    return da - db; // older first (left), unknowns to the right
  });
  // Generation 2: children of root (father match OR mother is one of root wives)
  const rootWives = getFemaleSpouses(root).map(w=> w.id!);
  let current: Member[] = members.filter(m=> m.father===root.id || (m.mother && rootWives.includes(m.mother)));
  sortByDobAsc(current);
  current.forEach(c=> visited.add(c.id!));
  if (current.length) levels.push(current);
  while (current.length){
    const nextOrdered: Member[] = [];
    for (const p of current){
      const mothers: string[] = [];
      if (p.gender==='female' && p.id) mothers.push(p.id);
      for (const w of getFemaleSpouses(p)) mothers.push(w.id!);
      for (const mid of mothers){
        const kids = members.filter(m=> m.mother===mid && !visited.has(m.id!));
        if (kids.length){
          sortByDobAsc(kids);
          kids.forEach(k=> { visited.add(k.id!); nextOrdered.push(k); });
        }
      }
    }
    if (!nextOrdered.length) break;
    levels.push(nextOrdered);
    current = nextOrdered;
  }
  // Optional: reorder within each level female first for presentation (if flag true)
  if (femaleFirst){
    levels.forEach(level => level.sort((a,b)=>{
      if (a.gender === b.gender) return 0;
      return a.gender === 'female' ? -1 : 1;
    }));
  }
  return levels;
}
