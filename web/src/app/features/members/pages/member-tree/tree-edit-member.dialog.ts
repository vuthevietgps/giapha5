import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MemberService } from '../../services/member';
import type { Member } from '../../models/member.model';

export interface EditMemberData { member: Member; }

@Component({
  selector: 'app-tree-edit-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Sửa thông tin</h2>
    <div mat-dialog-content [formGroup]="form" class="form-grid">
      <div class="photo">
        <img [src]="previewUrl || data.member.photoUrl || (data.member.gender==='female' ? 'assets/avatar-female.svg' : 'assets/avatar-male.svg')" alt="avatar" />
        <input type="file" (change)="onFile($event)" />
      </div>
      <div class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Họ tên</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Giới tính</mat-label>
          <mat-select formControlName="gender">
            <mat-option value="male">Nam</mat-option>
            <mat-option value="female">Nữ</mat-option>
            <mat-option value="other">Khác</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ngày sinh</mat-label>
          <input matInput type="date" formControlName="dob" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ngày mất</mat-label>
          <input matInput type="date" formControlName="dod" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Số điện thoại</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Địa chỉ</mat-label>
          <textarea matInput rows="3" formControlName="bio"></textarea>
        </mat-form-field>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Hủy</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving">Lưu</button>
    </div>
  `,
  styles: [`
    .form-grid{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:start}
    .photo{display:flex;flex-direction:column;gap:8px}
    .photo img{width:160px;height:160px;object-fit:cover;border-radius:8px;border:1px solid #ddd}
    .fields{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .fields mat-form-field:nth-child(7){grid-column:1 / -1}
  `]
})
export class TreeEditMemberDialog {
  private readonly fb = inject(FormBuilder);
  private readonly membersApi = inject(MemberService);

  saving = false;
  previewUrl: string | null = null;

  form = this.fb.group({
    fullName: ['', Validators.required],
    gender: ['male'],
    dob: [''],
    dod: [''],
    phone: [''],
    email: [''],
    bio: [''],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: EditMemberData,
    private ref: MatDialogRef<TreeEditMemberDialog, boolean>,
  ) {
    const m = data.member || ({} as Member);
    this.form.patchValue({
      fullName: m.fullName || '',
      gender: m.gender || 'male',
      dob: m.dob ? m.dob.substring(0,10) : '',
      dod: m.dod ? m.dod.substring(0,10) : '',
      phone: m.phone || '',
      email: m.email || '',
      bio: m.bio || '',
    });
  }

  onFile(ev: Event){
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.data.member.id) return;
    // preview
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = reader.result as string;
    reader.readAsDataURL(file);
    // upload immediately
    this.membersApi.uploadPhoto(this.data.member.id!, file).subscribe({
      next: (res) => {
        if (res?.success && res.url){
          // switch to server URL so it works outside of the dialog too
          this.data.member.photoUrl = res.url;
          // If preview is set, we can keep it or clear to show server URL; prefer server URL
          this.previewUrl = null;
        }
      },
      error: _ => {
        // keep the preview if upload fails; no-op
      }
    });
  }

  save(){
    if (!this.data.member.id) { this.ref.close(false); return; }
    this.saving = true;
    const v = this.form.value;
    const payload: Partial<Member> = {
      fullName: v.fullName || '',
      gender: v.gender as any,
      dob: v.dob || undefined,
      dod: v.dod || undefined,
      phone: v.phone || undefined,
      email: v.email || undefined,
      bio: v.bio || undefined,
    };
    this.membersApi.update(this.data.member.id!, payload).subscribe({
      next: _=>{ this.saving = false; this.ref.close(true); },
      error: _=>{ this.saving = false; }
    })
  }
}
