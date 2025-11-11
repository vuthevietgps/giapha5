import type { Member } from '../../models/member.model';
import type { Couple } from './member-tree.types';

export function buildGenerations(
  members: Member[],
  unionsByPartner: Map<string, Set<string>>
): Couple[][] {
  const byId = new Map<string, Member>();
  members.forEach((m) => {
    if (m.id) byId.set(m.id, m);
  });

  // Build reverse spouse index so that if A.spouse=B, we also treat A as a partner of B.
  const reverseSpouses = new Map<string, Set<string>>();
  for (const m of members) {
    if (!m.id || !m.spouse) continue;
    const partnerId = m.spouse;
    const set = reverseSpouses.get(partnerId) || new Set<string>();
    set.add(m.id);
    reverseSpouses.set(partnerId, set);
  }

  const getSpouse = (m: Member): Member | undefined => {
    return m.spouse ? byId.get(m.spouse) : undefined;
  };

  const coupleKey = (a?: string, b?: string) => {
    const ids = [a, b].filter(Boolean) as string[];
    return ids.sort().join('|');
  };

  // Build spousesOfMale index from spouse links, unions, and inferred from children
  const spousesOfMale = new Map<string, Set<string>>();
  const husbandsOfFemale = new Map<string, Set<string>>();
  
  // From spouse links
  for (const m of members) {
    if (!m.id || !m.spouse) continue;
    const s = byId.get(m.spouse);
    if (!s) continue;
    if (s.gender === 'male' && m.gender === 'female') {
      const set = spousesOfMale.get(s.id!) || new Set<string>();
      set.add(m.id!);
      spousesOfMale.set(s.id!, set);
    }
  }

  // From unions
  for (const [pid, setIds] of unionsByPartner.entries()) {
    const person = byId.get(pid);
    if (person?.gender !== 'male') continue;
    const set = spousesOfMale.get(pid) || new Set<string>();
    for (const otherId of setIds) {
      const other = byId.get(otherId);
      if (other?.gender === 'female') {
        set.add(otherId);
      }
    }
    if (set.size) spousesOfMale.set(pid, set);
  }

  // Infer from children: if a child has father F and mother M, consider M as a spouse of F (and F as a spouse of M)
  for (const m of members) {
    if (!m.father || !m.mother) continue;
    const father = byId.get(m.father);
    const mother = byId.get(m.mother);
    if (father?.gender === 'male' && mother?.gender === 'female') {
      const setW = spousesOfMale.get(father.id!) || new Set<string>();
      setW.add(mother.id!);
      spousesOfMale.set(father.id!, setW);

      const setH = husbandsOfFemale.get(mother.id!) || new Set<string>();
      setH.add(father.id!);
      husbandsOfFemale.set(mother.id!, setH);
    }
  }

  const visitedMembers = new Set<string>();
  const addedRootCoupleKeys = new Set<string>();

  const makeCouple = (male?: Member, female?: Member): Couple => {
    const key = coupleKey(male?.id, female?.id) || (male?.id || female?.id || Math.random().toString());
    const c: Couple = {
      key,
      male,
      female,
      members: [male?.id, female?.id].filter(Boolean) as string[],
    };
    c.members.forEach((id) => visitedMembers.add(id));
    return c;
  };

  const roots: Couple[] = [];

    // Find male roots (males with no father)
  members.forEach((m) => {
    if (!m.id) return;
    if (m.gender === 'male' && !m.father) {
      if (visitedMembers.has(m.id)) return;
      const male = byId.get(m.id);
      const wives = new Set<string>();
      
      // Add spouse from spouse link
      const s = getSpouse(m);
      if (s && s.gender === 'female') wives.add(s.id!);
      
      // Add from unions
      const unionSpouses = spousesOfMale.get(m.id) || new Set<string>();
      for (const sp of unionSpouses) wives.add(sp);
      
      // Only keep wives who themselves don't have a father (true roots)
      const filteredWives = new Set<string>();
      for (const wid of wives) {
        const w = byId.get(wid);
        if (w && !w.father) filteredWives.add(wid);
      }

      if (filteredWives.size === 0) {
        // Male with no wives
        const c = makeCouple(male);
        roots.push(c);
      } else {
        // Create separate couple for EACH wife
        for (const wifeId of filteredWives) {
          const wife = byId.get(wifeId);
          if (!wife || visitedMembers.has(wifeId)) continue;
          
          const coupleKeyStr = coupleKey(male?.id, wife?.id);
          if (addedRootCoupleKeys.has(coupleKeyStr)) continue;
          
          const c = makeCouple(male, wife);
          roots.push(c);
          addedRootCoupleKeys.add(coupleKeyStr);
        }
      }
    }
  });

  // Find female roots (females with no father) - now supporting multiple husbands
  members.forEach((m) => {
    if (!m.id) return;
    if (m.gender === 'female' && !m.father) {
      if (visitedMembers.has(m.id)) return;
      const female = byId.get(m.id);
      const husbands = new Set<string>();
      
      // Add spouse from spouse link
      const s = getSpouse(m);
      if (s && s.gender === 'male') husbands.add(s.id!);
      
      // Add from unions (female as partner)
      const unionSpouses = unionsByPartner.get(m.id) || new Set<string>();
      for (const sp of unionSpouses) {
        const partner = byId.get(sp);
        if (partner && partner.gender === 'male') husbands.add(sp);
      }

      // Add inferred husbands from children
      const inferred = husbandsOfFemale.get(m.id) || new Set<string>();
      for (const h of inferred) husbands.add(h);

      // Only keep husbands who themselves don't have a father (truly root level)
      const filteredHusbands = new Set<string>();
      for (const hid of husbands) {
        const h = byId.get(hid);
        if (h && !h.father) filteredHusbands.add(hid);
      }
      
      if (filteredHusbands.size === 0) {
        // Nếu không có chồng nào ở tầng gốc nhưng NỮ này có chồng ở tầng dưới (tức husbands.size > 0),
        // bỏ qua việc tạo cặp ở root để người này sẽ xuất hiện cùng chồng ở đời kế tiếp.
        if (husbands.size === 0) {
          // Female with truly no husbands at all
          const c = makeCouple(undefined, female);
          roots.push(c);
        }
      } else {
        // Create separate couple for EACH husband
        for (const husbandId of filteredHusbands) {
          const husband = byId.get(husbandId);
          if (!husband || visitedMembers.has(husbandId)) continue;
          
          const coupleKeyStr = coupleKey(husband?.id, female?.id);
          if (addedRootCoupleKeys.has(coupleKeyStr)) continue;
          
          const c = makeCouple(husband, female);
          roots.push(c);
          addedRootCoupleKeys.add(coupleKeyStr);
        }
      }
    }
  });

  // Mark hub groups on roots (same person across multiple couples)
  
  // Male hubs: same male with multiple wives
  const maleRootGroups = new Map<string, Couple[]>();
  for (const r of roots) {
    const mid = r.male?.id;
    if (!mid) continue;
    const arr = maleRootGroups.get(mid) || [];
    arr.push(r);
    maleRootGroups.set(mid, arr);
  }

  for (const [, arr] of maleRootGroups) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => (a.female?.fullName || a.female?.id || '').localeCompare(b.female?.fullName || b.female?.id || ''));
    arr.forEach((c, idx) => {
      c.maleHubKey = c.male?.id;
      c.hideMale = idx > 0;
      const primary = arr[0];
      primary.extraWives = primary.extraWives ? [...primary.extraWives] : [];
      if (idx > 0) primary.extraWives.push(c.female);
    });
    for (let i = 1; i < arr.length; i++) {
      arr[i].hideInHub = true;
    }
  }
  
  // Female hubs: same female with multiple husbands  
  const femaleRootGroups = new Map<string, Couple[]>();
  for (const r of roots) {
    const fid = r.female?.id;
    if (!fid || r.hideInHub) continue; // Skip already processed by male hub
    const arr = femaleRootGroups.get(fid) || [];
    arr.push(r);
    femaleRootGroups.set(fid, arr);
  }

  for (const [, arr] of femaleRootGroups) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => (a.male?.fullName || a.male?.id || '').localeCompare(b.male?.fullName || b.male?.id || ''));
    arr.forEach((c, idx) => {
      c.femaleHubKey = c.female?.id;
      c.hideFemale = idx > 0;
      const primary = arr[0];
      primary.extraHusbands = primary.extraHusbands ? [...primary.extraHusbands] : [];
      if (idx > 0) primary.extraHusbands.push(c.male);
    });
    for (let i = 1; i < arr.length; i++) {
      arr[i].hideInHub = true;
    }
  }

  const levels: Couple[][] = [];
  levels.push(roots);

  // Build next generations up to safety depth
  const used = new Set<string>(roots.flatMap((c) => c.members));
  let currentParents = roots;
  const maxDepth = 8;

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextLevelCouples: Couple[] = [];
    const addedCoupleKeys = new Set<string>();

    for (const parent of currentParents) {
      const mothersInParent = new Set<string>();
      if (parent.female?.id) mothersInParent.add(parent.female.id);
      for (const w of parent.extraWives || []) {
        if (w?.id) mothersInParent.add(w.id);
      }

      // Strictly maternal: a child belongs to this parent couple only if its mother is one of the mothers in this couple
      const children = members.filter((ch) => {
        if (!ch.id) return false;
        if (used.has(ch.id)) return false;
        if (!ch.mother) return false;
        return mothersInParent.has(ch.mother);
      });

      // Sort children by birth date ascending (earlier first). Missing dob goes last.
      const sortedChildren = [...children].sort((a, b) => {
        const at = a.dob ? Date.parse(a.dob) : Number.POSITIVE_INFINITY;
        const bt = b.dob ? Date.parse(b.dob) : Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        // stable tie-breakers
        return (a.fullName || a.id || '').localeCompare(b.fullName || b.id || '');
      });

      for (const child of sortedChildren) {
        // Get all partners from unions + spouse field
        const allPartners = new Set<string>();
        if (child.spouse) allPartners.add(child.spouse);
        
        const unionPartners = unionsByPartner.get(child.id!);
        if (unionPartners) {
          unionPartners.forEach(pid => allPartners.add(pid));
        }

        const reversePartners = reverseSpouses.get(child.id!);
        if (reversePartners) {
          reversePartners.forEach(pid => allPartners.add(pid));
        }

        if (allPartners.size === 0) {
          // Single person - create couple with no spouse
          const key = child.id!;
          if (addedCoupleKeys.has(key)) continue;
          
          const male = child.gender === 'male' ? child : undefined;
          const female = child.gender === 'female' ? child : undefined;

          // Mother-centric linking
          const actualMotherId = child.mother;
          const linkVia: 'father' | 'mother' = 'mother';

          const couple: Couple = {
            key,
            male,
            female,
            members: [child.id!],
            parentKey: parent.key,
            linkVia,
            motherIdUsed: actualMotherId,
            childBirthTs: child.dob ? Date.parse(child.dob) : undefined,
          };

          couple.members.forEach((id) => used.add(id));
          nextLevelCouples.push(couple);
          addedCoupleKeys.add(key);
        } else {
          // Create couple for each partner
          for (const partnerId of allPartners) {
            const partner = byId.get(partnerId);
            if (!partner) continue;

            const key = coupleKey(child.id, partner.id) || child.id!;
            if (addedCoupleKeys.has(key)) continue;

            const male = child.gender === 'female' ? partner : child.gender === 'male' ? child : undefined;
            const female = child.gender === 'female' ? child : (partner && partner.gender === 'female' ? partner : undefined);

            // Mother-centric linking
            const actualMotherId = child.mother;
            const linkVia: 'father' | 'mother' = 'mother';

            const couple: Couple = {
              key,
              male,
              female,
              members: [child.id!, partner.id!],
              parentKey: parent.key,
              linkVia,
              motherIdUsed: actualMotherId,
              childBirthTs: child.dob ? Date.parse(child.dob) : undefined,
            };

            couple.members.forEach((id) => used.add(id));
            nextLevelCouples.push(couple);
            addedCoupleKeys.add(key);
          }
        }
      }
    }

    if (!nextLevelCouples.length) break;

    // Mark hub groups for this level
    // 1) Male hubs (same male, multiple wives)
    const maleGroups = new Map<string, Couple[]>();
    for (const c of nextLevelCouples) {
      const mid = c.male?.id;
      if (!mid) continue;
      const arr = maleGroups.get(mid) || [];
      arr.push(c);
      maleGroups.set(mid, arr);
    }

    for (const [, arr] of maleGroups) {
      if (arr.length <= 1) continue;
      arr.sort((a, b) => (a.female?.fullName || a.female?.id || '').localeCompare(b.female?.fullName || b.female?.id || ''));
      arr.forEach((c, idx) => {
        c.maleHubKey = c.male?.id;
        c.hideMale = idx > 0;
        const primary = arr[0];
        primary.extraWives = primary.extraWives ? [...primary.extraWives] : [];
        if (idx > 0) primary.extraWives.push(c.female);
      });
      for (let i = 1; i < arr.length; i++) {
        arr[i].hideInHub = true;
      }
    }

    // 2) Female hubs (same female, multiple husbands)
    const femaleGroups = new Map<string, Couple[]>();
    for (const c of nextLevelCouples) {
      const fid = c.female?.id;
      if (!fid) continue;
      const arr = femaleGroups.get(fid) || [];
      arr.push(c);
      femaleGroups.set(fid, arr);
    }

    for (const [, arr] of femaleGroups) {
      if (arr.length <= 1) continue;
      arr.sort((a, b) => (a.male?.fullName || a.male?.id || '').localeCompare(b.male?.fullName || b.male?.id || ''));
      arr.forEach((c, idx) => {
        c.femaleHubKey = c.female?.id;
        c.hideFemale = idx > 0;
        const primary = arr[0];
        primary.extraHusbands = primary.extraHusbands ? [...primary.extraHusbands] : [];
        if (idx > 0) primary.extraHusbands.push(c.male);
      });
      for (let i = 1; i < arr.length; i++) {
        arr[i].hideInHub = true;
      }
    }

    levels.push(nextLevelCouples);
    currentParents = nextLevelCouples;
  }

  return levels;
}
