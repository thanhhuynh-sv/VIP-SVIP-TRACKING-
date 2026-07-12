import { useState, useEffect } from "react";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { Student } from "./types";
import MetricCards from "./components/MetricCards";
import StudentList from "./components/StudentList";
import StudentDetail from "./components/StudentDetail";
import StudentModal from "./components/StudentModal";
import MonthlyReportModal from "./components/MonthlyReportModal";
import { Award, GraduationCap, RefreshCw, Sparkles, BookOpen, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Bell, Calendar, CheckCircle2, FileSpreadsheet, Lock, CheckCircle, ExternalLink, LogOut } from "lucide-react";
import { User } from "firebase/auth";
import { 
  initSheetsAuth, 
  googleSignIn, 
  googleLogout, 
  syncStudentToGoogleSheet, 
  fetchSheetValues,
  SPREADSHEET_ID
} from "./lib/googleSheets";

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Google Sheets Authentication State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);

  // Initialize sheets authentication listener
  useEffect(() => {
    const unsubscribe = initSheetsAuth(
      (user, token) => {
        setGoogleUser(user);
        setSheetsToken(token);
      },
      () => {
        setGoogleUser(null);
        setSheetsToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Read real-time students list from Firestore
  useEffect(() => {
    setIsLoading(true);
    const studentsCollection = collection(db, "students");
    const q = query(studentsCollection, orderBy("fullName", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData: Student[] = [];
      const todayString = new Date().toLocaleDateString("sv-SE");

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Student;
        const id = docSnapshot.id;
        let currentStatus = data.status;

        // Auto-graduate student if their endDate has passed
        if (data.endDate && data.endDate.length === 10 && (currentStatus === "active" || currentStatus === "paused")) {
          if (data.endDate < todayString) {
            currentStatus = "graduated";
            updateDoc(doc(db, "students", id), {
              status: "graduated",
              updatedAt: new Date().toISOString()
            }).catch(err => console.error("Auto-graduation update failed:", err));
          }
        }

        studentData.push({
          id,
          ...data,
          status: currentStatus,
        });
      });
      setStudents(studentData);

      // Maintain selected student reference with updated database info
      if (selectedStudent) {
        const updatedSelected = studentData.find((s) => s.id === selectedStudent.id);
        if (updatedSelected) {
          setSelectedStudent(updatedSelected);
        } else {
          setSelectedStudent(null);
        }
      } else if (studentData.length > 0 && !selectedStudent) {
        // Automatically select first student on first load
        setSelectedStudent(studentData[0]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save new student or update existing student's general details
  const handleSaveStudent = async (studentData: Partial<Student>) => {
    try {
      const now = new Date().toISOString();
      let updatedStudent: Student | null = null;

      if (studentToEdit && studentToEdit.id) {
        // Editing student general profile
        const docRef = doc(db, "students", studentToEdit.id);
        const updatePayload = {
          ...studentData,
          updatedAt: now,
        };
        await updateDoc(docRef, updatePayload);
        
        updatedStudent = {
          ...studentToEdit,
          ...updatePayload,
        } as Student;
      } else {
        // Adding new student
        const studentsCollection = collection(db, "students");
        const newStudentData = {
          ...studentData,
          createdAt: now,
          updatedAt: now,
        };
        const docRef = await addDoc(studentsCollection, newStudentData);
        
        updatedStudent = {
          id: docRef.id,
          ...newStudentData,
        } as Student;
      }

      // Automatically sync with Google Sheet if logged in
      if (sheetsToken && updatedStudent) {
        syncStudentToGoogleSheet(updatedStudent, sheetsToken).catch(err => {
          console.error("Auto-sync to Google Sheet failed:", err);
        });
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Đã xảy ra lỗi khi lưu học viên!");
    }
  };

  // Update specific fields or nested objects (milestones, gifts, monthly reports)
  const handleUpdateStudentFields = async (id: string, updatedFields: Partial<Student>) => {
    try {
      const docRef = doc(db, "students", id);
      const now = new Date().toISOString();
      const updatePayload = {
        ...updatedFields,
        updatedAt: now,
      };
      await updateDoc(docRef, updatePayload);

      // Automatically sync with Google Sheet if logged in
      if (sheetsToken) {
        const currentStudent = students.find(s => s.id === id);
        if (currentStudent) {
          const updatedStudent = {
            ...currentStudent,
            ...updatePayload,
          } as Student;
          syncStudentToGoogleSheet(updatedStudent, sheetsToken).catch(err => {
            console.error("Auto-sync to Google Sheet failed:", err);
          });
        }
      }
    } catch (error) {
      console.error("Error updating student sub-fields:", error);
      alert("Lỗi cập nhật dữ liệu!");
    }
  };

  // Delete student from Firestore
  const handleDeleteStudent = async (id: string) => {
    try {
      const docRef = doc(db, "students", id);
      await deleteDoc(docRef);
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Lỗi xóa học viên!");
    }
  };

  const handleOpenAddModal = () => {
    setStudentToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setStudentToEdit(student);
    setIsModalOpen(true);
  };

  // Seed sample database for demonstration
  const handleSeedDatabase = async () => {
    setIsLoading(true);
    try {
      const sampleStudents: Omit<Student, "id">[] = [
        {
          studentId: "TF-VIP-1025",
          fullName: "Trần Minh Triết",
          phone: "0909123456",
          email: "minhtriet.tran@gmail.com",
          coursePackage: "VIP IELTS 100 Sessions",
          startDate: "2026-01-15",
          endDate: "2026-12-15",
          totalSessions: 100,
          attendedSessions: 28,
          teacherAdvisor: "Teacher Mark Sullivan",
          academicAdvisor: "Vy Nguyễn (Academic Staff)",
          learningGoal: "Mục tiêu cam kết đầu ra IELTS 7.0 thực tế phục vụ việc đi du học thạc sĩ tại Anh Quốc. Tập trung chuyên sâu các buổi thực hành Speaking và Writing feedback 1-1.",
          status: "active",
          notes: "Tác phong học tập rất chỉn chu, hoàn thành tốt bài tập về nhà. Cần cải thiện phát âm âm cuối (ending sounds).",
          parentFeedback: "Học viên rất thích học với thầy Mark, phản hồi phương pháp dạy trực quan dễ hiểu. Phụ huynh mong muốn kèm thêm từ vựng chuyên ngành kinh tế.",
          academicActions: "Đã liên hệ hỗ trợ gửi thêm tài liệu đọc bổ trợ IELTS Reading Academic tuần thứ 4.",
          vipGifts: {
            backpack: true,
            notebook: true,
            thermos: false,
            poloShirt: true
          },
          monthlyReports: {
            "Tháng 02/2026": true,
            "Tháng 03/2026": true,
            "Tháng 04/2026": true,
            "Tháng 05/2026": true
          },
          milestones: {
            input: {
              title: "Kiểm tra đầu vào (Placement Test)",
              status: "completed",
              date: "2026-01-10",
              score: "IELTS 5.0 equivalent",
              feedback: "Kỹ năng Listening và Reading khá tốt. Nói phản xạ còn chậm và hay mắc lỗi chia động từ.",
              assessor: "Teacher Emily"
            },
            m1: {
              title: "Cột mốc 1: Đánh giá sau 25% lộ trình",
              status: "completed",
              date: "2026-04-05",
              score: "IELTS 5.5 (L: 6.0, R: 6.0, S: 5.5, W: 5.0)",
              feedback: "Đã tăng độ trôi chảy khi nói, vốn từ vựng được mở rộng. Cần tăng cấu trúc câu phức cho kỹ năng viết.",
              assessor: "Teacher Mark"
            },
            m2: {
              title: "Cột mốc 2: Giữa kỳ (50% lộ trình)",
              status: "in_progress",
              date: "2026-07-10",
              score: "",
              feedback: "Chuẩn bị đánh giá định kỳ buổi thứ 50 sắp tới.",
              assessor: "Teacher Mark"
            },
            m3: {
              title: "Cột mốc 3: Đánh giá sau 75% lộ trình",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            },
            m4: {
              title: "Cột mốc 4: Kiểm tra đầu ra (Output)",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          studentId: "TF-SVIP-2033",
          fullName: "Lê Thị Thu Thảo",
          phone: "0918888999",
          email: "thuthao.le@gmail.com",
          coursePackage: "SVIP Executive Communication",
          startDate: "2026-02-01",
          endDate: "2026-08-01",
          totalSessions: 60,
          attendedSessions: 42,
          teacherAdvisor: "Teacher Paul Henderson",
          academicAdvisor: "Trúc Mai (Academic Staff)",
          learningGoal: "Luyện phản xạ giao tiếp nâng cao, đàm phán hợp đồng thương mại với đối tác nước ngoài. Mục tiêu giao tiếp lưu loát tương đương C1.",
          status: "active",
          notes: "Học viên là giám đốc doanh nghiệp, học rất chủ động, có ngữ điệu tự nhiên. Cần mài giũa cách viết email trang trọng chuẩn formal.",
          parentFeedback: "Mong muốn tập trung sâu hơn vào các chủ đề Business Presentation và đàm phán thương lượng.",
          academicActions: "Đã bổ sung bộ Email Templates cho Business English để học viên thực hành hàng ngày.",
          vipGifts: {
            backpack: true,
            notebook: true,
            thermos: true,
            poloShirt: true
          },
          monthlyReports: {
            "Tháng 03/2026": true,
            "Tháng 04/2026": true,
            "Tháng 05/2026": true
          },
          milestones: {
            input: {
              title: "Kiểm tra đầu vào (Placement Test)",
              status: "completed",
              date: "2026-01-25",
              score: "Intermediate (B1)",
              feedback: "Có từ vựng cơ bản, phát âm ổn nhưng cấu trúc ngữ pháp đàm thoại còn đơn giản, thiếu từ vựng chuyên ngành tài chính.",
              assessor: "Teacher Paul"
            },
            m1: {
              title: "Cột mốc 1: Đánh giá sau 25% lộ trình",
              status: "completed",
              date: "2026-03-20",
              score: "High-Intermediate (B2)",
              feedback: "Sử dụng từ vựng Business trôi chảy hơn, phản xạ lập luận logic tốt. Email gửi đi đã đúng văn phong thương mại.",
              assessor: "Teacher Paul"
            },
            m2: {
              title: "Cột mốc 2: Giữa kỳ (50% lộ trình)",
              status: "completed",
              date: "2026-05-25",
              score: "Advanced (B2+ to C1)",
              feedback: "Thuyết trình dự án tự tin, có phong thái lãnh đạo tốt khi tranh luận. Phát âm chuẩn IPA tốt.",
              assessor: "Teacher Paul"
            },
            m3: {
              title: "Cột mốc 3: Đánh giá sau 75% lộ trình",
              status: "in_progress",
              date: "2026-07-15",
              score: "",
              feedback: "Chuẩn bị rà soát mốc đánh giá thứ 3.",
              assessor: ""
            },
            m4: {
              title: "Cột mốc 4: Kiểm tra đầu ra (Output)",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          studentId: "TF-VIP-0922",
          fullName: "Phạm Hoàng Nam",
          phone: "0908777123",
          email: "hoangnam.p@gmail.com",
          coursePackage: "VIP Active Speaking 60",
          startDate: "2026-03-01",
          endDate: "2027-03-01",
          totalSessions: 60,
          attendedSessions: 12,
          teacherAdvisor: "Teacher Sarah Connor",
          academicAdvisor: "Huy Lâm (Academic Staff)",
          learningGoal: "Xây dựng lại nền tảng từ vựng và lấy lại sự tự tin khi nói tiếng Anh. Vượt qua nỗi sợ giao tiếp với người nước ngoài.",
          status: "paused",
          notes: "Đang bảo lưu từ ngày 15/05/2026 do đi công tác đột xuất ở Nhật Bản. Dự kiến quay lại lớp vào tháng 08/2026.",
          parentFeedback: "Học viên cảm nhận học vui vẻ thoải mái, không áp lực. Rất mong muốn sớm thu xếp công việc để tiếp tục học.",
          academicActions: "Đã gửi mail xác nhận thời gian bảo lưu và bảo lưu thời hạn gói học theo quy chế VIP.",
          vipGifts: {
            backpack: true,
            notebook: false,
            thermos: false,
            poloShirt: false
          },
          monthlyReports: {
            "Tháng 04/2026": true
          },
          milestones: {
            input: {
              title: "Kiểm tra đầu vào (Placement Test)",
              status: "completed",
              date: "2026-02-25",
              score: "Beginner (A1)",
              feedback: "Bị mất gốc ngữ pháp, ngại nói và từ vựng rất hạn chế.",
              assessor: "Teacher Sarah"
            },
            m1: {
              title: "Cột mốc 1: Đánh giá sau 25% lộ trình",
              status: "in_progress",
              date: "2026-05-10",
              score: "A2 Entry",
              feedback: "Đã vượt qua rào cản sợ nói, tự tin chào hỏi và giới thiệu bản thân lưu loát. Tuy nhiên vốn từ chưa nhiều.",
              assessor: "Teacher Sarah"
            },
            m2: {
              title: "Cột mốc 2: Giữa kỳ (50% lộ trình)",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            },
            m3: {
              title: "Cột mốc 3: Đánh giá sau 75% lộ trình",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            },
            m4: {
              title: "Cột mốc 4: Kiểm tra đầu ra (Output)",
              status: "not_started",
              date: "",
              score: "",
              feedback: "",
              assessor: ""
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const studentsCollection = collection(db, "students");
      for (const student of sampleStudents) {
        await addDoc(studentsCollection, student);
      }
      alert("Đã khởi tạo thành công 3 học viên VIP mẫu cực kỳ chi tiết!");
    } catch (error) {
      console.error("Error seeding:", error);
      alert("Lỗi khi tạo dữ liệu mẫu!");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync with Google Sheets dynamically
  const handleSyncSheet = async () => {
    setIsSyncing(true);
    let insertedCount = 0;
    let updatedCount = 0;

    const parseDateString = (dateStr: string): string => {
      if (!dateStr) return "";
      dateStr = dateStr.trim();
      if (dateStr === "06/01/1900" || dateStr === "" || dateStr === "-" || dateStr === "0") return "";
      
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        let day = parts[0].trim().padStart(2, "0");
        let month = parts[1].trim().padStart(2, "0");
        let year = parts[2].trim();
        if (year.length === 2) {
          year = "20" + year;
        } else if (year.length === 4 && year.startsWith("02")) {
          year = "20" + year.substring(2);
        }
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    const parseCSVLine = (text: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    try {
      let lines: string[][] = [];

      if (sheetsToken) {
        console.log("Fetching live sheet values via Google Sheets API...");
        lines = await fetchSheetValues(sheetsToken);
      } else {
        console.log("Fetching public sheet values via CSV Export URL...");
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể tải file từ Google Sheet. Vui lòng kiểm tra quyền chia sẻ công khai hoặc Đăng nhập Google.");
        
        const csvData = await res.text();
        const csvLines = csvData.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        lines = csvLines.map(line => parseCSVLine(line));
      }

      if (lines.length <= 1) {
        throw new Error("Không có dữ liệu hoặc không có dòng học viên nào trong Google Sheet!");
      }

      // Map existing students by studentId (case-insensitive & trimmed)
      const existingMap = new Map<string, Student>();
      students.forEach(s => {
        if (s.studentId) {
          existingMap.set(s.studentId.trim().toLowerCase(), s);
        }
      });

      const incomingIds = new Set<string>();
      const studentsCollection = collection(db, "students");

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 3 || !row[1] || !row[2]) {
          continue; // Skip empty rows or rows missing name/student ID
        }

        const fullName = row[1].trim();
        const studentId = row[2].trim(); // Mã lớp as studentId

        if (!fullName || !studentId) {
          continue; // Skip if either is blank to prevent duplicates/orphans
        }

        // Track incoming IDs to delete removed students
        incomingIds.add(studentId.trim().toLowerCase());
        const level = row[3]?.trim() || "";
        const classType = row[4]?.trim() || "";
        const courseDuration = row[5]?.trim() || "";
        const classStatusStr = row[6]?.trim() || "";
        const teacherName = row[7]?.trim() || "";
        const startDateStr = row[8]?.trim() || "";
        const endDateStr = row[9]?.trim() || "";

        // Determine basic course status
        let status: "active" | "paused" | "graduated" | "dropped" = "active";
        if (classStatusStr === "Kết thúc") {
          status = "graduated";
        } else if (classStatusStr === "Tạm dừng") {
          status = "paused";
        } else if (classStatusStr === "Đang học") {
          status = "active";
        } else if (classStatusStr === "Nghỉ học") {
          status = "dropped";
        }

        const startDate = parseDateString(startDateStr);
        const endDate = parseDateString(endDateStr);

        // Auto-graduate on import/sync if the end date has passed
        const todayString = new Date().toLocaleDateString("sv-SE");
        if (endDate && endDate.length === 10 && (status === "active" || status === "paused")) {
          if (endDate < todayString) {
            status = "graduated";
          }
        }
        
        let totalSessions = 45;
        const durMatch = courseDuration.match(/(\d+)/);
        if (durMatch) {
          totalSessions = parseInt(durMatch[1]);
        }

        // Helper to build a Milestone object
        const buildMilestone = (title: string, dateRaw: string, statusRaw: string) => {
          const date = parseDateString(dateRaw);
          let milestoneStatus: "not_started" | "in_progress" | "completed" = "not_started";
          
          if (date) {
            if (statusRaw === "Hoàn thành" || statusRaw === "ON TRACK" || statusRaw === "CONCERN" || statusRaw === "Chuẩn bị") {
              milestoneStatus = statusRaw === "Hoàn thành" ? "completed" : "in_progress";
            } else {
              milestoneStatus = "in_progress";
            }
          }

          return {
            title,
            status: milestoneStatus,
            date,
            score: statusRaw || "",
            feedback: milestoneStatus === "completed" ? `Đã hoàn thành đánh giá cột mốc: ${statusRaw}` : "",
            assessor: teacherName || "Academic Staff"
          };
        };

        const milestones = {
          m1: buildMilestone("QC1 (Buổi đầu tiên)", row[10] || "", row[11] || ""),
          m2: buildMilestone("QC2 (25% lộ trình)", row[12] || "", row[13] || ""),
          m3: buildMilestone("MTT (Giữa kỳ - 50% lộ trình)", row[14] || "", row[15] || ""),
          mtr: buildMilestone("MTR (Midterm Review)", row[16] || "", row[17] || ""),
          m4: buildMilestone("FT (Final test - 75% lộ trình)", row[18] || "", row[19] || "")
        };

        const existingStudent = existingMap.get(studentId.toLowerCase());

        const syncMttDone = row[15]?.trim() === "Hoàn thành";
        const syncMtrDone = row[17]?.trim() === "Hoàn thành";
        const syncFtDone = row[19]?.trim() === "Hoàn thành";

        if (existingStudent) {
          // Merge & update existing - prevent overwriting manual app edits with blank/default sheet values
          const mergedStartDate = startDate || existingStudent.startDate || "";
          const mergedEndDate = endDate || existingStudent.endDate || "";
          const mergedTeacherAdvisor = teacherName || existingStudent.teacherAdvisor || "";
          
          let mergedStatus = existingStudent.status || "active";
          if (classStatusStr && classStatusStr !== "Chưa bắt đầu") {
            mergedStatus = status;
          }

          // Merge milestones: preserve app values if the sheet column is blank or if the app milestone is already completed
          const mergedMilestones = {
            m1: existingStudent.milestones?.m1?.status === "completed" || (!(row[10] && row[10].trim()) && existingStudent.milestones?.m1?.date)
              ? { ...existingStudent.milestones.m1 }
              : { ...milestones.m1, feedback: existingStudent.milestones?.m1?.feedback || milestones.m1.feedback },
            m2: existingStudent.milestones?.m2?.status === "completed" || (!(row[12] && row[12].trim()) && existingStudent.milestones?.m2?.date)
              ? { ...existingStudent.milestones.m2 }
              : { ...milestones.m2, feedback: existingStudent.milestones?.m2?.feedback || milestones.m2.feedback },
            m3: existingStudent.milestones?.m3?.status === "completed" || (!(row[14] && row[14].trim()) && existingStudent.milestones?.m3?.date)
              ? { ...existingStudent.milestones.m3 }
              : { ...milestones.m3, feedback: existingStudent.milestones?.m3?.feedback || milestones.m3.feedback },
            mtr: existingStudent.milestones?.mtr?.status === "completed" || (!(row[16] && row[16].trim()) && existingStudent.milestones?.mtr?.date)
              ? { ...existingStudent.milestones.mtr }
              : { ...milestones.mtr, feedback: existingStudent.milestones?.mtr?.feedback || milestones.mtr.feedback },
            m4: existingStudent.milestones?.m4?.status === "completed" || (!(row[18] && row[18].trim()) && existingStudent.milestones?.m4?.date)
              ? { ...existingStudent.milestones.m4 }
              : { ...milestones.m4, feedback: existingStudent.milestones?.m4?.feedback || milestones.m4.feedback },
          };

          const updatedDoc: Partial<Student> = {
            fullName,
            coursePackage: `${level} (${classType})`,
            startDate: mergedStartDate,
            endDate: mergedEndDate,
            totalSessions,
            status: mergedStatus,
            teacherAdvisor: mergedTeacherAdvisor,
            mttDone: syncMttDone || existingStudent.mttDone || false,
            mtrDone: syncMtrDone || existingStudent.mtrDone || false,
            ftDone: syncFtDone || existingStudent.ftDone || false,
            milestones: mergedMilestones,
            updatedAt: new Date().toISOString()
          };

          const docRef = doc(db, "students", existingStudent.id);
          await updateDoc(docRef, updatedDoc);
          updatedCount++;
        } else {
          // Add brand new student
          const newStudentDoc = {
            studentId,
            fullName,
            phone: "",
            email: "",
            coursePackage: `${level} (${classType})`,
            startDate,
            endDate,
            totalSessions,
            attendedSessions: status === "graduated" ? totalSessions : 0,
            teacherAdvisor: teacherName,
            academicAdvisor: "Vy Nguyễn (Academic Staff)",
            learningGoal: `Chương trình: ${level}. Hệ lớp: ${classType}. Lộ trình: ${courseDuration}.`,
            status,
            notes: `Lớp ${studentId}. Đồng bộ từ Google Sheet.`,
            parentFeedback: "",
            academicActions: "",
            vipGifts: {
              backpack: false,
              notebook: false,
              thermos: false,
              poloShirt: false
            },
            monthlyReports: {},
            mttDone: syncMttDone,
            mtrDone: syncMtrDone,
            ftDone: syncFtDone,
            milestones,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await addDoc(studentsCollection, newStudentDoc);
          insertedCount++;
        }
      }

      // Automatically clean up/delete existing students in Firestore that are no longer in Google Sheets
      let deletedCount = 0;
      for (const student of students) {
        if (student.studentId) {
          const normalizedId = student.studentId.trim().toLowerCase();
          if (!incomingIds.has(normalizedId)) {
            const docRef = doc(db, "students", student.id);
            await deleteDoc(docRef);
            deletedCount++;
          }
        }
      }

      alert(`ĐỒNG BỘ THÀNH CÔNG!\n- Học viên mới thêm: ${insertedCount}\n- Học viên được cập nhật: ${updatedCount}${deletedCount > 0 ? `\n- Học viên cũ đã bị xóa khỏi hệ thống (do không có tên trong Google Sheet): ${deletedCount}` : ""}`);
    } catch (error: any) {
      console.error("Lỗi đồng bộ Google Sheet:", error);
      alert(`Lỗi đồng bộ Google Sheet: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMarkAlertDone = async (student: Student, milestoneKey: "m3" | "m4") => {
    try {
      const updatedMilestones = { ...student.milestones };
      if (updatedMilestones[milestoneKey]) {
        updatedMilestones[milestoneKey] = {
          ...updatedMilestones[milestoneKey]!,
          status: "completed",
          feedback: updatedMilestones[milestoneKey]?.feedback || "Đã xử lý cảnh báo hoàn thành."
        };
      }
      
      const extraFields: Partial<Student> = {
        milestones: updatedMilestones
      };
      
      if (milestoneKey === "m3") {
        extraFields.mttDone = true;
      } else if (milestoneKey === "m4") {
        extraFields.ftDone = true;
      }
      
      await handleUpdateStudentFields(student.id!, extraFields);
    } catch (error) {
      console.error("Error marking alert done:", error);
      alert("Lỗi khi đánh dấu hoàn thành!");
    }
  };

  // Calculate alerts for MTT (m3) and FT (m4) milestone warnings (under 10 days or overdue)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const milestoneAlerts = students.flatMap((student) => {
    if (student.status !== "active") return [];
    const alerts: any[] = [];
    const keysToCheck: { key: "m3" | "m4"; type: "MTT" | "FT"; label: string }[] = [
      { key: "m3", type: "MTT", label: "Cột mốc 3: Đánh giá giữa kỳ (MTT)" },
      { key: "m4", type: "FT", label: "Cột mốc 4: Kiểm tra đầu ra (FT)" }
    ];

    keysToCheck.forEach(({ key, type, label }) => {
      const milestone = student.milestones?.[key];
      if (!milestone || !milestone.date || milestone.status === "completed") return;

      // Auto-disappear conditions if checkboxes are all checked
      if (key === "m3" && student.mttDone && student.mtrDone) return;
      if (key === "m4" && student.ftNotified && student.ftBooked && student.ftDone) return;

      const msDate = new Date(milestone.date);
      msDate.setHours(0, 0, 0, 0);

      const diffTime = msDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 10) {
        alerts.push({
          student,
          milestoneKey: key,
          milestoneType: type,
          milestoneLabel: label,
          milestone,
          daysRemaining: diffDays,
          isOverdue: diffDays < 0,
        });
      }
    });

    return alerts;
  }).sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.daysRemaining - b.daysRemaining;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-emerald-100 antialiased font-sans" id="main-app">
      
      {/* Upper Brand Bar in Slate & Emerald Theme */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 sticky top-0 z-40 shadow-md" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-sans font-bold text-white tracking-tight uppercase">
                  VIP & SVIP Milestone Tracker
                </h1>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">
                  TalkFirst Academic
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Hệ thống kiểm soát chất lượng đào tạo và tiến độ 5 cột mốc học viên Cao cấp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-end">
            {students.length === 0 && (
              <button
                onClick={handleSeedDatabase}
                disabled={isLoading}
                className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Khởi tạo dữ liệu mẫu</span>
              </button>
            )}

            {/* Google Sheets Integration Controls */}
            {googleUser && sheetsToken ? (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]" title={googleUser.email || ""}>
                    {googleUser.email?.split("@")[0]}
                  </span>
                  <span className="text-[8px] text-emerald-400 font-bold tracking-tight uppercase">
                    Sync 2 Chiều OK
                  </span>
                </div>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở file Google Sheet tổng để xem trực tiếp"
                  className="ml-2 text-slate-400 hover:text-emerald-400 transition-colors p-1 bg-slate-900 rounded border border-slate-800"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={googleLogout}
                  title="Đăng xuất tài khoản Google"
                  className="text-slate-400 hover:text-rose-400 transition-colors p-1 bg-slate-900 rounded border border-slate-800 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={googleSignIn}
                className="text-xs bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-amber-400"
                title="Đăng nhập để đồng bộ trực tiếp 2 chiều từ Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                <span>Đăng Nhập Google Sheets</span>
              </button>
            )}

            <div className="text-xs font-mono text-slate-400 border border-slate-800 bg-slate-950 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Cloud DB Live Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace Inner Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex flex-col min-h-0" id="app-workspace">
        
        {/* KPI indicators at the top */}
        <MetricCards students={students} />

        {/* Milestone Warnings (MTT & FT) */}
        {milestoneAlerts.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="milestone-alerts-panel">
            <div 
              className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors border-l-4 ${
                milestoneAlerts.some(a => a.isOverdue) ? "border-l-rose-500 bg-rose-50/10 hover:bg-rose-50/20" : "border-l-amber-500 bg-amber-50/10 hover:bg-amber-50/20"
              }`}
              onClick={() => setIsAlertsCollapsed(!isAlertsCollapsed)}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg flex items-center justify-center ${
                  milestoneAlerts.some(a => a.isOverdue) ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-amber-100 text-amber-600 animate-pulse"
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    Cảnh báo mốc học tập MTT & FT quan trọng 
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                      milestoneAlerts.some(a => a.isOverdue) ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                    }`}>
                      {milestoneAlerts.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Có {milestoneAlerts.filter(a => a.isOverdue).length} mốc trễ hạn và {milestoneAlerts.filter(a => !a.isOverdue).length} mốc sắp diễn ra trong 10 ngày tới. Click học viên để xử lý ngay.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  {isAlertsCollapsed ? "Hiện" : "Ẩn"}
                </span>
                <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors">
                  {isAlertsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isAlertsCollapsed && (
              <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {milestoneAlerts.map((alert, idx) => (
                    <div 
                      key={`${alert.student.id}-${alert.milestoneKey}-${idx}`}
                      onClick={() => {
                        setSelectedStudent(alert.student);
                        document.getElementById("student-detail-panel")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm flex flex-col justify-between ${
                        alert.isOverdue 
                          ? "border-rose-100 hover:border-rose-300 ring-1 ring-rose-50/50" 
                          : "border-amber-100 hover:border-amber-300 ring-1 ring-amber-50/50"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm hover:text-emerald-600 transition-colors">
                            {alert.student.fullName}
                          </h4>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                            alert.isOverdue 
                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {alert.milestoneType}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-500 font-mono">
                          Mã lớp/HV: <b>{alert.student.studentId}</b>
                        </p>

                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                          <span className="font-semibold block text-slate-700 mb-0.5">{alert.milestoneLabel}</span>
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Ngày hẹn: <b className="text-slate-800 font-semibold">{alert.milestone.date}</b>
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-100 flex items-center justify-between">
                        <span className={`text-[11px] font-bold font-mono ${alert.isOverdue ? "text-rose-600 animate-pulse" : "text-amber-600"}`}>
                          {alert.isOverdue 
                            ? `TRỄ HẠN ${Math.abs(alert.daysRemaining)} NGÀY` 
                            : alert.daysRemaining === 0 
                            ? "SẼ DIỄN RA HÔM NAY" 
                            : `CÒN ${alert.daysRemaining} NGÀY`
                          }
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAlertDone(alert.student, alert.milestoneKey);
                            }}
                            className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Bấm để đánh dấu hoàn thành mốc cảnh báo này"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Done
                          </button>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 hover:underline">
                            Xem &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && students.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-96 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-sm font-mono">Đang đồng bộ dữ liệu Firestore...</p>
          </div>
        ) : (
          /* Bento grid layout for split view: Left list, Right detail drawer */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0" id="bento-split-view">
            
            {/* Left side student catalog */}
            <div className="lg:col-span-8 flex flex-col h-[70vh] lg:h-[75vh]">
              <StudentList
                students={students}
                selectedStudent={selectedStudent}
                onSelectStudent={setSelectedStudent}
                onAddStudent={handleOpenAddModal}
                onEditStudent={handleOpenEditModal}
                onDeleteStudent={handleDeleteStudent}
                onSyncSheet={handleSyncSheet}
                isSyncing={isSyncing}
                onOpenReportModal={() => setIsReportOpen(true)}
                onUpdateStudentFields={handleUpdateStudentFields}
              />
            </div>

            {/* Right side interactive timeline panel */}
            <div className="lg:col-span-4 flex flex-col h-[70vh] lg:h-[75vh]">
              <StudentDetail
                student={selectedStudent}
                onUpdateStudent={handleUpdateStudentFields}
              />
            </div>

          </div>
        )}

      </main>

      {/* Shared Modals */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStudent}
        student={studentToEdit}
      />

      <MonthlyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        students={students}
      />

    </div>
  );
}
