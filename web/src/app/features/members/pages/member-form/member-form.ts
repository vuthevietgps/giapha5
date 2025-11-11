import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FamilyService } from '../../../families/services/family';
import { PositionService } from '../../../positions/services/position';
import { MemberService } from '../../services/member';
import { UnionService } from '../../services/union';
import type { Family } from '../../../families/models/family.model';
import type { Position } from '../../../positions/models/position.model';
import type { Member } from '../../models/member.model';
import type { Union } from '../../models/union.model';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './member-form.html',
  styleUrl: './member-form.scss',
})
export class MemberForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly familyService = inject(FamilyService);
  private readonly positionService = inject(PositionService);
  private readonly memberService = inject(MemberService);
  private readonly unionService = inject(UnionService);

  id: string | null = null;
  families: Family[] = [];
  positions: Position[] = [];
  familyMembers: Member[] = [];
  selectedChildrenIds: string[] = [];
  selectedFile: File | null = null;
  fathersOptions: Member[] = [];
  mothersOptions: Member[] = [];
  spouseOptions: Member[] = [];
  childrenOptions: Member[] = [];
  // Track the original family loaded from DB to avoid mismatch when creating unions before save
  private originalFamilyId: string | null = null;
  
  // Unions management
  unions: Union[] = [];
  newUnionPartner: string = '';

  form = this.fb.group({
    fullName: ['', Validators.required],
    photoUrl: [''],
    phone: [''],
    email: [''],
    password: [''],
    family: ['', Validators.required],
    father: [{ value: '', disabled: true }],
    mother: [{ value: '', disabled: true }],
    spouse: [{ value: '', disabled: true }],
    bio: [''],
    dob: [''],
    dod: [''],
    position: [''],
    gender: ['male'],
  });

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadLookups();

    if (this.id) {
      this.memberService.get(this.id).subscribe((m) => {
        this.form.patchValue({
          fullName: m.fullName,
          photoUrl: m.photoUrl,
          phone: m.phone,
          email: m.email,
          family: m.family,
          father: m.father,
          mother: m.mother,
          spouse: m.spouse,
          bio: m.bio,
          dob: m.dob?.substring(0,10),
          dod: m.dod?.substring(0,10),
          position: m.position,
        });
        this.originalFamilyId = m.family || null;
        if (m.family) {
          this.loadFamilyMembers(m.family);
          this.loadUnions(m.family);
        }
      });
    }

    this.form.controls.family.valueChanges.subscribe((fid) => {
      if (fid) this.loadFamilyMembers(fid);
      // Reset selects when family changes
      this.form.patchValue({ father: '', mother: '', spouse: '' });
      this.selectedChildrenIds = [];
      // Enable/disable relation selects via FormControl API per Angular guidance
      if (fid) {
        this.form.controls.father.enable({ emitEvent: false });
        this.form.controls.mother.enable({ emitEvent: false });
        this.form.controls.spouse.enable({ emitEvent: false });
      } else {
        this.form.controls.father.disable({ emitEvent: false });
        this.form.controls.mother.disable({ emitEvent: false });
        this.form.controls.spouse.disable({ emitEvent: false });
      }
    });

    this.form.controls.gender.valueChanges.subscribe(() => {
      this.computeOptions();
    });
  }

  // Refresh family members when opening any relation dropdown to ensure latest data
  onRelationSelectOpened(opened: boolean) {
    if (!opened) return;
    const fid = this.form.controls.family.value;
    if (fid) {
      this.loadFamilyMembers(fid);
    }
  }

  loadLookups() {
    this.familyService.list().subscribe((res) => (this.families = res));
    this.positionService.list().subscribe((res) => (this.positions = res));
  }

  loadFamilyMembers(familyId: string) {
    this.memberService.listByFamily(familyId).subscribe((res) => {
      this.familyMembers = res;
      this.computeOptions();
      // Ensure selects are enabled when we have a family pre-selected (edit case)
      if (this.form.controls.family.value) {
        this.form.controls.father.enable({ emitEvent: false });
        this.form.controls.mother.enable({ emitEvent: false });
        this.form.controls.spouse.enable({ emitEvent: false });
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value as Member;
    const action$ = this.id
      ? this.memberService.update(this.id, value)
      : this.memberService.create(value);

    action$.subscribe((saved) => {
      const afterChildren = () => {
        if (this.selectedFile) {
          this.memberService.uploadPhoto(saved.id!, this.selectedFile).subscribe(() => {
            this.snack.open('Lưu thành viên thành công', 'Đóng', { duration: 2000 });
            this.router.navigate(['/members']);
          });
        } else {
          this.snack.open('Lưu thành viên thành công', 'Đóng', { duration: 2000 });
          this.router.navigate(['/members']);
        }
      };
      if (this.selectedChildrenIds.length) {
        this.memberService.setChildren(saved.id!, this.selectedChildrenIds).subscribe(afterChildren);
      } else {
        afterChildren();
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    }
  }

  loadUnions(familyId: string) {
    if (!this.id) {
      this.unions = [];
      return;
    }
    this.unionService.list({ family: familyId, partner: this.id }).subscribe({
      next: (res) => {
        this.unions = res;
      },
      error: (err) => {
        console.warn('Failed to load unions:', err);
        this.unions = []; // Fallback to empty unions
        // Optionally show a message
        if (err.status === 404) {
          this.snack.open('Union API chưa sẵn sàng - sẽ dùng spouse field', 'Đóng', { duration: 3000 });
        }
      }
    });
  }

  addUnion() {
    if (!this.id) return;
    if (!this.newUnionPartner) return;

    // Prevent creating union when the user changed family but hasn't saved yet
    const selectedFamilyId = this.form.controls.family.value || '';
    if (this.originalFamilyId && selectedFamilyId && this.originalFamilyId !== selectedFamilyId) {
      this.snack.open('Bạn đã thay đổi Dòng họ. Hãy lưu thành viên trước rồi mới thêm quan hệ hôn nhân.', 'Đóng', { duration: 4000 });
      return;
    }

    const familyIdForUnion = this.originalFamilyId || selectedFamilyId;
    if (!familyIdForUnion) {
      this.snack.open('Vui lòng chọn Dòng họ trước khi thêm quan hệ hôn nhân.', 'Đóng', { duration: 3000 });
      return;
    }

    if (this.newUnionPartner === this.id) {
      this.snack.open('Không thể chọn chính mình làm vợ/chồng.', 'Đóng', { duration: 3000 });
      return;
    }

    const union: Union = {
      family: familyIdForUnion,
      partners: [this.id, this.newUnionPartner]
    };

    this.unionService.create(union).subscribe({
      next: () => {
        this.snack.open('Đã thêm liên kết hôn nhân', 'Đóng', { duration: 2000 });
        this.loadUnions(familyIdForUnion);
        this.newUnionPartner = '';
      },
      error: (err) => {
        console.error('Failed to create union:', err);
        if (err.status === 404) {
          this.snack.open('Union API chưa sẵn sàng - hãy dùng field "Vợ/Chồng" ở trên', 'Đóng', { duration: 4000 });
        } else {
          const msg = err?.error?.message || err?.message || 'Lỗi khi thêm liên kết hôn nhân';
          this.snack.open(msg, 'Đóng', { duration: 4000 });
        }
      }
    });
  }

  removeUnion(union: Union) {
    if (!union.id) return;
    this.unionService.remove(union.id).subscribe({
      next: () => {
        this.snack.open('Đã xóa liên kết hôn nhân', 'Đóng', { duration: 2000 });
        this.loadUnions(this.form.controls.family.value!);
      },
      error: (err) => {
        console.error('Failed to remove union:', err);
        this.snack.open('Lỗi khi xóa liên kết hôn nhân', 'Đóng', { duration: 3000 });
      }
    });
  }

  getPartnerName(union: Union): string {
    const partnerId = union.partners.find(p => p !== this.id);
    const partner = this.familyMembers.find(m => m.id === partnerId);
    return partner?.fullName || 'Không rõ';
  }

  private computeOptions() {
    const currentId = this.id || '';
    const gender = this.form.controls.gender.value as 'male' | 'female' | 'other' | null;
    const others = this.familyMembers.filter((m) => m.id !== currentId);
    const byName = (a: Member, b: Member) => a.fullName.localeCompare(b.fullName);

    this.fathersOptions = others.filter((m) => m.gender === 'male').sort(byName);
    this.mothersOptions = others.filter((m) => m.gender === 'female').sort(byName);
    // Spouse: if gender is known and not 'other', suggest opposite sex, else all others
    if (gender === 'male') {
      this.spouseOptions = others.filter((m) => m.gender === 'female').sort(byName);
    } else if (gender === 'female') {
      this.spouseOptions = others.filter((m) => m.gender === 'male').sort(byName);
    } else {
      this.spouseOptions = [...others].sort(byName);
    }
    this.childrenOptions = [...others].sort(byName);
  }
}
