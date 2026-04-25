import { sortPeopleByDobAsc, type TreePersonLike } from './tree-graph';

function buildParentContext<T extends TreePersonLike>(currentLevel: T[], spousesByMember: Record<string, T[]>) {
  const motherIds = new Set<string>();
  const fatherIds = new Set<string>();

  for (const person of currentLevel) {
    if (!person.id) continue;

    if (person.gender === 'female') motherIds.add(person.id);
    if (person.gender === 'male') fatherIds.add(person.id);

    for (const spouse of spousesByMember[person.id] || []) {
      if (!spouse?.id) continue;
      if (spouse.gender === 'female') motherIds.add(spouse.id);
      if (spouse.gender === 'male') fatherIds.add(spouse.id);
    }
  }

  return { motherIds, fatherIds };
}

// Builds generational levels from a root member using a mother-first rule:
// if a child has a mother, that mother determines which generation bridge it belongs to.
// father-only links are used as a fallback when mother is missing.
export function buildLevels<T extends TreePersonLike>(members: T[], root: T, spousesByMember: Record<string, T[]>, femaleFirst = false): T[][] {
  const levels: T[][] = [];
  const visited = new Set<string>();
  visited.add(root.id!);
  let current: T[] = [root];

  while (current.length) {
    const { motherIds, fatherIds } = buildParentContext(current, spousesByMember);
    const nextLevel = members.filter((member) => {
      if (!member.id || visited.has(member.id)) return false;
      if (member.mother) return motherIds.has(member.mother);
      if (member.father) return fatherIds.has(member.father);
      return false;
    });

    if (!nextLevel.length) break;

    sortPeopleByDobAsc(nextLevel);
    nextLevel.forEach((member) => visited.add(member.id!));
    levels.push(nextLevel);
    current = nextLevel;
  }

  // Optional: reorder within each level female first for presentation (if flag true)
  if (femaleFirst) {
    levels.forEach(level => level.sort((a, b) => {
      if (a.gender === b.gender) return 0;
      return a.gender === 'female' ? -1 : 1;
    }));
  }
  return levels;
}
