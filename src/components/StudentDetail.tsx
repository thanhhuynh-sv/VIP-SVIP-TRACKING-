import React, { useState } from "react";
import { 
  CheckCircle, Sparkles, Phone, Mail, Award, Calendar, BookOpen, AlertCircle, 
  MapPin, CheckSquare, Square, Check, Copy, RefreshCw, Send, Save, Edit, X, Plus, Trash
} from "lucide-react";
import { Student, MilestoneKey, Milestone, MilestoneStatus } from "../types";
import { getStudentClassTypes, getStudentLevel } from "./MonthlyReportModal";
import { getClassTypeStyles } from "./StudentModal";

interface StudentDetailProps {
  student: Student | null;
  onUpdateStudent: (id: string, updatedFields: Partial<Student>) => Promise<void>;
}

export default function StudentDetail({ student, onUpdateStudent }: StudentDetailProps) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Milestone inline edit states
  const [editingMilestoneKey, setEditingMilestoneKey] = useState<MilestoneKey | null>(null);
  const [mScore, setMScore] = useState("");
  const [mDate, setMDate] = useState("");
  const [mAssessor, setMAssessor] = useState("");
  const [mFeedback, setMFeedback] = useState("");

  const [inlineMttDone, setInlineMttDone] = useState(false);
  const [inlineMtrDone, setInlineMtrDone] = useState(false);
  const [inlineFtDone, setInlineFtDone] = useState(false);

  const getDerivedMilestoneStatus = (key: MilestoneKey): MilestoneStatus => {
    const m = student?.milestones?.[key];
    if (key === "m1") {
      return m?.date || student?.startDate ? "completed" : "not_started";
    }
    if (key === "m2") {
      return m?.date ? "completed" : "not_started";
    }
    if (key === "m3") {
      return student?.mttDone ? "completed" : (m?.date ? "in_progress" : "not_started");
    }
    if (key === "m4") {
      return student?.ftDone ? "completed" : (m?.date ? "in_progress" : "not_started");
    }
    return m?.status || "not_started";
  };



  if (!student) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-full text-slate-400">
        <div className="bg-emerald-50 p-4 rounded-full text-emerald-500 mb-3">
          <Award className="w-8 h-8" />
        </div>
        <h3 className="text-slate-900 font-sans font-semibold text-base">Chưa chọn học viên</h3>
        <p className="text-sm mt-1 max-w-xs">Chọn một học viên từ danh sách bên trái để xem tiến độ và theo dõi các cột mốc chi tiết.</p>
      </div>
    );
  }

  // Trigger AI evaluation report from Gemini API
  const generateAIRecommendation = async () => {
    setIsGeneratingAI(true);
    setAiResult("");
    try {
      const response = await fetch("/api/ai/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student.fullName,
          coursePackage: student.coursePackage,
          learningGoal: student.learningGoal,
          milestones: student.milestones,
          notes: student.notes,
          parentFeedback: student.parentFeedback
        })
      });
      const data = await response.json();
      if (data.recommendation) {
        setAiResult(data.recommendation);
      } else if (data.error) {
        setAiResult(`Lỗi: ${data.error}`);
      }
    } catch (error: any) {
      setAiResult(`Đã xảy ra lỗi khi tạo đánh giá AI: ${error?.message || error}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyAIResult = () => {
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  // Save specific edited milestone
  const handleStartEditMilestone = (key: MilestoneKey, m: Milestone) => {
    setEditingMilestoneKey(key);
    setMScore(m.score || "");
    setMDate(key === "m1" ? (student.startDate || m.date || "") : (m.date || ""));
    setMAssessor(m.assessor || "");
    setMFeedback(m.feedback || "");

    setInlineMttDone(student.mttDone || false);
    setInlineMtrDone(student.mtrDone || false);
    setInlineFtDone(student.ftDone || false);
  };

  const handleSaveMilestone = async () => {
    if (!editingMilestoneKey) return;

    let derivedStatus: MilestoneStatus = "not_started";
    if (editingMilestoneKey === "m1") {
      derivedStatus = mDate ? "completed" : "not_started";
    } else if (editingMilestoneKey === "m2") {
      derivedStatus = mDate ? "completed" : "not_started";
    } else if (editingMilestoneKey === "m3") {
      derivedStatus = inlineMttDone ? "completed" : (mDate ? "in_progress" : "not_started");
    } else if (editingMilestoneKey === "m4") {
      derivedStatus = inlineFtDone ? "completed" : (mDate ? "in_progress" : "not_started");
    }

    const updatedMilestones = {
      ...student.milestones,
      [editingMilestoneKey]: {
        ...student.milestones[editingMilestoneKey],
        status: derivedStatus,
        score: editingMilestoneKey === "m3"
          ? (inlineMttDone ? "Đã hoàn thành" : "Chưa hoàn thành")
          : editingMilestoneKey === "m4"
          ? (inlineFtDone ? "Đã làm FT" : "Chưa làm FT")
          : mScore,
        date: mDate,
        assessor: mAssessor,
        feedback: mFeedback
      }
    };

    const updateFields: Partial<Student> = {
      milestones: updatedMilestones
    };

    if (editingMilestoneKey === "m1" && mDate) {
      updateFields.startDate = mDate;
    }

    if (editingMilestoneKey === "m3") {
      updateFields.mttDone = inlineMttDone;
      updateFields.mtrDone = inlineMtrDone;

      if (mDate) {
        const d = new Date(mDate);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 7);
          const mtrDateStr = d.toISOString().split("T")[0];
          const derivedMtrStatus: MilestoneStatus = inlineMtrDone ? "completed" : "in_progress";
          updatedMilestones.mtr = {
            ...updatedMilestones.mtr,
            title: "MTR (Midterm Review)",
            status: derivedMtrStatus,
            date: mtrDateStr,
            score: inlineMtrDone ? "Đã có MTR" : "Chưa có MTR",
            feedback: updatedMilestones.mtr?.feedback || "",
            assessor: updatedMilestones.mtr?.assessor || mAssessor
          };
        }
      }
    }

    if (editingMilestoneKey === "m4") {
      updateFields.ftDone = inlineFtDone;
    }

    await onUpdateStudent(student.id!, updateFields);
    setEditingMilestoneKey(null);
  };



  const milestonesList: { key: MilestoneKey; label: string; desc: string }[] = [
    { key: "m1", label: "QC1: Đánh giá ngay buổi đầu tiên", desc: "Buổi đầu tiên" },
    { key: "m2", label: "QC2: Đánh giá sau 25% lộ trình", desc: "25% chặng" },
    { key: "m3", label: "MTT (Midterm Test)", desc: "Giữa kỳ - 50% chặng" },
    { key: "m4", label: "Final Test (FT)", desc: "75% chặng" }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden font-sans" id="student-detail-panel">
      {/* Detail Header */}
      <div className="p-6 border-b border-slate-100 bg-linear-to-r from-emerald-500/5 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{student.fullName}</h2>
              {/* Level Badge */}
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                {getStudentLevel(student)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className="text-xs font-mono text-slate-500">Mã HV: <b className="text-slate-800">{student.studentId}</b></span>
              <span className="text-xs text-slate-300">•</span>
              {/* Render dynamic class types nicely as individual pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-mono text-slate-500 mr-0.5">Loại lớp:</span>
                {getStudentClassTypes(student).map(type => {
                  const badgeStyle = getClassTypeStyles(type, true);
                  return (
                    <span key={type} className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeStyle.bg}`}>
                      {type}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs text-slate-600 border-t border-dashed border-slate-100 pt-3 font-mono">
          {student.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>SĐT: {student.phone}</span>
            </div>
          )}
          {student.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">Email: {student.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scroller Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* SECTION 1: MILESTONE TIMELINE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Theo Dõi Các Cột Mốc Đào Tạo
            </h3>
            <span className="text-xs text-slate-400">Ấn nút "Sửa" để cập nhật</span>
          </div>

          <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-5">
            {milestonesList.map(({ key, label, desc }) => {
              const m = student.milestones[key] || {
                title: label,
                status: "not_started",
                date: "",
                score: "",
                feedback: "",
                assessor: ""
              };
              const isEditing = editingMilestoneKey === key;
              const derivedStatus = getDerivedMilestoneStatus(key);

              return (
                <div key={key} className="relative" id={`milestone-row-${key}`}>
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[22.5px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white ${
                    derivedStatus === "completed" 
                      ? "border-emerald-500 text-emerald-500" 
                      : (derivedStatus === "in_progress" && student.status !== "paused")
                      ? "border-amber-500 text-amber-500" 
                      : "border-slate-200 text-slate-300"
                  }`}>
                    {derivedStatus === "completed" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>

                  {/* Milestone Card */}
                  <div className={`p-4 rounded-lg border text-sm transition-all ${
                    isEditing 
                      ? "bg-emerald-50/10 border-emerald-300 ring-1 ring-emerald-300"
                      : derivedStatus === "completed"
                      ? "bg-emerald-50/10 border-emerald-100 hover:border-emerald-200"
                      : (derivedStatus === "in_progress" && student.status !== "paused")
                      ? "bg-amber-50/10 border-amber-100 hover:border-amber-200"
                      : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                  }`}>
                    
                    {/* View State */}
                    {!isEditing ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">{label}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">({desc})</span>
                            {key === "m3" && (
                              <span className="text-[9px] font-bold font-mono px-1 bg-amber-500 text-white rounded-sm" title="Midterm Milestone">MTT</span>
                            )}
                            {key === "m4" && (
                              <span className="text-[9px] font-bold font-mono px-1 bg-emerald-600 text-white rounded-sm" title="Final Test">FT</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                              derivedStatus === "completed" 
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                : (derivedStatus === "in_progress" && student.status !== "paused")
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}>
                              {derivedStatus === "completed" ? "Đã đạt" : (derivedStatus === "in_progress" && student.status !== "paused") ? "Đang chạy" : "Chưa đạt"}
                            </span>
                            <button
                              onClick={() => handleStartEditMilestone(key, m)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Cập nhật cột mốc"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono text-slate-500 border-b border-slate-100 pb-2">
                          {key !== "m3" && key !== "m4" ? (
                            <>
                              <div>
                                Điểm số/Đánh giá: <b className="text-slate-900">{m.score || "—"}</b>
                              </div>
                              <div>
                                Ngày khảo sát: <span className="text-slate-900">{key === "m1" ? (student.startDate || m.date || "—") : (m.date || "—")}</span>
                              </div>
                            </>
                          ) : key === "m3" ? (
                            <>
                              <div>
                                MTT: <b className={student.mttDone ? "text-emerald-600 font-bold" : "text-slate-400 font-normal"}>{student.mttDone ? "✓ Đã làm" : "✗ Chưa làm"}</b>
                              </div>
                              <div>
                                Ngày kiểm tra MTT: <span className="text-slate-900">{m.date || "—"}</span>
                              </div>
                              <div>
                                MTR: <b className={student.mtrDone ? "text-emerald-600 font-bold" : "text-slate-400 font-normal"}>{student.mtrDone ? "✓ Đã có MTR" : "✗ Chưa có MTR"}</b>
                              </div>
                              <div>
                                Ngày nhận MTR: <span className="text-slate-900">{student.milestones.mtr?.date || "—"}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                Trạng thái FT: <b className={student.ftDone ? "text-emerald-600 font-bold" : "text-slate-400 font-normal"}>{student.ftDone ? "✓ Đã làm FT" : "✗ Chưa làm FT"}</b>
                              </div>
                              <div>
                                Ngày kiểm tra FT: <span className="text-slate-900">{m.date || "—"}</span>
                              </div>
                              {student.ftBooked && (
                                <div className="col-span-2">
                                  Ngày book test: <span className="text-slate-900">{student.ftBookedDate || "—"}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="col-span-2">
                            Người đánh giá/GV: <span className="text-slate-900">{m.assessor || "—"}</span>
                          </div>
                        </div>

                        {/* Feedback */}
                        <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">
                          <b>Nhận xét:</b> {m.feedback || "Chưa có nhận xét chi tiết cho cột mốc này."}
                        </p>
                      </div>
                    ) : (
                      // Inline Edit State
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                          <span className="font-semibold text-emerald-800 text-xs">Cập nhật: {m.title || label}</span>
                          <button onClick={() => setEditingMilestoneKey(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {key !== "m3" && key !== "m4" ? (
                            <>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">Điểm số/Đánh giá</label>
                                <input
                                  type="text"
                                  value={mScore}
                                  onChange={(e) => setMScore(e.target.value)}
                                  placeholder="e.g. Band 5.5, IELTS 6.0"
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">Ngày khảo sát</label>
                                <input
                                  type="date"
                                  value={mDate}
                                  onChange={(e) => setMDate(e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                                />
                              </div>
                            </>
                          ) : key === "m3" ? (
                            <>
                              <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={inlineMttDone}
                                    onChange={(e) => setInlineMttDone(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                  />
                                  <span>Đã làm MTT</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={inlineMtrDone}
                                    onChange={(e) => setInlineMtrDone(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                  />
                                  <span>Đã có MTR</span>
                                </label>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">Ngày kiểm tra MTT</label>
                                <input
                                  type="date"
                                  value={mDate}
                                  onChange={(e) => setMDate(e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-mono mb-0.5 font-bold">Ngày MTR (Tự động chạy)</label>
                                <div className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono">
                                  {mDate ? (() => {
                                    const d = new Date(mDate);
                                    if (!isNaN(d.getTime())) {
                                      d.setDate(d.getDate() + 7);
                                      return d.toISOString().split("T")[0];
                                    }
                                    return "—";
                                  })() : "—"}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-100">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={inlineFtDone}
                                    onChange={(e) => setInlineFtDone(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                  />
                                  <span>Đã làm FT</span>
                                </label>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">Ngày kiểm tra FT</label>
                                <input
                                  type="date"
                                  value={mDate}
                                  onChange={(e) => setMDate(e.target.value)}
                                  className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">GV Khảo sát/Assessor</label>
                            <input
                              type="text"
                              value={mAssessor}
                              onChange={(e) => setMAssessor(e.target.value)}
                              placeholder="e.g. Teacher Mark"
                              className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-slate-500 font-mono mb-0.5 font-bold">Nhận xét chi tiết từ Giáo viên</label>
                            <textarea
                              rows={2}
                              value={mFeedback}
                              onChange={(e) => setMFeedback(e.target.value)}
                              placeholder="Nhận xét kỹ năng..."
                              className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setEditingMilestoneKey(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveMilestone}
                            className="px-2.5 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer font-semibold"
                          >
                            <Save className="w-3 h-3" />
                            Lưu cột mốc
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 2: ADVISOR DETAILS & GOALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/40">
            <h4 className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider mb-2">Lộ trình & Mục tiêu</h4>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans font-medium">
              {student.learningGoal || "Chưa thiết lập mục tiêu cam kết đầu ra."}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2 text-xs font-mono text-slate-600">
            <h4 className="font-sans font-bold text-slate-950 uppercase text-[10px] tracking-wider mb-2">Đội Ngũ Học Thuật Phụ Trách</h4>
            <div>
              Giáo viên chủ nhiệm: <b className="text-slate-900">{student.teacherAdvisor || "Chưa phân công"}</b>
            </div>
            <div>
              Hạn hoàn thành: <span className="text-slate-900 font-bold">{student.endDate || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 4: STUDENT FEEDBACK & ACTIONS */}
        <div className="space-y-4">
          {student.parentFeedback && (
            <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/50">
              <h4 className="text-xs font-mono font-bold text-blue-800 uppercase tracking-wider mb-1">Ý kiến Học viên / Phụ huynh</h4>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {student.parentFeedback}
              </p>
            </div>
          )}

          {student.academicActions && (
            <div className="p-4 bg-emerald-50/20 rounded-xl border border-emerald-100/30">
              <h4 className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider mb-1">Hành động của Bộ phận Học vụ</h4>
              <p className="text-xs text-emerald-800 leading-relaxed font-sans">
                {student.academicActions}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
