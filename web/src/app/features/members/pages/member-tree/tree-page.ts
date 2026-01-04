import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, HostListener, effect, ChangeDetectionStrategy } from '@angular/core';
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
import { CoupletDialog, CoupletDialogResult } from '../../../printing/couplet.dialog';
import { TreeEditMemberDialog } from './tree-edit-member.dialog';
import { TreeAddPartnerDialog } from './tree-add-partner.dialog';
import { TreeSelectFatherDialog } from './tree-select-father.dialog';
import { TreeBackgroundsDialog } from './tree-backgrounds.dialog';
import { TreeDecorDialog, type DecorDialogResult } from './tree-decor.dialog';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';
import { firstValueFrom } from 'rxjs';
import { buildConnections } from './tree-connections';
import { buildLevels } from './tree-levels';
import { resolveFatherForMotherAsync as resolveFatherForMotherAsyncUtil, ensureUnionIfNeeded as ensureUnionIfNeededUtil } from './tree-relations';
import { collectSubtree } from './tree-focus';
import { TreeToolbarComponent } from './components/tree-toolbar.component';
import { TreeStore } from './tree.store';
import { TreeFacade } from './tree.facade';
import type { TextItem } from './services/tree-text.service';
import { TreeTextService, type CoupletData } from './services/tree-text.service';
import { TreeTextDialog, type TextDialogResult } from './tree-text.dialog';
import type { LayerPosition, MovableLayer } from './tree-layout';
import { cloneDefaultPositions, cloneDefaultScales, loadPositions, persistPositions, loadScales, persistScales } from './tree-layout';
import { TreeExportService, type ExportSize, type ExportOrientation } from './services/tree-export.service';
import { TreeDecorationService, type DecorSlot, type DecorAsset } from './services/tree-decoration.service';
import { TreeFontService, type FontItem } from './services/tree-font.service';

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
    TreeToolbarComponent,
  ],
  templateUrl: './tree-page.html',
  styles: [`
    .tree-shell{display:flex;min-height:100vh;}
    .left{flex:1;display:flex;flex-direction:column;min-height:100vh;}
    .right{width:280px;border-left:1px solid #e0e0e0}
  .header{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #e0e0e0;flex-wrap:nowrap;overflow-x:auto;white-space:nowrap}
  .header>*{flex:0 0 auto}
  .header button{white-space:nowrap;min-height:36px;padding:0 10px}
  .header::-webkit-scrollbar{height:8px}
  .header::-webkit-scrollbar-thumb{background:#c7c7c7;border-radius:999px}
  .header::-webkit-scrollbar-track{background:transparent}
    .spacer{flex:1}
  .tree-area{position:relative;width:100%;height:calc(100vh - 64px);max-width:none;aspect-ratio:auto;overflow:auto;padding:8px;border:1px solid #e0e0e0;border-radius:12px;box-sizing:border-box;background:#fafafa}
  .tree-area.space-pan{cursor:grab}
  .tree-area.space-pan.panning{cursor:grabbing}
  .center-wrap{min-width:100%;min-height:100%;display:grid;justify-content:center;align-content:flex-start;position:relative;z-index:1}
  .tree-content{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:100%}
  .connections{position:absolute;left:0;top:0;pointer-events:none;z-index:999}
    .node{border:1px solid #ccc;border-radius:8px;padding:8px 12px;background:transparent;min-width:160px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .couple-box{display:inline-grid;grid-template-rows:auto auto;row-gap:6px;justify-items:center;border:2px solid #e0e0e0;border-radius:12px;padding:10px 12px 12px;background:transparent;position:relative;z-index:2;width:fit-content;max-width:none;box-shadow:0 2px 4px rgba(0,0,0,.06);overflow:hidden;transition:border-color .15s}
  /* Nền trong suốt; giữ vạch màu giới tính ở cạnh trái */
  .person{margin:0 auto 2px;text-align:center;padding:6px 12px 6px 16px;border-radius:10px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:auto;position:relative;background:transparent}
  .person::before{content:"";position:absolute;left:4px;top:6px;width:6px;height:calc(100% - 12px);border-radius:6px;background:#1976d2;box-shadow:0 0 0 1px rgba(0,0,0,0.06)}
  .person.male::before{background:#1976d2}
  .person.female::before{background:#d81b60}
  .person.male .name{color:#000}
  .person.female .name{color:#000}
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
  .draggable{cursor:grab;pointer-events:auto}
  .draggable.dragging{cursor:grabbing}
  .resizable{resize:both;overflow:auto;box-sizing:border-box}
  /* Tắt khung/ô resize cho câu đối để chỉ còn chữ */
  .couplet-text.resizable{resize:none;overflow:visible;border:none;outline:none;box-shadow:none;background:transparent}
  /* Canvas overflow visible để không cắt decor/text khi drag ra ngoài */
  .canvas{min-width:var(--paper-width);min-height:var(--paper-height);overflow:visible!important;position:relative;}
  .bg-rotator{max-width:100%;max-height:100%;}
  .decor.scroll{position:absolute;top:0;left:50%;transform:translate(-50%,0);max-width:5200px;width:32%;height:auto;z-index:5;pointer-events:auto}
  .decor.dragon-left{position:absolute;top:0;left:50%;transform:translate(-50%,0);max-width:4200px;width:26%;height:auto;z-index:5;pointer-events:auto}
  .decor.dragon-right{position:absolute;top:0;left:50%;transform:translate(-50%,0);max-width:4200px;width:26%;height:auto;z-index:5;pointer-events:auto}
  .couplet-text{position:absolute;top:0;left:50%;transform:translate(-50%,0);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px 14px;width:fit-content;min-width:140px;max-width:420px;max-height:3600px;text-align:center;line-height:1.05;letter-spacing:0;white-space:nowrap;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.2);user-select:none;z-index:4;pointer-events:auto;background:transparent;border-radius:10px;box-shadow:none}
  .couplet-text.left{ }
  .couplet-text.right{ }
  .couplet-word{display:block}
  .text-item{position:absolute;cursor:move;user-select:none;font-weight:700;z-index:1200;white-space:pre-wrap;}
  .curved-text{display:flex;gap:2px;align-items:flex-end;justify-content:center;line-height:1}
  .curved-char{display:inline-block;transform-origin:bottom center;}
  .bg-rotator{position:absolute;inset:0;background-repeat:no-repeat;background-position:center top;z-index:0;pointer-events:none;transition:transform .2s ease}
  .bg-rotator.rotated{transform:rotate(90deg) scale(2);transform-origin:center center}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreePage implements OnInit, AfterViewInit {
  private readonly membersApi = inject(MemberService);
  private readonly unionsApi = inject(UnionService);
  private readonly treeStore = inject(TreeStore);
  private readonly treeFacade = inject(TreeFacade);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exportService = inject(TreeExportService);
  private readonly decorService = inject(TreeDecorationService);
  private readonly textService = inject(TreeTextService);
  private readonly fontService = inject(TreeFontService);

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
  childColors: Record<string, string> = {}; // Store child box border colors from connections
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
  panAlwaysEnabled = true;
  // Cache cha ưa thích theo từng người mẹ để giảm popup chọn cha lặp lại
  private preferredFatherByMother: Record<string, string> = {};
  // Màu nhóm: cha nhiều vợ -> gom theo mẹ; mẹ nhiều chồng -> gom theo cha
  private colorFatherMotherPair = new Map<string,string>(); // key: fatherId|motherId
  private colorMotherFatherPair = new Map<string,string>(); // key: motherId|fatherId
  private loadToken = 0; // dùng để vô hiệu hóa response cũ khi đổi dòng họ nhanh
  // Xoay nền đã bỏ
  rotateBackground = false;
  // Focus subtree state
  focusRootId: string | null = null;
  includeSpousesInFocus = true;
  // Background management
  selectedBackgroundId: string | null = null;
  backgroundUrl: string | null = null;
  backgroundFit: 'cover' = 'cover';
  // Bottom padding (px) to create space below tree for better layout
  // Allows decorations to move upward without being clipped
  topOffset = 160;

  // Decor & couplet (for in-place preview like print page) - now managed by services
  // Expose service signals for template binding
  decorAssets = this.decorService.decorAssets;
  decorInstances = this.decorService.decorInstances;
  textItems = this.textService.textItems;
  couplet = this.textService.couplet;
  customFonts = this.fontService.customFonts;

  positions: Record<MovableLayer, LayerPosition> = cloneDefaultPositions();
  private dragState: { layer: MovableLayer; startX: number; startY: number; origin: LayerPosition; size: { w: number; h: number } } | null = null;
  scales: Record<MovableLayer, number> = cloneDefaultScales();

  // Kích thước giấy mặc định 2:1 (px)
  paperWidth = 2000;
  paperHeight = 1000;

  private textDrag: { id: string; startX: number; startY: number; origin: { x: number; y: number } } | null = null;

  goHome(){
    this.router.navigateByUrl('/');
  }

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

  constructor() {
    // Register reactive bridges in DI context so effect() is allowed
    this.treeStore.init();

    effect(() => {
      this.families = this.treeStore.families();
      this.selectedBackgroundId = this.treeStore.selectedBackgroundId();
      this.backgroundUrl = this.treeStore.backgroundUrl();
      this.topOffset = this.treeStore.topOffset();
    });

    effect(() => {
      const familyId = this.treeStore.selectedFamilyId();
      console.log('🔄 Family changed effect triggered:', familyId);
      this.selectedFamilyId = familyId;
      if (!familyId) {
        this.textService.clearTextItems();
        this.positions = cloneDefaultPositions();
        this.scales = cloneDefaultScales();
        this.decorService.loadDecor(null);
        this.fontService.loadFonts(null);
        this.treeFacade.setFamily(null);
        return;
      }

      console.log('📝 Loading data for family:', familyId);
      this.textService.loadTextItems(familyId);
      this.textService.loadCouplet(familyId);
      this.positions = loadPositions(this.positionsKey());
      this.scales = loadScales(this.scalesKey());
      this.decorService.loadDecor(familyId);
      this.fontService.loadFonts(familyId);
      this.treeFacade.setFamily(familyId);
      console.log('✅ Data loaded - decorInstances:', this.decorInstances().length, 'textItems:', this.textItems().length);
    });

    effect(() => {
      this.root = this.treeFacade.root();
      this.spouses = this.treeFacade.spouses();
      this.levels = this.treeFacade.levels();
      this.allMembers = this.treeFacade.allMembers();
      this.spousesByMember = this.treeFacade.spousesByMember();
      this.memberById = this.treeFacade.memberById();
      this.wifeColor = this.treeFacade.wifeColor();
      this.stats = this.treeFacade.stats();
      this.focusRootId = this.treeFacade.focusRootId();
      this.includeSpousesInFocus = this.treeFacade.includeSpousesInFocus();
      this.scheduleConnections();
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(qp => {
      const focus = qp.get('focus');
      const spouses = qp.get('spouses');
      this.focusRootId = focus || null;
      this.includeSpousesInFocus = spouses !== '0';
      this.treeFacade.setFocus(this.focusRootId, this.includeSpousesInFocus);
    });
  }

  loadPositions(): void {
    const key = this.positionsKey();
    this.positions = loadPositions(key);
  }
  persistPositions(): void {
    const key = this.positionsKey();
    if (!key) return;
    persistPositions(key, this.positions);
  }
  resetPositions(): void {
    this.positions = cloneDefaultPositions();
    this.persistPositions();
  }
  loadScales(): void {
    const key = this.scalesKey();
    this.scales = loadScales(key);
  }
  persistScales(): void {
    const key = this.scalesKey();
    if (!key) return;
    persistScales(key, this.scales);
  }
  resetScales(): void {
    this.scales = cloneDefaultScales();
    this.persistScales();
  }

  // toggleRotate removed with UI

  onFamilyChange(){
    this.treeStore.setFamily(this.selectedFamilyId);
  }

  reload(){
    // Recompute connections and recentre gốc khi dữ liệu đổi
    this.scheduleConnections();
    setTimeout(()=>{
      if (this.treeAreaEl){
        this.treeAreaEl.nativeElement.scrollLeft = 0;
        this.treeAreaEl.nativeElement.scrollTop = 0;
      }
      this.centerRoot();
    }, 60);
  }

  onTopOffsetChange(){
    this.treeStore.setTopOffset(this.topOffset);
  }

  openBackgrounds(){
    const ref = this.dialog.open(TreeBackgroundsDialog, { data: { selectedId: this.selectedBackgroundId }, width: '820px' });
    ref.afterClosed().subscribe((id: string | null | undefined) => {
      if (id === undefined) return; // closed without changes
      this.treeStore.setBackgroundSelection(id || null);
    });
  }

  openDecorDialog(){
    const ref = this.dialog.open(TreeDecorDialog, { data: { assets: this.decorAssets() }, width: '860px' });
    ref.afterClosed().subscribe((res: DecorDialogResult | undefined) => {
      if (!res) return;
      this.decorService.decorAssets.set(res.assets);
      this.decorService.persistDecor(this.selectedFamilyId);
      
      // If user clicked "Add to canvas" button
      if (res.addInstance) {
        this.decorService.addInstance(
          res.addInstance.assetId,
          res.addInstance.slot,
          this.paperWidth,
          this.paperHeight
        );
        this.decorService.persistDecor(this.selectedFamilyId);
        this.snack.open('Đã thêm trang trí vào canvas', 'Đóng', { duration: 1500 });
      }
    });
  }

  addText(){
    this.openTextDialog();
  }

  addScrollText(){
    this.openTextDialog(undefined, true);
  }

  createRoot(){
    if (!this.selectedFamilyId) return;
    if (this.root){ this.snack.open('Đã có cụ tổ cho họ này', 'Đóng', { duration: 2000 }); return; }
    const name = prompt('Họ tên cụ tổ?');
    if (!name) return;
    this.membersApi.create({ fullName: name, family: this.selectedFamilyId, gender: 'male' }).subscribe({
      next: _=>{ this.snack.open('Tạo cụ tổ thành công', 'Đóng', { duration: 2000 }); this.treeFacade.reload(); },
      error: _=>{ this.snack.open('Không thể tạo cụ tổ', 'Đóng', { duration: 2500 }); },
    });
  }

  openContextMenu(ev: MouseEvent, node: Member){
    ev.preventDefault();
    this.ctx = { visible: true, x: ev.clientX, y: ev.clientY, node };
  }

  enterFocus(node: Member){
    if (!node?.id) return;
    this.focusRootId = node.id;
    this.treeFacade.setFocus(node.id, this.includeSpousesInFocus);
    this.updateFocusParams();
  }

  exitFocus(){
    this.focusRootId = null;
    this.treeFacade.setFocus(null, this.includeSpousesInFocus);
    this.updateFocusParams();
  }
  toggleIncludeSpouses(val: boolean){
    this.includeSpousesInFocus = val;
    this.treeFacade.setFocus(this.focusRootId, val);
    this.updateFocusParams();
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
    ref.afterClosed().subscribe((ok: boolean | undefined) => { if (ok) this.treeFacade.reload(); });
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
            next: _=>{ this.snack.open('Đã thêm hôn phối', 'Đóng', { duration: 1500 }); this.treeFacade.reload(); },
            error: (err)=>{
              const msg = (err?.error?.message) || 'Tạo hôn phối thất bại';
              this.snack.open(msg, 'Đóng', { duration: 2500 });
              this.unionsApi.normalize(node.id!).subscribe({ next: norm => { if (norm.created?.length) this.treeFacade.reload(); } });
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
      next: _=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.treeFacade.reload(); },
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
      next: ()=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.treeFacade.reload(); },
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
        next: ()=>{ this.snack.open('Đã thêm con', 'Đóng', { duration: 1500 }); this.treeFacade.reload(); },
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
    const childRects: Array<{ elRect: DOMRect; childId?: string; motherId?: string; fatherId?: string }> = [];
    this.childEls?.forEach(el => {
      const childId = el.nativeElement.getAttribute('data-id') || undefined;
      const motherId = el.nativeElement.getAttribute('data-mother') || undefined;
      const fatherId = el.nativeElement.getAttribute('data-father') || undefined;
      childRects.push({ elRect: el.nativeElement.getBoundingClientRect(), childId, motherId, fatherId });
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
    this.childColors = result.childColors;
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
    if (ev.code === 'Space'){ this.spaceKey = false; this.isPanning = false; }
  }
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(ev: KeyboardEvent){
    if (ev.code === 'Space'){
      // Don't prevent space key when user is typing in an input field
      const target = ev.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      this.spaceKey = true;
      ev.preventDefault();
    }
  }
  private canPanFromEvent(ev: MouseEvent): boolean {
    const target = ev.target as HTMLElement | null;
    if (!target) return false;
    // Disallow pan when dragging on interactive nodes/anchors
    return !target.closest('.person, .couple-box, .wives-list, .children, .anchor');
  }
  onMouseDown(ev: MouseEvent){
    if (!(this.spaceKey || this.panAlwaysEnabled) || !this.treeAreaEl) return;
    if (!this.canPanFromEvent(ev)) return;
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

  onTextPointerDown(item: TextItem, ev: PointerEvent){
    ev.preventDefault();
    ev.stopPropagation();
    this.textDrag = {
      id: item.id,
      startX: ev.clientX,
      startY: ev.clientY,
      origin: { x: item.x, y: item.y },
    };
    window.addEventListener('pointermove', this.handleTextPointerMove);
    window.addEventListener('pointerup', this.handleTextPointerUp);
  }

  private handleTextPointerMove = (ev: PointerEvent) => {
    if (!this.textDrag) return;
    const { id, startX, startY, origin } = this.textDrag;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const treeScale = (this.scales['tree'] || 1) * this.zoom;
    const adjDx = dx / treeScale;
    const adjDy = dy / treeScale;
    this.textService.moveTextItem(id, origin.x + adjDx, origin.y + adjDy);
  };

  private handleTextPointerUp = () => {
    if (!this.textDrag) return;
    this.textService.persistTextItems(this.selectedFamilyId);
    this.textDrag = null;
    window.removeEventListener('pointermove', this.handleTextPointerMove);
    window.removeEventListener('pointerup', this.handleTextPointerUp);
  };

  onTextWheel(item: TextItem, ev: WheelEvent){
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.05 : 0.05;
    const next = Math.min(3, Math.max(0.3, item.scale + delta));
    if (next === item.scale) return;
    this.textService.updateTextItem(item.id, { scale: next });
    this.textService.persistTextItems(this.selectedFamilyId);
  }

  openTextDialog(existing?: TextItem, allowCurvature = false){
    const ref = this.dialog.open(TreeTextDialog, {
      data: {
        item: existing ? { text: existing.text, color: existing.color, fontSize: existing.fontSize, fontFamily: existing.fontFamily, curvature: existing.curvature } : null,
        fonts: this.fontService.getAllFonts().map(f => f.name),
        allowCurvature,
      },
      width: '520px',
    });
    ref.afterClosed().subscribe((res: TextDialogResult | undefined) => {
      if (!res) return;
      if (existing){
        this.textService.updateTextItem(existing.id, {
          text: res.text,
          color: res.color,
          fontSize: res.fontSize,
          fontFamily: res.fontFamily,
          curvature: res.curvature,
        });
      } else {
        const item = this.textService.createTextItem({
          text: res.text,
          fontFamily: res.fontFamily,
          fontSize: res.fontSize,
          color: res.color,
          paperWidth: this.paperWidth,
          paperHeight: this.paperHeight,
        });
        item.curvature = res.curvature;
        this.textService.addTextItem(item);
      }
      this.textService.persistTextItems(this.selectedFamilyId);
    });
  }

  editText(item: TextItem){
    this.openTextDialog(item, true);
  }

  onTextContext(item: TextItem, ev: MouseEvent){
    ev.preventDefault();
    ev.stopPropagation();
    this.openTextDialog(item, true);
  }

  curvedChars(line: string, curvature: number): Array<{ char: string; display: string; angle: number; lift: number }>{
    const chars = Array.from(line ?? '');
    const total = chars.length || 1;
    const arc = Math.max(-60, Math.min(60, curvature || 0)); // tổng độ cong cho cả dòng
    const offset = (total - 1) / 2;
    const span = Math.max(total - 1, 1);
    const stepAngle = arc / span;
    const maxLift = Math.min(30, Math.abs(arc) * 0.6 + 6);
    return chars.map((char, idx) => {
      const rel = offset === 0 ? 0 : (idx - offset) / offset;
      const lift = maxLift * (1 - Math.min(1, rel * rel));
      const angle = (idx - offset) * stepAngle * 0.6; // nhẹ nhàng
      const display = char === ' ' ? '\u00A0' : char; // giữ khoảng trắng khi uốn cong
      return { char, display, angle, lift };
    });
  }

  curvedCharTransform(angle: number, lift: number, curvature: number): string {
    const clampedAngle = Math.max(-18, Math.min(18, angle));
    const clampedLift = Math.min(30, lift);
    const direction = (curvature || 0) >= 0 ? -1 : 1; // cong lên: dịch âm (đi lên)
    return `rotate(${clampedAngle}deg) translateY(${direction * clampedLift}px)`;
  }

  textLines(item: TextItem): string[] {
    const raw = item.text || '';
    const parts = raw.split(/\r?\n/);
    return parts.length ? parts : [''];
  }
  onMouseUp(){
    this.isPanning = false;
  }

  onTreePointerDown(ev: PointerEvent){
    this.beginDrag('tree', ev);
  }

  beginDrag(layer: MovableLayer, ev: PointerEvent){
    ev.preventDefault();
    ev.stopPropagation();
    const origin = this.positions[layer] || { x: 0, y: 0 };
    const target = ev.target as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    this.dragState = {
      layer,
      startX: ev.clientX,
      startY: ev.clientY,
      origin: { x: origin.x, y: origin.y },
      size: { w: rect?.width || 0, h: rect?.height || 0 },
    };
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerMove = (ev: PointerEvent) => {
    if (!this.dragState) return;
    const { layer, startX, startY, origin } = this.dragState;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const nextX = origin.x + dx;
    const nextY = origin.y + dy;
    this.positions = {
      ...this.positions,
      [layer]: { x: nextX, y: nextY },
    };
    if (layer === 'tree') {
      this.scheduleConnections();
    }
  };

  @HostListener('window:pointerup')
  handlePointerUp(): void {
    if (!this.dragState) return;
    this.persistPositions();
    this.dragState = null;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }
  isDragging(layer: MovableLayer): boolean {
    return this.dragState?.layer === layer;
  }
  positionTransform(layer: MovableLayer): string {
    const p = this.positions[layer];
    if (layer === 'tree') return this.treeTransform();
    const scale = this.scales[layer] || 1;
    return `translate(-50%, 0) translate(${p.x}px, ${p.y}px) scale(${scale})`;
  }
  treeTransform(): string {
    const p = this.positions['tree'];
    const extraScale = this.scales['tree'] || 1;
    return `translate(${p.x}px, ${p.y}px) scale(${this.zoom * extraScale})`;
  }
  onWheel(ev: WheelEvent){
    // Ctrl + wheel: thay đổi kích cỡ node (boxScale)
    if (ev.ctrlKey){
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? -0.1 : 0.1;
      const next = Math.min(2.5, Math.max(0.1, this.boxScale + delta));
      if (next !== this.boxScale){
        this.boxScale = next;
        this.scheduleConnections();
      }
      return;
    }
  }
  onOverlayWheel(layer: MovableLayer, ev: WheelEvent){
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.05 : 0.05;
    const next = Math.min(4, Math.max(0.2, (this.scales[layer] || 1) + delta));
    this.scales = { ...this.scales, [layer]: next };
    this.persistScales();
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
      next: ()=>{ this.snack.open('Đã xóa', 'Đóng', { duration: 1500 }); this.treeFacade.reload(); },
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

  // Decor upload (cuốn thư, rồng trái/phải) - creates asset and adds instance to canvas
  async onDecorUpload(payload: { slot: DecorSlot; event: Event }): Promise<void> {
    const { slot, event } = payload;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      await this.decorService.addDecor(this.selectedFamilyId, slot, file);
      
      // Get the newly added asset (first in the array)
      const assets = this.decorService.getDecorAssets(slot);
      if (assets.length > 0) {
        const newAsset = assets[0];
        // Add instance to canvas at center
        this.decorService.addInstance(newAsset.id, slot, this.paperWidth, this.paperHeight);
      }
      
      this.decorService.persistDecor(this.selectedFamilyId, slot);
      this.snack.open('Đã thêm trang trí', 'Đóng', { duration: 1500 });
    } catch (err: any) {
      console.error(err);
      const message = err?.message || 'Không đọc được file ảnh';
      this.snack.open(message, 'Đóng', { duration: 3000 });
    }
  }

  // Add decoration instance from existing asset
  addDecorInstance(assetId: string, slot: DecorSlot): void {
    this.decorService.addInstance(assetId, slot, this.paperWidth, this.paperHeight);
    this.decorService.persistDecor(this.selectedFamilyId);
  }

  // Remove decoration instance
  removeDecorInstance(instanceId: string): void {
    this.decorService.removeInstance(instanceId);
    this.decorService.persistDecor(this.selectedFamilyId);
  }

  // Get decoration instance source (data URL)
  getDecorInstanceSource(instance: any): string | null {
    return this.decorService.getInstanceSource(instance);
  }

  // Drag handlers for decoration instances
  private decorDragState: {
    instance: any;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null = null;

  onDecorInstancePointerDown(instance: any, ev: PointerEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.decorDragState = {
      instance,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: instance.x,
      originY: instance.y,
    };
    window.addEventListener('pointermove', this.handleDecorPointerMove);
    window.addEventListener('pointerup', this.handleDecorPointerUp);
  }

  private handleDecorPointerMove = (ev: PointerEvent) => {
    if (!this.decorDragState) return;
    const { instance, startX, startY, originX, originY } = this.decorDragState;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const nextX = originX + dx;
    const nextY = originY + dy;
    this.decorService.updateInstancePosition(instance.id, nextX, nextY);
  };

  private handleDecorPointerUp = () => {
    if (!this.decorDragState) return;
    this.decorService.persistDecor(this.selectedFamilyId);
    this.decorDragState = null;
    window.removeEventListener('pointermove', this.handleDecorPointerMove);
    window.removeEventListener('pointerup', this.handleDecorPointerUp);
  };

  // Scale decoration instance with mouse wheel
  onDecorInstanceWheel(instance: any, ev: WheelEvent): void {
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.05 : 0.05;
    const nextScale = Math.min(4, Math.max(0.2, instance.scale + delta));
    this.decorService.updateInstanceScale(instance.id, nextScale);
    this.decorService.persistDecor(this.selectedFamilyId);
  }

  // Context menu for decoration instance (delete)
  onDecorInstanceContext(instance: any, ev: MouseEvent): void {
    ev.preventDefault();
    const ok = confirm('Xóa trang trí này?');
    if (ok) {
      this.removeDecorInstance(instance.id);
    }
  }


  openCoupletDialog(): void {
    const ref = this.dialog.open(CoupletDialog, { 
      data: { 
        couplet: { ...this.textService.couplet() }, 
        fonts: this.fontService.getAllFonts(), 
        customFonts: [...this.fontService.customFonts()] 
      } 
    });
    ref.afterClosed().subscribe((res: CoupletDialogResult | undefined) => {
      if (!res) return;
      this.textService.setCouplet(res.couplet);
      this.fontService.customFonts.set(res.customFonts || []);
      this.textService.persistCouplet(this.selectedFamilyId);
      this.fontService.persistFonts(this.selectedFamilyId);
      res.customFonts?.forEach(f => { 
        if (f.dataUrl) this.fontService['registerFontFace'](f.name, f.dataUrl); 
      });
    });
  }

  async exportToPNG(size: ExportSize, orientation: ExportOrientation = 'portrait') {
    // Use treeAreaRef instead of canvasRef to capture all overflow elements
    const captureElement = this.treeAreaEl?.nativeElement;
    if (!captureElement) {
      this.snack.open('Không tìm thấy vùng cây', 'Đóng', { duration: 2000 });
      return;
    }

    const familyName = this.families.find(f => f.id === this.selectedFamilyId)?.name || 'GiaPha';

    await this.exportService.exportToPNG(captureElement, {
      size,
      orientation,
      paperWidth: this.paperWidth,
      paperHeight: this.paperHeight,
      backgroundUrl: this.backgroundUrl,
      backgroundFit: this.backgroundFit,
      familyName
    });
  }

  // Helpers for positions/scales persistence
  private positionsKey(): string | null { 
    return this.selectedFamilyId ? `tree:${this.selectedFamilyId}:positions` : null; 
  }
  
  private scalesKey(): string | null { 
    return this.selectedFamilyId ? `tree:${this.selectedFamilyId}:scales` : null; 
  }

  // Text item methods
  onTextMouseDown(ev: MouseEvent, item: TextItem): void {
    if (ev.button !== 0) return;
    this.textDrag = { id: item.id, startX: ev.clientX, startY: ev.clientY, origin: { x: item.x, y: item.y } };
  }

  @HostListener('window:mousemove', ['$event'])
  onTextMouseMove(ev: MouseEvent): void {
    if (!this.textDrag) return;
    const dx = ev.clientX - this.textDrag.startX;
    const dy = ev.clientY - this.textDrag.startY;
    const newX = this.textDrag.origin.x + dx;
    const newY = this.textDrag.origin.y + dy;
    this.textService.moveTextItem(this.textDrag.id, newX, newY);
  }

  @HostListener('window:mouseup')
  onTextMouseUp(): void {
    if (!this.textDrag) return;
    this.textService.persistTextItems(this.selectedFamilyId);
    this.textDrag = null;
  }

  editTextItem(item: TextItem): void {
    const ref = this.dialog.open(TreeTextDialog, { 
      data: { 
        text: item.text,
        fontFamily: item.fontFamily,
        fontSize: item.fontSize,
        color: item.color,
        fonts: this.fontService.getAllFonts() 
      } 
    });
    ref.afterClosed().subscribe((res: TextDialogResult | undefined) => {
      if (!res) return;
      this.textService.updateTextItem(item.id, {
        text: res.text,
        fontFamily: res.fontFamily,
        fontSize: res.fontSize,
        color: res.color
      });
      this.textService.persistTextItems(this.selectedFamilyId);
    });
  }

  deleteTextItem(id: string): void {
    this.textService.deleteTextItem(id);
    this.textService.persistTextItems(this.selectedFamilyId);
  }

  splitWords(text: string): string[] {
    return this.textService.splitWords(text);
  }
}
