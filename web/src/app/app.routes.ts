import { Routes } from '@angular/router';
import { UserList } from './features/users/pages/user-list/user-list';
import { UserForm } from './features/users/pages/user-form/user-form';
import { FamilyList } from './features/families/pages/family-list/family-list';
import { FamilyForm } from './features/families/pages/family-form/family-form';
import { PositionList } from './features/positions/pages/position-list/position-list';
import { PositionForm } from './features/positions/pages/position-form/position-form';
import { MemberList } from './features/members/pages/member-list/member-list';
import { MemberForm } from './features/members/pages/member-form/member-form';
import { TreePage } from './features/members/pages/member-tree/tree-page';
import { PostList } from './features/posts/pages/post-list/post-list';
import { PostDetail } from './features/posts/pages/post-detail/post-detail';
import { CalendarPage } from './features/calendar/calendar-page';
import { BranchPage } from './features/members/pages/member-branch/branch-page';
import { BranchCalendarPage } from './features/members/pages/member-branch/branch-calendar-page';
import { BackgroundsPage } from './features/backgrounds/pages/backgrounds-page';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'users' },
	{ path: 'users', component: UserList, title: 'Quản lý người dùng' },
	{ path: 'users/new', component: UserForm, title: 'Thêm người dùng' },
	{ path: 'users/:id/edit', component: UserForm, title: 'Sửa người dùng' },
  { path: 'families', component: FamilyList, title: 'Quản lý dòng họ' },
  { path: 'families/new', component: FamilyForm, title: 'Thêm dòng họ' },
  { path: 'families/:id/edit', component: FamilyForm, title: 'Sửa dòng họ' },
	{ path: 'positions', component: PositionList, title: 'Quản lý chức vụ' },
	{ path: 'positions/new', component: PositionForm, title: 'Thêm chức vụ' },
	{ path: 'positions/:id/edit', component: PositionForm, title: 'Sửa chức vụ' },
	{ path: 'members', component: MemberList, title: 'Quản lý thành viên' },
	{ path: 'members/new', component: MemberForm, title: 'Thêm thành viên' },
	{ path: 'members/:id/edit', component: MemberForm, title: 'Sửa thành viên' },
	{ path: 'posts', component: PostList, title: 'Bài viết' },
	{ path: 'posts/:id', component: PostDetail, title: 'Bài viết' },
	{ path: 'members/tree', component: TreePage, title: 'Cây gia phả' },
	{ path: 'members/branch', component: BranchPage, title: 'Nhánh quan tâm' },
	{ path: 'members/branch-calendar', component: BranchCalendarPage, title: 'Lịch quan trọng (nhánh)' },
	{ path: 'calendar', component: CalendarPage, title: 'Lịch vạn niên' },
	{ path: 'backgrounds', component: BackgroundsPage, title: 'Ảnh nền' },
];
