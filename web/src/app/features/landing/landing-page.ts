import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SubscriptionService, Plan } from '../../core/services/subscription.service';
import { firstValueFrom } from 'rxjs';

interface PricingPlan {
  name: string;
  slug: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
  image: string;
  eyebrow: string;
}

interface Statistic {
  number: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss']
})
export class LandingPage implements OnInit {
  private router = inject(Router);
  private subscriptionService = inject(SubscriptionService);
  private snack = inject(MatSnackBar);
  mobileMenuOpen = false;
  
  contactForm = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };

  pricingPlans: PricingPlan[] = [];

  features: Feature[] = [
    {
      icon: 'account_tree',
      title: 'Cây phả đồ trực quan',
      eyebrow: 'Phả đồ',
      image: '/assets/landing/feature-tree.webp',
      description: 'Hiển thị cây gia phả sinh động với nhiều thế hệ, dễ dàng xem và quản lý thông tin dòng họ'
    },
    {
      icon: 'cloud_upload',
      title: 'Lưu trữ trực tuyến',
      eyebrow: 'Lưu trữ',
      image: '/assets/landing/feature-cloud.webp',
      description: 'Dữ liệu được lưu trữ an toàn trên cloud, truy cập mọi lúc mọi nơi từ mọi thiết bị'
    },
    {
      icon: 'people',
      title: 'Quản lý thành viên',
      eyebrow: 'Hồ sơ',
      image: '/assets/landing/feature-members.webp',
      description: 'Thêm, sửa, xóa thông tin thành viên dễ dàng với giao diện thân thiện'
    },
    {
      icon: 'photo_library',
      title: 'Album ảnh gia đình',
      eyebrow: 'Kỷ niệm',
      image: '/assets/landing/feature-album.webp',
      description: 'Lưu trữ và chia sẻ kỷ niệm đẹp của dòng họ qua từng thế hệ'
    },
    {
      icon: 'event',
      title: 'Lịch sự kiện',
      eyebrow: 'Sự kiện',
      image: '/assets/landing/feature-calendar.webp',
      description: 'Ghi nhớ và thông báo các ngày lễ, kỷ niệm quan trọng của dòng họ'
    },
    {
      icon: 'security',
      title: 'Bảo mật cao',
      eyebrow: 'Bảo mật',
      image: '/assets/landing/feature-security.webp',
      description: 'Dữ liệu được mã hóa và bảo vệ với tiêu chuẩn bảo mật cao nhất'
    }
  ];

  statistics: Statistic[] = [
    {
      number: '10+',
      label: 'Năm kinh nghiệm',
      icon: 'verified'
    },
    {
      number: '500+',
      label: 'Dòng họ tin dùng',
      icon: 'family_restroom'
    },
    {
      number: '50+',
      label: 'Tỉnh thành',
      icon: 'location_city'
    },
    {
      number: '50.000+',
      label: 'Thành viên',
      icon: 'groups'
    }
  ];

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  ngOnInit() {
    this.loadPlans();
  }

  private async loadPlans() {
    try {
      const plans = await firstValueFrom(this.subscriptionService.getPlans());
      this.pricingPlans = plans.map(p => ({
        name: p.name,
        slug: p.slug,
        price: p.price === 0 ? 'Miễn phí' : `${p.price.toLocaleString('vi-VN')}đ`,
        originalPrice: p.originalPrice > p.price ? `${p.originalPrice.toLocaleString('vi-VN')}đ` : undefined,
        period: p.price === 0 ? `${p.durationMonths} ngày` : `${p.durationMonths} tháng`,
        features: p.features,
        recommended: p.slug === 'basic',
        ctaText: p.price === 0 ? 'Dùng thử ngay' : (p.slug === 'unlimited' ? 'Liên hệ ngay' : 'Đăng ký ngay'),
      }));
    } catch {
      // Fallback hardcoded plans if API fails
      this.pricingPlans = [
        { name: 'Dùng thử', slug: 'free', price: 'Miễn phí', period: '30 ngày',
          features: ['30 thành viên', '1 quản trị viên', 'Cây phả đồ cơ bản'], ctaText: 'Dùng thử ngay' },
        { name: 'Cơ bản', slug: 'basic', price: '1.500.000đ', originalPrice: '2.000.000đ', period: '12 tháng',
          features: ['300 thành viên', '3 quản trị viên', 'Cây phả đồ đầy đủ', '2GB album'],
          recommended: true, ctaText: 'Đăng ký ngay' },
        { name: 'Nâng cao', slug: 'advanced', price: '2.000.000đ', originalPrice: '2.500.000đ', period: '12 tháng',
          features: ['500 thành viên', '5 quản trị viên', '5GB album', 'Hỗ trợ ưu tiên'], ctaText: 'Đăng ký ngay' },
        { name: 'Không giới hạn', slug: 'unlimited', price: '3.500.000đ', originalPrice: '5.000.000đ', period: '12 tháng',
          features: ['Không giới hạn thành viên', '10 quản trị viên', 'Tất cả tính năng'], ctaText: 'Liên hệ ngay' },
      ];
    }
  }
  
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.mobileMenuOpen = false; // Close mobile menu after navigation
  }

  submitContact() {
    // TODO: Implement actual form submission
    this.snack.open('Cam on ban da quan tam! Chung toi se lien he voi ban som nhat.', 'Dong', { duration: 2600 });
    this.contactForm = { name: '', email: '', phone: '', message: '' };
  }

  selectPlan(plan: PricingPlan) {
    if (plan.slug === 'unlimited') {
      this.scrollToSection('contact');
    } else {
      this.router.navigate(['/register']);
    }
  }
}
