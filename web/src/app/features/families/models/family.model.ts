export interface Family {
  id?: string;
  name: string; // Tên dòng họ
  contactName: string; // Tên người liên hệ
  contactPhone?: string; // SĐT người liên hệ
  address?: string; // Địa chỉ dòng họ
  rootMember?: string;
  shareToken?: string;
  isPublic?: boolean;
}
