import { Injectable, inject, signal } from '@angular/core';
import { BackgroundService } from '../../../backgrounds/services/background';
import { FamilyService } from '../../../families/services/family';
import type { Family } from '../../../families/models/family.model';

@Injectable({ providedIn: 'root' })
export class TreeStore {
  private readonly familiesApi = inject(FamilyService);
  private readonly backgroundsApi = inject(BackgroundService);

  readonly families = signal<Family[]>([]);
  readonly selectedFamilyId = signal<string | null>(null);
  readonly selectedBackgroundId = signal<string | null>(null);
  readonly backgroundUrl = signal<string | null>(null);
  readonly topOffset = signal<number>(160);

  init() {
    this.familiesApi.list().subscribe((f) => {
      this.families.set(f);
      if (!this.selectedFamilyId() && f.length) {
        this.setFamily(f[0].id || null);
      }
    });
  }

  setFamily(familyId: string | null) {
    this.selectedFamilyId.set(familyId);
    this.loadBackgroundChoice();
  }

  setTopOffset(offset: number) {
    const safe = Math.max(0, offset || 0);
    this.topOffset.set(safe);
    const currentFamily = this.selectedFamilyId();
    if (!currentFamily) return;
    localStorage.setItem(`bgOff:${currentFamily}`, String(safe));
  }

  loadBackgroundChoice() {
    const familyId = this.selectedFamilyId();
    if (!familyId) {
      this.selectedBackgroundId.set(null);
      this.backgroundUrl.set(null);
      this.topOffset.set(160);
      return;
    }
    const key = `bg:${familyId}`;
    const offKey = `bgOff:${familyId}`;
    const id = localStorage.getItem(key);
    const offRaw = localStorage.getItem(offKey);
    this.selectedBackgroundId.set(id);
    this.backgroundUrl.set(id ? this.backgroundsApi.fileUrl(id) : null);
    const off = offRaw ? Math.max(0, parseInt(offRaw, 10) || 0) : 160;
    this.topOffset.set(off);
  }

  setBackgroundSelection(id: string | null) {
    const familyId = this.selectedFamilyId();
    if (!familyId) return;
    const key = `bg:${familyId}`;
    const offKey = `bgOff:${familyId}`;
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
    this.selectedBackgroundId.set(id);
    this.backgroundUrl.set(id ? this.backgroundsApi.fileUrl(id) : null);
    const off = this.topOffset();
    localStorage.setItem(offKey, String(off));
  }
}
