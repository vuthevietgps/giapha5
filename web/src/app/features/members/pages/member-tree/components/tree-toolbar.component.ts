import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FamilyControlsComponent } from './family-controls.component';
import { FocusControlsComponent } from './focus-controls.component';
import { LayoutControlsComponent } from './layout-controls.component';
import { DecorControlsComponent } from './decor-controls.component';
import { ExportControlsComponent } from './export-controls.component';
import type { Family } from '../../../../families/models/family.model';
import type { Member } from '../../../models/member.model';

type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';

@Component({
  selector: 'app-tree-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    FamilyControlsComponent,
    FocusControlsComponent,
    LayoutControlsComponent,
    DecorControlsComponent,
    ExportControlsComponent,
  ],
  styles: [
    `:host{display:block;padding:10px 12px;border-bottom:1px solid #e6e0d5;background:linear-gradient(180deg,#fffdf8 0%,#fbf7ef 100%)}`,
    `.toolbar-shell{display:grid;gap:10px}`,
    `.toolbar-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}`,
    `.toolbar-main{justify-content:space-between}`,
    `.toolbar-main-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1 1 620px}`,
    `.toolbar-main-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;flex:1 1 280px}`,
    `.toolbar-chip{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(129,99,50,.15);border-radius:16px;background:rgba(255,255,255,.82);box-shadow:0 4px 18px rgba(91,70,35,.06)}`,
    `.toolbar-cluster{display:flex;align-items:center;gap:8px;flex-wrap:wrap}`,
    `.toolbar-home{white-space:nowrap}`,
    `.search-box{display:flex;align-items:center;gap:8px;background:rgba(245,239,230,.95);border:1px solid rgba(129,99,50,.12);border-radius:16px;padding:8px 12px;min-width:240px;flex:1 1 280px;max-width:420px}`,
    `.search-icon{font-size:18px;width:18px;height:18px;color:#8b7657}`,
    `.search-input{border:none;background:transparent;outline:none;font-size:13px;width:100%;min-width:120px;color:#3d2f1a}`,
    `.toolbar-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8b7657;font-weight:700}`,
    `@media (max-width:900px){.toolbar-main-left,.toolbar-main-right{flex:1 1 100%}.toolbar-main-right{justify-content:flex-start}.search-box{max-width:none}}`,
    `@media (max-width:640px){:host{padding:8px}.toolbar-row{gap:8px}.toolbar-chip{width:100%;align-items:flex-start}.toolbar-cluster{width:100%}.search-box{width:100%;min-width:0}.toolbar-home{width:100%;justify-content:center}}`,
  ],
  template: `
    <div class="toolbar-shell">
      <div class="toolbar-row toolbar-main">
        <div class="toolbar-main-left">
          <button mat-stroked-button color="primary" class="toolbar-home" (click)="goHome.emit()">
            <mat-icon>arrow_back</mat-icon>
            Trang chủ
          </button>

          <div class="toolbar-chip toolbar-cluster">
            <div class="toolbar-label">Dòng họ</div>
            <app-family-controls
              [families]="families"
              [selectedFamilyId]="selectedFamilyId"
              (familyChange)="familyChange.emit($event)"
              (createRoot)="createRoot.emit()"
            ></app-family-controls>
          </div>
        </div>

        <div class="toolbar-main-right">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              placeholder="Tìm thành viên..."
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              [matAutocomplete]="autoSearch"
              class="search-input"
            />
            <mat-autocomplete #autoSearch="matAutocomplete" (optionSelected)="onMemberSelected($event.option.value)">
              <mat-option *ngFor="let m of filteredMembers" [value]="m">
                <span>{{ m.fullName }}</span>
                <small *ngIf="m.dob" style="color:#888; margin-left:8px">{{ m.dob | date:'yyyy' }}</small>
                <small *ngIf="m.gender" style="color:#888; margin-left:4px">({{ m.gender === 'male' ? 'Nam' : 'Nữ' }})</small>
              </mat-option>
              <mat-option *ngIf="searchQuery && filteredMembers.length === 0" disabled>
                Không tìm thấy
              </mat-option>
            </mat-autocomplete>
          </div>
        </div>
      </div>

      <div class="toolbar-row">
        <div class="toolbar-chip toolbar-cluster" *ngIf="focusRootId">
          <div class="toolbar-label">Nhánh xem</div>
          <app-focus-controls
            [focusRootId]="focusRootId"
            [includeSpousesInFocus]="includeSpousesInFocus"
            (exitFocus)="exitFocus.emit()"
            (includeSpousesChange)="includeSpousesChange.emit($event)"
          ></app-focus-controls>
        </div>

        <div class="toolbar-chip toolbar-cluster">
          <div class="toolbar-label">Bố cục</div>
          <app-layout-controls
            [connectionStyle]="connectionStyle"
            [topOffset]="topOffset"
            (connectionStyleChange)="connectionStyleChange.emit($event)"
            (topOffsetChange)="topOffsetChange.emit($event)"
          ></app-layout-controls>
        </div>

        <div class="toolbar-chip toolbar-cluster">
          <div class="toolbar-label">Trang trí</div>
          <app-decor-controls
            (openBackgrounds)="openBackgrounds.emit()"
            (addText)="addText.emit()"
            (addScrollText)="addScrollText.emit()"
            (openDecorDialog)="openDecorDialog.emit()"
            (openCouplet)="openCouplet.emit()"
            [scrollAssets]="decorAssets?.['scroll'] || []"
            [dragonLeftAssets]="decorAssets?.['dragonLeft'] || []"
            [dragonRightAssets]="decorAssets?.['dragonRight'] || []"
          ></app-decor-controls>
        </div>

        <div class="toolbar-chip toolbar-cluster">
          <div class="toolbar-label">Xuất bản</div>
          <app-export-controls
            (export)="export.emit($event)"
            (reload)="reload.emit()"
          ></app-export-controls>
        </div>
      </div>
    </div>
  `,
})
export class TreeToolbarComponent {
  @Input() families: Family[] = [];
  @Input() selectedFamilyId: string | null = null;
  @Input() focusRootId: string | null = null;
  @Input() includeSpousesInFocus = true;
  @Input() connectionStyle: 'diagonal' | 'hub' = 'diagonal';
  @Input() topOffset = 160;
  @Input() decorAssets: Record<DecorSlot, Array<{ id: string; name: string; dataUrl: string }>> | null = null;
  @Input() allMembers: Member[] = [];

