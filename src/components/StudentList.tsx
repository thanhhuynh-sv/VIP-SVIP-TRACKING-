import React, { useState } from "react";
import { Search, UserPlus, Filter, Phone, Mail, Award, BookOpen, AlertCircle, Trash2, Edit, RefreshCw, FileSpreadsheet, Calendar, CheckSquare, Square, Bell, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Student, StudentStatus, MilestoneKey } from "../types";

interface StudentListProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => Promise<void>;
  onSyncSheet?: () => Promise<void>;
  isSyncing?: boolean;
  onOpenReportModal?: () => void;
  onUpdateStudentFields?: (id: string, updatedFields: Partial<Student>) => Promise<void>;
}

export default function StudentList({
  students,
  selectedStudent,
  onSelectStudent,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onSyncSheet,
  isSyncing = false,
  onOpenReportModal,
  onUpdateStudentFields,
}: StudentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"general" | "mtt" | "ft" | "ending">("general");
  const [mttFilter, setMttFilter] = useState<string>("all"); // "all", "not_done", "done", "mtr_not_done", "mtr_done"
  const [ftFilter, setFtFilter] = useState<string>("all"); // "all", "not_notified", "not_booked", "booked", "not_done", "done"
  const [mttMonthFilter, setMttMonthFilter] = useState<string>("all"); // "all", "YYYY-MM"
  const [ftMonthFilter, setFtMonthFilter] = useState<string>("all"); // "all", "YYYY-MM"

  const currentMonthStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  })();

  const [endingMonthFilter, setEndingMonthFilter] = useState<string>("all"); // "all" or "YYYY-MM"
  const [endingFilter, setEndingFilter] = useState<string>("all"); // "all", "not_finished", "finished", "not_renewed", "renewed"
  const [dashboardMonth, setDashboardMonth] = useState<string>(currentMonthStr);
  const [isMonthlyDashboardCollapsed, setIsMonthlyDashboardCollapsed] = useState<boolean>(false);

  const handleEndingMonthFilterChange = (val: string) => {
    setEndingMonthFilter(val);
    if (val !== "all") {
      setDashboardMonth(val);
    }
  };

  const handleDashboardMonthChange = (val: string) => {
    setDashboardMonth(val);
    setEndingMonthFilter(val);
  };

  // Get unique packages
  const packages = Array.from(new Set(students.map((s) => s.coursePackage))).filter(Boolean);

  // Get unique months for MTT (m3 date) for active students
  const mttMonths = Array.from(
    new Set(
      students
        .filter((s) => s.status === "active")
        .map((s) => s.milestones?.m3?.date)
        .filter((d): d is string => !!d && d.length >= 7)
        .map((d) => d.substring(0, 7))
    )
  ).sort();

  // Get unique months for FT (m4 date) for active students
  const ftMonths = Array.from(
    new Set(
      students
        .filter((s) => s.status === "active")
        .map((s) => s.milestones?.m4?.date)
        .filter((d): d is string => !!d && d.length >= 7)
        .map((d) => d.substring(0, 7))
    )
  ).sort();

  // Get unique months for End Date (endDate) including the current month
  const endingMonths = Array.from(
    new Set([
      currentMonthStr,
      ...students
        .map((s) => s.endDate)
        .filter((d): d is string => !!d && d.length >= 7)
        .map((d) => d.substring(0, 7))
    ])
  ).sort();

  // Combine all possible months for the selector in the monthly dashboard
  const allAvailableMonths = Array.from(
    new Set([
      currentMonthStr,
      ...students.flatMap((s) => [
        s.startDate?.substring(0, 7),
        s.endDate?.substring(0, 7),
        s.milestones?.m3?.date?.substring(0, 7),
        s.milestones?.m4?.date?.substring(0, 7)
      ]).filter((d): d is string => !!d && d.length === 7)
    ])
  ).sort();

  const isStudentActiveInMonth = (student: Student, yyyyMm: string) => {
    if (!student.startDate || !student.endDate) return false;
    const startM = student.startDate.substring(0, 7);
    const endM = student.endDate.substring(0, 7);
    return startM <= yyyyMm && endM >= yyyyMm;
  };

  const activeInMonthList = students.filter(
    (s) => s.status === "active" && isStudentActiveInMonth(s, dashboardMonth)
  );

  const mttInMonthList = students.filter(
    (s) => s.status === "active" && !!s.milestones?.m3?.date && s.milestones.m3.date.startsWith(dashboardMonth)
  );

  const ftInMonthList = students.filter(
    (s) => s.status === "active" && !!s.milestones?.m4?.date && s.milestones.m4.date.startsWith(dashboardMonth)
  );

  const endingInMonthList = students.filter(
    (s) => s.status !== "paused" && !!s.endDate && s.endDate.startsWith(dashboardMonth)
  );

  const formatMonthLabel = (yyyyMm: string) => {
    const [year, month] = yyyyMm.split("-");
    return `Tháng ${month}/${year}`;
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.studentId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.phone && student.phone.includes(searchTerm)) ||
      (student.teacherAdvisor && student.teacherAdvisor.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesPackage = packageFilter === "all" || student.coursePackage === packageFilter;

    // Sub-filters for viewMode
    let matchesSubFilter = true;
    if (viewMode === "mtt") {
      if (student.status !== "active") {
        return false;
      }
      if (mttFilter === "not_done") {
        matchesSubFilter = !student.mttDone;
      } else if (mttFilter === "done") {
        matchesSubFilter = !!student.mttDone;
      } else if (mttFilter === "mtr_not_done") {
        matchesSubFilter = !student.mtrDone;
      } else if (mttFilter === "mtr_done") {
        matchesSubFilter = !!student.mtrDone;
      }

      if (matchesSubFilter && mttMonthFilter !== "all") {
        const mttDate = student.milestones?.m3?.date;
        matchesSubFilter = !!mttDate && mttDate.startsWith(mttMonthFilter);
      }
    } else if (viewMode === "ft") {
      if (student.status !== "active") {
        return false;
      }
      if (ftFilter === "not_notified") {
        matchesSubFilter = !student.ftNotified;
      } else if (ftFilter === "not_booked") {
        matchesSubFilter = !student.ftBooked;
      } else if (ftFilter === "booked") {
        matchesSubFilter = !!student.ftBooked;
      } else if (ftFilter === "not_done") {
        matchesSubFilter = !student.ftDone;
      } else if (ftFilter === "done") {
        matchesSubFilter = !!student.ftDone;
      }

      if (matchesSubFilter && ftMonthFilter !== "all") {
        const ftDate = student.milestones?.m4?.date;
        matchesSubFilter = !!ftDate && ftDate.startsWith(ftMonthFilter);
      }
    } else if (viewMode === "ending") {
      if (student.status === "paused") {
        return false;
      }
      if (endingFilter === "not_finished") {
        matchesSubFilter = !student.courseFinished;
      } else if (endingFilter === "finished") {
        matchesSubFilter = !!student.courseFinished;
      } else if (endingFilter === "renewed") {
        matchesSubFilter = !!student.courseRenewed;
      } else if (endingFilter === "not_renewed") {
        matchesSubFilter = !student.courseRenewed;
      }

      if (matchesSubFilter && endingMonthFilter !== "all") {
        matchesSubFilter = !!student.endDate && student.endDate.startsWith(endingMonthFilter);
      }
    }

    return matchesSearch && matchesStatus && matchesPackage && matchesSubFilter;
  });

  const getStatusBadgeClass = (status: StudentStatus) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "paused":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "graduated":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "dropped":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: StudentStatus) => {
    switch (status) {
      case "active":
        return "ĐANG HỌC";
      case "paused":
        return "BẢO LƯU";
      case "graduated":
        return "TỐT NGHIỆP";
      case "dropped":
        return "NGHỈ HỌC";
      default:
        return String(status).toUpperCase();
    }
  };

  const getMilestoneIndicatorColor = (status: string, studentStatus?: StudentStatus) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500 border-emerald-600";
      case "in_progress":
        if (studentStatus === "paused") {
          return "bg-slate-100 border-slate-200";
        }
        return "bg-amber-400 border-amber-500 animate-pulse";
      default:
        return "bg-slate-100 border-slate-200";
    }
  };

  const getDerivedMilestoneStatus = (student: Student, key: string): string => {
    const m = student.milestones?.[key as MilestoneKey];
    if (key === "m1") {
      return m?.date || student.startDate ? "completed" : "not_started";
    }
    if (key === "m2") {
      return m?.date ? "completed" : "not_started";
    }
    if (key === "m3") {
      return student.mttDone ? "completed" : (m?.date ? "in_progress" : "not_started");
    }
    if (key === "m4") {
      return student.ftDone ? "completed" : (m?.date ? "in_progress" : "not_started");
    }
    return m?.status || "not_started";
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa học viên "${name}" khỏi hệ thống?`)) {
      onDeleteStudent(id);
    }
  };

  const isGoogleAuthenticated = typeof window !== "undefined" && !!sessionStorage.getItem("oauth_token");

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full" id="student-list-container">
      {/* Monthly Summary Dashboard */}
      {viewMode === "ending" && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 rounded-t-xl" id="monthly-summary-dashboard">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setIsMonthlyDashboardCollapsed(!isMonthlyDashboardCollapsed)}
            >
              <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  Báo cáo tổng hợp số liệu
                  <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                    Tháng {formatMonthLabel(dashboardMonth)}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Thống kê chi tiết danh sách học viên theo từng mốc hoạt động trong tháng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-slate-600 uppercase font-mono">Chọn Tháng:</span>
              <select
                value={dashboardMonth}
                onChange={(e) => handleDashboardMonthChange(e.target.value)}
                className="text-xs bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer shadow-xs focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              >
                {allAvailableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}{m === currentMonthStr ? " (Hiện tại)" : ""}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setIsMonthlyDashboardCollapsed(!isMonthlyDashboardCollapsed)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {isMonthlyDashboardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isMonthlyDashboardCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2">
              
              {/* 1. Active students card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide">1. Đang học (Active)</span>
                    <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                      {activeInMonthList.length} HV
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto mt-1 pr-1">
                    {activeInMonthList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Không có học viên</p>
                    ) : (
                      activeInMonthList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onSelectStudent(s)}
                          className="w-full text-left text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-50 p-1.5 rounded-md border border-transparent hover:border-slate-100 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate max-w-[120px]">{s.fullName}</span>
                          <span className="text-[9px] font-mono text-slate-400">{s.studentId}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 2. MTT students card */}
              <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase font-mono tracking-wide">2. Mốc MTT (Midterm)</span>
                    <span className="text-xs font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {mttInMonthList.length} HV
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto mt-1 pr-1">
                    {mttInMonthList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Không có mốc hẹn</p>
                    ) : (
                      mttInMonthList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onSelectStudent(s)}
                          className="w-full text-left text-xs font-medium text-slate-700 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded-md border border-transparent hover:border-amber-100 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate max-w-[120px] font-semibold">{s.fullName}</span>
                          <span className="text-[9px] font-mono text-amber-600 font-bold">{s.milestones?.m3?.date}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 3. FT students card */}
              <div className="bg-white rounded-xl border border-emerald-200 p-3 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wide">3. Mốc FT (Final)</span>
                    <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {ftInMonthList.length} HV
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto mt-1 pr-1">
                    {ftInMonthList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Không có mốc hẹn</p>
                    ) : (
                      ftInMonthList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onSelectStudent(s)}
                          className="w-full text-left text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 p-1.5 rounded-md border border-transparent hover:border-emerald-100 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate max-w-[120px] font-semibold">{s.fullName}</span>
                          <span className="text-[9px] font-mono text-emerald-600 font-bold">{s.milestones?.m4?.date}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Ending students card */}
              <div className="bg-white rounded-xl border border-rose-200 p-3 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-bold text-rose-800 uppercase font-mono tracking-wide">4. Kết thúc khóa học</span>
                    <span className="text-xs font-bold font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      {endingInMonthList.length} HV
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto mt-1 pr-1">
                    {endingInMonthList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-1">Không có học viên kết thúc</p>
                    ) : (
                      endingInMonthList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => onSelectStudent(s)}
                          className="w-full text-left text-xs font-medium text-slate-700 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-md border border-transparent hover:border-rose-100 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate max-w-[100px] font-semibold">{s.fullName}</span>
                          <div className="flex items-center gap-1">
                            {s.courseFinished && (
                              <span className="text-[8px] bg-rose-100 text-rose-800 px-1 rounded font-bold" title="Đã kết thúc">End</span>
                            )}
                            {s.courseRenewed && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold" title="Đã Renew">Renew</span>
                            )}
                            <span className="text-[9px] font-mono text-rose-600 font-bold">{s.endDate}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="p-4 border-b border-slate-200 space-y-4" id="student-list-filters">
        {/* Search Box - Full Width */}
        <div className="relative w-full" id="search-box-container">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên, Mã HV, SĐT, Giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs bg-slate-50 focus:bg-white transition-all font-medium"
            id="student-search-input"
          />
        </div>

        {/* Action Buttons & Filter Badges Row */}
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Filter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>LỌC:</span>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang học</option>
              <option value="paused">Bảo lưu</option>
              <option value="graduated">Tốt nghiệp</option>
              <option value="dropped">Nghỉ học</option>
            </select>

            {/* Package filter */}
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 max-w-[180px] cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="all">Tất cả gói học</option>
              {packages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md font-semibold">
              Tìm thấy: <b className="text-slate-800">{filteredStudents.length}</b> học viên
            </span>
          </div>

          {/* Add Student Button, Sync Button & Report Button */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap justify-start lg:justify-end">
            {onOpenReportModal && (
              <button
                onClick={onOpenReportModal}
                title="Báo cáo thống kê tình trạng và loại lớp học viên cuối tháng"
                className="bg-slate-800 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Báo cáo cuối tháng</span>
              </button>
            )}
            {onSyncSheet && (
              <button
                onClick={onSyncSheet}
                disabled={isSyncing}
                title={isGoogleAuthenticated ? "Đồng bộ trực tiếp qua Google Sheets API bảo mật" : "Đồng bộ dữ liệu học viên từ Google Sheet công khai (CSV)"}
                className={`px-3 py-2 border rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                  isSyncing
                    ? "bg-slate-50 text-slate-400 border-slate-100"
                    : isGoogleAuthenticated
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                    : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isGoogleAuthenticated ? "text-emerald-600" : "text-slate-500"} ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Đang đồng bộ..." : isGoogleAuthenticated ? "Đồng bộ Sheets API" : "Đồng bộ Sheet"}</span>
              </button>
            )}
            <button
              onClick={onAddStudent}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Học Viên</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs & Contextual Sub-filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100 pt-3 px-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setViewMode("general")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "general"
                  ? "bg-slate-900 text-white shadow-xs font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              📋 Danh sách chung
            </button>
            <button
              onClick={() => setViewMode("mtt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "mtt"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100/50 border border-amber-200/50"
              }`}
            >
              📊 Theo dõi MTT (Midterm)
            </button>
            <button
              onClick={() => setViewMode("ft")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "ft"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50 border border-emerald-200/50"
              }`}
            >
              🎓 Theo dõi FT (Final)
            </button>
            <button
              onClick={() => setViewMode("ending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === "ending"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100/50 border border-rose-200/50"
              }`}
            >
              📅 Kết thúc khóa học
            </button>
          </div>

          {/* Contextual sub-filters */}
          {viewMode === "mtt" && (
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase hidden md:inline">Tháng MTT:</span>
                <select
                  value={mttMonthFilter}
                  onChange={(e) => setMttMonthFilter(e.target.value)}
                  className="text-[11px] bg-amber-50 text-amber-950 border border-amber-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
                >
                  <option value="all">Tất cả các tháng</option>
                  {mttMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase hidden md:inline">Trạng thái MTT:</span>
                <select
                  value={mttFilter}
                  onChange={(e) => setMttFilter(e.target.value)}
                  className="text-[11px] bg-amber-50 text-amber-950 border border-amber-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái MTT</option>
                  <option value="not_done">Chưa làm MTT</option>
                  <option value="done">Đã làm MTT</option>
                  <option value="mtr_not_done">Chưa làm MTR</option>
                  <option value="mtr_done">Đã làm MTR</option>
                </select>
              </div>
            </div>
          )}

          {viewMode === "ft" && (
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase hidden md:inline">Tháng FT:</span>
                <select
                  value={ftMonthFilter}
                  onChange={(e) => setFtMonthFilter(e.target.value)}
                  className="text-[11px] bg-emerald-50 text-emerald-950 border border-emerald-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                >
                  <option value="all">Tất cả các tháng</option>
                  {ftMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase hidden md:inline">Trạng thái FT:</span>
                <select
                  value={ftFilter}
                  onChange={(e) => setFtFilter(e.target.value)}
                  className="text-[11px] bg-emerald-50 text-emerald-950 border border-emerald-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái FT</option>
                  <option value="not_notified">Chưa thông báo test</option>
                  <option value="not_booked">Chưa book lịch</option>
                  <option value="booked">Đã book lịch</option>
                  <option value="not_done">Chưa test xong</option>
                  <option value="done">Đã test xong</option>
                </select>
              </div>
            </div>
          )}

          {viewMode === "ending" && (
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto animate-fadeIn">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase hidden md:inline font-mono">Tháng Kết Thúc:</span>
                <select
                  value={endingMonthFilter}
                  onChange={(e) => handleEndingMonthFilterChange(e.target.value)}
                  className="text-[11px] bg-rose-50 text-rose-950 border border-rose-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-rose-500 font-semibold cursor-pointer shadow-xs"
                >
                  <option value="all">Tất cả các tháng</option>
                  {endingMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}{m === currentMonthStr ? " (Tháng hiện tại)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase hidden md:inline font-mono">Trạng thái khóa học:</span>
                <select
                  value={endingFilter}
                  onChange={(e) => setEndingFilter(e.target.value)}
                  className="text-[11px] bg-rose-50 text-rose-950 border border-rose-200 rounded px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-rose-500 font-semibold cursor-pointer shadow-xs"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="not_finished">Chưa kết thúc</option>
                  <option value="finished">Đã kết thúc</option>
                  <option value="renewed">Đã Renew</option>
                  <option value="not_renewed">Chưa Renew</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto" id="student-table-wrapper">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-8">
            <AlertCircle className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-sm">Không tìm thấy học viên nào phù hợp</p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 border-b border-slate-200">
                  {viewMode === "general" ? (
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Học Viên</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Gói Học</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Buổi Học</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Mốc Điểm</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng Thái</th>
                      <th scope="col" className="relative px-4 py-3 text-right">
                        <span className="sr-only">Hành động</span>
                      </th>
                    </tr>
                  ) : viewMode === "mtt" ? (
                    <tr className="bg-amber-500/5">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider border-b border-amber-100">Học Viên</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-amber-950 uppercase tracking-wider border-b border-amber-100">Ngày Hẹn MTT & MTR</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-amber-950 uppercase tracking-wider border-b border-amber-100">Đã Làm MTT</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-amber-950 uppercase tracking-wider border-b border-amber-100">Có MTR</th>
                      <th scope="col" className="relative px-4 py-3 text-right border-b border-amber-100">
                        <span className="sr-only">Hành động</span>
                      </th>
                    </tr>
                  ) : viewMode === "ft" ? (
                    <tr className="bg-emerald-500/5">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-emerald-900 uppercase tracking-wider border-b border-emerald-100">Học Viên</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100">Ngày dự kiến FT</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100">Đã thông báo</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100">Đã Book Lịch (Ngày)</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-emerald-950 uppercase tracking-wider border-b border-emerald-100">Đã Test Xong</th>
                      <th scope="col" className="relative px-4 py-3 text-right border-b border-emerald-100">
                        <span className="sr-only">Hành động</span>
                      </th>
                    </tr>
                  ) : (
                    <tr className="bg-rose-500/5">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-rose-900 uppercase tracking-wider border-b border-rose-100">Học Viên</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-rose-950 uppercase tracking-wider border-b border-rose-100">Ngày Kết Thúc</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-rose-950 uppercase tracking-wider border-b border-rose-100">Đã Kết Thúc</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-rose-950 uppercase tracking-wider border-b border-rose-100">Có Renew</th>
                      <th scope="col" className="relative px-4 py-3 text-right border-b border-rose-100">
                        <span className="sr-only">Hành động</span>
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudent?.id === student.id;
                    const remainingSessions = student.totalSessions - student.attendedSessions;
                    const sessionPercentage = Math.round((student.attendedSessions / (student.totalSessions || 1)) * 100);

                    return (
                      <tr
                        key={student.id}
                        onClick={() => onSelectStudent(student)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? "bg-emerald-500/10 border-l-4 border-emerald-500 text-slate-900" : ""
                        }`}
                      >
                        {/* Student Main Cell */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900 hover:text-emerald-700">
                              {student.fullName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-sm font-bold">
                                {student.studentId}
                              </span>
                              {student.phone && (
                                <span className="text-xs text-slate-400 font-mono flex items-center gap-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" /> {student.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {viewMode === "general" ? (
                          <>
                            {/* Package */}
                            <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                              <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                {student.coursePackage}
                              </span>
                            </td>

                            {/* Session Progress */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col w-28">
                                <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                                  <span>{student.attendedSessions}/{student.totalSessions}</span>
                                  {remainingSessions <= 10 && student.status === "active" ? (
                                    <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-1.5 py-0.2 rounded-sm animate-pulse">SẮP HẾT</span>
                                  ) : null}
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      remainingSessions <= 10 && student.status === "active" ? "bg-rose-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(sessionPercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                             {/* Milestone indicators */}
                             <td className="px-4 py-3 whitespace-nowrap">
                               <div className="flex items-center justify-center gap-1.5">
                                 {/* M1 Milestone - QC1 */}
                                 <div
                                   title={`QC1 (Buổi 1): ${student.milestones.m1?.date || student.startDate || "N/A"}`}
                                   className={`w-2.5 h-2.5 rounded-full border ${getMilestoneIndicatorColor(
                                     getDerivedMilestoneStatus(student, "m1"),
                                     student.status
                                   )}`}
                                 />
                                 {/* M2 Milestone - QC2 */}
                                 <div
                                   title={`QC2 (25%): ${student.milestones.m2?.date || "N/A"}`}
                                   className={`w-2.5 h-2.5 rounded-full border ${getMilestoneIndicatorColor(
                                     getDerivedMilestoneStatus(student, "m2"),
                                     student.status
                                   )}`}
                                 />
                                 {/* M3 Milestone - MTT */}
                                 <div
                                   title={`MTT (50%): ${student.mttDone ? "Đã làm" : "Chưa làm"}`}
                                   className={`w-2.5 h-2.5 rounded-full border ${getMilestoneIndicatorColor(
                                     getDerivedMilestoneStatus(student, "m3"),
                                     student.status
                                   )}`}
                                 />
                                 {/* M4 Milestone - FT */}
                                 <div
                                   title={`FT (75%): ${student.ftDone ? "Đã làm FT" : "Chưa làm"}`}
                                   className={`w-2.5 h-2.5 rounded-full border ${getMilestoneIndicatorColor(
                                     getDerivedMilestoneStatus(student, "m4"),
                                     student.status
                                   )}`}
                                 />
                               </div>
                             </td>

                            {/* Status Badge */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded ${getStatusBadgeClass(student.status)}`}>
                                {getStatusLabel(student.status)}
                              </span>
                            </td>
                          </>
                        ) : viewMode === "mtt" ? (
                          <>
                            {/* MTT & MTR Dates */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col text-xs space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] px-1 font-bold rounded bg-amber-100 text-amber-800">MTT</span>
                                  <span className="font-mono font-semibold text-slate-700">{student.milestones?.m3?.date || "Chưa hẹn"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] px-1 font-bold rounded bg-blue-100 text-blue-800">MTR</span>
                                  <span className="font-mono font-medium text-slate-500">{student.milestones?.mtr?.date || "Chưa hẹn"}</span>
                                </div>
                              </div>
                            </td>

                            {/* MTT Done checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { mttDone: !student.mttDone });
                                  }
                                }}
                                className="inline-flex text-slate-400 hover:text-amber-600 transition-colors p-1 cursor-pointer"
                                title="Click để đánh dấu Đã làm MTT"
                              >
                                {student.mttDone ? (
                                  <CheckSquare className="w-5 h-5 text-amber-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            </td>

                            {/* MTR Done checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { mtrDone: !student.mtrDone });
                                  }
                                }}
                                className="inline-flex text-slate-400 hover:text-amber-600 transition-colors p-1 cursor-pointer"
                                title="Click để đánh dấu Có MTR"
                              >
                                {student.mtrDone ? (
                                  <CheckSquare className="w-5 h-5 text-amber-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            </td>
                          </>
                        ) : viewMode === "ft" ? (
                          <>
                            {/* FT Date (Dự kiến) */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col text-xs space-y-0.5">
                                <div className="flex items-center gap-1 text-slate-700">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-mono font-semibold">{student.milestones?.m4?.date || "Chưa hẹn"}</span>
                                </div>
                                <span className="text-[9px] text-slate-400 italic block">Ngày dự kiến ban đầu</span>
                              </div>
                            </td>

                            {/* FT Notified checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { ftNotified: !student.ftNotified });
                                  }
                                }}
                                className="inline-flex text-slate-400 hover:text-emerald-600 transition-colors p-1 cursor-pointer"
                                title="Đánh dấu đã thông báo test FT"
                              >
                                {student.ftNotified ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            </td>

                            {/* FT Booked checkbox + Date input editor */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    if (onUpdateStudentFields && student.id) {
                                      const nextVal = !student.ftBooked;
                                      onUpdateStudentFields(student.id, { 
                                        ftBooked: nextVal,
                                        ftBookedDate: nextVal ? student.ftBookedDate || new Date().toISOString().split("T")[0] : ""
                                      });
                                    }
                                  }}
                                  className="inline-flex text-slate-400 hover:text-emerald-600 transition-colors p-1 cursor-pointer"
                                  title="Đánh dấu đã book lịch test FT"
                                >
                                  {student.ftBooked ? (
                                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-300" />
                                  )}
                                </button>
                                <input
                                  type="date"
                                  value={student.ftBookedDate || ""}
                                  onChange={(e) => {
                                    if (onUpdateStudentFields && student.id) {
                                      const dateVal = e.target.value;
                                      onUpdateStudentFields(student.id, { 
                                        ftBookedDate: dateVal,
                                        ftBooked: !!dateVal
                                      });
                                    }
                                  }}
                                  className="text-[11px] px-1.5 py-0.5 border border-emerald-200 rounded bg-emerald-50 text-emerald-950 font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500 max-w-[125px] cursor-pointer"
                                />
                              </div>
                            </td>

                            {/* FT Done checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { ftDone: !student.ftDone });
                                  }
                                }}
                                className="inline-flex text-slate-400 hover:text-emerald-600 transition-colors p-1 cursor-pointer"
                                title="Đánh dấu đã test xong FT"
                              >
                                {student.ftDone ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* viewMode === "ending" */}
                            {/* End Date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col text-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <Calendar className="w-4 h-4 text-rose-500" />
                                  <span className="font-mono font-bold text-rose-600">{student.endDate || "Chưa xác định"}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {student.startDate ? `Bắt đầu: ${student.startDate}` : ""}
                                </span>
                              </div>
                            </td>

                            {/* Course Finished Checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { courseFinished: !student.courseFinished });
                                  }
                                }}
                                className="inline-flex items-center justify-center p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Click để đánh dấu Kết Thúc"
                              >
                                {student.courseFinished ? (
                                  <CheckSquare className="w-5 h-5 text-rose-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300 hover:text-rose-400" />
                                )}
                              </button>
                            </td>

                            {/* Course Renewed Checkbox */}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudentFields && student.id) {
                                    onUpdateStudentFields(student.id, { courseRenewed: !student.courseRenewed });
                                  }
                                }}
                                className="inline-flex items-center justify-center p-1.5 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Click để đánh dấu Renew"
                              >
                                {student.courseRenewed ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300 hover:text-emerald-400" />
                                )}
                              </button>
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onEditStudent(student)}
                              className="text-slate-400 hover:text-emerald-600 p-1 rounded-md hover:bg-slate-100/80 transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, student.id!, student.fullName)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100/80 transition-colors"
                              title="Xóa học viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
