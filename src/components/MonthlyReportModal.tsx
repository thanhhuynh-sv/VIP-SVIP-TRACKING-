import React, { useState } from "react";
import { X, Download, FileSpreadsheet, PieChart, Users, CheckCircle, PauseCircle, LogOut, Award, Calendar, ChevronRight } from "lucide-react";
import { Student, MilestoneKey, Milestone } from "../types";
import { CLASS_TYPES, getClassTypeStyles } from "./StudentModal";

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
}

// Utility functions to extract details dynamically if not stored explicitly
export const getStudentClassTypes = (student: Student): string[] => {
  if (student.classTypes && student.classTypes.length > 0) {
    return student.classTypes;
  }
  if (student.coursePackage) {
    const match = student.coursePackage.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    if (match && match[2]) {
      return match[2].split(",").map(s => s.trim());
    }
  }
  return [];
};

export const getStudentLevel = (student: Student): string => {
  if (student.level) return student.level;
  if (student.coursePackage) {
    const match = student.coursePackage.match(/^([^(]+)(?:\(([^)]+)\))?$/);
    if (match) return match[1].trim();
    return student.coursePackage;
  }
  return "";
};

export default function MonthlyReportModal({ isOpen, onClose, students }: MonthlyReportModalProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "milestones">("matrix");

  if (!isOpen) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed, e.g. 6 = July
  const currentMonthYear = now.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });

  // 1. Filter out students who graduated in previous months
  const filteredStudents = students.filter(student => {
    if (student.status !== "graduated") return true;
    if (!student.endDate || student.endDate.length < 7) return true; // keep if no endDate specified
    
    const parts = student.endDate.split("-");
    if (parts.length < 2) return true;
    const endYear = parseInt(parts[0], 10);
    const endMonth = parseInt(parts[1], 10) - 1; // 0-indexed to match currentMonth
    
    // Exclude if graduation year/month is strictly before current year/month
    if (endYear < currentYear) return false;
    if (endYear === currentYear && endMonth < currentMonth) return false;
    
    return true;
  });

  // 2. Calculate General Totals based on filtered list
  const activeCount = filteredStudents.filter(s => s.status === "active").length;
  const pausedCount = filteredStudents.filter(s => s.status === "paused").length;
  const graduatedCount = filteredStudents.filter(s => s.status === "graduated").length;
  const droppedCount = filteredStudents.filter(s => s.status === "dropped").length;

  // 3. Initialize matrix statistics for Class Types
  const reportData: Record<string, { active: number, paused: number, graduated: number, dropped: number, total: number }> = {};
  
  CLASS_TYPES.forEach(type => {
    reportData[type] = { active: 0, paused: 0, graduated: 0, dropped: 0, total: 0 };
  });

  // Count each student based on their class types
  filteredStudents.forEach(student => {
    const sTypes = getStudentClassTypes(student);
    sTypes.forEach(type => {
      if (reportData[type]) {
        if (student.status === "active") reportData[type].active++;
        else if (student.status === "paused") reportData[type].paused++;
        else if (student.status === "graduated") reportData[type].graduated++;
        else if (student.status === "dropped") reportData[type].dropped++;
        
        reportData[type].total++;
      }
    });
  });

  // 3b. Calculate Custom Classification Matrix Stats (VIP/SVIP vs Standard/Non-Standard)
  // Cases marked as KOL should be calculated normally into VIP and SVIP classes.
  const matrixStats = {
    VIP: {
      "STANDARD": { active: 0, paused: 0, finished: 0, total: 0 },
      "NON STANDARD": { active: 0, paused: 0, finished: 0, total: 0 }
    },
    SVIP: {
      "STANDARD": { active: 0, paused: 0, finished: 0, total: 0 },
      "NON STANDARD": { active: 0, paused: 0, finished: 0, total: 0 }
    }
  };

  filteredStudents.forEach(student => {
    const sTypes = getStudentClassTypes(student);
    
    // Determine category: VIP or SVIP
    let isSVIP = false;
    if (
      sTypes.includes("SVIP - Standard") || 
      sTypes.includes("SVIP - Non-Standard") || 
      (student.coursePackage && student.coursePackage.toUpperCase().includes("SVIP"))
    ) {
      isSVIP = true;
    }
    const category = isSVIP ? "SVIP" : "VIP";

    // Determine standard status: STANDARD or NON STANDARD
    let isStandard = true;
    if (
      sTypes.includes("VIP - Non-Standard") || 
      sTypes.includes("SVIP - Non-Standard") || 
      (student.coursePackage && (
        student.coursePackage.toUpperCase().includes("NON-STANDARD") || 
        student.coursePackage.toUpperCase().includes("NON STANDARD")
      ))
    ) {
      isStandard = false;
    }
    const standardType = isStandard ? "STANDARD" : "NON STANDARD";

    // Determine status grouping: "active" (Đang chạy), "paused" (Tạm dừng), "finished" (Kết thúc)
    let statusGroup: "active" | "paused" | "finished" = "active";
    if (student.status === "paused") {
      statusGroup = "paused";
    } else if (student.status === "graduated" || student.status === "dropped" || student.courseFinished) {
      statusGroup = "finished";
    } else if (student.status === "active") {
      statusGroup = "active";
    }

    matrixStats[category][standardType][statusGroup]++;
    matrixStats[category][standardType].total++;
  });

  const totalStats = {
    active: 
      matrixStats.VIP.STANDARD.active + 
      matrixStats.VIP["NON STANDARD"].active + 
      matrixStats.SVIP.STANDARD.active + 
      matrixStats.SVIP["NON STANDARD"].active,
    paused: 
      matrixStats.VIP.STANDARD.paused + 
      matrixStats.VIP["NON STANDARD"].paused + 
      matrixStats.SVIP.STANDARD.paused + 
      matrixStats.SVIP["NON STANDARD"].paused,
    finished: 
      matrixStats.VIP.STANDARD.finished + 
      matrixStats.VIP["NON STANDARD"].finished + 
      matrixStats.SVIP.STANDARD.finished + 
      matrixStats.SVIP["NON STANDARD"].finished,
    total: 
      matrixStats.VIP.STANDARD.total + 
      matrixStats.VIP["NON STANDARD"].total + 
      matrixStats.SVIP.STANDARD.total + 
      matrixStats.SVIP["NON STANDARD"].total
  };

  // 4. Filter students with MTT or FT scheduled in the current month
  const isDateInCurrentMonth = (dateStr?: string): boolean => {
    if (!dateStr || dateStr.length < 7) return false;
    const parts = dateStr.split("-");
    if (parts.length < 2) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    return year === currentYear && month === (currentMonth + 1);
  };

  const mttStudents = filteredStudents.filter(s => {
    if (s.status === "paused") return false;
    const m3 = s.milestones?.m3;
    return m3 && isDateInCurrentMonth(m3.date);
  });

  const ftStudents = filteredStudents.filter(s => {
    if (s.status === "paused") return false;
    const m4 = s.milestones?.m4;
    return m4 && isDateInCurrentMonth(m4.date);
  });

  const renewStudents = filteredStudents.filter(s => {
    if (s.status === "paused") return false;
    return s.courseRenewed && isDateInCurrentMonth(s.endDate);
  });

  // 5. Handle full CSV Export
  const handleExportCSV = () => {
    const csvRows: string[] = [];
    
    // Title section
    csvRows.push("BÁO CÁO THỐNG KÊ HỌC VIÊN CUỐI THÁNG");
    csvRows.push(`Thời gian xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")} - Kỳ báo cáo: Tháng ${currentMonthYear}`);
    csvRows.push("LƯU Ý: Các học viên tốt nghiệp trước tháng này đã được lọc bỏ khỏi danh sách.");
    csvRows.push("");

    // General Summary Section
    csvRows.push("TỔNG QUAN TÌNH TRẠNG HỌC VIÊN THÁNG HIỆN TẠI");
    csvRows.push(`Đang học (Active),${activeCount}`);
    csvRows.push(`Bảo lưu (Paused),${pausedCount}`);
    csvRows.push(`Tốt nghiệp trong tháng (Graduated),${graduatedCount}`);
    csvRows.push(`Nghỉ học (Dropped),${droppedCount}`);
    csvRows.push(`Tổng cộng học viên trong danh sách,${filteredStudents.length}`);
    csvRows.push("");

    // Matrix breakdown by Class Type
    csvRows.push("THỐNG KÊ CHI TIẾT THEO LOẠI LỚP VÀ TÌNH TRẠNG");
    csvRows.push("Loại Lớp,Đang học (Active),Bảo lưu (Paused),Tốt nghiệp tháng này (Graduated),Nghỉ học (Dropped),Tổng cộng");
    
    CLASS_TYPES.forEach(type => {
      const stats = reportData[type];
      csvRows.push(`${type},${stats.active},${stats.paused},${stats.graduated},${stats.dropped},${stats.total}`);
    });
    csvRows.push("");

    // MTT & FT lists summary inside the CSV
    csvRows.push(`DANH SÁCH HỌC VIÊN SẮP THI GIỮA KỲ (MTT) - THÁNG ${currentMonthYear}`);
    csvRows.push("Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Thi MTT,Trạng thái cột mốc,Điểm số");
    if (mttStudents.length === 0) {
      csvRows.push("Không có học viên nào");
    } else {
      mttStudents.forEach(s => {
        const m3 = s.milestones.m3!;
        const statusLabel = m3.status === "completed" ? "Đã đạt" : m3.status === "in_progress" ? "Đang chạy" : "Chưa đạt";
        csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${m3.date}","${statusLabel}","${m3.score || ""}"`);
      });
    }
    csvRows.push("");

    csvRows.push(`DANH SÁCH HỌC VIÊN SẮP THI ĐẦU RA (FT) - THÁNG ${currentMonthYear}`);
    csvRows.push("Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Thi FT,Trạng thái cột mốc,Điểm số");
    if (ftStudents.length === 0) {
      csvRows.push("Không có học viên nào");
    } else {
      ftStudents.forEach(s => {
        const m4 = s.milestones.m4!;
        const statusLabel = m4.status === "completed" ? "Đã đạt" : m4.status === "in_progress" ? "Đang chạy" : "Chưa đạt";
        csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${m4.date}","${statusLabel}","${m4.score || ""}"`);
      });
    }
    csvRows.push("");

    csvRows.push(`DANH SÁCH HỌC VIÊN RENEW KHÓA HỌC - THÁNG ${currentMonthYear}`);
    csvRows.push("Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Kết Thúc,Trạng thái");
    if (renewStudents.length === 0) {
      csvRows.push("Không có học viên nào");
    } else {
      renewStudents.forEach(s => {
        csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${s.endDate || ""}","Đã Renew"`);
      });
    }
    csvRows.push("");

    // Detailed Student List grouped by Class Type
    csvRows.push("DANH SÁCH CHI TIẾT HỌC VIÊN THEO TỪNG LOẠI LỚP");
    csvRows.push("");

    CLASS_TYPES.forEach(type => {
      const typeStudents = filteredStudents.filter(s => getStudentClassTypes(s).includes(type));
      
      csvRows.push(`LOẠI LỚP: ${type.toUpperCase()} (${typeStudents.length} Học viên)`);
      csvRows.push("Mã Học Viên,Họ và Tên,Trình độ (Level),Loại Lớp,Trạng Thái,Ngày Bắt Đầu,Ngày Kết Thúc,Số Buổi Đã Học,Tổng Số Buổi,Giáo Viên Chủ Nhiệm,Học Vụ Phụ Trách");
      
      if (typeStudents.length === 0) {
        csvRows.push("(Không có học viên nào)");
      } else {
        typeStudents.forEach(s => {
          const sTypes = getStudentClassTypes(s).join(" - ");
          const sLvl = getStudentLevel(s);
          const statusLabel = 
            s.status === "active" ? "Đang học (Active)" : 
            s.status === "paused" ? "Bảo lưu (Paused)" : 
            s.status === "graduated" ? "Đã tốt nghiệp (Graduated)" : "Nghỉ học (Dropped)";
          
          csvRows.push([
            `"${s.studentId.replace(/"/g, '""')}"`,
            `"${s.fullName.replace(/"/g, '""')}"`,
            `"${sLvl.replace(/"/g, '""')}"`,
            `"${sTypes.replace(/"/g, '""')}"`,
            `"${statusLabel}"`,
            `"${s.startDate || ""}"`,
            `"${s.endDate || ""}"`,
            s.attendedSessions,
            s.totalSessions,
            `"${(s.teacherAdvisor || "").replace(/"/g, '""')}"`,
            `"${(s.academicAdvisor || "").replace(/"/g, '""')}"`
          ].join(","));
        });
      }
      csvRows.push(""); // spacer
    });

    const csvContent = csvRows.join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const formattedDateName = currentMonthYear.replace("/", "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao-cao-cuoi-thang-TalkFirst-${formattedDateName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to export only MTT list
  const handleExportMTT = () => {
    const csvRows = [
      `DANH SÁCH HỌC VIÊN SẮP THI GIỮA KỲ (MTT) - THÁNG ${currentMonthYear}`,
      `Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")}`,
      "",
      "Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Thi MTT,Trạng thái,Điểm số,Người đánh giá/GV,Học Vụ Phụ Trách"
    ];

    mttStudents.forEach(s => {
      const m3 = s.milestones.m3!;
      const statusLabel = m3.status === "completed" ? "Đã đạt" : m3.status === "in_progress" ? "Đang chạy" : "Chưa đạt";
      csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${m3.date}","${statusLabel}","${m3.score || ""}","${m3.assessor || ""}","${s.academicAdvisor || ""}"`);
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh-sach-MTT-Thang-${currentMonthYear.replace("/", "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to export only FT list
  const handleExportFT = () => {
    const csvRows = [
      `DANH SÁCH HỌC VIÊN SẮP THI ĐẦU RA (FT) - THÁNG ${currentMonthYear}`,
      `Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")}`,
      "",
      "Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Thi FT,Trạng thái,Điểm số,Người đánh giá/GV,Học Vụ Phụ Trách"
    ];

    ftStudents.forEach(s => {
      const m4 = s.milestones.m4!;
      const statusLabel = m4.status === "completed" ? "Đã đạt" : m4.status === "in_progress" ? "Đang chạy" : "Chưa đạt";
      csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${m4.date}","${statusLabel}","${m4.score || ""}","${m4.assessor || ""}","${s.academicAdvisor || ""}"`);
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh-sach-FT-Thang-${currentMonthYear.replace("/", "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to export only Renew list
  const handleExportRenew = () => {
    const csvRows = [
      `DANH SÁCH HỌC VIÊN RENEW KHÓA HỌC - THÁNG ${currentMonthYear}`,
      `Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")}`,
      "",
      "Mã Học Viên,Họ và Tên,Trình độ (Level),Ngày Kết Thúc,Trạng thái,Học Vụ Phụ Trách"
    ];

    renewStudents.forEach(s => {
      csvRows.push(`"${s.studentId}","${s.fullName}","${getStudentLevel(s)}","${s.endDate || ""}","Đã Renew","${s.academicAdvisor || ""}"`);
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh-sach-Renew-Thang-${currentMonthYear.replace("/", "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      id="monthly-report-modal"
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 font-sans"
        id="monthly-report-modal-content"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                Báo cáo Thống kê Học viên Cuối Tháng
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Kỳ báo cáo: Tháng {currentMonthYear} • Đã lọc bỏ học viên tốt nghiệp các tháng trước.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-150 flex items-center gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === "matrix" 
                ? "border-emerald-600 text-emerald-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Ma trận Phân loại & Tổng hợp
          </button>
          <button
            onClick={() => setActiveTab("milestones")}
            className={`px-4 py-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "milestones" 
                ? "border-emerald-600 text-emerald-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Lịch Thi & Renew ({mttStudents.length + ftStudents.length + renewStudents.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* General Stats summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase">Đang học (Active)</span>
                <span className="text-xl font-extrabold text-slate-800">{activeCount}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase">Bảo lưu (Paused)</span>
                <span className="text-xl font-extrabold text-slate-800">{pausedCount}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase">Nghỉ học (Dropped)</span>
                <span className="text-xl font-extrabold text-slate-800">{droppedCount}</span>
              </div>
            </div>
          </div>

          {activeTab === "matrix" ? (
            <>
              {/* Matrix table representation */}
              <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-[#f8fafc] border-b border-slate-300 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-sans">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    Ma trận phân loại và tổng hợp học viên
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Đơn vị: Lớp / Học viên</span>
                </div>
                
                <div className="overflow-x-auto p-4 bg-slate-50/50">
                  <table className="w-full text-center border-collapse border border-slate-300 font-sans shadow-xs rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-[#dbeafe] border-b border-slate-300 text-slate-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-3 border border-slate-300 text-center font-extrabold" colSpan={2}>Loại lớp</th>
                        <th className="py-3.5 px-3 border border-slate-300 text-center font-extrabold w-32">Số lượng lớp</th>
                        <th className="py-3.5 px-3 border border-slate-300 text-center font-extrabold w-44">Tổng lớp kết thúc</th>
                        <th className="py-3.5 px-3 border border-slate-300 text-center font-extrabold w-48">Tổng lớp đang tạm dừng</th>
                        <th className="py-3.5 px-3 border border-slate-300 text-center font-extrabold w-36">Đang chạy</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] sm:text-xs font-bold text-slate-800">
                      {/* VIP Row Group */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-4 border border-slate-300 bg-[#fef9c3] font-black text-[#854d0e] text-center align-middle text-sm tracking-widest w-24" rowSpan={2}>
                          VIP
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-extrabold text-slate-500 bg-white">
                          STANDARD
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-900">
                          {matrixStats.VIP.STANDARD.total}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.VIP.STANDARD.finished}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.VIP.STANDARD.paused}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-[#15803d]">
                          {matrixStats.VIP.STANDARD.active}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-3 border border-slate-300 text-center font-extrabold text-slate-500 bg-white">
                          NON STANDARD
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-900">
                          {matrixStats.VIP["NON STANDARD"].total}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.VIP["NON STANDARD"].finished}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.VIP["NON STANDARD"].paused}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-[#15803d]">
                          {matrixStats.VIP["NON STANDARD"].active}
                        </td>
                      </tr>

                      {/* SVIP Row Group */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-4 border border-slate-300 bg-[#fef9c3] font-black text-[#854d0e] text-center align-middle text-sm tracking-widest w-24" rowSpan={2}>
                          SVIP
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-extrabold text-slate-500 bg-white">
                          STANDARD
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-900">
                          {matrixStats.SVIP.STANDARD.total}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.SVIP.STANDARD.finished}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.SVIP.STANDARD.paused}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-[#15803d]">
                          {matrixStats.SVIP.STANDARD.active}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-3 border border-slate-300 text-center font-extrabold text-slate-500 bg-white">
                          NON STANDARD
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-900">
                          {matrixStats.SVIP["NON STANDARD"].total}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.SVIP["NON STANDARD"].finished}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-slate-600 font-semibold">
                          {matrixStats.SVIP["NON STANDARD"].paused}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono text-sm bg-white text-[#15803d]">
                          {matrixStats.SVIP["NON STANDARD"].active}
                        </td>
                      </tr>

                      {/* Total Footer Row */}
                      <tr className="bg-[#f1f5f9]">
                        <td className="py-4 px-4 border border-slate-300 text-center font-extrabold text-[#1e293b] text-xs sm:text-sm uppercase tracking-wider bg-[#f1f5f9]" colSpan={2}>
                          Total
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono font-extrabold text-sm text-[#0f172a]">
                          {totalStats.total}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono font-extrabold text-sm text-[#0f172a]">
                          {totalStats.finished}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono font-extrabold text-sm text-[#0f172a]">
                          {totalStats.paused}
                        </td>
                        <td className="py-4 px-3 border border-slate-300 text-center font-mono font-extrabold text-sm text-[#15803d]">
                          {totalStats.active}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 italic">
                  * Ghi chú: Theo chỉ đạo, các trường hợp KOL (Key Opinion Leader) được phân loại và thống kê bình thường vào các lớp VIP và SVIP tương ứng để đảm bảo tính đồng bộ dữ liệu. Các học viên tốt nghiệp các tháng trước đã được loại khỏi thống kê kỳ này.
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <h4 className="text-xs font-bold uppercase text-slate-800 mb-1">Cơ chế hoạt động xuất báo cáo</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Khi bấm nút <b>Xuất File Báo Cáo</b>, hệ thống tự động xuất dữ liệu ra file CSV chuẩn hóa. File này bao gồm phần tổng hợp ma trận thống kê, các danh sách học viên thi MTT & FT trong tháng, và đặc biệt là <b>Danh sách chi tiết học viên được chia sẵn theo từng loại lớp</b>, giúp bộ phận đào tạo dễ dàng lưu trữ, đối soát hoặc làm báo cáo gửi Ban Giám đốc vào mỗi cuối tháng học.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* MTT section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Học viên sắp thi MTT (Midterm Test) - Tháng {currentMonthYear} ({mttStudents.length})
                  </span>
                  {mttStudents.length > 0 && (
                    <button
                      onClick={handleExportMTT}
                      className="px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Xuất DS thi MTT
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {mttStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Không có học viên nào lịch thi MTT trong tháng này.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          <th className="py-2.5 px-4">Mã HV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3">Trình độ (Level)</th>
                          <th className="py-2.5 px-3">Ngày thi MTT</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                          <th className="py-2.5 px-3">Điểm số</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {mttStudents.map(s => {
                          const m3 = s.milestones.m3!;
                          return (
                            <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.studentId}</td>
                              <td className="py-2.5 px-3 font-semibold">{s.fullName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{getStudentLevel(s)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-700 bg-amber-50/50">{m3.date}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                  m3.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                  m3.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {m3.status === "completed" ? "Đã đạt" : m3.status === "in_progress" ? "Đang chạy" : "Chưa đạt"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">{m3.score || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* FT section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Học viên sắp thi FT (Final Test) - Tháng {currentMonthYear} ({ftStudents.length})
                  </span>
                  {ftStudents.length > 0 && (
                    <button
                      onClick={handleExportFT}
                      className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Xuất DS thi FT
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {ftStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Không có học viên nào lịch thi FT (đầu ra) trong tháng này.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          <th className="py-2.5 px-4">Mã HV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3">Trình độ (Level)</th>
                          <th className="py-2.5 px-3">Ngày thi FT</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                          <th className="py-2.5 px-3">Điểm số</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {ftStudents.map(s => {
                          const m4 = s.milestones.m4!;
                          return (
                            <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.studentId}</td>
                              <td className="py-2.5 px-3 font-semibold">{s.fullName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{getStudentLevel(s)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">{m4.date}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                  m4.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                  m4.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {m4.status === "completed" ? "Đã đạt" : m4.status === "in_progress" ? "Đang chạy" : "Chưa đạt"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">{m4.score || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Renew section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Học viên Renew khóa học - Tháng {currentMonthYear} ({renewStudents.length})
                  </span>
                  {renewStudents.length > 0 && (
                    <button
                      onClick={handleExportRenew}
                      className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Xuất DS Renew
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {renewStudents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Không có học viên nào renew trong tháng này.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          <th className="py-2.5 px-4">Mã HV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3">Trình độ (Level)</th>
                          <th className="py-2.5 px-3">Ngày Kết Thúc</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {renewStudents.map(s => {
                          return (
                            <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.studentId}</td>
                              <td className="py-2.5 px-3 font-semibold">{s.fullName}</td>
                              <td className="py-2.5 px-3 text-slate-600">{getStudentLevel(s)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 bg-emerald-50/50">{s.endDate || "—"}</td>
                              <td className="py-2.5 px-3">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase bg-emerald-100 text-emerald-700">
                                  ĐÃ RENEW
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">TalkFirst CRM Monthly Report Engine</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Đóng lại
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Toàn Bộ Báo Cáo (.CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
