import { Users, GraduationCap, Clock, AlertTriangle } from "lucide-react";
import { Student } from "../types";

interface MetricCardsProps {
  students: Student[];
}

export default function MetricCards({ students }: MetricCardsProps) {
  const total = students.length;
  const active = students.filter((s) => s.status === "active").length;
  
  // Calculate completed milestones
  let completedMilestonesCount = 0;
  students.forEach((s) => {
    Object.values(s.milestones).forEach((m) => {
      if (m.status === "completed") {
        completedMilestonesCount++;
      }
    });
  });

  // Low sessions warning: active students with < 10 remaining sessions
  const lowSessionsCount = students.filter((s) => {
    if (s.status !== "active") return false;
    const remaining = s.totalSessions - s.attendedSessions;
    return remaining > 0 && remaining <= 10;
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metric-cards-container">
      {/* Total Students Card */}
      <div 
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        id="metric-total-students"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng Số Học Viên</p>
          <h3 className="text-2xl font-bold text-slate-900">{total}</h3>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Danh sách VIP & SVIP</p>
        </div>
        <div className="bg-slate-100 text-slate-600 p-2 rounded-lg">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Active Students Card */}
      <div 
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        id="metric-active-students"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đang Hoạt Động</p>
          <h3 className="text-2xl font-bold text-emerald-600">{active}</h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">Đang theo học trực tiếp</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-lg">
          <GraduationCap className="w-5 h-5" />
        </div>
      </div>

      {/* Completed Milestones Card */}
      <div 
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
        id="metric-completed-milestones"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cột Mốc Đạt Được</p>
          <h3 className="text-2xl font-bold text-indigo-600">{completedMilestonesCount}</h3>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Đã kiểm tra & đánh giá</p>
        </div>
        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Low Sessions/Alerts Card with Amber left-border as in Design HTML */}
      <div 
        className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between border-l-4 ${
          lowSessionsCount > 0 ? "border-l-amber-400" : "border-l-slate-300"
        }`}
        id="metric-academic-alerts"
      >
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cảnh Báo Học Vụ</p>
          <h3 className={`text-2xl font-bold ${lowSessionsCount > 0 ? "text-amber-600 animate-pulse" : "text-slate-700"}`}>
            {lowSessionsCount}
          </h3>
          <p className="text-[10px] text-amber-500 font-medium mt-1">
            {lowSessionsCount > 0 ? "Học viên sắp hết buổi (≤10)" : "Không có cảnh báo"}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${lowSessionsCount > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
