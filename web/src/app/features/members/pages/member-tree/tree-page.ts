import { Component, OnInit, inject, AfterViewInit, ElementRef, ViewChild, ViewChildren, QueryList, HostListener, effect, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { TreeNamePromptDialog, type TreeNamePromptData } from './tree-name-prompt.dialog';
import { ConfirmDialogComponent } from '../../../../core/ui/confirm-dialog';
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
import { TreeExportService } from './services/tree-export.service';
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
  .tree-area{position:relative;width:100%;flex:1;min-height:0;max-width:none;aspect-ratio:auto;overflow:auto;padding:8px;border:1px solid #e0e0e0;border-radius:12px;box-sizing:border-box;background:#fafafa}
  .tree-area.space-pan{cursor:grab}
  .tree-area.space-pan.panning{cursor:grabbing}
  .center-wrap{min-width:100%;min-height:100%;display:grid;justify-content:center;align-content:flex-start;position:relative;z-index:1}
  .tree-content{display:flex;flex-direction:column;align-items:center;gap:12px;min-width:100%}
  .connections{position:absolute;left:0;top:0;pointer-events:none;z-index:1}
    .node{border:1px solid #ccc;border-radius:8px;padding:8px 12px;background:transparent;min-width:160px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
  .couple-box{display:inline-grid;grid-template-rows:auto auto;row-gap:6px;justify-items:center;border:2px solid #e0e0e0;border-radius:12px;padding:10px 12px 12px;background:rgba(255,255,255,0.85);position:relative;z-index:2;width:fit-content;max-width:none;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:visible;transition:border-color .2s, box-shadow .2s}
  .couple-box:hover{box-shadow:0 4px 16px rgba(0,0,0,.12);border-color:#b0bec5}
  .person{margin:0 auto 2px;text-align:center;padding:8px 18px;border-radius:10px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:auto;position:relative;background:transparent;cursor:pointer;transition:background .15s}
  .person:hover{background:rgba(0,0,0,.03)}
  .person::before{content:"";position:absolute;left:4px;top:6px;width:6px;height:calc(100% - 12px);border-radius:6px;background:#1976d2;box-shadow:0 0 0 1px rgba(0,0,0,0.06)}
  .person.male::before{background:#1976d2}
  .person.female::before{background:#d81b60}
  .person-action{display:none}
  .person-action:hover{background:rgba(25,118,210,.12);color:#1976d2}
  .person-action mat-icon{font-size:18px;width:18px;height:18px}
  .person.deceased{opacity:0.7}
  .person.deceased .name{text-decoration:line-through;text-decoration-color:rgba(0,0,0,0.3)}
  .person.male .name{color:#000}
  .person.female .name{color:#000}
  .child-couple.couple-box{padding:6px 10px}
  .person-photo{width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e0e0e0;flex-shrink:0}
  .person-info{display:flex;align-items:center;gap:8px}
  .person-text{display:flex;flex-direction:column;gap:2px}
  .person-badges{display:none}
  .person-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.05);color:#555;font-size:10px;font-weight:600;letter-spacing:.02em}
  .person-badge mat-icon{font-size:12px;width:12px;height:12px}
  .wives-list{display:flex;gap:6px;flex-wrap:nowrap;justify-content:center;align-items:flex-end}
    .wives-list .person{position:relative;padding-bottom:18px}
  .wives-list .person .anchor{position:absolute;left:50%;transform:translateX(-50%);bottom:-10px;display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:24px;padding:0 10px;border:none;border-radius:999px;box-shadow:0 10px 24px rgba(0,0,0,.16);cursor:pointer;transition:transform .15s, box-shadow .15s;color:#fff;font-size:10px;font-weight:700}
  .wives-list .person .anchor:hover{transform:translateX(-50%) translateY(-1px);box-shadow:0 14px 28px rgba(0,0,0,.18)}
  .anchor mat-icon{font-size:14px;width:14px;height:14px}
  .anchor-label{display:inline}
  .children{display:flex;gap:14px;flex-wrap:nowrap;margin:10px 0 16px;position:relative;z-index:2;align-items:flex-start;justify-content:center;width:max-content}
  .child-couple{display:flex;flex-direction:column;align-items:center}
  .spouse-small{position:relative;padding-bottom:18px}
  .role-tag{font-size:11px;color:#888;margin-left:4px;font-weight:400}
    .tree-hud{position:sticky;top:12px;left:0;z-index:4;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:4px 4px 0;pointer-events:none}
    .tree-hud-left,.tree-hud-right{display:flex;flex-wrap:wrap;gap:8px;pointer-events:none}
    .hud-card{pointer-events:auto;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:16px;background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.08);box-shadow:0 10px 24px rgba(0,0,0,.08)}
    .hud-card.stats{flex-wrap:wrap}
    .hud-stat{display:flex;flex-direction:column;min-width:72px}
    .hud-stat strong{font-size:15px;color:#222;line-height:1}
    .hud-stat span{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.06em}
    .hud-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(25,118,210,.08);color:#245ea8;font-size:11px;font-weight:700}
    .hud-chip mat-icon{font-size:15px;width:15px;height:15px}
    .hud-actions{display:flex;align-items:center;gap:6px}
    .hud-actions button{min-width:0}
    .hud-readout{font-size:11px;color:#666;padding:0 2px;min-width:48px;text-align:center}
    .ctx-menu{position:fixed;background:#fff;border:1px solid #e0e0e0;border-radius:14px;box-shadow:0 16px 32px rgba(0,0,0,.18);padding:8px;display:flex;flex-direction:column;z-index:1000;min-width:190px;max-width:min(280px,calc(100vw - 16px));gap:4px}
    .ctx-menu button{justify-content:flex-start;text-align:left;border-radius:10px}
    .ctx-menu.mobile{left:12px!important;right:12px;bottom:12px;top:auto!important;max-width:none;border-radius:18px;padding:12px;background:rgba(255,255,255,.98)}
    .ctx-menu-header{display:flex;flex-direction:column;gap:2px;padding:4px 6px 10px;border-bottom:1px solid rgba(0,0,0,.08);margin-bottom:4px}
    .ctx-menu-title{font-weight:700;color:#222}
    .ctx-menu-subtitle{font-size:12px;color:#777}
    .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:60px 20px;text-align:center;opacity:.85}
    .empty-state mat-icon{font-size:64px;width:64px;height:64px;color:#bdbdbd}
    .loading-overlay{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px;text-align:center}
    .loading-spinner{width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:#1976d2;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error-banner{background:#fff3e0;color:#e65100;padding:12px 20px;border-radius:8px;margin:20px;text-align:center;display:flex;align-items:center;gap:8px;justify-content:center}
    .gen-label{font-size:11px;color:#9e9e9e;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:4px 12px;background:rgba(0,0,0,.04);border-radius:20px;white-space:nowrap;user-select:none;margin:4px 0}
  .name{display:flex;align-items:center;justify-content:center;gap:6px;font-weight:500;font-size:13px}
  .meta{display:none}
  .stats-inline{display:flex;gap:10px;align-items:center;margin-left:8px}
  .stat-item{display:flex;gap:4px;align-items:baseline;font-size:12px;color:#444}
  .stat-item strong{font-size:13px;color:#000}
  .draggable{cursor:grab;pointer-events:auto}
  .draggable.dragging{cursor:grabbing}
  .resizable{resize:both;overflow:auto;box-sizing:border-box}
  .couplet-text.resizable{resize:none;overflow:visible;border:none;outline:none;box-shadow:none;background:transparent}
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
  .search-highlight{animation:searchPulse 1.5s ease 2;background:rgba(255,235,59,0.45)!important;border-radius:10px;box-shadow:0 0 12px 4px rgba(255,235,59,0.6)}
  @keyframes searchPulse{0%,100%{box-shadow:0 0 12px 4px rgba(255,235,59,0.6)}50%{box-shadow:0 0 20px 8px rgba(255,235,59,0.9)}}
  @media (max-width: 780px){
    .tree-hud{top:8px;flex-direction:column;align-items:stretch}
    .tree-hud-left,.tree-hud-right{pointer-events:auto}
    .hud-card.stats{width:100%}
    .hud-card.controls{justify-content:space-between}
  }
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
  private readonly cdr = inject(ChangeDetectorRef);

  families: Family[] = [];
  selectedFamilyId: string | null = null;

  root: Member | null = null;
  originalRoot: Member | null = null;
  spouses: Member[] = [];
  levels: Member[][] = [];
  allMembers: Member[] = [];
  spousesByMember: Record<string, Member[]> = {};
  private memberById: Map<string, Member> = new Map();
  childCountByMember: Record<string, number> = {};
  partnerCountByMember: Record<string, number> = {};
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

  // Loading / error from facade
  get isLoading() { return this.treeFacade.loading(); }
  get errorMessage() { return this.treeFacade.error(); }

  retryLoad() { this.treeFacade.reload(); }

  /** Get photo URL for a member */
  getPhotoUrl(_m: Member): string | null {
    // Tree nodes stay text-only. Photos remain available inside the edit dialog.
    return null;
  }

  /** Label for generation level */
  generationLabel(index: number): string {
    const labels = ['Đời 2', 'Đời 3', 'Đời 4', 'Đời 5', 'Đời 6', 'Đời 7', 'Đời 8', 'Đời 9', 'Đời 10',
      'Đời 11', 'Đời 12', 'Đời 13', 'Đời 14', 'Đời 15', 'Đời 16', 'Đời 17', 'Đời 18', 'Đời 19', 'Đời 20'];
    return labels[index] || `Đời ${index + 2}`;
  }

  /** Display lifespan text */
  lifespanText(m: Member): string {
    const parts: string[] = [];
    if (m.dob) parts.push(new Date(m.dob).getFullYear().toString());
    if (m.dod) {
      if (parts.length) parts.push('–');
      else parts.push('? –');
      parts.push(new Date(m.dod).getFullYear().toString());
    }
    return parts.join(' ');
  }

  /** Hiển thị tên không kèm họ (surname) của dòng họ */
  displayName(m: Member | null): string {
    if (!m?.fullName) return '';
    const family = this.families.find(f => f.id === this.selectedFamilyId);
    if (!family?.name) return m.fullName;
    let fname = family.name;
    if (fname.startsWith('Dòng họ ')) fname = fname.slice(8);
    else if (fname.startsWith('Họ ')) fname = fname.slice(3);
    const surname = fname.split(/[\s\-]/)[0].trim();
    if (surname && m.fullName.startsWith(surname + ' ')) {
      return m.fullName.slice(surname.length + 1);
    }
    return m.fullName;
  }

  private rebuildRelationshipCounters() {
    const childCounts: Record<string, number> = {};
    this.allMembers.forEach((member) => {
      if (member.mother) childCounts[member.mother] = (childCounts[member.mother] || 0) + 1;
      if (member.father) childCounts[member.father] = (childCounts[member.father] || 0) + 1;
    });
    this.childCountByMember = childCounts;

    const partnerCounts: Record<string, number> = {};
    Object.keys(this.spousesByMember).forEach((memberId) => {
      partnerCounts[memberId] = (this.spousesByMember[memberId] || []).length;
    });
    this.partnerCountByMember = partnerCounts;
  }

  childCount(member: Member | null): number {
    if (!member?.id) return 0;
    return this.childCountByMember[member.id] || 0;
  }

  partnerCount(member: Member | null): number {
    if (!member?.id) return 0;
    return this.partnerCountByMember[member.id] || 0;
  }

  zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  nodeScalePercent(): number {
    return Math.round(this.boxScale * 100);
  }

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

  ctx = { visible: false, x: 0, y: 0, node: null as (Member | null), mobile: false };

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

      this.textService.loadTextItems(familyId);
      this.textService.loadCouplet(familyId);
      this.positions = loadPositions(this.positionsKey());
      this.scales = loadScales(this.scalesKey());
      this.decorService.loadDecor(familyId);
      this.fontService.loadFonts(familyId);
      this.treeFacade.setFamily(familyId);
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
      this.rebuildRelationshipCounters();
      // Read loading signal so effect re-fires when loading ends (DOM renders tree)
      const _loading = this.treeFacade.loading();
      void _loading;
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

  adjustZoom(delta: number) {
    const next = Math.min(2.2, Math.max(0.55, this.zoom + delta));
    if (next === this.zoom) return;
    this.zoom = next;
    this.cdr.markForCheck();
  }

  zoomIn() {
    this.adjustZoom(0.1);
  }

  zoomOut() {
    this.adjustZoom(-0.1);
  }

  adjustNodeScale(delta: number) {
    const next = Math.min(2.2, Math.max(0.7, this.boxScale + delta));
    if (next === this.boxScale) return;
    this.boxScale = next;
    this.scheduleConnections();
    this.cdr.markForCheck();
  }

  resetViewport() {
    this.zoom = 1;
    this.boxScale = 1;
    this.centerRoot();
    this.cdr.markForCheck();
  }

  fitTreeForReading() {
    const area = this.treeAreaEl?.nativeElement;
    if (!area) return;
    const compact = area.clientWidth < 900;
    this.zoom = compact ? 0.82 : 0.96;
    this.boxScale = compact ? 0.94 : 1;
    this.centerRoot();
    this.cdr.markForCheck();
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
    if (!this.selectedFamilyId) {
      this.snack.open('Hãy chọn dòng họ trước khi quản lý ảnh nền', 'Đóng', { duration: 2200 });
      return;
    }
    const ref = this.dialog.open(TreeBackgroundsDialog, {
      data: { selectedId: this.selectedBackgroundId, familyId: this.selectedFamilyId },
      width: '820px'
    });
    ref.afterClosed().subscribe((id: string | null | undefined) => {
      if (id === undefined) return; // closed without changes
      this.treeStore.setBackgroundSelection(id || null);
    });
  }

  openDecorDialog(){
    const ref = this.dialog.open(TreeDecorDialog, { data: { assets: this.decorAssets() }, width: '860px' });
    ref.afterClosed().subscribe(async (res: DecorDialogResult | undefined) => {
      if (!res) return;
      // Sync new/removed assets to IndexedDB and update signal
      await this.decorService.syncFromDialog(this.selectedFamilyId, res.assets);

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

  private async promptForName(config: TreeNamePromptData): Promise<string | null> {
    const ref = this.dialog.open(TreeNamePromptDialog, {
      data: config,
      width: '440px',
    });
    return await firstValueFrom(ref.afterClosed());
  }

  async createRoot(){
    if (!this.selectedFamilyId) return;
    if (this.root){ this.snack.open('Đã có cụ tổ cho họ này', 'Đóng', { duration: 2000 }); return; }
    const name = await this.promptForName({
      title: 'Tạo đời đầu',
      label: 'Họ tên cụ tổ',
      placeholder: 'Nhập họ tên đầy đủ',
      confirmText: 'Tạo đời đầu',
      helperText: 'Người này sẽ được dùng làm gốc hiển thị của cây gia phả.',
    });
    if (!name) return;
    this.membersApi.create({ fullName: name, family: this.selectedFamilyId, gender: 'male' }).subscribe({
      next: _=>{ this.snack.open('Tạo cụ tổ thành công', 'Đóng', { duration: 2000 }); this.treeFacade.reload(); },
      error: _=>{ this.snack.open('Không thể tạo cụ tổ', 'Đóng', { duration: 2500 }); },
    });
  }

  private showContextMenu(x: number, y: number, node: Member) {
    const isMobile = window.innerWidth <= 720;
    if (isMobile) {
      this.ctx = { visible: true, x: 12, y: window.innerHeight - 12, node, mobile: true };
      return;
    }

    const estimatedWidth = 220;
    const estimatedHeight = 270;
    const margin = 12;
    const nextX = Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - estimatedWidth - margin));
    const nextY = Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - estimatedHeight - margin));
    this.ctx = { visible: true, x: nextX, y: nextY, node, mobile: false };
  }

  closeContextMenu(){
    this.ctx = { visible: false, x: 0, y: 0, node: null, mobile: false };
  }

  openContextMenu(ev: MouseEvent, node: Member){
    ev.preventDefault();
    this.showContextMenu(ev.clientX, ev.clientY, node);
  }

  openActions(ev: MouseEvent, node: Member) {
    ev.preventDefault();
    ev.stopPropagation();
    this.showContextMenu(ev.clientX, ev.clientY, node);
  }

  enterFocus(node: Member){
    if (!node?.id) return;
    this.closeContextMenu();
    this.focusRootId = node.id;
    this.treeFacade.setFocus(node.id, this.includeSpousesInFocus);
    this.updateFocusParams();
  }

  exitFocus(){
    this.focusRootId = null;
    this.treeFacade.setFocus(null, this.includeSpousesInFocus);
    this.updateFocusParams();
  }

  scrollToMember(member: Member) {
    if (!member?.id) return;
    const el = document.querySelector(`[data-member-id="${member.id}"]`) as HTMLElement;
    if (el) {
      // Remove previous highlight
      document.querySelectorAll('.search-highlight').forEach(e => e.classList.remove('search-highlight'));
      // Add highlight
      el.classList.add('search-highlight');
      // Scroll into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Remove highlight after 3 seconds
      setTimeout(() => el.classList.remove('search-highlight'), 3000);
    } else {
      this.snack.open(`Không tìm thấy "${this.displayName(member)}" trên cây hiện tại`, 'OK', { duration: 3000 });
    }
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
    this.closeContextMenu();
    const ref = this.dialog.open(TreeEditMemberDialog, { data: { member: node }, width: '720px' });
    ref.afterClosed().subscribe((ok: boolean | undefined) => { if (ok) this.treeFacade.reload(); });
  }

  addWife(node: Member | null){
    if (!node) return;
    this.closeContextMenu();
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
    this.closeContextMenu();
    const childName = await this.promptForName({
      title: 'Thêm con',
      label: 'Họ tên người con',
      placeholder: 'Nhập họ tên đầy đủ',
      confirmText: 'Thêm con',
      helperText: `Con sẽ được gắn với mẹ là ${node.fullName}.`,
    });
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
    const baseName = await this.promptForName({
      title: 'Thêm con nhanh',
      label: 'Họ tên người con',
      placeholder: 'Nhập họ tên đầy đủ',
      confirmText: 'Thêm con',
      helperText: `Con sẽ được thêm dưới nhánh của ${mother.fullName}.`,
    });
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
      const baseName = await this.promptForName({
        title: 'Thêm con',
        label: 'Họ tên người con',
        placeholder: 'Nhập họ tên đầy đủ',
        confirmText: 'Thêm con',
        helperText: `Con sẽ gắn mẹ là ${owner.fullName} và cha là ${spouse.fullName}.`,
      });
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
  onResize(){
    this.computeConnections();
    if (this.ctx.visible && this.ctx.node) {
      this.showContextMenu(this.ctx.x, this.ctx.y, this.ctx.node);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent){
    if (!this.ctx.visible) return;
    const target = ev.target as HTMLElement | null;
    if (target?.closest('.ctx-menu, .person-action')) return;
    this.closeContextMenu();
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(){
    if (this.ctx.visible) this.closeContextMenu();
  }

  computeConnections(){
    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;
    // Helper: walk offsetParent chain to get LOCAL coords relative to canvas.
    // This is immune to CSS transforms — offsetLeft/offsetTop are in untransformed space.
    const treeScale = this.zoom * (this.scales['tree'] || 1);
    const canvasRect = canvas.getBoundingClientRect();
    const localRect = (el: HTMLElement): { left: number; top: number; width: number; height: number } => {
      const rect = el.getBoundingClientRect();
      return {
        left: (rect.left - canvasRect.left) / treeScale,
        top: (rect.top - canvasRect.top) / treeScale,
        width: rect.width / treeScale,
        height: rect.height / treeScale,
      };
    };
    const anchorCandidates = new Map<string, Array<{ key: string; memberId: string; x: number; y: number }>>();
    let anchorIndex = 0;
    canvas.querySelectorAll<HTMLElement>('[data-member-id]').forEach((el) => {
      const memberId = el.getAttribute('data-member-id') || '';
      if (!memberId) return;
      const personBox = localRect(el);
      const parentBoxEl = el.closest('.couple-box') as HTMLElement | null;
      const parentBox = parentBoxEl ? localRect(parentBoxEl) : personBox;
      const existing = anchorCandidates.get(memberId) || [];
      existing.push({
        key: `${memberId}:${anchorIndex++}`,
        memberId,
        x: personBox.left + (personBox.width / 2),
        y: parentBox.top + parentBox.height,
      });
      anchorCandidates.set(memberId, existing);
    });

    const childTargets: Array<{ point: { x: number; y: number }; childId?: string; motherId?: string; fatherId?: string }> = [];
    this.childEls?.forEach(el => {
      const childId = el.nativeElement.getAttribute('data-id') || undefined;
      const motherId = el.nativeElement.getAttribute('data-mother') || undefined;
      const fatherId = el.nativeElement.getAttribute('data-father') || undefined;
      const box = localRect(el.nativeElement);
      childTargets.push({ point: { x: box.left + (box.width / 2), y: box.top }, childId, motherId, fatherId });
    });
    // Use local rects — baseRect left/top = 0 since coords are already relative to canvas
    const baseRect = new DOMRect(0, 0, this.paperWidth, this.paperHeight);
    const result = buildConnections({
      baseRect,
      anchorCandidates,
      childTargets,
      memberById: this.memberById,
      spousesByMember: this.spousesByMember,
      style: this.connectionStyle,
      colors: this.COLORS,
      colorFatherMotherPair: this.colorFatherMotherPair,
      colorMotherFatherPair: this.colorMotherFatherPair,
      scale: 1, // coords are already in local space — no scale correction needed
    });
    this.connections = result.connections;
    this.childColors = result.childColors;
    this.overlayW = result.overlayW;
    this.overlayH = result.overlayH;
    this.cdr.markForCheck();
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
    if (ev.altKey){
      ev.preventDefault();
      this.adjustZoom(ev.deltaY > 0 ? -0.08 : 0.08);
      return;
    }
    // Ctrl + wheel: thay đổi kích cỡ node (boxScale)
    if (ev.ctrlKey){
      ev.preventDefault();
      this.adjustNodeScale(ev.deltaY > 0 ? -0.08 : 0.08);
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
  async deleteNode(node: Member | null){
    if (!node) return;
    this.closeContextMenu();
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa thành viên',
          message: `Bạn có chắc muốn xóa ${node.fullName}? Hành động này không thể hoàn tác.`,
          confirmText: 'Xóa thành viên',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
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
      
      // Get the newly added asset (last in the array)
      const assets = this.decorService.getDecorAssets(slot);
      if (assets.length > 0) {
        const newAsset = assets[assets.length - 1];
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
  async onDecorInstanceContext(instance: any, ev: MouseEvent): Promise<void> {
    ev.preventDefault();
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Xóa trang trí',
          message: 'Bạn có chắc muốn xóa trang trí này khỏi canvas?',
          confirmText: 'Xóa trang trí',
          tone: 'warn',
        },
      }).afterClosed(),
    );
    if (!confirmed) return;
    this.removeDecorInstance(instance.id);
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

  async exportToPNG(scale: number = 4) {
    // Use treeAreaRef instead of canvasRef to capture all overflow elements
    const captureElement = this.treeAreaEl?.nativeElement;
    if (!captureElement) {
      this.snack.open('Không tìm thấy vùng cây', 'Đóng', { duration: 2000 });
      return;
    }

    const familyName = this.families.find(f => f.id === this.selectedFamilyId)?.name || 'GiaPha';

    await this.exportService.exportToPNG(captureElement, {
      scale,
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
