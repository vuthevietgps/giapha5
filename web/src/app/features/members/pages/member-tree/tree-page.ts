import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { TreeEditMemberDialog } from './tree-edit-member.dialog';
import { TreeAddPartnerDialog } from './tree-add-partner.dialog';
import { TreeSelectFatherDialog } from './tree-select-father.dialog';
import { TreeBackgroundsDialog } from './tree-backgrounds.dialog';
import { BackgroundService } from '../../../backgrounds/services/background';
import { FamilyService } from '../../../families/services/family';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';
import { firstValueFrom } from 'rxjs';
import { computeStatsFromMembers } from './tree-utils';
import { buildConnections } from './tree-connections';
import { buildLevels } from './tree-levels';
import { resolveFatherForMotherAsync as resolveFatherForMotherAsyncUtil, ensureUnionIfNeeded as ensureUnionIfNeededUtil } from './tree-relations';
import { collectSubtree } from './tree-focus';

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
    MatSlideToggleModule,
    FormsModule,
    MatInputModule,
    RouterModule,
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
  .center-wrap{min-width:100%;min-height:100%;display:grid;justify-content:center;align-content:flex-start}
  .tree-content{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:100%}
  .connections{position:absolute;left:0;top:0;pointer-events:none;z-index:999}
    .node{border:1px solid #ccc;border-radius:8px;padding:8px 12px;background:transparent;min-width:160px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .couple-box{display:inline-grid;grid-template-rows:auto auto;row-gap:6px;justify-items:center;border:2px solid #1976d2;border-radius:10px;padding:10px 12px 12px;background:transparent;position:relative;z-index:2;width:fit-content;max-width:none;box-shadow:0 2px 4px rgba(0,0,0,.06);overflow:hidden;transition:border-color .15s}
  /* Nền trong suốt; giữ vạch màu giới tính ở cạnh trái */
  .person{margin:0 auto 2px;text-align:center;padding:4px 10px 4px 12px;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:auto;position:relative;background:transparent}
  .person:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:6px 0 0 6px;background:#1976d2}
  .person.female:before{background:#d81b60}
  .person.male{background:transparent}
  .person.female{background:transparent}
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
  private readonly backgroundsApi = inject(BackgroundService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  families: Family[] = [];
  selectedFamilyId: string | null = null;

  root: Member | null = null;
  originalRoot: Member | null = null;
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
  // Connection style: 'diagonal' (style 1) or 'hub' (style 2)
  connectionStyle: 'diagonal' | 'hub' = 'diagonal';
  setConnectionStyle(style: 'diagonal' | 'hub'){
    if (this.connectionStyle !== style){
      this.connectionStyle = style;
      this.scheduleConnections();
    }
  }
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
  private loadToken = 0; // dùng để vô hiệu hóa response cũ khi đổi dòng họ nhanh
  // Focus subtree state
  focusRootId: string | null = null;
  includeSpousesInFocus = true;
  // Background management
  selectedBackgroundId: string | null = null;
  backgroundUrl: string | null = null;
  backgroundFit: 'contain' | 'cover' = 'contain';
  // Top padding (px) to lower the tree to match background artwork
  // Increased default from 120 -> 160 to align better with decorative header in backgrounds.
  topOffset = 160;

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
    // Đọc query params focus & spouses
    this.route.queryParamMap.subscribe(qp => {
      const focus = qp.get('focus');
      const spouses = qp.get('spouses');
      this.focusRootId = focus || null;
      this.includeSpousesInFocus = spouses !== '0';
      // Khi thay đổi params mà đã có dữ liệu thì chỉ reload filter
      if (this.allMembers.length) this.reload();
    });
    this.familiesApi.list().subscribe(f=>{
      this.families = f;
      if (f.length && !this.selectedFamilyId){
        this.selectedFamilyId = f[0].id || null;
        this.loadBackgroundChoice();
        this.reload();
      }
    })
  }

  onFamilyChange(){ this.reload(); }

  reload(){
    if (!this.selectedFamilyId){
      this.root = null; this.spouses = []; this.levels = []; this.connections = []; return;
    }
    this.loadBackgroundChoice();
    const token = ++this.loadToken;
    // Reset trạng thái màu & hôn phối để tránh “rò” giữa các họ
    this.colorFatherMotherPair.clear();
    this.colorMotherFatherPair.clear();
    this.spousesByMember = {};
    this.spouses = [];
    this.levels = [];
    this.connections = [];
    this.membersApi.listByFamily(this.selectedFamilyId).subscribe(members=>{
      if (token !== this.loadToken) return; // bị thay thế bởi lần reload khác
      this.allMembers = members || [];
      // Chọn root mới (không cố giữ root cũ khác họ)
      let root: Member | null = null;
      const candidates = members.filter(m=> m.gender==='male' && !m.father && !m.mother && !m.spouse);
      if (candidates.length === 1) root = candidates[0];
      else if (candidates.length > 1){
        const childCount = (id: string) => members.filter(c=> c.father===id).length;
        candidates.sort((a,b)=> childCount(b.id!) - childCount(a.id!));
        root = candidates[0];
      }
      this.root = root;
      if (!root){ this.computeStats(); return; }
      // Sau khi có danh sách unions mới xây spouses & levels để tránh chạy buildLevels hai lần
      this.unionsApi.list({ family: this.selectedFamilyId! }).subscribe(us=>{
        if (token !== this.loadToken) return;
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
        // Tạo map màu vợ/chồng toàn cục trước (sẽ lọc sau nếu focus)
        this.wifeColor.clear();
        const allPartnersGlobal = Object.values(this.spousesByMember).flat();
        const seenGlobal = new Set<string>();
        allPartnersGlobal.forEach((p, i)=>{ if (!seenGlobal.has(p.id!)) { this.wifeColor.set(p.id!, this.COLORS[i % this.COLORS.length]); seenGlobal.add(p.id!); } });
        this.memberById = new Map(members.map(m=> [m.id!, m] as const));

        let renderMembers = members;
        let renderRoot = root;
        let spousesMap = this.spousesByMember;
        if (this.focusRootId){
          const { visibleIds, root: focusRoot } = collectSubtree(members, this.focusRootId, this.spousesByMember, { includeSpouses: this.includeSpousesInFocus });
          renderMembers = members.filter(m => visibleIds.has(m.id!));
          renderRoot = focusRoot || root;
          // Lọc lại spousesByMember chỉ giữ các partners nằm trong visibleIds để template không hiển thị anchor dư
          const filtered: Record<string, Member[]> = {};
          Object.keys(this.spousesByMember).forEach(mid => {
            if (!visibleIds.has(mid)) return;
            filtered[mid] = (this.spousesByMember[mid]||[]).filter(p => visibleIds.has(p.id!));
          });
            spousesMap = filtered;
        }
        this.spousesByMember = spousesMap;
        this.root = renderRoot;
        // Cập nhật danh sách spouses hiển thị ở hộp gốc (lọc theo visible set)
        this.spouses = (spousesMap[renderRoot!.id!] || []);
        this.levels = buildLevels(renderMembers, renderRoot!, spousesMap || {});
        this.allMembers = renderMembers; // stats theo nhánh nếu đang focus
        this.computeStats();
        this.scheduleConnections();
        // Tự căn giữa gốc khi đổi dòng họ để trải nghiệm nhất quán trên mọi họ
        setTimeout(()=>{
          if (this.treeAreaEl){
            // reset scroll rồi mới căn giữa để tránh lệch
            this.treeAreaEl.nativeElement.scrollLeft = 0;
            this.treeAreaEl.nativeElement.scrollTop = 0;
          }
          this.centerRoot();
        }, 60);
      });
    });
  }

  private loadBackgroundChoice(){
    if (!this.selectedFamilyId) { this.selectedBackgroundId = null; this.backgroundUrl = null; this.topOffset = 160; return; }
    const key = `bg:${this.selectedFamilyId}`;
    const offKey = `bgOff:${this.selectedFamilyId}`;
    const fitKey = `bgFit:${this.selectedFamilyId}`;
    const id = localStorage.getItem(key);
    const offRaw = localStorage.getItem(offKey);
    const fit = (localStorage.getItem(fitKey) as ('contain'|'cover'|null)) || 'contain';
    this.selectedBackgroundId = id;
    this.backgroundUrl = id ? this.backgroundsApi.fileUrl(id) : null;
    this.topOffset = offRaw ? Math.max(0, parseInt(offRaw, 10) || 0) : 160;
    this.backgroundFit = fit === 'cover' ? 'cover' : 'contain';
  }
  openBackgrounds(){
    const ref = this.dialog.open(TreeBackgroundsDialog, { data: { selectedId: this.selectedBackgroundId }, width: '820px' });
    ref.afterClosed().subscribe((id: string | null | undefined) => {
      if (id === undefined) return; // closed without changes
      this.selectedBackgroundId = id || null;
      const key = this.selectedFamilyId ? `bg:${this.selectedFamilyId}` : null;
      const offKey = this.selectedFamilyId ? `bgOff:${this.selectedFamilyId}` : null;
      if (key){
        if (id) localStorage.setItem(key, id); else localStorage.removeItem(key);
      }
      this.backgroundUrl = id ? this.backgroundsApi.fileUrl(id) : null;
      // Persist current offset alongside background selection
      if (offKey) localStorage.setItem(offKey, String(this.topOffset));
    });
  }

  onTopOffsetChange(){
    // Persist per family to keep alignment with chosen background
    if (!this.selectedFamilyId) return;
    const offKey = `bgOff:${this.selectedFamilyId}`;
    localStorage.setItem(offKey, String(this.topOffset));
  }

  onBackgroundFitChange(fit: 'contain'|'cover'){
    this.backgroundFit = fit;
    if (!this.selectedFamilyId) return;
    const fitKey = `bgFit:${this.selectedFamilyId}`;
    localStorage.setItem(fitKey, fit);
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

  // Focus subtree API
  enterFocus(node: Member){
    if (!node?.id) return;
    this.focusRootId = node.id;
    this.updateFocusParams();
    this.reload();
  }
  exitFocus(){
    this.focusRootId = null;
    this.updateFocusParams();
    this.reload();
  }
  toggleIncludeSpouses(val: boolean){
    this.includeSpousesInFocus = val;
    this.updateFocusParams();
    if (this.focusRootId){ this.reload(); }
  }
  private updateFocusParams(){
    const params: any = {};
    if (this.focusRootId) params.focus = this.focusRootId; else params.focus = null;
    params.spouses = this.includeSpousesInFocus ? '1' : '0';
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
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
    this.stats = computeStatsFromMembers(this.allMembers || [], this.root, this.levels || []);
  }

  computeConnections(){
    const base = (this.canvasEl?.nativeElement || this.treeAreaEl?.nativeElement);
    if (!base) return;
    const baseRect = base.getBoundingClientRect();
    const anchorRects = new Map<string, DOMRect>();
    this.anchorEls?.forEach(el => {
      const id = el.nativeElement.getAttribute('data-id') || '';
      if (!id) return;
      anchorRects.set(id, el.nativeElement.getBoundingClientRect());
    });
    const childRects: Array<{ elRect: DOMRect; motherId?: string; fatherId?: string }> = [];
    this.childEls?.forEach(el => {
      const motherId = el.nativeElement.getAttribute('data-mother') || undefined;
      const fatherId = el.nativeElement.getAttribute('data-father') || undefined;
      childRects.push({ elRect: el.nativeElement.getBoundingClientRect(), motherId, fatherId });
    });
    const result = buildConnections({
      baseRect,
      anchorRects,
      childRects,
      memberById: this.memberById,
      spousesByMember: this.spousesByMember,
      style: this.connectionStyle,
      colors: this.COLORS,
      colorFatherMotherPair: this.colorFatherMotherPair,
      colorMotherFatherPair: this.colorMotherFatherPair,
    });
    this.connections = result.connections;
    this.overlayW = result.overlayW;
    this.overlayH = result.overlayH;
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
  
  // buildLevels moved to tree-levels.ts
  private async resolveFatherForMotherAsync(mother: Member): Promise<Member | null> {
    return await resolveFatherForMotherAsyncUtil(mother, {
      spousesByMember: this.spousesByMember,
      root: this.root,
      preferredFatherByMother: this.preferredFatherByMother,
      openFatherDialog: async (mom, fathers) => {
        const ref = this.dialog.open(TreeSelectFatherDialog, { data: { mother: mom, fathers }, width: '420px' });
        return await firstValueFrom(ref.afterClosed());
      }
    });
  }

  private async ensureUnionIfNeeded(motherId?: string, fatherId?: string): Promise<void>{
    return ensureUnionIfNeededUtil(motherId, fatherId, {
      listUnions: async (partnerId: string) => await firstValueFrom(this.unionsApi.list({ family: this.selectedFamilyId!, partner: partnerId })),
      createUnion: async (mid: string, fid: string) => { await firstValueFrom(this.unionsApi.create({ family: this.selectedFamilyId!, partners: [mid, fid] })); }
    })
  }
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(ev: KeyboardEvent){
    const target = ev.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || (!!(target as any)?.isContentEditable);
    const inDialog = !!(target?.closest('.cdk-overlay-pane') || target?.closest('mat-dialog-container'));
    if (isTyping || inDialog) return; // đừng can thiệp khi đang gõ trong input/dialog
    if (ev.code === 'Space'){ this.spaceKey = false; this.isPanning = false; }
  }
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(ev: KeyboardEvent){
    const target = ev.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || (!!(target as any)?.isContentEditable);
    const inDialog = !!(target?.closest('.cdk-overlay-pane') || target?.closest('mat-dialog-container'));
    if (isTyping || inDialog) return; // cho phép gõ phím cách trong form/dialog
    if (ev.code === 'Space'){ this.spaceKey = true; ev.preventDefault(); }
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
  onWheel(ev: WheelEvent){
    // Ctrl + wheel to zoom, otherwise let default scroll happen
    if (ev.ctrlKey){
      ev.preventDefault();
      const delta = -Math.sign(ev.deltaY) * 0.1; // wheel up -> zoom in
      const newZoom = Math.min(2, Math.max(0.5, this.zoom + delta));
      if (newZoom !== this.zoom){
        this.zoom = newZoom;
        this.scheduleConnections();
      }
    }
  }
  onScaleChange(){
    // Clamp and recompute connections since box sizes changed
    if (this.boxScale < 0.6) this.boxScale = 0.6;
    if (this.boxScale > 2.5) this.boxScale = 2.5;
    this.scheduleConnections();
  }
  genderColor(gender?: string){
    return (gender||'').toLowerCase() === 'female' ? '#d81b60' : '#1976d2';
  }
  deleteNode(node: Member | null){
    if (!node) return;
    this.ctx.visible = false;
    const ok = confirm(`Xóa ${node.fullName}? Hành động không thể hoàn tác.`);
    if (!ok) return;
    this.membersApi.delete(node.id!).subscribe({
      next: ()=>{ this.snack.open('Đã xóa', 'Đóng', { duration: 1500 }); this.reload(); },
      error: (e)=> this.snack.open(e?.error?.message || 'Xóa thất bại', 'Đóng', { duration: 2000 })
    });
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