  @Output() goHome = new EventEmitter<void>();
  @Output() familyChange = new EventEmitter<string | null>();
  @Output() createRoot = new EventEmitter<void>();
  @Output() exitFocus = new EventEmitter<void>();
  @Output() includeSpousesChange = new EventEmitter<boolean>();
  @Output() connectionStyleChange = new EventEmitter<'diagonal' | 'hub'>();
  @Output() topOffsetChange = new EventEmitter<number>();
  @Output() openBackgrounds = new EventEmitter<void>();
  @Output() addText = new EventEmitter<void>();
  @Output() addScrollText = new EventEmitter<void>();
  @Output() openDecorDialog = new EventEmitter<void>();
  @Output() openCouplet = new EventEmitter<void>();
  @Output() export = new EventEmitter<number>();
  @Output() reload = new EventEmitter<void>();
  @Output() searchMember = new EventEmitter<Member>();

  searchQuery = '';
  filteredMembers: Member[] = [];

  onSearchInput() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredMembers = [];
      return;
    }
    this.filteredMembers = this.allMembers
      .filter((m) => m.fullName.toLowerCase().includes(q))
      .slice(0, 20);
  }

  onMemberSelected(member: Member) {
    this.searchMember.emit(member);
    this.searchQuery = member.fullName;
    this.filteredMembers = [];
  }
}
