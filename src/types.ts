export type StudentStatus = "active" | "paused" | "graduated" | "dropped";

export type MilestoneStatus = "not_started" | "in_progress" | "completed";

export type MilestoneKey = "input" | "m1" | "m2" | "m3" | "m4" | "mtr";

export interface Milestone {
  title: string;
  status: MilestoneStatus;
  date: string;
  score: string;
  feedback: string;
  assessor: string;
}

export interface VipGifts {
  backpack: boolean;
  notebook: boolean;
  thermos: boolean;
  poloShirt: boolean;
}

export interface Student {
  id?: string; // Firestore Document ID
  studentId: string; // Mã HV (e.g., TF-2026-001)
  fullName: string; // Họ và tên
  phone: string; // Số điện thoại
  email: string; // Email
  coursePackage: string; // Gói học (e.g., VIP 1-1, SVIP Academic, IELTS VIP)
  startDate: string; // Ngày bắt đầu
  endDate: string; // Ngày kết thúc
  totalSessions: number; // Tổng số buổi học
  attendedSessions: number; // Số buổi đã học
  teacherAdvisor: string; // Giáo viên chủ nhiệm
  academicAdvisor: string; // Học vụ phụ trách
  learningGoal: string; // Lộ trình & Mục tiêu đầu ra
  status: StudentStatus; // Trạng thái học tập
  notes: string; // Ghi chú học vụ chung
  parentFeedback: string; // Ý kiến học viên / phụ huynh
  academicActions: string; // Hành động học vụ hỗ trợ
  vipGifts: VipGifts; // Quà tặng VIP
  monthlyReports: Record<string, boolean>; // Đánh dấu các báo cáo tháng đã gửi (e.g., "05/2026": true)
  milestones: Partial<Record<MilestoneKey, Milestone>>; // 5 cột mốc học tập
  classTypes?: string[]; // Danh sách loại lớp (tối đa chọn 2)
  level?: string; // Level hiện tại
  
  // MTT specific tracking
  mttDone?: boolean; // Học viên đã làm MTT chưa
  mtrDone?: boolean; // Có MTR chưa

  // FT specific tracking
  ftNotified?: boolean; // Đã thông báo test chưa
  ftBooked?: boolean; // Đã book test chưa
  ftBookedDate?: string; // Book ngày nào
  ftDone?: boolean; // Đã test chưa

  // Ending course specific tracking
  courseFinished?: boolean; // Đã kết thúc chưa
  courseRenewed?: boolean; // Có renew không

  createdAt: string;
  updatedAt: string;
}
