import { Injectable, inject, signal } from '@angular/core';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Member } from '../../models/member.model';
import { computeStatsFromMembers } from './tree-utils';
import { buildLevels } from './tree-levels';
import { collectSubtree } from './tree-focus';
import { TreeStore } from './tree.store';

export interface TreeStats {
  totalMembers: number;
  totalMale: number;
  totalFemale: number;
  totalAlive: number;
  totalDeceased: number;
  totalGenerations: number;
}

@Injectable({ providedIn: 'root' })
export class TreeFacade {
  private readonly membersApi = inject(MemberService);
  private readonly unionsApi = inject(UnionService);
  private readonly store = inject(TreeStore);

  readonly allMembers = signal<Member[]>([]);
  readonly root = signal<Member | null>(null);
  readonly spouses = signal<Member[]>([]);
  readonly levels = signal<Member[][]>([]);
  readonly spousesByMember = signal<Record<string, Member[]>>({});
  readonly memberById = signal<Map<string, Member>>(new Map());
  readonly wifeColor = signal<Map<string, string>>(new Map());
  readonly stats = signal<TreeStats>({
    totalMembers: 0,
    totalMale: 0,
    totalFemale: 0,
    totalAlive: 0,
    totalDeceased: 0,
    totalGenerations: 0,
  });
  readonly focusRootId = signal<string | null>(null);
  readonly includeSpousesInFocus = signal(true);

  private loadToken = 0;
  private readonly COLORS = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];

  setFamily(familyId: string | null) {
    this.store.setFamily(familyId);
    this.reload();
  }

  setFocus(focusId: string | null, includeSpouses: boolean) {
    this.focusRootId.set(focusId);
    this.includeSpousesInFocus.set(includeSpouses);
    this.reload();
  }

  reload() {
    const familyId = this.store.selectedFamilyId();
    if (!familyId) {
      this.allMembers.set([]);
      this.root.set(null);
      this.spouses.set([]);
      this.levels.set([]);
      this.spousesByMember.set({});
      this.memberById.set(new Map());
      this.wifeColor.set(new Map());
      this.stats.set({
        totalMembers: 0,
        totalMale: 0,
        totalFemale: 0,
        totalAlive: 0,
        totalDeceased: 0,
        totalGenerations: 0,
      });
      return;
    }

    const token = ++this.loadToken;
    this.membersApi.listByFamily(familyId).subscribe(members => {
      if (token !== this.loadToken) return;
      const allMembers = members || [];

      let root: Member | null = null;
      // Gốc chỉ cần không có cha/mẹ; vẫn có thể có vợ/chồng
      const candidates = allMembers.filter(m => m.gender === 'male' && !m.father && !(m as any).mother);
      if (candidates.length === 1) root = candidates[0];
      else if (candidates.length > 1) {
        const childCount = (id: string) => allMembers.filter(c => c.father === id).length;
        candidates.sort((a, b) => childCount(b.id!) - childCount(a.id!));
        root = candidates[0];
      }
      this.root.set(root);
      if (!root) {
        this.allMembers.set(allMembers);
        this.levels.set([]);
        this.spouses.set([]);
        this.spousesByMember.set({});
        this.memberById.set(new Map());
        this.wifeColor.set(new Map());
        this.stats.set(computeStatsFromMembers(allMembers, root, []));
        return;
      }

      this.unionsApi.list({ family: familyId }).subscribe(us => {
        if (token !== this.loadToken) return;
        const map: Record<string, Set<string>> = {};
        const addPair = (a?: string, b?: string) => {
          if (!a || !b || a === b) return;
          map[a] = map[a] || new Set<string>(); map[a].add(b);
          map[b] = map[b] || new Set<string>(); map[b].add(a);
        };
        us.forEach(u => {
          const ps = (u.partners || []) as string[];
          ps.forEach(p => ps.forEach(q => addPair(p, q)));
        });
        allMembers.forEach(m => addPair(m.id, (m as any).spouse));
        allMembers.forEach(m => addPair(m.father, (m as any).mother));

        const spousesByMember: Record<string, Member[]> = {};
        Object.keys(map).forEach(mid => {
          const set = map[mid];
          spousesByMember[mid] = allMembers.filter(m => set.has(m.id!));
        });

        // Assign colors for partners globally
        const wifeColor = new Map<string, string>();
        const allPartnersGlobal = Object.values(spousesByMember).flat();
        const seenGlobal = new Set<string>();
        allPartnersGlobal.forEach((p, i) => {
          if (!seenGlobal.has(p.id!)) {
            wifeColor.set(p.id!, this.COLORS[i % this.COLORS.length]);
            seenGlobal.add(p.id!);
          }
        });

        let renderMembers = allMembers;
        let renderRoot = root;
        let spousesMap = spousesByMember;
        const focusId = this.focusRootId();
        const includeSpouses = this.includeSpousesInFocus();
        if (focusId) {
          const { visibleIds, root: focusRoot } = collectSubtree(allMembers, focusId, spousesByMember, { includeSpouses });
          renderMembers = allMembers.filter(m => visibleIds.has(m.id!));
          renderRoot = focusRoot || root;
          const filtered: Record<string, Member[]> = {};
          Object.keys(spousesByMember).forEach(mid => {
            if (!visibleIds.has(mid)) return;
            filtered[mid] = (spousesByMember[mid] || []).filter(p => visibleIds.has(p.id!));
          });
          spousesMap = filtered;
        }

        const memberById = new Map(renderMembers.map(m => [m.id!, m] as const));
        const levels = buildLevels(renderMembers, renderRoot!, spousesMap || {});
        const stats = computeStatsFromMembers(renderMembers, renderRoot, levels);
        const rootSpouses = spousesMap[renderRoot!.id!] || [];

        this.allMembers.set(renderMembers);
        this.root.set(renderRoot);
        this.spouses.set(rootSpouses);
        this.levels.set(levels);
        this.spousesByMember.set(spousesMap);
        this.memberById.set(memberById);
        this.wifeColor.set(wifeColor);
        this.stats.set(stats);
      });
    });
  }
}
