import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TreeEditMemberDialog } from './tree-edit-member.dialog';
import { TreeAddPartnerDialog } from './tree-add-partner.dialog';
import { TreeSelectFatherDialog } from './tree-select-father.dialog';
import { FamilyService } from '../../../families/services/family';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tree-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    FormsModule,
    MatInputModule,
  // TreeSelectFatherDialog is opened dynamically (not declared in template)
  TreeSelectFatherDialog,
  ],
  templateUrl: './tree-page.html',
  styles: [`
    .tree-shell{display:flex;height:calc(100vh - 64px);}
    .left{flex:1;display:flex;flex-direction:column;}
    .right{width:280px;border-left:1px solid #e0e0e0}
  .header{display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #e0e0e0}
    .spacer{flex:1}
  .tree-area{position:relative;flex:1;overflow:auto;padding:8px}
  .tree-area.space-pan{cursor:grab}
  .tree-area.space-pan.panning{cursor:grabbing}
  .tree-content{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:100%}
  .connections{position:absolute;left:0;top:0;pointer-events:none;z-index:999}
    .node{border:1px solid #ccc;border-radius:8px;padding:8px 12px;background:#fff;min-width:160px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .couple-box{display:inline-grid;grid-template-rows:auto auto;row-gap:6px;justify-items:center;border:2px solid #1976d2;border-radius:10px;padding:10px 12px 12px;background:#fff;position:relative;z-index:2;width:fit-content;max-width:none;box-shadow:0 2px 4px rgba(0,0,0,.06);overflow:hidden;transition:border-color .15s}
  /* Màu giới tính chỉ còn một vạch dọc bên trái trong mỗi khối person */
  .person{margin:0 auto 2px;text-align:center;padding:4px 10px 4px 12px;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:auto;position:relative;background:#f5f8fa}
  .person:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:6px 0 0 6px;background:#1976d2}
  .person.female:before{background:#d81b60}
  .person.male{background:#e7f2fc}
  .person.female{background:#fde7f1}
  .child-couple.couple-box{padding:6px 10px}
  .wives-list{display:flex;gap:6px;flex-wrap:nowrap;justify-content:center;align-items:flex-end}
    .wives-list .person{position:relative;padding-bottom:18px}
  .wives-list .person .anchor{position:absolute;left:50%;transform:translateX(-50%);bottom:-6px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.12);cursor:pointer}
  /* Mỗi level hiển thị trên 1 hàng, không xuống dòng; khi tràn ngang sẽ cuộn theo .tree-area */
  .children{display:flex;gap:12px;flex-wrap:nowrap;margin:10px 0;position:relative;z-index:2;align-items:flex-start;justify-content:flex-start;width:max-content}
  .child-couple{display:flex;flex-direction:column;align-items:center}
  .spouse-small{position:relative;padding-bottom:18px}
  .role-tag{font-size:11px;color:#555;margin-left:4px}
    .ctx-menu{position:fixed;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);padding:4px;display:flex;flex-direction:column;z-index:1000}
    .empty{opacity:.7}
  .name{display:flex;align-items:center;justify-content:center;gap:6px;font-weight:500}
  .stats-inline{display:flex;gap:10px;align-items:center;margin-left:8px}
  .stat-item{display:flex;gap:4px;align-items:baseline;font-size:12px;color:#444}
  .stat-item strong{font-size:13px;color:#000}
  `]
})
export class TreePage implements OnInit, AfterViewInit {
  private readonly familiesApi = inject(FamilyService);
  private readonly membersApi = inject(MemberService);
  private readonly unionsApi = inject(UnionService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  families: Family[] = [];
  selectedFamilyId: string | null = null;

  root: Member | null = null;
  spouses: Member[] = [];
  levels: Member[][] = [];
  allMembers: Member[] = [];
  spousesByMember: Record<string, Member[]> = {};
  private memberById: Map<string, Member> = new Map();
  connections: Array<{ x1:number;y1:number;x2:number;y2:number;color:string }> = [];
  private wifeColor = new Map<string,string>();
  private readonly COLORS = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
  coupleWidth: number | null = null;
  zoom = 1;
  overlayW = 0; overlayH = 0;
  boxScale = 1;
  // Panning state
  spaceKey = false; // true khi giữ phím Space
  private panStart = { x: 0, y: 0 };
  private scrollStart = { left: 0, top: 0 };
  isPanning = false;
  // Cache cha ưa thích theo từng người mẹ để giảm popup chọn cha lặp lại
  private preferredFatherByMother: Record<string, string> = {};
  // Màu nhóm: cha nhiều vợ -> gom theo mẹ; mẹ nhiều chồng -> gom theo cha
  private colorFatherMotherPair = new Map<string,string>(); // key: fatherId|motherId
  private colorMotherFatherPair = new Map<string,string>(); // key: motherId|fatherId

  @ViewChild('treeAreaRef') treeAreaEl?: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef') canvasEl?: ElementRef<HTMLDivElement>;
  @ViewChild('husbandEl') husbandEl?: ElementRef<HTMLElement>;
  @ViewChildren('wifeEl') wifeEls?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('childEl') childEls?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('anchorEl') anchorEls?: QueryList<ElementRef<HTMLElement>>;

  ctx = { visible: false, x: 0, y: 0, node: null as (Member | null) };

  stats: { totalMembers: number; totalMale: number; totalFemale: number; totalAlive: number; totalDeceased: number; totalGenerations: number } = {
    totalMembers: 0, totalMale: 0, totalFemale: 0, totalAlive: 0, totalDeceased: 0, totalGenerations: 0
  };

  ngOnInit(){
    this.familiesApi.list().subscribe(f=>{
      this.families = f;
      if (f.length && !this.selectedFamilyId){
        this.selectedFamilyId = f[0].id || null;
        this.reload();
      }
    })
  }

  onFamilyChange(){ this.reload(); }

  reload(){
    if (!this.selectedFamilyId){ this.root = null; this.spouses = []; this.levels = []; return; }
    this.membersApi.listByFamily(this.selectedFamilyId).subscribe(members=>{
      this.allMembers = members || [];
      const previousRootId = this.root?.id;
      let root: Member | null = null;
      if (previousRootId){ root = members.find(m=> m.id === previousRootId) || null; }
      if (!root){
        const candidates = members.filter(m=> m.gender==='male' && !m.father && !m.mother && !m.spouse);
        if (candidates.length === 1) root = candidates[0];
        else if (candidates.length > 1){
          const childCount = (id: string) => members.filter(c=> c.father===id).length;
          candidates.sort((a,b)=> childCount(b.id!) - childCount(a.id!));
          root = candidates[0];
        }
      }
      this.root = root;
      if (!root){ this.spouses = []; this.levels = []; return; }
      this.unionsApi.list({ family: this.selectedFamilyId! }).subscribe(us=>{
        const map: Record<string, Set<string>> = {};
        const addPair = (a?: string, b?: string) => {
          if (!a || !b || a === b) return;
          map[a] = map[a] || new Set<string>(); map[a].add(b);
          map[b] = map[b] || new Set<string>(); map[b].add(a);
        };
        us.forEach(u=>{
          const ps = (u.partners||[]) as string[];
          ps.forEach(p=> ps.forEach(q=> addPair(p, q)));
        });
        members.forEach(m=> addPair(m.id, m.spouse));
        members.forEach(m=> addPair(m.father, (m as any).mother));
        this.spousesByMember = {};
        Object.keys(map).forEach(mid=>{
          const set = map[mid];
          this.spousesByMember[mid] = members.filter(m=> set.has(m.id!));
        });
        this.spouses = this.spousesByMember[root.id!] || [];
        this.wifeColor.clear();
        const allPartners = Object.values(this.spousesByMember).flat();
        const seen = new Set<string>();
        allPartners.forEach((p, i)=>{ if (!seen.has(p.id!)) { this.wifeColor.set(p.id!, this.COLORS[i % this.COLORS.length]); seen.add(p.id!); } });
        this.colorFatherMotherPair.clear();
        this.colorMotherFatherPair.clear();
        this.scheduleConnections();
      });
      this.memberById = new Map(members.map(m=> [m.id!, m] as const));
      this.levels = this.buildLevels(members, root);
      this.computeStats();
      this.scheduleConnections();
    })
  }

  createRoot(){
    if (!this.selectedFamilyId) return;
    if (this.root){ this.snack.open('Đã có cụ tổ cho họ này', 'Đóng', { duration: 2000 }); return; }
    const name = prompt('Họ tên cụ tổ?');
    if (!name) return;
    this.membersApi.create({ fullName: name, family: this.selectedFamilyId, gender: 'male' }).subscribe({
      next: _=>{ this.snack.open('Tạo cụ tổ thành công', 'Đóng', { duration: 2000 }); this.reload(); },
      error: _=>{ this.snack.open('Không thể tạo cụ tổ', 'Đóng', { duration: 2500 }); },
    })
  }

  openContextMenu(ev: MouseEvent, node: Member){
    ev.preventDefault();
    this.ctx = { visible: true, x: ev.clientX, y: ev.clientY, node };
  }

  editInfo(node: Member | null){
    if (!node) return;
    this.ctx.visible = false;
    const ref = this.dialog.open(TreeEditMemberDialog, { data: { member: node }, width: '720px' });
    ref.afterClosed().subscribe((ok: boolean | undefined) => { if (ok) this.reload(); });
  }

  addWife(node: Member | null){
    if (!node) return;
    this.ctx.visible = false;
    const defaultRole: 'wife'|'husband' = node.gender === 'male' ? 'wife' : 'husband';
    const ref = this.dialog.open(TreeAddPartnerDialog, { data: { defaultRole }, width: '520px' });
    ref.afterClosed().subscribe((res: { fullName: string; gender: 'male'|'female' }|undefined)=>{
      if (!res) return;
      // Để tránh bị chặn bởi luật "chỉ 1 nam không có cha mẹ" trên server,
      // khi thêm CHỒNG cho nữ, tạo member với spouse trỏ sẵn tới người được chọn.
      const createPayload: any = { fullName: res.fullName, family: this.selectedFamilyId!, gender: res.gender };
      if (defaultRole === 'husband') createPayload.spouse = node.id;
      this.membersApi.create(createPayload).subscribe({
        next: (partner)=>{
          this.unionsApi.create({ family: this.selectedFamilyId!, partners: [node.id!, partner.id!] }).subscribe({
            next: _=>{ this.snack.open('Đã thêm hôn phối', 'Đóng', { duration: 1500 }); this.reload(); },
            error: (err)=>{
              const msg = (err?.error?.message) || 'Tạo hôn phối thất bại';
              this.snack.open(msg, 'Đóng', { duration: 2500 });
              this.unionsApi.normalize(node.id!).subscribe({ next: norm => { if (norm.created?.length) this.reload(); } });
            }
          })
        },
        error: _=> this.snack.open('Tạo thành viên hôn phối thất bại', 'Đóng', { duration: 2000 })
      })
    })
  }

  async addChild(node: Member | null){
    if (!node || node.gender !== 'female') { this.snack.open('Chỉ thêm con từ người mẹ', 'Đóng', { duration: 2000 }); return; }
    this.ctx.visible = false;
    const childName = prompt('Họ tên con');
    if (!childName) return;
    let father: Member | null = null;
    try {
      father = await this.resolveFatherForMotherAsync(node);
    } catch {
      this.snack.open('Bạn đã hủy chọn cha', 'Đóng', { duration: 1500 });
      return;
    }
    const payload: any = { fullName: childName, family: this.selectedFamilyId!, mother: node.id };
    if (father) payload.father = father.id;
    await this.ensureUnionIfNeeded(payload.mother, payload.father);
    this.membersApi.create(payload).subscribe({
      next: _=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.reload(); },
      error: e=>{ const msg = e?.error?.message || 'Thêm con thất bại'; this.snack.open(msg, 'Đóng', { duration: 2000 }); },
    });
  }

