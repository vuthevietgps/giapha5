import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { LandingPage } from './features/landing/landing-page';
import { LoginPage } from './features/auth/login-page';
import { AuthService } from './core/services/auth.service';
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

// Auth guard function
const authGuard = () => {
	const authService = inject(AuthService);
	const router = inject(Router);
	
	if (authService.isLoggedIn()) {
		return true;
	}
	
	router.navigate(['/login']);
	return false;
};

export const routes: Routes = [
	{ path: '', component: LandingPage, title: 'Trang chủ - Gia Phả Số' },
	{ path: 'home', component: LandingPage, title: 'Trang chủ - Gia Phả Số' },
	{ path: 'login', component: LoginPage, title: 'Đăng nhập - Gia Phả Số' },
	{ path: 'users', component: UserList, title: 'Quản lý người dùng', canActivate: [authGuard] },
	{ path: 'users/new', component: UserForm, title: 'Thêm người dùng', canActivate: [authGuard] },
	{ path: 'users/:id/edit', component: UserForm, title: 'Sửa người dùng', canActivate: [authGuard] },
  { path: 'families', component: FamilyList, title: 'Quản lý dòng họ', canActivate: [authGuard] },
  { path: 'families/new', component: FamilyForm, title: 'Thêm dòng họ', canActivate: [authGuard] },
  { path: 'families/:id/edit', component: FamilyForm, title: 'Sửa dòng họ', canActivate: [authGuard] },
	{ path: 'positions', component: PositionList, title: 'Quản lý chức vụ', canActivate: [authGuard] },
	{ path: 'positions/new', component: PositionForm, title: 'Thêm chức vụ', canActivate: [authGuard] },
	{ path: 'positions/:id/edit', component: PositionForm, title: 'Sửa chức vụ', canActivate: [authGuard] },
	{ path: 'members', component: MemberList, title: 'Quản lý thành viên', canActivate: [authGuard] },
	{ path: 'members/new', component: MemberForm, title: 'Thêm thành viên', canActivate: [authGuard] },
	{ path: 'members/:id/edit', component: MemberForm, title: 'Sửa thành viên', canActivate: [authGuard] },
	{ path: 'posts', component: PostList, title: 'Bài viết', canActivate: [authGuard] },
	{ path: 'posts/:id', component: PostDetail, title: 'Bài viết', canActivate: [authGuard] },
	{ path: 'members/tree', component: TreePage, title: 'Cây gia phả', canActivate: [authGuard] },
	{ path: 'members/branch', component: BranchPage, title: 'Nhánh quan tâm', canActivate: [authGuard] },
	{ path: 'members/branch-calendar', component: BranchCalendarPage, title: 'Lịch quan trọng (nhánh)', canActivate: [authGuard] },
	{ path: 'calendar', component: CalendarPage, title: 'Lịch vạn niên', canActivate: [authGuard] },
	{ path: 'backgrounds', component: BackgroundsPage, title: 'Ảnh nền', canActivate: [authGuard] },
];
