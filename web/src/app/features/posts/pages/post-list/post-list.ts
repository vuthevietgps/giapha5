import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PostService } from '../../services/post';
import type { PostModel } from '../../models/post.model';
import { PostFormDialog } from '../post-form/post-form';
import { PermissionService } from '../../../../core/services/permission.service';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatToolbarModule,
    MatDialogModule,
  ],
  templateUrl: './post-list.html',
  styleUrl: './post-list.scss',
})
export class PostList {
  private readonly postService = inject(PostService);
  private readonly dialog = inject(MatDialog);
  private readonly permissionService = inject(PermissionService);

  posts: PostModel[] = [];
  readonly canCreatePosts = this.permissionService.can('posts', 'create');

  constructor() {
    this.load();
  }

  load() {
    this.postService.list().subscribe(res => this.posts = res);
  }

  openCreateDialog() {
    const ref = this.dialog.open(PostFormDialog, { width: '720px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.postService.create(result).subscribe(() => this.load());
    });
  }
}
