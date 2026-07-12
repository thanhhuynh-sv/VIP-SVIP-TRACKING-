import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to generate student tracking milestone feedback / study plan
  app.post("/api/ai/recommendation", async (req, res) => {
    try {
      const { studentName, coursePackage, learningGoal, milestones, notes, parentFeedback } = req.body;

      if (!studentName) {
        res.status(400).json({ error: "Missing studentName parameter" });
        return;
      }

      const prompt = `
Bạn là một Giám đốc Học vụ (Academic Director) cấp cao tại Trung tâm Anh ngữ Cao cấp TalkFirst.
Hãy viết một bài nhận xét, đánh giá kết quả học tập và đề xuất lộ trình hành động (study plan) cụ thể, chi tiết, chuyên nghiệp và mang tính động viên cao dành cho học viên VIP/SVIP sau:

--- THÔNG TIN HỌC VIÊN ---
Học viên: ${studentName}
Gói học: ${coursePackage || "Chưa cập nhật"}
Mục tiêu/Lộ trình: ${learningGoal || "Chưa cập nhật"}
Ghi chú học vụ hiện tại: ${notes || "Không có ghi chú"}
Ý kiến phụ huynh/Học viên: ${parentFeedback || "Không có ý kiến"}

--- CÁC CỘT MỐC ĐÃ GHI NHẬN ---
${Object.entries(milestones || {})
  .map(([key, value]: [string, any]) => {
    return `- ${value.title || key}: Trạng thái: ${value.status || "Chưa bắt đầu"}, Điểm số: ${value.score || "N/A"}, Nhận xét của giáo viên: ${value.feedback || "Chưa có"}`;
  })
  .join("\n")}

--- YÊU CẦU BÀI VIẾT ---
1. Định dạng bài nhận xét chuyên nghiệp bằng Markdown sạch đẹp với tiêu đề rõ ràng, các biểu tượng Bullet point trang nhã, phân chia các mục rõ rệt.
2. Ngôn từ: Tiếng Việt, lịch sự, ân cần, mang đẳng cấp dịch vụ VIP/SVIP 5 sao, nhấn mạnh tính cá nhân hóa (Personalized learning).
3. Nội dung gồm 3 phần chính:
   - **Đánh giá tổng quan tiến trình**: Đánh giá nỗ lực của học viên dựa trên các cột mốc đã hoàn thành (đặc biệt lưu ý mốc Đầu vào so với các mốc hiện tại).
   - **Các điểm sáng & Điểm cần cải thiện**: Phân tích ngắn gọn nhưng sâu sắc về kỹ năng học tập hoặc tinh thần tham gia lớp học của học viên.
   - **Đề xuất kế hoạch hành động cụ thể (Action Plan)**: Đưa ra 3-4 lời khuyên thiết thực (ví dụ: số giờ tự học mỗi tuần, nhóm kỹ năng cần tập trung luyện tập, cam kết tương tác, cách tận dụng tài nguyên lớp học TalkFirst).
4. Đừng lặp lại các thông tin thô từ input một cách máy móc, hãy diễn đạt tự nhiên như một chuyên gia giáo dục thực thụ.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      res.json({ recommendation: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate recommendation" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware setup for development, or static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
