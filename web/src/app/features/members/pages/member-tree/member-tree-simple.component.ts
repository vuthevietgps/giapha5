/* Member tree feature removed. All previous code commented out to exclude from build.
// Member tree feature removed. File intentionally left blank.
  name: string;
  avatar?: string;
  year?: string;
  gender: 'male' | 'female';
  father?: string;
  mother?: string;
  spouse?: string;
  dob?: string;
}

interface TreeCouple {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  male?: TreeMember;
  female?: TreeMember;
  extraWives?: TreeMember[];
  children: TreeCouple[];
  level: number;
  color: string;
}

interface TreeConnection {
  path: string;
  color: string;
}

@Component({
  selector: 'app-member-tree-simple',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatMenuModule,
  ],
  template: `
    <mat-card class="tree-card">
      <h2>Cây gia phả (Phiên bản đơn giản)</h2>
      
      <div class="controls">
        <mat-form-field>
          <mat-label>Dòng họ</mat-label>
          <mat-select [(value)]="selectedFamilyId" (selectionChange)="loadFamily()">
            <mat-option *ngFor="let f of families" [value]="f.id">{{f.name}}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-button (click)="loadFamily()">Tải lại</button>
      </div>

      <div class="tree-container" [style.width.px]="treeWidth" [style.height.px]="treeHeight">
        <!-- SVG Connections -->
        <svg class="connections" [attr.width]="treeWidth" [attr.height]="treeHeight">
          <path *ngFor="let conn of connections" 
                [attr.d]="conn.path" 
                [attr.stroke]="conn.color" 
                stroke-width="2" 
                fill="none"/>
        </svg>
        
        <!-- Member boxes -->
        <div *ngFor="let couple of allCouples" 
             class="couple-box"
             [style.left.px]="couple.x"
             [style.top.px]="couple.y"
             [style.width.px]="couple.width"
             [style.height.px]="couple.height"
             [style.border-left]="'4px solid ' + couple.color">
          
          <!-- Male -->
          <div *ngIf="couple.male" class="person male">
            <img [src]="couple.male.avatar || 'assets/avatar-male.svg'" class="avatar">
            <div class="info">
              <div class="name">{{couple.male.name}}</div>
              <div class="year">{{couple.male.year}}</div>
            </div>
          </div>
          
          <!-- Female(s) -->
          <div class="wives">
            <div *ngIf="couple.female" class="person female">
              <img [src]="couple.female.avatar || 'assets/avatar-female.svg'" class="avatar">
              <div class="info">
                <div class="name">{{couple.female.name}}</div>
                <div class="year">{{couple.female.year}}</div>
              </div>
            </div>
            <div *ngFor="let wife of couple.extraWives" class="person female">
              <img [src]="wife.avatar || 'assets/avatar-female.svg'" class="avatar">
              <div class="info">
                <div class="name">{{wife.name}}</div>
                <div class="year">{{wife.year}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </mat-card>
  `,
  styles: [`
    .tree-card { margin: 16px; }
    .controls { display: flex; gap: 16px; margin-bottom: 16px; }
    .tree-container { 
      position: relative; 
      border: 1px solid #ccc; 
      overflow: auto;
      min-height: 400px;
    }
    .connections { position: absolute; top: 0; left: 0; z-index: 1; }
    .couple-box { 
      position: absolute; 
      background: white; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
      padding: 8px; 
      z-index: 2;
    }
    .person { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; }
    .info { display: flex; flex-direction: column; }
    .name { font-weight: bold; }
    .year { font-size: 12px; color: #666; }
    .male { justify-content: center; }
    .wives { display: flex; flex-direction: column; }
  `]
})
export class MemberTreeSimpleComponent implements OnInit {
  private readonly familyService = inject(FamilyService);
  private readonly memberService = inject(MemberService);
  private readonly snack = inject(MatSnackBar);

  families: Family[] = [];
  selectedFamilyId: string | null = null;
  
  // SIMPLE STATE - Everything in component
  allCouples: TreeCouple[] = [];
  connections: TreeConnection[] = [];
  treeWidth = 800;
  treeHeight = 600;
  
  // CONSTANTS
  private readonly COLORS = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA'];
  private readonly BOX_WIDTH = 200;
  private readonly BOX_HEIGHT = 80;
  private readonly GAP_X = 50;
  private readonly GAP_Y = 100;

  ngOnInit() {
    this.loadFamilies();
  }

  private loadFamilies() {
    this.familyService.list().subscribe(families => {
      this.families = families;
      if (families.length) {
        this.selectedFamilyId = families[0].id || null;
        this.loadFamily();
      }
    });
  }

  loadFamily() {
    if (!this.selectedFamilyId) return;
    
    this.memberService.listByFamily(this.selectedFamilyId).subscribe({
      next: members => this.buildTree(members),
      error: () => this.snack.open('Lỗi tải dữ liệu', 'Đóng', { duration: 2000 })
    });
  }

  // ALL LOGIC IN ONE PLACE - Easy to debug and modify
  private buildTree(rawMembers: Member[]) {
    // 1. CONVERT TO SIMPLE FORMAT
    const members = this.convertMembers(rawMembers);
    
    // 2. BUILD TREE STRUCTURE  
    const roots = this.findRoots(members);
    const tree = this.buildTreeRecursive(roots, members, 0);
    
    // 3. CALCULATE LAYOUT
    this.calculateLayout(tree);
    
    // 4. GENERATE CONNECTIONS
    this.generateConnections(tree);
    
    // 5. UPDATE DISPLAY
    this.allCouples = this.flattenTree(tree);
    this.updateCanvasSize();
  }

  private convertMembers(raw: Member[]): TreeMember[] {
    return raw.map(m => ({
      id: m.id!,
      name: m.fullName,
      avatar: m.photoUrl,
      year: m.dob ? new Date(m.dob).getFullYear().toString() : '',
      gender: m.gender as 'male' | 'female',
      father: m.father,
      mother: m.mother,
      spouse: m.spouse,
      dob: m.dob
    }));
  }

  private findRoots(members: TreeMember[]): TreeCouple[] {
    const memberMap = new Map(members.map(m => [m.id, m]));
    const roots: TreeCouple[] = [];
    
    // Find males without fathers
    const rootMales = members.filter(m => m.gender === 'male' && !m.father);
    
    rootMales.forEach((male, index) => {
      const spouse = male.spouse ? memberMap.get(male.spouse) : undefined;
      roots.push({
        id: `root-${male.id}`,
        x: 0, y: 0, width: this.BOX_WIDTH, height: this.BOX_HEIGHT,
        male,
        female: spouse?.gender === 'female' ? spouse : undefined,
        extraWives: [], // TODO: Handle multiple wives
        children: [],
        level: 0,
        color: this.COLORS[index % this.COLORS.length]
      });
    });
    
    return roots;
  }

  private buildTreeRecursive(parents: TreeCouple[], allMembers: TreeMember[], level: number): TreeCouple[] {
    const memberMap = new Map(allMembers.map(m => [m.id, m]));
    
    parents.forEach(parent => {
      const fatherId = parent.male?.id;
      const motherId = parent.female?.id;
      
      // Find children
      const children = allMembers.filter(m => 
        (fatherId && m.father === fatherId) || 
        (motherId && m.mother === motherId)
      );
      
      // Create couples for children
      const childCouples: TreeCouple[] = [];
      children.forEach((child, index) => {
        const spouse = child.spouse ? memberMap.get(child.spouse) : undefined;
        childCouples.push({
          id: `child-${child.id}`,
          x: 0, y: 0, width: this.BOX_WIDTH, height: this.BOX_HEIGHT,
          male: child.gender === 'male' ? child : spouse,
          female: child.gender === 'female' ? child : (spouse?.gender === 'female' ? spouse : undefined),
          extraWives: [],
          children: [],
          level: level + 1,
          color: parent.color // SAME COLOR AS PARENT - Solves color consistency issue
        });
      });
      
      parent.children = childCouples;
      
      // Recursive build
      if (childCouples.length > 0 && level < 5) { // Max 5 levels
        this.buildTreeRecursive(childCouples, allMembers, level + 1);
      }
    });
    
    return parents;
  }

  private calculateLayout(tree: TreeCouple[]) {
    let currentY = 50;
    const levelCouples = new Map<number, TreeCouple[]>();
    
    // Group by levels
    this.collectByLevel(tree, levelCouples);
    
    // Position each level
    for (const [level, couples] of levelCouples) {
      let currentX = 50;
      couples.forEach(couple => {
        couple.x = currentX;
        couple.y = currentY;
        currentX += this.BOX_WIDTH + this.GAP_X;
      });
      currentY += this.BOX_HEIGHT + this.GAP_Y;
    }
  }

  private collectByLevel(couples: TreeCouple[], levelMap: Map<number, TreeCouple[]>) {
    couples.forEach(couple => {
      const existing = levelMap.get(couple.level) || [];
      existing.push(couple);
      levelMap.set(couple.level, existing);
      
      if (couple.children.length > 0) {
        this.collectByLevel(couple.children, levelMap);
      }
    });
  }

  private generateConnections(tree: TreeCouple[]) {
    this.connections = [];
    this.generateConnectionsRecursive(tree);
  }

  private generateConnectionsRecursive(couples: TreeCouple[]) {
    couples.forEach(parent => {
      if (parent.children.length > 0) {
        const parentCenterX = parent.x + parent.width / 2;
        const parentBottomY = parent.y + parent.height;
        
        parent.children.forEach(child => {
          const childCenterX = child.x + child.width / 2;
          const childTopY = child.y;
          
          // Simple vertical line + horizontal line
          const midY = parentBottomY + (childTopY - parentBottomY) / 2;
          
          this.connections.push({
            path: `M ${parentCenterX},${parentBottomY} L ${parentCenterX},${midY} L ${childCenterX},${midY} L ${childCenterX},${childTopY}`,
            color: parent.color
          });
        });
        
        // Recursive
        this.generateConnectionsRecursive(parent.children);
      }
    });
  }

  private flattenTree(tree: TreeCouple[]): TreeCouple[] {
    const result: TreeCouple[] = [];
    
    const flatten = (couples: TreeCouple[]) => {
      couples.forEach(couple => {
        result.push(couple);
        if (couple.children.length > 0) {
          flatten(couple.children);
        }
      });
    };
    
    flatten(tree);
    return result;
  }

  private updateCanvasSize() {
    if (this.allCouples.length === 0) return;
    
    const maxX = Math.max(...this.allCouples.map(c => c.x + c.width));
    const maxY = Math.max(...this.allCouples.map(c => c.y + c.height));
    
    this.treeWidth = maxX + 50;
    this.treeHeight = maxY + 50;
  }
}*/