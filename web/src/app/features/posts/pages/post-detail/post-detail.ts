import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PostService } from '../../services/post';
import type { PostModel } from '../../models/post.model';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
})
export class PostDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);

  post?: PostModel;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.postService.get(id).subscribe(res => this.post = res);
    }
  }
}
