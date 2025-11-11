import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { FamilyService } from '../../../families/services/family';
import { PositionService } from '../../../positions/services/position';
import { MemberService } from '../../services/member';
import type { Family } from '../../../families/models/family.model';
import type { Member } from '../../models/member.model';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
  ],
  templateUrl: './member-list.html',
  styleUrl: './member-list.scss',
})
export class MemberList {
  private readonly fb = inject(FormBuilder);
  private readonly familyService = inject(FamilyService);
  private readonly memberService = inject(MemberService);
  private readonly positionService = inject(PositionService);

  filters = this.fb.group({
    family: [''],
    q: [''],
  });

  families: Family[] = [];
  positions: { [id: string]: string } = {};
  data: Member[] = [];
  displayedColumns = ['fullName', 'family', 'phone', 'email', 'position', 'actions'];

  constructor() {
    this.loadFamilies();
    this.loadPositions();
    this.load();
    this.filters.valueChanges.subscribe(() => this.load());
  }

  loadFamilies() {
    this.familyService.list().subscribe((res) => (this.families = res));
  }

  load() {
    const { family, q } = this.filters.value;
    this.memberService.list({ family: family || undefined, q: q || undefined }).subscribe((res) => (this.data = res));
  }

  delete(id?: string) {
    if (!id) return;
    if (confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
      this.memberService.delete(id).subscribe(() => this.load());
    }
  }

  familyName(id?: string) {
    const f = this.families.find((x) => x.id === id);
    return f?.name ?? '—';
  }

  loadPositions() {
    this.positionService.list().subscribe((res) => {
      this.positions = Object.fromEntries(res.map((p) => [p.id!, p.name]));
    });
  }

  positionName(id?: string) {
    return (id && this.positions[id]) || '—';
  }
}
