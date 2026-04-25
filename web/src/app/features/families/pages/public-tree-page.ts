import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { buildLevels } from '../../members/pages/member-tree/tree-levels';
import { buildSpouseMap, findTreeRoot, type TreePersonLike } from '../../members/pages/member-tree/tree-graph';

interface PublicMember extends TreePersonLike {
  id: string;
  fullName: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  dod?: string;
  father?: string;
  mother?: string;
  spouse?: string;
  family: string;
  isMartyred?: boolean;
}

interface PublicFamily {
  id: string;
  name: string;
  contactName: string;
  address?: string;
  rootMember?: string;
}

@Component({
  selector: 'app-public-tree-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="public-tree-page">
      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Dang tai gia pha...</p>
      </div>

      <div *ngIf="error" class="error-state">
        <mat-icon>link_off</mat-icon>
        <h2>Khong the xem gia pha</h2>
        <p>{{ error }}</p>
        <button mat-flat-button color="primary" routerLink="/">Ve trang chu</button>
      </div>

      <ng-container *ngIf="!loading && !error && family">
        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">Lien ket chia se cong khai</div>
            <h1>Gia pha {{ family.name }}</h1>
            <p class="hero-sub">
              Duoc quan ly boi <strong>{{ family.contactName }}</strong>
            </p>
            <p *ngIf="family.address" class="hero-address">
              <mat-icon>location_on</mat-icon>
              <span>{{ family.address }}</span>
            </p>
          </div>

          <div class="stat-pills">
            <div class="stat-pill">
              <strong>{{ members.length }}</strong>
              <span>thanh vien</span>
            </div>
            <div class="stat-pill">
              <strong>{{ generationCount }}</strong>
              <span>doi</span>
            </div>
            <div class="stat-pill">
              <strong>{{ spouseCount }}</strong>
              <span>moi lien ket</span>
            </div>
          </div>
        </section>

        <section *ngIf="rootMember; else emptyTree" class="tree-shell">
          <div class="tree-legend">
            <div class="legend-item"><span class="legend-swatch male"></span><span>Nam</span></div>
            <div class="legend-item"><span class="legend-swatch female"></span><span>Nu</span></div>
            <div class="legend-item"><span class="legend-swatch neutral"></span><span>Hon phoi</span></div>
          </div>

          <div class="section-head">
            <div>
              <div class="section-label">Doi 1</div>
              <h2>Cu to</h2>
            </div>
          </div>

          <div class="founder-cluster">
            <article class="member-card founder" [class.male]="rootMember.gender === 'male'" [class.female]="rootMember.gender === 'female'">
              <div class="member-badge">Goc cay</div>
              <div class="member-name">
                <span *ngIf="rootMember.isMartyred" class="martyr">★</span>
                {{ rootMember.fullName }}
              </div>
              <div class="member-meta" *ngIf="lifespanText(rootMember)">{{ lifespanText(rootMember) }}</div>

              <div *ngIf="rootSpouses.length" class="spouse-stack">
                <div class="spouse-label">Hon phoi</div>
                <div class="spouse-list">
                  <div *ngFor="let spouse of rootSpouses" class="spouse-chip" [class.male]="spouse.gender === 'male'" [class.female]="spouse.gender === 'female'">
                    <span *ngIf="spouse.isMartyred" class="martyr">★</span>
                    <span>{{ spouse.fullName }}</span>
                    <small *ngIf="lifespanText(spouse)">{{ lifespanText(spouse) }}</small>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <section *ngFor="let level of generations; let index = index" class="generation-section">
            <div class="generation-marker"></div>
            <div class="section-head">
              <div>
                <div class="section-label">{{ generationLabel(index) }}</div>
                <h2>The he {{ index + 2 }}</h2>
              </div>
              <div class="section-count">{{ level.length }} thanh vien</div>
            </div>

            <div class="generation-surface">
              <div class="generation-grid">
                <article
                  *ngFor="let member of level"
                  class="member-card"
                  [class.male]="member.gender === 'male'"
                  [class.female]="member.gender === 'female'"
                >
                  <div class="member-name">
                    <span *ngIf="member.isMartyred" class="martyr">★</span>
                    {{ member.fullName }}
                  </div>
                  <div class="member-meta" *ngIf="lifespanText(member)">{{ lifespanText(member) }}</div>

                  <div *ngIf="visibleSpouses(member, level).length" class="spouse-stack">
                    <div class="spouse-label">Hon phoi</div>
                    <div class="spouse-list">
                      <div
                        *ngFor="let spouse of visibleSpouses(member, level)"
                        class="spouse-chip"
                        [class.male]="spouse.gender === 'male'"
                        [class.female]="spouse.gender === 'female'"
                      >
                        <span *ngIf="spouse.isMartyred" class="martyr">★</span>
                        <span>{{ spouse.fullName }}</span>
                        <small *ngIf="lifespanText(spouse)">{{ lifespanText(spouse) }}</small>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>
        </section>

        <ng-template #emptyTree>
          <div class="empty-tree">
            <mat-icon>nature</mat-icon>
            <h2>Gia pha chua co thanh vien nao</h2>
            <p>Dong ho nay chua cong khai du du lieu de hien thi cay.</p>
          </div>
        </ng-template>

        <footer class="public-footer">
          <p>Ban xem dang cong khai cua cay gia pha. Mot so tuy chinh noi bo co the khong hien thi tai day.</p>
          <button mat-stroked-button routerLink="/">
            <mat-icon>home</mat-icon>
            Tao gia pha cua ban
          </button>
        </footer>
      </ng-container>
    </div>
  `,
  styles: [`
    .public-tree-page {
      min-height: 100vh;
      padding: 24px 16px 40px;
      background:
        radial-gradient(circle at top left, rgba(198, 169, 105, 0.16), transparent 28%),
        linear-gradient(180deg, #f8f1e6 0%, #fffdf8 42%, #f4efe7 100%);
      color: #2f261b;
    }

    .loading-state,
    .error-state,
    .empty-tree {
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      padding: 72px 16px;
    }

    .error-state mat-icon,
    .empty-tree mat-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #9a7b43;
    }

    .hero,
    .tree-shell,
    .public-footer {
      max-width: 1160px;
      margin: 0 auto;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
      gap: 20px;
      align-items: stretch;
      margin-bottom: 24px;
    }

    .hero-copy,
    .stat-pills,
    .tree-shell,
    .public-footer {
      border: 1px solid rgba(96, 72, 37, 0.12);
      border-radius: 24px;
      background: rgba(255, 252, 246, 0.9);
      box-shadow: 0 16px 40px rgba(63, 43, 17, 0.08);
    }

    .hero-copy {
      padding: 28px;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 12px;
      color: #8d6c35;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .hero-copy h1 {
      margin: 0;
      font-size: clamp(32px, 5vw, 52px);
      line-height: 1.05;
      font-weight: 700;
    }

    .hero-sub {
      margin: 14px 0 0;
      color: #5f4b2c;
      font-size: 16px;
    }

    .hero-address {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 14px 0 0;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(141, 108, 53, 0.1);
      color: #6d542e;
    }

    .hero-address mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .stat-pills {
      padding: 20px;
      display: grid;
      gap: 12px;
      align-content: center;
    }

    .stat-pill {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 14px 16px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(148, 108, 45, 0.12), rgba(255, 255, 255, 0.9));
    }

    .stat-pill strong {
      font-size: 28px;
      color: #5c431e;
    }

    .stat-pill span {
      color: #7a6041;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .tree-shell {
      position: relative;
      padding: 28px;
      overflow: hidden;
    }

    .tree-shell::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top right, rgba(191, 153, 88, 0.1), transparent 24%),
        linear-gradient(90deg, rgba(185, 149, 88, 0.06), transparent 120px);
      pointer-events: none;
    }

    .tree-legend {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.88);
      border: 1px solid rgba(113, 84, 42, 0.12);
      color: #6f5a45;
      font-size: 13px;
    }

    .legend-swatch {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .legend-swatch.male { background: #1e6fb7; }
    .legend-swatch.female { background: #c54d7a; }
    .legend-swatch.neutral { background: #9e9e9e; }

    .section-head {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 12px;
      margin-bottom: 16px;
    }

    .section-label {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      color: #8d6c35;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .section-head h2 {
      margin: 0;
      font-size: 24px;
      color: #302112;
    }

    .section-count {
      color: #75604c;
      font-size: 14px;
    }

    .founder-cluster {
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }

    .generation-section + .generation-section {
      margin-top: 28px;
      padding-top: 24px;
      border-top: 1px dashed rgba(121, 92, 51, 0.25);
    }

    .generation-section {
      position: relative;
      padding-left: 28px;
    }

    .generation-marker {
      position: absolute;
      left: 0;
      top: 14px;
      bottom: -14px;
      width: 2px;
      background: linear-gradient(180deg, rgba(148,108,45,.36), rgba(148,108,45,.06));
    }

    .generation-marker::before {
      content: '';
      position: absolute;
      left: 50%;
      top: -2px;
      width: 12px;
      height: 12px;
      transform: translateX(-50%);
      border-radius: 50%;
      background: #f6d99a;
      box-shadow: 0 0 0 4px rgba(246,217,154,.28);
    }

    .generation-surface {
      position: relative;
      z-index: 1;
      padding: 12px;
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,.72) 0%, rgba(252,247,239,.9) 100%);
      border: 1px solid rgba(101, 77, 46, 0.1);
    }

    .generation-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
    }

    .member-card {
      flex: 1 1 250px;
      max-width: 340px;
      position: relative;
      border-radius: 22px;
      border: 1px solid rgba(101, 77, 46, 0.14);
      background: linear-gradient(180deg, #fffefb 0%, #fbf6ee 100%);
      padding: 18px 18px 16px;
      box-shadow: 0 10px 24px rgba(58, 38, 13, 0.07);
      min-height: 120px;
      overflow: hidden;
    }

    .member-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: #9e9e9e;
    }

    .member-card.male::before {
      background: #1e6fb7;
    }

    .member-card.female::before {
      background: #c54d7a;
    }

    .member-card.founder {
      max-width: 520px;
      background: linear-gradient(180deg, #fffaf0 0%, #f8f1e1 100%);
    }

    .member-badge {
      display: inline-flex;
      margin-bottom: 10px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(141, 108, 53, 0.12);
      color: #76572a;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .member-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 18px;
      font-weight: 700;
      color: #24190f;
    }

    .member-meta {
      margin-top: 6px;
      color: #6f5a45;
      font-size: 14px;
    }

    .spouse-stack {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(101, 77, 46, 0.1);
    }

    .spouse-label {
      margin-bottom: 10px;
      color: #8d6c35;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .spouse-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .spouse-chip {
      display: grid;
      gap: 2px;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(123, 96, 62, 0.08);
      border-left: 4px solid #9e9e9e;
      min-width: 140px;
    }

    .spouse-chip.male {
      border-left-color: #1e6fb7;
    }

    .spouse-chip.female {
      border-left-color: #c54d7a;
    }

    .spouse-chip small {
      color: #7a6041;
      font-size: 12px;
    }

    .martyr {
      color: #c28a13;
    }

    .public-footer {
      margin-top: 24px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .public-footer p {
      margin: 0;
      color: #6f5a45;
    }

    @media (max-width: 860px) {
      .hero {
        grid-template-columns: 1fr;
      }

      .tree-shell,
      .hero-copy,
      .stat-pills,
      .public-footer {
        border-radius: 20px;
      }

      .tree-shell {
        padding: 20px;
      }

      .generation-section {
        padding-left: 18px;
      }
    }

    @media (max-width: 560px) {
      .member-card {
        max-width: none;
        flex-basis: 100%;
      }

      .section-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .public-footer {
        align-items: stretch;
      }

      .public-footer button {
        width: 100%;
        justify-content: center;
      }
    }
  `],
})
export class PublicTreePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  loading = true;
  error = '';
  family: PublicFamily | null = null;
  members: PublicMember[] = [];
  rootMember: PublicMember | null = null;
  rootSpouses: PublicMember[] = [];
  spousesByMember: Record<string, PublicMember[]> = {};
  generations: PublicMember[][] = [];
  generationCount = 0;
  spouseCount = 0;

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error = 'Lien ket chia se khong hop le.';
      this.loading = false;
      return;
    }
    this.loadPublicTree(token);
  }

  async loadPublicTree(token: string) {
    try {
      const [family, members] = await Promise.all([
        firstValueFrom(this.http.get<PublicFamily>(`${environment.apiBaseUrl}/families/public/${token}`)),
        firstValueFrom(this.http.get<PublicMember[]>(`${environment.apiBaseUrl}/families/public/${token}/members`)),
      ]);

      this.family = family;
      this.members = members || [];
      this.buildTree();
    } catch (e: any) {
      this.error = e?.error?.message || 'Lien ket chia se khong hop le hoac da het han.';
    } finally {
      this.loading = false;
    }
  }

  private buildTree() {
    if (!this.members.length) {
      this.rootMember = null;
      this.rootSpouses = [];
      this.generations = [];
      this.spousesByMember = {};
      this.generationCount = 0;
      this.spouseCount = 0;
      return;
    }

    this.spousesByMember = buildSpouseMap(this.members);
    this.rootMember = findTreeRoot(this.members, this.family?.rootMember || null);
    this.rootSpouses = this.rootMember ? (this.spousesByMember[this.rootMember.id] || []) : [];
    this.generations = this.rootMember ? buildLevels(this.members, this.rootMember, this.spousesByMember) : [];
    this.generationCount = this.rootMember ? this.generations.length + 1 : 0;

    const uniquePairs = new Set<string>();
    Object.entries(this.spousesByMember).forEach(([memberId, spouses]) => {
      spouses.forEach((spouse) => {
        const left = [memberId, spouse.id].sort().join(':');
        uniquePairs.add(left);
      });
    });
    this.spouseCount = uniquePairs.size;
  }

  generationLabel(index: number): string {
    return `Doi ${index + 2}`;
  }

  lifespanText(member: PublicMember | null): string {
    if (!member) return '';
    const parts: string[] = [];
    if (member.dob) parts.push(new Date(member.dob).getFullYear().toString());
    if (member.dod) {
      if (parts.length) parts.push('-');
      parts.push(new Date(member.dod).getFullYear().toString());
    }
    return parts.join(' ');
  }

  visibleSpouses(member: PublicMember, level?: PublicMember[]): PublicMember[] {
    const spouses = this.spousesByMember[member.id] || [];
    if (!level?.length) return spouses;
    const levelIds = new Set(level.map((item) => item.id));
    return spouses.filter((spouse) => !levelIds.has(spouse.id));
  }
}
