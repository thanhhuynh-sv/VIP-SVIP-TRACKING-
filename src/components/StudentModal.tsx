import React, { useState, useEffect } from "react";
import { X, Save, Plus, Check } from "lucide-react";
import { Student, StudentStatus, MilestoneStatus, Milestone, MilestoneKey } from "../types";

// Constant arrays for Levels and Class Types as requested by user
export const LEVELS = [
  "Pre Voice Up 1",
  "Pre Voice Up 2",
  "Voice Up 1",
  "Voice Up 2",
  "Talk On 1",
  "Talk On 2",
  "Work Out 1",
  "Work Out 2"
];

export const CLASS_TYPES = [
  "VIP - Standard",
  "VIP - Non-Standard",
  "SVIP - Standard",
  "SVIP - Non-Standard",
  "KOL"
];

export const getClassTypeStyles = (type: string, isSelected: boolean) => {
  const styles: Record<string, { bg: string, text: string, border: string }> = {
    "VIP - Standard": {
      bg: isSelected ? "bg-red-100 text-red-900 border-red-300" : "bg-red-50/50 hover:bg-red-50 text-red-800 border-red-100",
      text: "text-red-900",
      border: isSelected ? "border-red-300" : "border-red-100"
    },
    "VIP - Non-Standard": {
      bg: isSelected ? "bg-purple-100 text-purple-900 border-purple-300" : "bg-purple-50/50 hover:bg-purple-50 text-purple-800 border-purple-100",
      text: "text-purple-900",
      border: isSelected ? "border-purple-300" : "border-purple-100"
    },
    "SVIP - Standard": {
      bg: isSelected ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 border-emerald-100",
      text: "text-emerald-900",
      border: isSelected ? "border-emerald-300" : "border-emerald-100"
    },
    "SVIP - Non-Standard": {
      bg: isSelected ? "bg-sky-100 text-sky-900 border-sky-300" : "bg-sky-50/50 hover:bg-sky-50 text-sky-800 border-sky-100",
      text: "text-sky-900",
      border: isSelected ? "border-sky-300" : "border-sky-100"
    },
    "KOL": {
      bg: isSelected ? "bg-rose-900 text-white border-rose-950" : "bg-rose-50/50 hover:bg-rose-50 text-rose-900 border-rose-100",
      text: isSelected ? "text-white" : "text-rose-900",
      border: isSelected ? "border-rose-950" : "border-rose-100"
    }
  };
  return styles[type] || { bg: "bg-slate-100 text-slate-800 border-slate-200", text: "text-slate-800", border: "border-slate-200" };
};

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Partial<Student>) => Promise<void>;
  student?: Student | null; // If editing
}

