export interface Family {
  id?: string;
  name: string; // Tên dòng họ
  contactName: string; // Tên người liên hệ
  contactPhone?: string; // SĐT người liên hệ
  address?: string; // Địa chỉ dòng họ
  adminId?: string; // ID admin quản lý dòng họ
  description?: string; // Mô tả dòng họ
  status?: 'active' | 'inactive' | 'expired'; // Trạng thái dòng họ
  subscriptionStartDate?: Date; // Ngày bắt đầu subscription
  subscriptionEndDate?: Date; // Ngày kết thúc subscription
  memberCount?: number; // Số lượng thành viên
  createdAt?: Date;
  updatedAt?: Date;
}