  async quickAddChild(mother: Member){
    if (mother.gender !== 'female') return;
    const baseName = prompt('Tên con?');
    if (!baseName) return;
    let father: Member | null = null;
    try {
      father = await this.resolveFatherForMotherAsync(mother);
    } catch {
      this.snack.open('Bạn đã hủy chọn cha', 'Đóng', { duration: 1500 });
      return;
    }
    const payload: any = { fullName: baseName, family: this.selectedFamilyId!, mother: mother.id };
    if (father) payload.father = father.id;
    await this.ensureUnionIfNeeded(payload.mother, payload.father);
    this.membersApi.create(payload).subscribe({
      next: ()=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.reload(); },
      error: (e)=> this.snack.open(e?.error?.message || 'Thêm con thất bại', 'Đóng', { duration: 2000 })
    });
  }
  // Click anchor logic: nếu chủ hộp là con gái và spouse là chồng -> dùng chồng làm gốc, coi chồng là "mẹ" để có điểm xuất phát đường
  async onAnchorClick(owner: Member, spouse: Member){
    // Nếu spouse là nữ thì xử lý như trước (thêm con từ mẹ)
    if (spouse.gender === 'female') { await this.quickAddChild(spouse); return; }
    // Nếu owner là nữ và spouse là nam => thêm con từ anchor của chồng nhưng vẫn gán mother = owner
    if (owner.gender === 'female' && spouse.gender === 'male'){
      const baseName = prompt('Tên con?');
      if (!baseName) return;
      // Anchor click trên 1 người chồng cụ thể: dùng trực tiếp người đó làm cha, KHÔNG mở dialog.
      const payload: any = { fullName: baseName, family: this.selectedFamilyId!, mother: owner.id, father: spouse.id };
      this.preferredFatherByMother[owner.id!] = spouse.id!; // ghi nhớ lựa chọn
      await this.ensureUnionIfNeeded(payload.mother, payload.father);
      this.membersApi.create(payload).subscribe({
        next: ()=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.reload(); },
        error: (e)=> this.snack.open(e?.error?.message || 'Thêm con thất bại', 'Đóng', { duration: 2000 })
      });
      return;
    }
    // Trường hợp khác fallback
    await this.quickAddChild(spouse);
  }

  ngAfterViewInit(){
    this.wifeEls?.changes.subscribe(()=> this.scheduleConnections());
    this.childEls?.changes.subscribe(()=> this.scheduleConnections());
    this.anchorEls?.changes.subscribe(()=> this.scheduleConnections());
    // Sau khi view init, lên lịch 2 khung hình để đảm bảo layout ổn định trước khi vẽ
    this.scheduleConnections();
  }

  @HostListener('window:resize')
  onResize(){ this.computeConnections(); }

  private computeStats(){
    const ms = this.allMembers || [];
    const male = ms.filter(m=> (m.gender||'').toLowerCase()==='male').length;
    const female = ms.filter(m=> (m.gender||'').toLowerCase()==='female').length;
    const deceased = ms.filter(m=> !!(m as any).dod).length;
    const alive = ms.length - deceased;
    const generations = this.root ? (1 + (this.levels?.length || 0)) : 0;
    this.stats = {
      totalMembers: ms.length,
      totalMale: male,
      totalFemale: female,
      totalAlive: alive,
      totalDeceased: deceased,
      totalGenerations: generations
    };
  }

  computeConnections(){
    const base = (this.canvasEl?.nativeElement || this.treeAreaEl?.nativeElement);
    if (!base) return;
    const baseRect = base.getBoundingClientRect();
    // Thu thập vị trí anchor thực tế (nút tròn) theo id
    const anchorById = new Map<string, DOMRect>();
    this.anchorEls?.forEach(el => {
      const id = el.nativeElement.getAttribute('data-id') || '';
      if (!id) return;
      anchorById.set(id, el.nativeElement.getBoundingClientRect());
    });
    type Conn = {x1:number;y1:number;x2:number;y2:number;color:string; anchorId?: string};
    const connsRaw: Conn[] = [];
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    this.childEls?.forEach(el=>{
      const motherId = el.nativeElement.getAttribute('data-mother') || '';
      const fatherId = el.nativeElement.getAttribute('data-father') || '';
      if (!motherId) return;
      // Anchor chọn: nếu có fatherId và có anchor của father thì dùng; nếu không, ưu tiên mẹ; cuối cùng fallback male spouse đầu tiên.
      let anchorId: string | undefined = undefined;
      if (fatherId && anchorById.has(fatherId)) anchorId = fatherId;
      else if (anchorById.has(motherId)) anchorId = motherId;
      else {
        const maleSpouse = (this.spousesByMember[motherId]||[]).find(s=> s.gender==='male');
        if (maleSpouse && anchorById.has(maleSpouse.id!)) anchorId = maleSpouse.id!;
      }
      if (!anchorId) return;
      const w = anchorById.get(anchorId);
      if (!w) return;
      const c = el.nativeElement.getBoundingClientRect();
      // Tính theo tọa độ tương đối với canvas để đồng bộ với scale transform
      let x1 = w.left + w.width/2 - baseRect.left;
      let y1 = w.bottom - baseRect.top; // ngay dưới điểm neo
      let x2 = c.left + c.width/2 - baseRect.left;
      let y2 = c.top - baseRect.top;
      minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
      minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      // Color grouping independent of anchor
      const mother = this.memberById.get(motherId);
      const father = fatherId ? this.memberById.get(fatherId) : undefined;
      let color = '#999';
      if (father && father.gender==='male'){
        const fatherWives = (this.spousesByMember[father.id!]||[]).filter(s=> s.gender==='female');
        if (fatherWives.length > 1 && mother){
          const key = father.id! + '|' + mother.id!;
          if (!this.colorFatherMotherPair.has(key)){
            const idx = this.colorFatherMotherPair.size % this.COLORS.length;
            this.colorFatherMotherPair.set(key, this.COLORS[idx]);
          }
          color = this.colorFatherMotherPair.get(key)!;
        } else if (mother) {
          const motherHusbands = (this.spousesByMember[mother.id!]||[]).filter(s=> s.gender==='male');
          if (motherHusbands.length > 1){
            const key2 = mother.id! + '|' + father.id!;
            if (!this.colorMotherFatherPair.has(key2)){
              const idx2 = this.colorMotherFatherPair.size % this.COLORS.length;
              this.colorMotherFatherPair.set(key2, this.COLORS[idx2]);
            }
            color = this.colorMotherFatherPair.get(key2)!;
          } else {
            color = '#1976d2';
          }
        } else {
          color = '#1976d2';
        }
      } else if (mother){
        const motherHusbands = (this.spousesByMember[mother.id!]||[]).filter(s=> s.gender==='male');
        if (motherHusbands.length > 1 && father){
          const key2 = mother.id! + '|' + father.id!;
          if (!this.colorMotherFatherPair.has(key2)){
            const idx2 = this.colorMotherFatherPair.size % this.COLORS.length;
            this.colorMotherFatherPair.set(key2, this.COLORS[idx2]);
          }
          color = this.colorMotherFatherPair.get(key2)!;
        } else {
          color = mother.gender==='female' ? '#d81b60' : '#1976d2';
        }
      }
      connsRaw.push({ x1, y1, x2, y2, color, anchorId });
    });
    // Nếu có tọa độ âm (vượt trái/lên trên viewport), dịch toàn cục về dương để SVG bao hết
    const offX = minX < 0 ? -minX + 10 : 0;
    const offY = minY < 0 ? -minY + 10 : 0;
    const conns: Conn[] = connsRaw.map(c=> ({ ...c, x1: c.x1 + offX, x2: c.x2 + offX, y1: c.y1 + offY, y2: c.y2 + offY }));
    this.connections = conns;
  this.overlayW = Math.max(baseRect.width, (maxX - Math.min(0, minX)) + 40);
  this.overlayH = Math.max(baseRect.height, (maxY - Math.min(0, minY)) + 120);
  }
  // Bảo đảm vẽ sau khi DOM thực sự có các phần tử (QueryList cập nhật). Dùng double rAF tránh cần thao tác phóng to mới xuất hiện.
  private scheduleConnections(){
    requestAnimationFrame(()=> requestAnimationFrame(()=> this.computeConnections()));
  }
  // Removed dynamic width computation to avoid ExpressionChangedAfterItHasBeenChecked
  colorFor(id: string){
    const m = this.memberById.get(id);
    if (!m) return '#999';
    return m.gender==='female' ? '#d81b60' : '#1976d2';
  }
  private buildLevels(members: Member[], root: Member): Member[][]{
    const byId = new Map(members.map(m=>[m.id!, m] as const));
    const levels: Member[][] = [];
    const visited = new Set<string>();
    const getFemaleSpouses = (m: Member) => (this.spousesByMember[m.id!]||[]).filter(s=>s.gender==='female');
    const sortByDobDesc = (arr: Member[]) => arr.sort((a,b)=>{
      const da = a.dob ? new Date(a.dob as any).getTime() : 0;
      const db = b.dob ? new Date(b.dob as any).getTime() : 0;
      return db - da; // lớn hơn (mới hơn) ở bên trái
    });
    // Gen2: children of root (by father OR mother is a wife of root)
    const rootWives = getFemaleSpouses(root).map(w=>w.id!);
    let current: Member[] = members.filter(m=> m.father===root.id || (m.mother && rootWives.includes(m.mother)));
    // Sắp xếp các con của một bố (cụ tổ) theo DOB giảm dần
    sortByDobDesc(current);
    current.forEach(c=> visited.add(c.id!));
    if (current.length) levels.push(current);
    // Next gens: derive by mothers that are either the female in the couple (if current member is female) or any female spouse of current member
    while (current.length){
      const nextOrdered: Member[] = [];
      // Duyệt theo thứ tự bố (cặp) ở level hiện tại để giữ cụm con của từng bố liền nhau
      for (const p of current){
        const mothers: string[] = [];
        if (p.gender==='female' && p.id) mothers.push(p.id);
        for (const w of getFemaleSpouses(p)) mothers.push(w.id!);
        for (const mid of mothers){
          const kids = members.filter(m=> m.mother===mid && !visited.has(m.id!));
          if (kids.length){
            sortByDobDesc(kids); // sắp xếp con của cùng một bố theo DOB giảm dần
            kids.forEach(k=>{ visited.add(k.id!); nextOrdered.push(k); });
          }
        }
      }
      const next = nextOrdered;
      next.forEach(n=> visited.add(n.id!));
      if (!next.length) break;
      levels.push(next);
      current = next;
    }
    return levels;
  }
  private async resolveFatherForMotherAsync(mother: Member): Promise<Member | null> {
    const partners = this.spousesByMember[mother.id!] || [];
    const males = partners.filter(p => p.gender === 'male');
    if (males.length === 1) return males[0];
    if (males.length > 1){
      // Nếu đã có lựa chọn cha ưa thích cho mẹ này và vẫn còn hợp lệ thì dùng luôn
      const cachedId = this.preferredFatherByMother[mother.id!];
      const cached = cachedId ? males.find(m => m.id === cachedId) : undefined;
      if (cached) return cached;
      // Mở dialog chọn cha (bắt buộc). Nếu hủy: ném lỗi để caller dừng lại.
      const ref = this.dialog.open(TreeSelectFatherDialog, { data: { mother, fathers: males }, width: '420px' });
      const picked = await firstValueFrom(ref.afterClosed());
      if (picked) { this.preferredFatherByMother[mother.id!] = picked.id!; return picked; }
      throw new Error('cancelled');
    }
    // fallback: nếu mẹ là vợ của root nam thì dùng root làm cha
    if (this.root && this.root.gender === 'male'){
      const rootPartners = this.spousesByMember[this.root.id!] || [];
      if (rootPartners.find(p=> p.id === mother.id)) return this.root;
    }
    return null;
  }
  // Đảm bảo tồn tại union nếu cả cha và mẹ đều có trước khi tạo con
  private async ensureUnionIfNeeded(motherId?: string, fatherId?: string): Promise<void>{
    if (!motherId || !fatherId) return; // chỉ cần khi đủ cả hai
    try {
      const unions = await firstValueFrom(this.unionsApi.list({ family: this.selectedFamilyId!, partner: motherId }));
      const exists = unions?.some(u => (u.partners||[]).includes(motherId) && (u.partners||[]).includes(fatherId));
      if (exists) return;
      await firstValueFrom(this.unionsApi.create({ family: this.selectedFamilyId!, partners: [motherId, fatherId] }));
    } catch (e){ /* ignore, sẽ fail ở bước create con nếu có vấn đề khác */ }
  }
  deleteNode(node: Member | null){
    if (!node) return;
    this.ctx.visible = false;
    if (this.root && node.id === this.root.id){
      this.snack.open('Không thể xóa cụ tổ', 'Đóng', { duration: 2000 });
      return;
    }
    const ok = confirm(`Xóa "${node.fullName}"? Hành động này không thể hoàn tác.`);
    if (!ok) return;
    this.membersApi.delete(node.id!).subscribe({
      next: ()=>{ this.snack.open('Đã xóa', 'Đóng', { duration: 1500 }); this.reload(); },
      error: (err: any)=>{
        const msg = err?.error?.message || 'Xóa thất bại';
        this.snack.open(msg, 'Đóng', { duration: 2500 });
      }
    })
  }
  onWheel(ev: WheelEvent){
    if (ev.ctrlKey){
      ev.preventDefault();
      const delta = -ev.deltaY; // wheel up => zoom in
      const factor = delta > 0 ? 1.05 : 0.95;
      let next = this.zoom * factor;
      if (next < 0.3) next = 0.3; if (next > 2.5) next = 2.5;
      this.zoom = parseFloat(next.toFixed(2));
      // Recompute to reposition lines based on new scale if needed (SVG scales with container)
      setTimeout(()=> this.computeConnections());
    }
  }
  onScaleChange(){
    setTimeout(()=> this.computeConnections(), 50);
  }
  genderColor(g?: string){ return (g==='male') ? '#1976d2' : (g==='female' ? '#d81b60' : '#888'); }
  // Panning handlers
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(ev: KeyboardEvent){
    if (ev.code === 'Space' && !this.spaceKey){ this.spaceKey = true; ev.preventDefault(); }
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(ev: KeyboardEvent){
    if (ev.code === 'Space'){ this.spaceKey = false; this.isPanning = false; }
  }
  onMouseDown(ev: MouseEvent){
    if (!this.spaceKey || !this.treeAreaEl) return;
    this.isPanning = true;
    this.panStart = { x: ev.clientX, y: ev.clientY };
    this.scrollStart = { left: this.treeAreaEl.nativeElement.scrollLeft, top: this.treeAreaEl.nativeElement.scrollTop };
    ev.preventDefault();
  }
  onMouseMove(ev: MouseEvent){
    if (!this.isPanning || !this.treeAreaEl) return;
    const dx = ev.clientX - this.panStart.x;
    const dy = ev.clientY - this.panStart.y;
    this.treeAreaEl.nativeElement.scrollLeft = this.scrollStart.left - dx;
    this.treeAreaEl.nativeElement.scrollTop = this.scrollStart.top - dy;
  }
  onMouseUp(){
    this.isPanning = false;
  }
  centerRoot(){
    if (!this.root || !this.husbandEl || !this.treeAreaEl) return;
    const area = this.treeAreaEl.nativeElement;
    const areaRect = area.getBoundingClientRect();
    const coupleBox = this.husbandEl.nativeElement.parentElement as HTMLElement;
    if (!coupleBox) return;
    const boxRect = coupleBox.getBoundingClientRect();
    const currentLeft = area.scrollLeft;
    const deltaLeft = (boxRect.left - areaRect.left) + boxRect.width/2 - areaRect.width/2;
    area.scrollLeft = currentLeft + deltaLeft;
    // Center vertically (optional) if tree taller than viewport
    const currentTop = area.scrollTop;
    const deltaTop = (boxRect.top - areaRect.top) + boxRect.height/2 - areaRect.height/2;
    area.scrollTop = currentTop + deltaTop;
    setTimeout(()=> this.computeConnections(), 50);
  }
  // Click handler on entire spouse card to make add-child easier, especially for male spouses
  async onSpousePersonClick(owner: Member, spouse: Member, ev: MouseEvent){
    // ignore if right-click (context menu)
    if (ev.button === 2) return;
    // behave like anchor click: add child under mother
    await this.onAnchorClick(owner, spouse);
  }
}
