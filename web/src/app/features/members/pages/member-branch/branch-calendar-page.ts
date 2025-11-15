import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';
import { FamilyService } from '../../../families/services/family';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import { collectSubtree } from '../member-tree/tree-focus';
import { buildLevels } from '../member-tree/tree-levels';

type EventType = 'birthday' | 'deathday';
interface ImportantEvent { month: number; day: number; type: EventType; member: Member; }

@Component({
  selector: 'app-branch-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  templateUrl: './branch-calendar-page.html'
})
export class BranchCalendarPage implements OnInit {
  private readonly familiesApi = inject(FamilyService);
  private readonly membersApi = inject(MemberService);
  private readonly unionsApi = inject(UnionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  families: Family[] = [];
  selectedFamilyId: string | null = null;
  allMembers: Member[] = [];
  membersForRootSelect: Member[] = [];
  rootId: string | null = null;
  includeSpouses = true;
  selectFilter = '';

  spousesByMember: Record<string, Member[]> = {};
  year = new Date().getFullYear();
  showBirthdays = true;
  showDeathdays = true;

  events: ImportantEvent[] = [];
  grouped: Record<number, ImportantEvent[]> = {}; // key: 1..12

  ngOnInit(){
    this.route.queryParamMap.subscribe(qp => {
      const fam = qp.get('family');
      const root = qp.get('root');
      const sp = qp.get('sp') || '1';
      const y = qp.get('year');
      const b = qp.get('b');
      const d = qp.get('d');
      this.selectedFamilyId = fam;
      this.rootId = root;
      this.includeSpouses = sp !== '0';
      this.year = y ? parseInt(y, 10) || this.year : this.year;
      this.showBirthdays = b !== '0';
      this.showDeathdays = d !== '0';
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
    const params: any = {
      year: String(this.year),
      b: this.showBirthdays ? '1' : '0',
      d: this.showDeathdays ? '1' : '0',
      sp: this.includeSpouses ? '1' : '0',
    };
    if (this.selectedFamilyId) params.family = this.selectedFamilyId; else params.family = null;
    if (this.rootId) params.root = this.rootId; else params.root = null;
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  onFamilyChange(){ this.rootId = null; this.updateParams(); this.bootstrap(); }
  onRootChange(){ this.updateParams(); this.compute(); }
  onIncludeSpousesChange(){ this.updateParams(); this.compute(); }
  onYearChange(){ if (this.year < 1900) this.year = 1900; if (this.year > 2100) this.year = 2100; this.updateParams(); this.compute(); }
  onToggleTypes(){ this.updateParams(); this.compute(); }

  filterSelectList(){
    const q = (this.selectFilter||'').toLowerCase().trim();
    if (!q) { this.membersForRootSelect = [...this.allMembers]; return; }
    this.membersForRootSelect = this.allMembers.filter(m => (m.fullName||'').toLowerCase().includes(q));
  }

  private bootstrap(){
    if (!this.selectedFamilyId){ this.allMembers = []; this.spousesByMember = {}; this.events = []; this.grouped = {}; return; }
    this.membersApi.listByFamily(this.selectedFamilyId).subscribe(members => {
      this.allMembers = members || [];
      this.membersForRootSelect = [...this.allMembers];
      this.loadUnionsAndCompute();
    });
  }

  private loadUnionsAndCompute(){
    if (!this.selectedFamilyId){ this.spousesByMember = {}; this.compute(); return; }
    this.unionsApi.list({ family: this.selectedFamilyId }).subscribe(us => {
      const map: Record<string, Set<string>> = {};
      const addPair = (a?: string, b?: string) => { if (!a || !b || a === b) return; map[a] = map[a] || new Set<string>(); map[a].add(b); map[b] = map[b] || new Set<string>(); map[b].add(a); };
      us.forEach(u => { const ps = (u.partners||[]) as string[]; ps.forEach(p => ps.forEach(q => addPair(p,q))); });
      this.allMembers.forEach(m => addPair(m.id, m.spouse));
      const spouses: Record<string, Member[]> = {};
      Object.keys(map).forEach(mid => { const set = map[mid]; spouses[mid] = this.allMembers.filter(m => set.has(m.id!)); });
      this.spousesByMember = spouses;
      this.compute();
    });
  }

  private compute(){
    if (!this.rootId){ this.events = []; this.grouped = {}; return; }
    const { visibleIds, root } = collectSubtree(this.allMembers, this.rootId, this.spousesByMember, { includeSpouses: this.includeSpouses });
    const renderMembers = this.allMembers.filter(m => visibleIds.has(m.id!));
    // ensure levels built for future extension (not currently used but may be needed)
    if (root) buildLevels(renderMembers, root, this.spousesByMember);

    const evts: ImportantEvent[] = [];
    for (const m of renderMembers){
      if (this.showBirthdays && m.dob){
        const d = new Date(m.dob);
        evts.push({ month: d.getMonth()+1, day: d.getDate(), type: 'birthday', member: m });
      }
      if (this.showDeathdays && m.dod){
        const d = new Date(m.dod);
        evts.push({ month: d.getMonth()+1, day: d.getDate(), type: 'deathday', member: m });
      }
    }
    evts.sort((a,b)=> a.month!==b.month ? a.month-b.month : (a.day!==b.day ? a.day-b.day : (a.type===b.type ? (a.member.fullName||'').localeCompare(b.member.fullName||'') : (a.type==='deathday'?1:-1))));
    this.events = evts;
    const grouped: Record<number, ImportantEvent[]> = {};
    for (let m=1;m<=12;m++) grouped[m] = [];
    for (const e of evts) grouped[e.month].push(e);
    this.grouped = grouped;
  }
}
