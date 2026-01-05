import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FamilyControlsComponent } from './family-controls.component';
import { FocusControlsComponent } from './focus-controls.component';
import { LayoutControlsComponent } from './layout-controls.component';
import { DecorControlsComponent } from './decor-controls.component';

type DecorSlot = 'scroll' | 'dragonLeft' | 'dragonRight';
import { ExportControlsComponent } from './export-controls.component';
import type { Family } from '../../../../families/models/family.model';

@Component({
  selector: 'app-tree-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    FamilyControlsComponent,
    FocusControlsComponent,
    LayoutControlsComponent,
    DecorControlsComponent,
    ExportControlsComponent,
  ],
  styles: [
    `:host{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #e0e0e0;flex-wrap:nowrap;overflow-x:auto;white-space:nowrap}`,
    `:host::-webkit-scrollbar{height:8px}`,
    `:host::-webkit-scrollbar-thumb{background:#c7c7c7;border-radius:999px}`,
    `:host::-webkit-scrollbar-track{background:transparent}`,
    `.spacer{flex:1}`,
  ],
  template: `
    <button mat-stroked-button color="primary" (click)="goHome.emit()">
      <mat-icon>arrow_back</mat-icon>
      Trang chủ
    </button>

    <app-family-controls
      [families]="families"
      [selectedFamilyId]="selectedFamilyId"
      (familyChange)="familyChange.emit($event)"
      (createRoot)="createRoot.emit()"
    ></app-family-controls>

    <app-focus-controls
      [focusRootId]="focusRootId"
      [includeSpousesInFocus]="includeSpousesInFocus"
      (exitFocus)="exitFocus.emit()"
      (includeSpousesChange)="includeSpousesChange.emit($event)"
    ></app-focus-controls>

    <app-layout-controls
      [connectionStyle]="connectionStyle"
      [topOffset]="topOffset"
      (connectionStyleChange)="connectionStyleChange.emit($event)"
      (topOffsetChange)="topOffsetChange.emit($event)"
    ></app-layout-controls>

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

    <app-export-controls
      (export)="export.emit($event)"
      (reload)="reload.emit()"
    ></app-export-controls>

    <span class="spacer"></span>
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
}
