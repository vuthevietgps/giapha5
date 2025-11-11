import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { FamilyService } from '../../../../families/services/family';
import { MemberService } from '../../../services/member';
import { UnionService } from '../../../services/union';
import type { Family } from '../../../../families/models/family.model';
import type { Member } from '../../../models/member.model';
import type { Couple } from '../member-tree.types';
import { buildGenerations } from '../tree-utils';

export interface TreeStats {
  totalMembers: number;
  totalGenerations: number;
  totalMale: number;
  totalFemale: number;
  totalAlive: number;
  totalDeceased: number;
}

export interface TreeData {
  levels: Couple[][];
  stats: TreeStats;
}

@Injectable({
  providedIn: 'root'
})
export class TreeDataService {
  private readonly familyService = inject(FamilyService);
  private readonly memberService = inject(MemberService);
  private readonly unionService = inject(UnionService);

  loadFamilies(): Observable<Family[]> {
    return this.familyService.list();
  }

  loadTreeData(familyId: string): Observable<TreeData> {
    const members$ = this.memberService.listByFamily(familyId);
    const unions$ = this.unionService.list({ family: familyId });

    return combineLatest([members$, unions$]).pipe(
      map(([members, unions]) => {
        // Calculate stats
        const stats: TreeStats = {
          totalMembers: members?.length || 0,
          totalMale: (members || []).filter(m => (m.gender || '').toLowerCase() === 'male').length,
          totalFemale: (members || []).filter(m => (m.gender || '').toLowerCase() === 'female').length,
          totalAlive: (members || []).filter(m => !m.dod).length,
          totalDeceased: (members || []).filter(m => !!m.dod).length,
          totalGenerations: 0 // Will be set after building levels
        };

        // Build union map
        const unionsByPartner = new Map<string, Set<string>>();
        for (const u of unions || []) {
          const partners: string[] = (u.partners || []).filter(Boolean);
          for (const p of partners) {
            const set = unionsByPartner.get(p) || new Set<string>();
            for (const q of partners) if (q !== p) set.add(q);
            unionsByPartner.set(p, set);
          }
        }

        // Normalize members (ensure id exists) before building generations
        const normalized = (members || []).filter(m => !!m?.id).map(m => ({
          ...m,
          id: m.id as string
        }));
        // Build generations from normalized data
        const levels = buildGenerations(normalized as any, unionsByPartner);
        stats.totalGenerations = levels?.length || 0;

        return { levels, stats };
      })
    );
  }
}