import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BackgroundService } from '../../backgrounds/services/background';
import type { BackgroundImage } from '../../backgrounds/models/background.model';

@Component({
  selector: 'app-backgrounds-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './backgrounds-page.html',
  styles: [`
    .shell{padding:16px}
    .toolbar{display:flex; gap:8px; align-items:center; margin-bottom:12px}
    .grid{display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:12px}
    .item{position:relative; border:1px solid #ddd; border-radius:8px; overflow:hidden}
    .item img{width:100%; height:140px; object-fit:cover}
    .item .name{padding:8px}
    .item .actions{position:absolute; top:6px; right:6px}
  `]
})
export class BackgroundsPage {
  private readonly api = inject(BackgroundService);
  items: BackgroundImage[] = [];

  ngOnInit(){ this.load(); }
  load(){ this.api.list().subscribe(list => this.items = list || []); }
  fileUrl(it: BackgroundImage){ return this.api.fileUrl(it.id); }
  onFile(ev: Event){ const input = ev.target as HTMLInputElement; const f = input.files?.[0]; if (!f) return; this.api.upload(f).subscribe({ next: _ => this.load() }); input.value=''; }
  remove(it: BackgroundImage){ if (!confirm(`Xóa '${it.name}'?`)) return; const prev=this.items.slice(); this.items=this.items.filter(x=>x.id!==it.id); this.api.remove(it.id).subscribe({ error: _=> this.items=prev }); }
}
