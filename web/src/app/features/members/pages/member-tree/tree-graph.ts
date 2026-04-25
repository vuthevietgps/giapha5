export interface TreePersonLike {
  id?: string;
  fullName?: string;
  gender?: string;
  dob?: string;
  father?: string;
  mother?: string;
  spouse?: string;
}

export function sortPeopleByDobAsc<T extends TreePersonLike>(arr: T[]): T[] {
  return arr.sort((a, b) => {
    const da = a.dob ? new Date(a.dob as any).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dob ? new Date(b.dob as any).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return (a.fullName || '').localeCompare(b.fullName || '');
  });
}

function addPair(map: Record<string, Set<string>>, a?: string, b?: string) {
  if (!a || !b || a === b) return;
  map[a] = map[a] || new Set<string>();
  map[a].add(b);
  map[b] = map[b] || new Set<string>();
  map[b].add(a);
}

export function buildSpouseMap<T extends TreePersonLike>(
  members: T[],
  unions: Array<{ partners?: string[] }> = [],
): Record<string, T[]> {
  const pairs: Record<string, Set<string>> = {};

  unions.forEach((union) => {
    const partners = union.partners || [];
    partners.forEach((left) => partners.forEach((right) => addPair(pairs, left, right)));
  });

  members.forEach((member) => addPair(pairs, member.id, member.spouse));
  members.forEach((member) => addPair(pairs, member.father, member.mother));

  const spousesByMember: Record<string, T[]> = {};
  Object.keys(pairs).forEach((memberId) => {
    const spouseIds = pairs[memberId];
    spousesByMember[memberId] = sortPeopleByDobAsc(
      members.filter((member) => !!member.id && spouseIds.has(member.id)),
    );
  });

  return spousesByMember;
}

export function findTreeRoot<T extends TreePersonLike>(members: T[], preferredRootId?: string | null): T | null {
  if (!members.length) return null;

  if (preferredRootId) {
    const preferred = members.find((member) => member.id === preferredRootId);
    if (preferred) return preferred;
  }

  const childCount = (id?: string) => members.filter((member) => member.father === id || member.mother === id).length;
  const sortCandidates = (candidates: T[]) =>
    candidates.sort((a, b) => {
      const byChildren = childCount(b.id) - childCount(a.id);
      if (byChildren !== 0) return byChildren;
      const da = a.dob ? new Date(a.dob as any).getTime() : Number.POSITIVE_INFINITY;
      const db = b.dob ? new Date(b.dob as any).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

  const maleWithoutParents = members.filter((member) => member.gender === 'male' && !member.father && !member.mother);
  if (maleWithoutParents.length === 1) return maleWithoutParents[0];
  if (maleWithoutParents.length > 1) return sortCandidates(maleWithoutParents)[0];

  const withoutParents = members.filter((member) => !member.father && !member.mother);
  if (withoutParents.length === 1) return withoutParents[0];
  if (withoutParents.length > 1) return sortCandidates(withoutParents)[0];

  return sortCandidates([...members])[0] || null;
}
