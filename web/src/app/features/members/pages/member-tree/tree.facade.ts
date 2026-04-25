import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Member } from '../../models/member.model';
import { computeStatsFromMembers } from './tree-utils';
import { buildLevels } from './tree-levels';
import { collectSubtree } from './tree-focus';
import { TreeStore } from './tree.store';
import { buildSpouseMap, findTreeRoot } from './tree-graph';

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
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
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

  private readonly emptyStats: TreeStats = {
    totalMembers: 0, totalMale: 0, totalFemale: 0,
    totalAlive: 0, totalDeceased: 0, totalGenerations: 0,
  };

  setFamily(familyId: string | null) {
    this.store.setFamily(familyId);
    this.reload();
  }

  setFocus(focusId: string | null, includeSpouses: boolean) {
    this.focusRootId.set(focusId);
    this.includeSpousesInFocus.set(includeSpouses);
    this.reload();
  }

  private resetState() {
    this.allMembers.set([]);
    this.root.set(null);
    this.spouses.set([]);
    this.levels.set([]);
    this.spousesByMember.set({});
    this.memberById.set(new Map());
    this.wifeColor.set(new Map());
    this.stats.set(this.emptyStats);
  }

  reload() {
    const familyId = this.store.selectedFamilyId();
    if (!familyId) {
      this.resetState();
      return;
    }

    const token = ++this.loadToken;
    this.loading.set(true);
    this.error.set(null);

    // Use forkJoin to load members and unions in parallel (no nested subscribe)
    forkJoin({
      members: this.membersApi.listByFamily(familyId),
      unions: this.unionsApi.list({ family: familyId }),
    }).subscribe({
      next: ({ members, unions }) => {
        if (token !== this.loadToken) return;
        this.processData(members || [], unions || [], familyId);
        this.loading.set(false);
      },
      error: (err) => {
        if (token !== this.loadToken) return;
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Không thể tải dữ liệu cây gia phả');
        this.resetState();
      },
    });
  }

  private processData(allMembers: Member[], unions: any[], familyId: string) {
    const family = this.store.families().find(f => f.id === familyId);
    const root = findTreeRoot(allMembers, family?.rootMember || null);
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

    const spousesByMember = buildSpouseMap(allMembers, unions);

    // Assign colors for partners globally
    const wifeColor = new Map<string, string>();
    const seenGlobal = new Set<string>();
    let colorIdx = 0;
    Object.values(spousesByMember).flat().forEach(p => {
      if (!seenGlobal.has(p.id!)) {
        wifeColor.set(p.id!, this.COLORS[colorIdx % this.COLORS.length]);
        seenGlobal.add(p.id!);
        colorIdx++;
      }
    });

    // Focus subtree filtering
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
  }
}
