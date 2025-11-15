import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FamilyService } from '../../../families/services/family';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';
import { collectSubtree } from '../member-tree/tree-focus';
import { buildLevels } from '../member-tree/tree-levels';

@Component({
  selector: 'app-branch-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './branch-page.html'
})
export class BranchPage implements OnInit {
  private readonly familiesApi = inject(FamilyService);
  private readonly membersApi = inject(MemberService);
  private readonly unionsApi = inject(UnionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  families: Family[] = [];
  selectedFamilyId: string | null = null;

  allMembers: Member[] = [];
  membersFilteredForSelect: Member[] = [];
  rootId: string | null = null;
  includeSpouses = true;
  selectFilter = '';
  tableFilter = '';

  spousesByMember: Record<string, Member[]> = {};
  memberById = new Map<string, Member>();

  focusedMembers: Member[] = [];
  private levelIndexByMember: Record<string, number> = {};

  ngOnInit(){
    this.route.queryParamMap.subscribe(qp => {
      const fam = qp.get('family');
      const root = qp.get('root');
      const sp = qp.get('sp') || '1';
      this.selectedFamilyId = fam;
      this.rootId = root;
      this.includeSpouses = sp !== '0';
      this.bootstrap();
    });
    this.familiesApi.list().subscribe(fs => {
      this.families = fs || [];
      if (!this.selectedFamilyId && fs?.length){
        this.selectedFamilyId = fs[0].id || null;
        this.updateParams();
      }
    });
  }

  updateParams(){
    const params: any = {};
    if (this.selectedFamilyId) params.family = this.selectedFamilyId; else params.family = null;
    if (this.rootId) params.root = this.rootId; else params.root = null;
    params.sp = this.includeSpouses ? '1' : '0';
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  onFamilyChange(){
    this.rootId = null;
    this.updateParams();
    this.bootstrap();
  }

  onRootChange(){
    this.updateParams();
    this.computeFocused();
  }

  onIncludeSpousesChange(){
    this.updateParams();
    this.computeFocused();
  }

  private bootstrap(){
    if (!this.selectedFamilyId){
      this.allMembers = []; this.membersFilteredForSelect = []; this.memberById.clear(); this.spousesByMember = {}; this.focusedMembers = []; return;
    }
    this.membersApi.listByFamily(this.selectedFamilyId).subscribe(members => {
      this.allMembers = members || [];
      this.membersFilteredForSelect = [...this.allMembers];
      this.memberById = new Map(this.allMembers.map(m => [m.id!, m] as const));
      this.loadUnionsAndCompute();
    });
  }

  private loadUnionsAndCompute(){
    if (!this.selectedFamilyId){ this.spousesByMember = {}; this.computeFocused(); return; }
    this.unionsApi.list({ family: this.selectedFamilyId }).subscribe(us => {
      const map: Record<string, Set<string>> = {};
      const addPair = (a?: string, b?: string) => {
        if (!a || !b || a === b) return;
        map[a] = map[a] || new Set<string>(); map[a].add(b);
        map[b] = map[b] || new Set<string>(); map[b].add(a);
      };
      us.forEach(u => {
        const ps = (u.partners||[]) as string[];
        ps.forEach(p => ps.forEach(q => addPair(p, q)));
      });
      this.allMembers.forEach(m => addPair(m.id, m.spouse));
      const spouses: Record<string, Member[]> = {};
      Object.keys(map).forEach(mid => {
        const set = map[mid];
        spouses[mid] = this.allMembers.filter(m => set.has(m.id!));
      });
      this.spousesByMember = spouses;
      this.computeFocused();
    });
  }

  filterSelectList(){
    const q = (this.selectFilter||'').toLowerCase().trim();
    if (!q) { this.membersFilteredForSelect = [...this.allMembers]; return; }
    this.membersFilteredForSelect = this.allMembers.filter(m => (m.fullName||'').toLowerCase().includes(q));
  }

  private computeFocused(){
    if (!this.rootId){ this.focusedMembers = []; this.levelIndexByMember = {}; return; }
    const { visibleIds, root } = collectSubtree(this.allMembers, this.rootId, this.spousesByMember, { includeSpouses: this.includeSpouses });
    const renderMembers = this.allMembers.filter(m => visibleIds.has(m.id!));
    const levels = root ? buildLevels(renderMembers, root, this.spousesByMember) : [];
    this.levelIndexByMember = {};
    if (root?.id) this.levelIndexByMember[root.id] = 0;
    levels.forEach((lv, i) => lv.forEach(m => { if (m?.id) this.levelIndexByMember[m.id] = Math.min(this.levelIndexByMember[m.id] ?? Infinity, i+1); }));
    this.focusedMembers = renderMembers.sort((a,b) => {
      const la = this.levelIndexByMember[a.id!] ?? 9999;
      const lb = this.levelIndexByMember[b.id!] ?? 9999;
      if (la !== lb) return la - lb;
      return (a.fullName||'').localeCompare(b.fullName||'');
    });
  }

  get filteredFocusedMembers(): Member[] {
    const q = (this.tableFilter||'').toLowerCase().trim();
    if (!q) return this.focusedMembers;
    return this.focusedMembers.filter(m => {
      const name = (m.fullName||'').toLowerCase();
      const father = this.displayParentName(m.father).toLowerCase();
      const mother = this.displayParentName(m.mother).toLowerCase();
      const spouses = (this.spousesByMember[m.id!]||[]).map(x=>x.fullName||'').join(' ').toLowerCase();
      const dob = (m.dob||'').toLowerCase();
      const dod = (m.dod||'').toLowerCase();
      return name.includes(q) || father.includes(q) || mother.includes(q) || spouses.includes(q) || dob.includes(q) || dod.includes(q);
    });
  }

  displayParentName(id?: string){
    if (!id) return '';
    const m = this.memberById.get(id);
    return m?.fullName || '';
  }
  displaySpouses(m: Member){
    const arr = this.spousesByMember[m.id!] || [];
    return arr.map(x=> x.fullName).join(', ');
  }
  levelOf(m: Member){
    return this.levelIndexByMember[m.id!] ?? '';
  }
}