export default function StudentModal({ isOpen, onClose, onSave, student }: StudentModalProps) {
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [coursePackage, setCoursePackage] = useState("");
  const [level, setLevel] = useState("Pre Voice Up 1");
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSessions, setTotalSessions] = useState(60);
  const [attendedSessions, setAttendedSessions] = useState(0);
  const [teacherAdvisor, setTeacherAdvisor] = useState("");
  const [academicAdvisor, setAcademicAdvisor] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [notes, setNotes] = useState("");
  const [parentFeedback, setParentFeedback] = useState("");
  const [academicActions, setAcademicActions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Milestone fields editable in Add/Edit student modal
  const [qc1Date, setQc1Date] = useState("");
  const [qc1Status, setQc1Status] = useState<MilestoneStatus>("not_started");
  const [qc1Score, setQc1Score] = useState("");
  const [qc1Assessor, setQc1Assessor] = useState("");
  const [qc1Feedback, setQc1Feedback] = useState("");

  const [qc2Date, setQc2Date] = useState("");
  const [qc2Status, setQc2Status] = useState<MilestoneStatus>("not_started");
  const [qc2Score, setQc2Score] = useState("");
  const [qc2Assessor, setQc2Assessor] = useState("");
  const [qc2Feedback, setQc2Feedback] = useState("");

  const [mttDate, setMttDate] = useState("");
  const [mttStatus, setMttStatus] = useState<MilestoneStatus>("not_started");
  const [mttScore, setMttScore] = useState("");
  const [mttAssessor, setMttAssessor] = useState("");
  const [mttFeedback, setMttFeedback] = useState("");

  const [mtrDate, setMtrDate] = useState("");
  const [mtrStatus, setMtrStatus] = useState<MilestoneStatus>("not_started");
  const [mtrScore, setMtrScore] = useState("");
  const [mtrAssessor, setMtrAssessor] = useState("");
  const [mtrFeedback, setMtrFeedback] = useState("");

  const [ftDate, setFtDate] = useState("");
  const [ftStatus, setFtStatus] = useState<MilestoneStatus>("not_started");
  const [ftScore, setFtScore] = useState("");
  const [ftAssessor, setFtAssessor] = useState("");
  const [ftFeedback, setFtFeedback] = useState("");

  const [inputDate, setInputDate] = useState("");
  const [inputStatus, setInputStatus] = useState<MilestoneStatus>("not_started");
  const [inputScore, setInputScore] = useState("");
  const [inputAssessor, setInputAssessor] = useState("");
  const [inputFeedback, setInputFeedback] = useState("");

  // MTT & FT specific tracking states
  const [mttDone, setMttDone] = useState(false);
  const [mtrDone, setMtrDone] = useState(false);
  const [ftNotified, setFtNotified] = useState(false);
  const [ftBooked, setFtBooked] = useState(false);
  const [ftBookedDate, setFtBookedDate] = useState("");
  const [ftDone, setFtDone] = useState(false);

  // Ending course specific tracking states
  const [courseFinished, setCourseFinished] = useState(false);
  const [courseRenewed, setCourseRenewed] = useState(false);

  useEffect(() => {
    if (student) {
      setStudentId(student.studentId || "");
      setFullName(student.fullName || "");
      setPhone(student.phone || "");
      setEmail(student.email || "");
      setCoursePackage(student.coursePackage || "");
      setStartDate(student.startDate || "");
      setEndDate(student.endDate || "");
      setTotalSessions(student.totalSessions || 0);
      setAttendedSessions(student.attendedSessions || 0);
      setTeacherAdvisor(student.teacherAdvisor || "");
      setAcademicAdvisor(student.academicAdvisor || "");
      setLearningGoal(student.learningGoal || "");
      setStatus(student.status || "active");
      setNotes(student.notes || "");
      setParentFeedback(student.parentFeedback || "");
      setAcademicActions(student.academicActions || "");

      // Robust parsing of Level and Class Types from student or coursePackage
      let initialLevel = student.level || "";
      let initialClassTypes = student.classTypes || [];
      
      if (!initialLevel && student.coursePackage) {
        const match = student.coursePackage.match(/^([^(]+)(?:\(([^)]+)\))?$/);
        if (match) {
          initialLevel = match[1].trim();
          if (match[2]) {
            initialClassTypes = match[2].split(",").map(s => s.trim());
          }
        } else {
          initialLevel = student.coursePackage;
        }
      }

      setLevel(initialLevel || "Pre Voice Up 1");
      setClassTypes(initialClassTypes);

      // Load milestones states safely
      const ms = student.milestones || ({} as Partial<Record<MilestoneKey, Milestone>>);
      
      const mQC1 = ms.m1 || ({} as Milestone);
      setQc1Date(mQC1.date || "");
      setQc1Status(mQC1.status || "not_started");
      setQc1Score(mQC1.score || "");
      setQc1Assessor(mQC1.assessor || "");
      setQc1Feedback(mQC1.feedback || "");

      const mQC2 = ms.m2 || ({} as Milestone);
      setQc2Date(mQC2.date || "");
      setQc2Status(mQC2.status || "not_started");
      setQc2Score(mQC2.score || "");
      setQc2Assessor(mQC2.assessor || "");
      setQc2Feedback(mQC2.feedback || "");

      const mMTT = ms.m3 || ({} as Milestone);
      setMttDate(mMTT.date || "");
      setMttStatus(mMTT.status || "not_started");
      setMttScore(mMTT.score || "");
      setMttAssessor(mMTT.assessor || "");
      setMttFeedback(mMTT.feedback || "");

      const mMTR = ms.mtr || ({} as Milestone);
      setMtrDate(mMTR.date || "");
      setMtrStatus(mMTR.status || "not_started");
      setMtrScore(mMTR.score || "");
      setMtrAssessor(mMTR.assessor || "");
      setMtrFeedback(mMTR.feedback || "");

      const mFT = ms.m4 || ({} as Milestone);
      setFtDate(mFT.date || "");
      setFtStatus(mFT.status || "not_started");
      setFtScore(mFT.score || "");
      setFtAssessor(mFT.assessor || "");
      setFtFeedback(mFT.feedback || "");

      // Load tracking fields
      setMttDone(student.mttDone || false);
      setMtrDone(student.mtrDone || false);
      setFtNotified(student.ftNotified || false);
      setFtBooked(student.ftBooked || false);
      setFtBookedDate(student.ftBookedDate || "");
      setFtDone(student.ftDone || false);
      setCourseFinished(student.courseFinished || false);
      setCourseRenewed(student.courseRenewed || false);
    } else {
      // Set default code or blank
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setStudentId(`TF-VIP-${randNum}`);
      setFullName("");
      setPhone("");
      setEmail("");
      setCoursePackage("Pre Voice Up 1 (VIP - Standard)");
      setLevel("Pre Voice Up 1");
      setClassTypes(["VIP - Standard"]);
      // Pre-fill dates
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setEndDate(nextYear.toISOString().split("T")[0]);
      setTotalSessions(60);
      setAttendedSessions(0);
      setTeacherAdvisor("");
      setAcademicAdvisor("");
      setLearningGoal("");
      setStatus("active");
      setNotes("");
      setParentFeedback("");
      setAcademicActions("");

      // Clear milestones states for new student
      setInputDate(today);
      setInputStatus("not_started");
      setInputScore("");
      setInputAssessor("");
      setInputFeedback("");

      setQc1Date(today);
      setQc1Status("not_started");
      setQc1Score("");
      setQc1Assessor("");
      setQc1Feedback("");

      setQc2Date("");
      setQc2Status("not_started");
      setQc2Score("");
      setQc2Assessor("");
      setQc2Feedback("");

      setMttDate("");
      setMttStatus("not_started");
      setMttScore("");
      setMttAssessor("");
      setMttFeedback("");

      setMtrDate("");
      setMtrStatus("not_started");
      setMtrScore("");
      setMtrAssessor("");
      setMtrFeedback("");

      setFtDate("");
      setFtStatus("not_started");
      setFtScore("");
      setFtAssessor("");
      setFtFeedback("");

      // Clear tracking fields
      setMttDone(false);
      setMtrDone(false);
      setFtNotified(false);
      setFtBooked(false);
      setFtBookedDate("");
      setFtDone(false);
      setCourseFinished(false);
      setCourseRenewed(false);
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleToggleClassType = (type: string) => {
    if (classTypes.includes(type)) {
      setClassTypes(classTypes.filter(t => t !== type));
    } else {
      if (classTypes.length >= 2) {
        alert("Chỉ được chọn tối đa 2 loại lớp!");
        return;
      }
      setClassTypes([...classTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !studentId) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }
    if (!level) {
      alert("Vui lòng chọn trình độ (level) cho học viên!");
      return;
    }
    if (classTypes.length === 0) {
      alert("Vui lòng chọn ít nhất một loại lớp!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Automatically derive the coursePackage string: e.g. "Voice Up 1 (VIP - Standard, KOL)"
      const derivedCoursePackage = `${level}${classTypes.length > 0 ? ` (${classTypes.join(", ")})` : ""}`;

      const studentData: Partial<Student> = {
        studentId,
        fullName,
        phone,
        email,
        coursePackage: derivedCoursePackage,
        level,
        classTypes,
        startDate,
        endDate,
        totalSessions: Number(totalSessions),
        attendedSessions: Number(attendedSessions),
        teacherAdvisor,
        academicAdvisor,
        learningGoal,
        status,
        notes,
        parentFeedback,
        academicActions,
        
        // MTT specific tracking
        mttDone,
        mtrDone,
        
        // FT specific tracking
        ftNotified,
        ftBooked,
        ftBookedDate,
        ftDone,

        // Ending course specific tracking
        courseFinished,
        courseRenewed,
      };

      // Save or update milestones based on form values with auto-derived statuses
      studentData.milestones = {
        m1: {
          title: "QC1 (Buổi đầu tiên)",
          status: qc1Date ? "completed" : "not_started",
          date: qc1Date,
          score: qc1Score,
          feedback: qc1Feedback,
          assessor: qc1Assessor
        },
        m2: {
          title: "QC2 (25% lộ trình)",
          status: qc2Date ? "completed" : "not_started",
          date: qc2Date,
          score: qc2Score,
          feedback: qc2Feedback,
          assessor: qc2Assessor
        },
        m3: {
          title: "MTT (Giữa kỳ - 50% lộ trình)",
          status: mttDone ? "completed" : (mttDate ? "in_progress" : "not_started"),
          date: mttDate,
          score: mttDone ? "Done" : "",
          feedback: mttFeedback,
          assessor: mttAssessor
        },
        mtr: {
          title: "MTR (Midterm Review)",
          status: mtrDone ? "completed" : (mtrDate ? "in_progress" : "not_started"),
          date: mtrDate,
          score: mtrDone ? "Done" : "",
          feedback: mtrFeedback,
          assessor: mtrAssessor
        },
        m4: {
          title: "FT (Final test - 75% lộ trình)",
          status: ftDone ? "completed" : (ftDate ? "in_progress" : "not_started"),
          date: ftDate,
          score: ftDone ? "Done" : "",
          feedback: ftFeedback,
          assessor: ftAssessor
        }
      };

      // If creating a new student, initialize gift and reports states
      if (!student) {
        studentData.vipGifts = {
          backpack: false,
          notebook: false,
          thermos: false,
          poloShirt: false,
        };
        studentData.monthlyReports = {};
      }

      await onSave(studentData);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      id="student-modal"
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 font-sans"
        id="student-modal-content"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            {student ? "Chỉnh Sửa Thông Tin Học Viên" : "Thêm Mới Học Viên VIP/SVIP"}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: General Info */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 mb-3">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Học Viên (Mã HV) *</label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. TF-VIP-9999"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên Học Viên *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Course Info */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 mb-3">Thông tin lớp học & lộ trình</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Dual custom select inputs for Level and Class Types */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Trình độ (Level) *</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-semibold text-slate-800"
                  >
                    {LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>Loại lớp (Tối đa chọn 2) *</span>
                    <span className="text-[10px] text-slate-400 normal-case font-mono font-medium">Đã chọn: {classTypes.length}/2</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CLASS_TYPES.map(type => {
                      const isSelected = classTypes.includes(type);
                      const isLimitReached = classTypes.length >= 2 && !isSelected;
                      const style = getClassTypeStyles(type, isSelected);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleToggleClassType(type)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${style.bg} ${
                            isSelected ? "ring-2 ring-emerald-500/10 shadow-xs scale-[1.02]" : "border-slate-200 hover:border-slate-300"
                          } ${isLimitReached ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng Thái Học Tập</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="active">Đang học (Active)</option>
                  <option value="paused">Bảo lưu (Paused)</option>
                  <option value="graduated">Đã tốt nghiệp (Graduated)</option>
                  <option value="dropped">Nghỉ học (Dropped)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Bắt Đầu</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDate(val);
                    setQc1Date(val);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Kết Thúc (Dự kiến)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tổng Số Buổi Hợp Đồng</label>
                <input
                  type="number"
                  min="0"
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Buổi Đã Học</label>
                <input
                  type="number"
                  min="0"
                  max={totalSessions}
                  value={attendedSessions}
                  onChange={(e) => setAttendedSessions(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo viên chủ nhiệm (Mentor/Tutor)</label>
                <input
                  type="text"
                  value={teacherAdvisor}
                  onChange={(e) => setTeacherAdvisor(e.target.value)}
                  placeholder="Teacher Ms. Emily"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6 bg-rose-50/30 p-3.5 rounded-xl border border-rose-100/50">
                <span className="text-xs font-bold text-rose-800 uppercase flex items-center font-mono">Theo dõi kết thúc khóa học:</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={courseFinished}
                    onChange={(e) => setCourseFinished(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <span>Đã kết thúc khóa học</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={courseRenewed}
                    onChange={(e) => setCourseRenewed(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <span>Có gia hạn (Renew)</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lộ trình học tập & Mục tiêu học viên</label>
                <textarea
                  rows={2}
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="e.g. Mất gốc lên Giao tiếp tự tin 6.5 IELTS. Cam kết kết quả thi thật trước tháng 12."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Notes & Staff Care */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 mb-3">Ghi chú chăm sóc khách hàng & Học vụ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ý kiến Học viên / Phụ huynh</label>
                <textarea
                  rows={2}
                  value={parentFeedback}
                  onChange={(e) => setParentFeedback(e.target.value)}
                  placeholder="Cảm nhận từ học viên hoặc yêu cầu riêng từ phụ huynh..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động của Bộ phận Học vụ</label>
                <textarea
                  rows={2}
                  value={academicActions}
                  onChange={(e) => setAcademicActions(e.target.value)}
                  placeholder="Các hoạt động hỗ trợ học viên từ trung tâm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét học tập chung</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm về thái độ học tập, điểm cần lưu ý..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Academic Milestones */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 mb-3">Các Cột Mốc Đào Tạo & Đánh Giá</h3>
            <p className="text-xs text-slate-500 mb-4 italic">Khi thay đổi Ngày kiểm tra MTT (Midterm Test), ngày kiểm tra MTR (Midterm Review) sẽ tự động được tính là 7 ngày sau đó. Trạng thái của từng cột mốc sẽ tự động được cập nhật dựa trên tiến độ và ngày nhập.</p>
            
            <div className="space-y-6">
              {/* Milestone: QC1 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">1. QC1 (Buổi 1 - Ngày bắt đầu khóa học)</h4>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">Tự động đồng bộ với Ngày Bắt Đầu khóa học</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngày bắt đầu khóa học (QC1)</label>
                    <input
                      type="date"
                      value={qc1Date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQc1Date(val);
                        setStartDate(val);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Điểm số/Đánh giá</label>
                    <input
                      type="text"
                      placeholder="Điểm QC1..."
                      value={qc1Score}
                      onChange={(e) => setQc1Score(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Người đánh giá/GV</label>
                    <input
                      type="text"
                      placeholder="Người đánh giá..."
                      value={qc1Assessor}
                      onChange={(e) => setQc1Assessor(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Nhận xét chi tiết</label>
                  <textarea
                    rows={1}
                    placeholder="Nhận xét QC1..."
                    value={qc1Feedback}
                    onChange={(e) => setQc1Feedback(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Milestone: QC2 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase">2. QC2 (25% chặng lộ trình)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngày kiểm tra QC2</label>
                    <input
                      type="date"
                      value={qc2Date}
                      onChange={(e) => setQc2Date(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Điểm số/Đánh giá</label>
                    <input
                      type="text"
                      placeholder="Điểm QC2..."
                      value={qc2Score}
                      onChange={(e) => setQc2Score(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Người đánh giá/GV</label>
                    <input
                      type="text"
                      placeholder="Người đánh giá..."
                      value={qc2Assessor}
                      onChange={(e) => setQc2Assessor(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Nhận xét chi tiết</label>
                  <textarea
                    rows={1}
                    placeholder="Nhận xét QC2..."
                    value={qc2Feedback}
                    onChange={(e) => setQc2Feedback(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Milestone: MTT */}
              <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-200/50 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase">3. MTT & MTR (Giữa kỳ - 50% chặng)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngày kiểm tra MTT</label>
                    <input
                      type="date"
                      value={mttDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMttDate(val);
                        if (val) {
                          const d = new Date(val);
                          if (!isNaN(d.getTime())) {
                            d.setDate(d.getDate() + 7);
                            setMtrDate(d.toISOString().split("T")[0]);
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Người đánh giá/GV</label>
                    <input
                      type="text"
                      placeholder="Người đánh giá..."
                      value={mttAssessor}
                      onChange={(e) => setMttAssessor(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Nhận xét chi tiết</label>
                  <textarea
                    rows={1}
                    placeholder="Nhận xét MTT..."
                    value={mttFeedback}
                    onChange={(e) => setMttFeedback(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                
                {/* Custom MTT/MTR tracker */}
                <div className="pt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-amber-200/50 bg-white/50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Theo dõi tiến độ MTT/MTR:</span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mttDone}
                      onChange={(e) => setMttDone(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span>Đã làm MTT chưa</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mtrDone}
                      onChange={(e) => setMtrDone(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span>Có MTR chưa</span>
                  </label>
                  {mttDate && (
                    <span className="text-xs text-slate-500 font-mono">
                      Ngày MTR dự kiến (+7 ngày): <b className="text-slate-800">{mtrDate}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Milestone: FT */}
              <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-200/50 space-y-3">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">4. FT (Cuối kỳ - 75% chặng)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngày dự kiến / kiểm tra FT</label>
                    <input
                      type="date"
                      value={ftDate}
                      onChange={(e) => setFtDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Người đánh giá/GV</label>
                    <input
                      type="text"
                      placeholder="Người đánh giá..."
                      value={ftAssessor}
                      onChange={(e) => setFtAssessor(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Nhận xét chi tiết</label>
                  <textarea
                    rows={1}
                    placeholder="Nhận xét FT..."
                    value={ftFeedback}
                    onChange={(e) => setFtFeedback(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                {/* Custom FT tracker */}
                <div className="pt-2.5 flex flex-col gap-3 border-t border-emerald-200/50 bg-white/50 p-3 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Theo dõi tiến độ FT:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ftNotified}
                        onChange={(e) => setFtNotified(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span>Đã thông báo test</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ftBooked}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFtBooked(val);
                          if (!val) setFtBookedDate(""); // Reset date if unchecked
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span>Đã book lịch test</span>
                    </label>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 uppercase tracking-tight">Ngày book test thực tế</label>
                      <input
                        type="date"
                        value={ftBookedDate}
                        onChange={(e) => setFtBookedDate(e.target.value)}
                        disabled={!ftBooked}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ftDone}
                        onChange={(e) => setFtDone(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span>Đã test xong (Đạt FT)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </div>
    </div>
  );
}
