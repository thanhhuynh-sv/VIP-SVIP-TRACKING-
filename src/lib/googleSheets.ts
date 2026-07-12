import { auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import { Student } from "../types";

export const SPREADSHEET_ID = "1TRPe2XI-r2Majlsc8XWRBXIOoQEzCXzqDRhMJqVBhUk";

// OAuth Scope for Google Sheets API
export const SHEET_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets"
];

const provider = new GoogleAuthProvider();
SHEET_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory cache for OAuth access token
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Try retrieving from session storage to maintain connection on refresh
  const storedToken = sessionStorage.getItem("sheets_access_token");
  if (storedToken) {
    cachedAccessToken = storedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem("sheets_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Không thể lấy access token từ Google Auth.");
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem("sheets_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem("sheets_access_token");
};

// Retrieve token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Helper: convert YYYY-MM-DD to DD/MM/YYYY
export const formatToSheetDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
  }
  return trimmed;
};

// Convert sheet date DD/MM/YYYY back to YYYY-MM-DD
export const parseDateString = (dateStr?: string): string => {
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

// Map student fields to a 20-column Google Sheet row
export const mapStudentToRow = (student: Student, stt: string | number = ""): string[] => {
  let level = student.level || "";
  let classType = student.classTypes && student.classTypes.length > 0 ? student.classTypes.join(", ") : "";

  if (!level && student.coursePackage) {
    const match = student.coursePackage.match(/^([^(]+)(?:\(([^)]+)\))?/);
    if (match) {
      level = match[1].trim();
      classType = match[2] ? match[2].trim() : "";
    } else {
      level = student.coursePackage;
    }
  }

  let statusStr = "Đang học";
  if (student.status === "paused") {
    statusStr = "Tạm dừng";
  } else if (student.status === "graduated") {
    statusStr = "Kết thúc";
  } else if (student.status === "dropped") {
    statusStr = "Nghỉ học";
  }

  const m1 = student.milestones?.m1;
  const m2 = student.milestones?.m2;
  const m3 = student.milestones?.m3;
  const mtr = student.milestones?.mtr;
  const m4 = student.milestones?.m4;

  const row = new Array(20).fill("");
  row[0] = String(stt);
  row[1] = student.fullName || "";
  row[2] = student.studentId || "";
  row[3] = level;
  row[4] = classType;
  row[5] = `${student.totalSessions || 45} giờ`;
  row[6] = statusStr;
  row[7] = student.teacherAdvisor || "";
  row[8] = formatToSheetDate(student.startDate);
  row[9] = formatToSheetDate(student.endDate);

  // Milestone 1 (QC1)
  row[10] = formatToSheetDate(m1?.date);
  row[11] = m1?.score || (m1?.status === "completed" ? "Hoàn thành" : "");

  // Milestone 2 (QC2)
  row[12] = formatToSheetDate(m2?.date);
  row[13] = m2?.score || (m2?.status === "completed" ? "Hoàn thành" : "");

  // Milestone 3 (MTT)
  row[14] = formatToSheetDate(m3?.date);
  row[15] = m3?.score || (student.mttDone ? "Hoàn thành" : (m3?.status === "completed" ? "Hoàn thành" : ""));

  // Milestone MTR (Midterm Review)
  row[16] = formatToSheetDate(mtr?.date);
  row[17] = mtr?.score || (student.mtrDone ? "Hoàn thành" : (mtr?.status === "completed" ? "Hoàn thành" : ""));

  // Milestone 4 (FT)
  row[18] = formatToSheetDate(m4?.date);
  row[19] = m4?.score || (student.ftDone ? "Hoàn thành" : (m4?.status === "completed" ? "Hoàn thành" : ""));

  return row;
};

// Fetch values from Sheet using token
export const fetchSheetValues = async (token: string): Promise<string[][]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:T?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Lỗi tải dữ liệu Google Sheet: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.values || [];
};

// Write a single student's record back to Google Sheet (2-way write)
export const syncStudentToGoogleSheet = async (student: Student, token: string): Promise<boolean> => {
  if (!student.studentId) {
    console.warn("Student missing studentId, skipping Google Sheet sync");
    return false;
  }

  try {
    const rows = await fetchSheetValues(token);
    let foundRowIndex = -1; // 0-based index in the `rows` array

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[2] && row[2].trim().toLowerCase() === student.studentId.trim().toLowerCase()) {
        foundRowIndex = i;
        break;
      }
    }

    if (foundRowIndex !== -1) {
      // Update existing row
      const sttValue = rows[foundRowIndex][0] || foundRowIndex;
      const mappedRow = mapStudentToRow(student, sttValue);
      
      const rowNumber = foundRowIndex + 1; // Google Sheet row number is 1-indexed
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A${rowNumber}:T${rowNumber}?valueInputOption=USER_ENTERED`;
      
      const response = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: `A${rowNumber}:T${rowNumber}`,
          majorDimension: "ROWS",
          values: [mappedRow]
        })
      });

      if (!response.ok) {
        throw new Error(`Không thể cập nhật dòng ${rowNumber}: HTTP ${response.status}`);
      }

      console.log(`Successfully updated student ${student.studentId} in Google Sheet at row ${rowNumber}`);
      return true;
    } else {
      // Append brand new row
      const nextStt = rows.length; // Approximate STT
      const mappedRow = mapStudentToRow(student, nextStt);

      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A:T:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: "A:T",
          majorDimension: "ROWS",
          values: [mappedRow]
        })
      });

      if (!response.ok) {
        throw new Error(`Không thể thêm mới dòng vào Google Sheet: HTTP ${response.status}`);
      }

      console.log(`Successfully appended student ${student.studentId} as a new row in Google Sheet`);
      return true;
    }
  } catch (error) {
    console.error("Lỗi khi đồng bộ lên Google Sheet:", error);
    throw error;
  }
};
