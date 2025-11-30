import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface PricingPlan {
  name: string;
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
    FormsModule,
    RouterModule,
  ],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss']
})
export class LandingPage {
  mobileMenuOpen = false;
  
  contactForm = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };

  pricingPlans: PricingPlan[] = [
    {
      name: 'Dùng thử',
      price: 'Miễn phí',
      period: '30 ngày',
      features: [
        '30 thành viên',
        '1 quản trị viên',
        'Cây phả đồ cơ bản',
        'Album ảnh cơ bản'
      ],
      ctaText: 'Dùng thử ngay'
    },
    {
      name: 'Cơ bản',
      price: '1.500.000đ',
      originalPrice: '2.000.000đ',
      period: '12 tháng',
      features: [
        '300 thành viên',
        '3 quản trị viên',
        'Cây phả đồ đầy đủ',
        '2GB dung lượng album',
        'Trang chủ dòng họ',
        'Sự kiện và lịch'
      ],
      recommended: true,
      ctaText: 'Đăng ký ngay'
    },
    {
      name: 'Nâng cao',
      price: '2.000.000đ',
      originalPrice: '2.500.000đ',
      period: '12 tháng',
      features: [
        '500 thành viên',
        '5 quản trị viên',
        'Cây phả đồ nâng cao',
        '5GB dung lượng album',
        'Trang chủ dòng họ',
        'Sự kiện và lịch',
        'Hỗ trợ ưu tiên'
      ],
      ctaText: 'Đăng ký ngay'
    },
    {
      name: 'Không giới hạn',
      price: '3.500.000đ',
      originalPrice: '5.000.000đ',
      period: '12 tháng',
      features: [
        'Không giới hạn thành viên',
        '10 quản trị viên',
        'Tất cả tính năng',
        '10GB dung lượng album',
        'Tùy chỉnh giao diện',
        'Hỗ trợ 24/7',
        'Tư vấn chuyên sâu'
      ],
      ctaText: 'Liên hệ ngay'
    }
  ];

  features: Feature[] = [
    {
      icon: 'account_tree',
      title: 'Cây phả đồ trực quan',
      description: 'Hiển thị cây gia phả sinh động với nhiều thế hệ, dễ dàng xem và quản lý thông tin dòng họ'
    },
    {
      icon: 'cloud_upload',
      title: 'Lưu trữ trực tuyến',
      description: 'Dữ liệu được lưu trữ an toàn trên cloud, truy cập mọi lúc mọi nơi từ mọi thiết bị'
    },
    {
      icon: 'people',
      title: 'Quản lý thành viên',
      description: 'Thêm, sửa, xóa thông tin thành viên dễ dàng với giao diện thân thiện'
    },
    {
      icon: 'photo_library',
      title: 'Album ảnh gia đình',
      description: 'Lưu trữ và chia sẻ kỷ niệm đẹp của dòng họ qua từng thế hệ'
    },
    {
      icon: 'event',
      title: 'Lịch sự kiện',
      description: 'Ghi nhớ và thông báo các ngày lễ, kỷ niệm quan trọng của dòng họ'
    },
    {
      icon: 'security',
      title: 'Bảo mật cao',
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
  
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    this.mobileMenuOpen = false; // Close mobile menu after navigation
  }

  submitContact() {
    console.log('Contact form submitted:', this.contactForm);
    // TODO: Implement actual form submission
    alert('Cảm ơn bạn đã quan tâm! Chúng tôi sẽ liên hệ với bạn sớm nhất.');
    this.contactForm = { name: '', email: '', phone: '', message: '' };
  }

  selectPlan(plan: PricingPlan) {
    console.log('Selected plan:', plan);
    // TODO: Implement plan selection/registration
    if (plan.name === 'Dùng thử') {
      alert('Chuyển đến trang đăng ký dùng thử...');
    } else {
      alert(`Chuyển đến trang đăng ký gói ${plan.name}...`);
    }
  }
}
