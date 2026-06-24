import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Play,
  Clipboard,
  Trash2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  LogIn,
  LogOut,
  Link2,
  DownloadCloud,
  Check,
  Info,
  AlertCircle,
  X
} from "lucide-react";
import { DictionaryEntry, ChunkColor, ExampleItem } from "../types";
import { initAuth, googleSignIn, logout } from "../lib/firebase";
import { User } from "firebase/auth";

interface TeacherDashboardBulkImportProps {
  entries: DictionaryEntry[];
  onImportComplete: () => Promise<void>;
}

interface ParsedImportItem {
  id: string;
  en: string;
  vn: string;
  color: ChunkColor;
  pos: string;
  ipa: string;
  definition: string;
  status: 'published' | 'draft';
  examples: ExampleItem[];
  rowNumber: number;
  validationErrors: string[];
  isDuplicate: boolean;
}

const TEMPLATE_BASIC = `en,vn,color,pos,ipa,definition
"no free lunch","không có bữa ăn nào miễn phí","red","idiom","nəʊ friː lʌntʃ","Cụm từ chỉ việc mọi thứ đều có chi phí ngầm."
"bear in mind","hãy ghi nhớ trong đầu","blue","phrase","beə ɪn maɪnd","Nhắc nhở đối phương chú ý một chi tiết."
"to have butterflies","bồn chồn lo lắng","red","idiom","tʊ hæv ˈbʌtəflaɪz","Cảm xúc lo sợ phấp phỏng trước cuộc phỏng vấn."
"essentially","về cơ bản là","green","adverb","ɪˈsenʃli","Dùng bổ trợ kết nối câu chêm xen."`;

const TEMPLATE_ADVANCED = `en,vn,color,pos,ipa,definition,status,example_en_1,example_vn_1,example_en_2,example_vn_2
"hands down","chắc chắn là, không bàn cãi","red","phrase","hændz daʊn","Dùng để khẳng định một điều gì đó là tuyệt đối và xuất sắc nhất.","published","This is hands down the best phở in town.","Đây chắc chắn là món phở ngon nhất thị trấn rồi.","He is hands down the fastest runner.","Cậu ấy chắc chắn là người chạy nhanh nhất không cần bàn cãi."
"at the end of the day","sau tất cả, cuối cùng thì","green","phrase","æt ði end əv ðə deɪ","Nhấn mạnh điểm quan trọng hoặc kết quả chung cuộc.","draft","At the end of the day, it is your choice.","Sau tất cả, đó vẫn là sự lựa chọn của bạn.","",""
"leverage","tối ưu hóa, tận dụng","pink","verb","ˈliːvərɪdʒ","Tận dụng một nguồn hoặc lợi thế sẵn có để đạt kết quả tốt nhất.","published","We must leverage our technology network.","Chúng ta phải tận dụng tối đa mạng lưới công nghệ của mình.","",""`;

export default function TeacherDashboardBulkImport({
  entries,
  onImportComplete
}: TeacherDashboardBulkImportProps) {
  const [inputText, setInputText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    added: number;
    updated: number;
    total: number;
    error?: string;
  } | null>(null);

  // Connection modes for sheets
  const [activeTab, setActiveTab2] = useState<"csv" | "sheets">("csv");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetRange, setSheetRange] = useState("Sheet1!A1"); // modified default from Sheet1!A:K to Sheet1!A1 for writing compatibility
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [sheetSuccessMessage, setSheetSuccessMessage] = useState<string | null>(null);

  // Sandboxed iframe-safe notification/modal states
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importAlertMessage, setImportAlertMessage] = useState<string | null>(null);

  // Firebase auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New Google Sheets Sync states
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; url?: string; message?: string } | null>(null);

  // Create & Sync New Google Sheet
  const handleCreateAndSyncNewSheet = async () => {
    if (!token) {
      setImportAlertMessage("Vui lòng 'Đăng nhập tài khoản Google' trước khi thực hiện đồng bộ.");
      return;
    }
    
    setIsSyncingSheet(true);
    setSyncResult(null);
    setSheetError("");

    try {
      // 1. Create a brand new Google Sheet
      const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          properties: {
            title: "Bảng Quản Lý Biên Soạn Từ Điển - English Chunks"
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Không thể tạo mới Google Sheet: ${errorText || "Kiểm tra lại quyền hạn tệp."}`);
      }

      const spreadsheet = await createResponse.json();
      const spreadsheetId = spreadsheet.spreadsheetId;
      const spreadsheetUrl = spreadsheet.spreadsheetUrl;
      const firstSheetTitle = spreadsheet.sheets?.[0]?.properties?.title || "Sheet1";

      // 2. Format structure rows matching standard importer criteria
      const headerRow = [
        "en", "vn", "color", "pos", "ipa", "definition", "status",
        "example_en_1", "example_vn_1", "example_en_2", "example_vn_2", "example_en_3", "example_vn_3"
      ];

      const dataRows = entries.map(item => {
        const [ex1, ex2, ex3] = item.examples || [];
        return [
          item.en || "",
          item.vn || "",
          item.color || "pink",
          item.pos || "phrase",
          item.ipa || "",
          item.definition || "",
          item.status || "draft",
          ex1 ? ex1.text_en : "",
          ex1 ? ex1.text_vn : "",
          ex2 ? ex2.text_en : "",
          ex2 ? ex2.text_vn : "",
          ex3 ? ex3.text_en : "",
          ex3 ? ex3.text_vn : "",
        ];
      });

      const values = [headerRow, ...dataRows];

      // 3. Write complete dictionary dataset up to A1
      const writeResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetTitle)}!A1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ values })
        }
      );

      if (!writeResponse.ok) {
        throw new Error("Tệp Sheet đã được tạo thành công trên Drive nhưng dữ liệu và cột mẫu từ điển chưa đẩy lên được.");
      }

      setSyncResult({
        success: true,
        url: spreadsheetUrl,
        message: "Tạo thành công tệp 'Bảng Quản Lý Biên Soạn Từ Điển - English Chunks' mẫu mới trên tài khoản Google Drive của bạn và đã đồng bộ toàn bộ dữ liệu từ điển hiện tại!"
      });
      
      // Auto-set URL field so they can copy/use it directly
      setSheetUrl(spreadsheetUrl);
      setSheetRange(`${firstSheetTitle}!A1`);

    } catch (e: any) {
      console.error("Sheet creation failed:", e);
      setSyncResult({
        success: false,
        message: e.message || "Tạo và đồng bộ thất bại. Vui lòng thử đăng nhập lại và cấp đủ quyền."
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Sync / Export to Existing Google Sheets
  const handleSyncToExistingSheet = async () => {
    if (!token) {
      setImportAlertMessage("Vui lòng 'Đăng nhập tài khoản Google' trước khi thực hiện đồng bộ.");
      return;
    }

    const info = parseGoogleSheetParams(sheetUrl);
    if (!info || !info.spreadsheetId) {
      setImportAlertMessage("Đường dẫn (URL) hoặc ID Google Sheet không hợp lệ. Vui lòng dán lại URL chính thức.");
      return;
    }

    setShowSyncConfirm(true);
  };

  const proceedSyncToExistingSheet = async () => {
    const info = parseGoogleSheetParams(sheetUrl);
    if (!info || !info.spreadsheetId) return;

    setIsSyncingSheet(true);
    setSyncResult(null);
    setSheetError("");

    try {
      const headerRow = [
        "en", "vn", "color", "pos", "ipa", "definition", "status",
        "example_en_1", "example_vn_1", "example_en_2", "example_vn_2", "example_en_3", "example_vn_3"
      ];

      const dataRows = entries.map(item => {
        const [ex1, ex2, ex3] = item.examples || [];
        return [
          item.en || "",
          item.vn || "",
          item.color || "pink",
          item.pos || "phrase",
          item.ipa || "",
          item.definition || "",
          item.status || "draft",
          ex1 ? ex1.text_en : "",
          ex1 ? ex1.text_vn : "",
          ex2 ? ex2.text_en : "",
          ex2 ? ex2.text_vn : "",
          ex3 ? ex3.text_en : "",
          ex3 ? ex3.text_vn : "",
        ];
      });

      const values = [headerRow, ...dataRows];
      let targetRange = sheetRange || "Sheet1!A1";

      if (token && targetRange.startsWith("Sheet1")) {
        try {
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}?fields=sheets.properties.title`,
            {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            }
          );
          if (metaRes.ok) {
            const meta = await metaRes.json();
            const sheetTitles: string[] = meta.sheets?.map((s: any) => s?.properties?.title) || [];
            if (sheetTitles.length > 0 && !sheetTitles.includes("Sheet1")) {
              const defaultTitle = sheetTitles[0];
              targetRange = targetRange.replace("Sheet1", defaultTitle);
              setSheetRange(targetRange);
            }
          }
        } catch (err) {
          console.error("Failed to query metadata for existing sheet sync, keeping original:", err);
        }
      }

      const writeResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}/values/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ values })
        }
      );

      if (!writeResponse.ok) {
        const errorText = await writeResponse.text();
        throw new Error(`Đồng bộ thất bại: ${errorText || "Kiểm tra quyền chỉnh sửa của tệp Sheet này."}`);
      }

      setSyncResult({
        success: true,
        message: `Đã xuất và đồng bộ thành công ${entries.length} mục từ điển của hệ thống vào Google Sheet của bạn!`
      });

    } catch (e: any) {
      console.error("Google Sheets Sync to existing failed:", e);
      setSyncResult({
        success: false,
        message: e.message || "Đồng bộ thất bại. Vui lòng kiểm tra quyền chia sẻ chỉnh sửa của Sheet này."
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Monitor auth state on component mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSheetError("");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login with Google failed:", err);
      setSheetError("Đăng nhập thất bại: " + (err.message || "Lỗi không xác định."));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Helper to extract Spreadsheet ID and GID from any Google Sheets URL
  const parseGoogleSheetParams = (input: string) => {
    const clean = input.trim();
    if (!clean) return null;

    let spreadsheetId = null;

    // Pattern 1: Published to web link (/spreadsheets/d/e/ID/...)
    const publishedMatch = clean.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (publishedMatch) {
      spreadsheetId = publishedMatch[1];
    } else {
      // Pattern 2: Standard spreadsheet link (/spreadsheets/d/ID/...)
      const idMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch) {
        spreadsheetId = idMatch[1];
      } else {
        // Pattern 3: Raw spreadsheet ID (starts with alphanumeric, has no slashes)
        if (!clean.includes("/")) {
          spreadsheetId = clean;
        }
      }
    }

    if (!spreadsheetId) return null;

    // Extract GID (sheet tab identifier)
    const gidMatch = clean.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : "0";

    return { 
      spreadsheetId, 
      gid,
      isPublishedToWeb: !!publishedMatch || spreadsheetId.startsWith("2PACX-")
    };
  };

  const fetchGoogleSheetData = async () => {
    setSheetError("");
    setSheetSuccessMessage(null);
    const info = parseGoogleSheetParams(sheetUrl);
    if (!info || !info.spreadsheetId) {
      setSheetError("Đường dẫn (URL) hoặc ID Google Sheet không hợp lệ. Vui lòng dán lại URL chính thức.");
      return;
    }

    setIsFetchingSheet(true);
    setImportResult(null);

    try {
      let currentRange = sheetRange;
      if (token && currentRange.startsWith("Sheet1")) {
        try {
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${info.spreadsheetId}?fields=sheets.properties.title`,
            {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            }
          );
          if (metaRes.ok) {
            const meta = await metaRes.json();
            const sheetTitles: string[] = meta.sheets?.map((s: any) => s?.properties?.title) || [];
            if (sheetTitles.length > 0 && !sheetTitles.includes("Sheet1")) {
              const defaultTitle = sheetTitles[0];
              currentRange = currentRange.replace("Sheet1", defaultTitle);
              setSheetRange(currentRange);
            }
          }
        } catch (err) {
          console.error("Error auto-detecting sheet title, fallback to default:", err);
        }
      }

      const fetchResponse = await fetch("/api/sheets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          spreadsheetId: info.spreadsheetId,
          gid: info.gid,
          range: currentRange,
          token: token
        })
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error || "Gặp lỗi khi truy xuất dữ liệu từ API Google Sheets.");
      }

      const resData = await fetchResponse.json();
      if (resData.success && resData.csvText) {
        setInputText(resData.csvText);
        // Soft success indicator
        setSheetError("");
        try {
          const parsedRows = parseTextToRows(resData.csvText);
          setSheetSuccessMessage(`✅ Đồng bộ Google Sheets kết nối thành công! Nạp ${parsedRows.length} dòng từ vựng.`);
        } catch (parseErr) {
          setSheetSuccessMessage("✅ Đồng bộ Google Sheets kết nối thành công!");
        }
      } else {
        throw new Error("Dữ liệu phản hồi từ máy chủ bị trống.");
      }
    } catch (err: any) {
      console.error("Error fetching Google sheet values:", err);
      setSheetError(
        err.message || 
        "Tải dữ liệu thất bại. Bản tính Google Sheets phải được chia sẻ dạng 'Bất kỳ ai có đường liên kết đều có thể xem' hoặc Đăng nhập Google để cấp quyền."
      );
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // Active validation stats
  const totalErrors = parsedItems.reduce((acc, item) => acc + item.validationErrors.length, 0);
  const validItemsCount = parsedItems.filter((item) => item.validationErrors.length === 0).length;
  const duplicateItemsCount = parsedItems.filter((item) => item.validationErrors.length === 0 && item.isDuplicate).length;
  const newItemsCount = parsedItems.filter((item) => item.validationErrors.length === 0 && !item.isDuplicate).length;

  // React to input changes and run real-time preview parse
  useEffect(() => {
    if (!inputText.trim()) {
      setParsedItems([]);
      return;
    }

    try {
      const parsedRows = parseTextToRows(inputText);
      const processed = parsedRows.map((row, index) => {
        const rowNum = index + 2; // header skip + 1-based index
        const rawEn = (row.en || row.english || row["tiếng anh"] || row["từ tiếng anh"] || "").trim();
        const rawVn = (row.vn || row.vietnamese || row["tiếng việt"] || row["dịch"] || row["nghĩa"] || "").trim();
        
        let rawColor = (row.color || row.category || row["màu sắc"] || row["nhóm"] || "pink").trim().toLowerCase();
        // Categorization normalizer
        let finalColor: ChunkColor = "pink";
        if (["green", "gap filler", "yellow"].includes(rawColor)) finalColor = "green";
        else if (["blue", "sentence frame", "frame"].includes(rawColor)) finalColor = "blue";
        else if (["red", "idiom", "slang"].includes(rawColor)) finalColor = "red";
        else if (["pink", "key term", "vocabulary", "word"].includes(rawColor)) finalColor = "pink";

        const rawPos = (row.pos || row["loại từ"] || "phrase").trim();
        const rawIpa = (row.ipa || row["phát âm"] || "").trim();
        const rawDef = (row.definition || row.explanation || row["giải thích"] || row["định nghĩa"] || "").trim();
        
        let rawStatus = (row.status || row["trạng thái"] || "draft").trim().toLowerCase();
        let finalStatus: "published" | "draft" = rawStatus === "published" ? "published" : "draft";

        // Collect examples structured nicely
        const examples: ExampleItem[] = [];
        for (let idx = 1; idx <= 3; idx++) {
          const exEn = (row[`example_en_${idx}`] || row[`ví dụ anh ${idx}`] || "").trim();
          const exVn = (row[`example_vn_${idx}`] || row[`ví dụ việt ${idx}`] || "").trim();
          if (exEn && exVn) {
            examples.push({
              id: `${rawEn.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ex-${idx}-${Date.now()}`,
              type: "normal",
              text_en: exEn,
              text_vn: exVn
            });
          }
        }

        // Validate mandatory criteria
        const errors: string[] = [];
        if (!rawEn) {
          errors.push("Thiếu cột hoặc từ Tiếng Anh (English term required)");
        }
        if (!rawVn) {
          errors.push("Thiếu nghĩa Tiếng Việt (Vietnamese translation required)");
        }

        const slugId = rawEn.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const exists = entries.some((e) => e.id === slugId || e.en.toLowerCase() === rawEn.toLowerCase());

        return {
          id: slugId,
          en: rawEn,
          vn: rawVn,
          color: finalColor,
          pos: rawPos,
          ipa: rawIpa,
          definition: rawDef,
          status: finalStatus,
          examples,
          rowNumber: rowNum,
          validationErrors: errors,
          isDuplicate: exists
        };
      });

      setParsedItems(processed);
    } catch (err: any) {
      console.error("Parse Error:", err);
    }
  }, [inputText, entries]);

  // Split logic handling both CSV strings and TSV sheets paste
  function parseTextToRows(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    // Decide delimiter and clean Byte Order Mark (BOM)
    const firstLine = lines[0].replace(/^\uFEFF/, "");
    const delimiter = firstLine.includes("\t") ? "\t" : ",";

    const headers = parseCSVLine(firstLine, delimiter);
    if (headers.length === 0) return [];

    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
       const line = lines[i];
       const values = parseCSVLine(line, delimiter);
       const row: Record<string, string> = {};
       headers.forEach((header, index) => {
         const cleanHeader = header.replace(/^\uFEFF/, "").toLowerCase().trim().replace(/^["']|["']$/g, "");
         if (cleanHeader) {
           row[cleanHeader] = index < values.length ? values[index] : "";
         }
       });
       result.push(row);
    }
    return result;
  }

  function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map((val) => {
      let v = val.trim();
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.substring(1, v.length - 1);
      }
      return v;
    });
  }

  // Submit parsed data to backend endpoint
  const handlePerformImportSubmit = async () => {
    const validPayload = parsedItems.filter((it) => it.validationErrors.length === 0);
    if (validPayload.length === 0) {
      setImportAlertMessage("Không có dòng từ vựng hợp lệ nào để tiến hành import. Vui lòng kiểm tra kỹ.");
      return;
    }

    setShowImportConfirm(true);
  };

  const proceedPerformImportSubmit = async () => {
    const validPayload = parsedItems.filter((it) => it.validationErrors.length === 0);

    setIsSubmitting(true);
    setImportResult(null);

    try {
      const dictEntriesPayload: DictionaryEntry[] = validPayload.map((item) => {
        return {
          id: item.id,
          en: item.en,
          vn: item.vn,
          color: item.color,
          pos: item.pos,
          ipa: item.ipa,
          definition: item.definition,
          examples: item.examples,
          related_terms: [],
          teacher_audios: [],
          status: item.status,
          updated_at: new Date().toISOString()
        };
      });

      const response = await fetch("/api/entries/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dictEntriesPayload)
      });

      if (response.ok) {
        const stats = await response.json();
        setImportResult({
          success: true,
          added: stats.added || 0,
          updated: stats.updated || 0,
          total: stats.total_processed || 0
        });
        setInputText(""); // Reset textarea as successful import completed
        await onImportComplete();
      } else {
        const errObj = await response.json();
        setImportResult({
          success: false,
          added: 0,
          updated: 0,
          total: 0,
          error: errObj.error || "Gặp lỗi phản hồi từ máy chủ."
        });
      }
    } catch (e: any) {
      setImportResult({
        success: false,
        added: 0,
        updated: 0,
        total: 0,
        error: e.message || "Lỗi mạng hoặc sự cố kết nối cơ sở dữ liệu."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (text: string) => {
    setInputText(text);
    setImportResult(null);
  };

  const categoryColorMeta: Record<ChunkColor, { border: string; bg: string; text: string; label: string; dot: string }> = {
    green: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: "Gap Filler",
      dot: "bg-emerald-500"
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-blue-700",
      label: "Sentence Frame",
      dot: "bg-blue-500"
    },
    red: {
      border: "border-red-200",
      bg: "bg-red-50",
      text: "text-red-700",
      label: "Idiom / Nuance",
      dot: "bg-red-500"
    },
    pink: {
      border: "border-pink-200",
      bg: "bg-pink-50",
      text: "text-pink-700",
      label: "Key Term",
      dot: "bg-pink-500"
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4" id="bulk-import-assistant">
      {/* Title block */}
      <div className="p-5 bg-neutral-50/70 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-800 uppercase font-sans tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-600" /> BẢNG NHẬP CỤM TỪ HÀNG LOẠT & GOOGLE SHEETS
          </h3>
          <p className="text-xs text-neutral-550 font-medium font-sans">
            Thực hiện nhập nhanh thông qua chép-dán CSV nâng cao hoặc kết nối trực tiếp đến bảng tính trực tuyến của bạn.
          </p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Connection Mode Tabs Switcher */}
        <div className="flex border-b border-neutral-150 gap-1.5 pb-0.5">
          <button
            type="button"
            onClick={() => { setActiveTab2("csv"); setImportResult(null); }}
            className={`px-4 py-2 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "csv"
                ? "border-red-600 text-neutral-900 font-extrabold"
                : "border-transparent text-neutral-450 hover:text-neutral-700"
            }`}
          >
            <Clipboard className="w-4 h-4" /> 1. Chép & dán dữ liệu CSV/TSV
          </button>
          
          <button
            type="button"
            onClick={() => { setActiveTab2("sheets"); setImportResult(null); }}
            className={`px-4 py-2 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sheets"
                ? "border-red-600 text-neutral-900 font-extrabold"
                : "border-transparent text-neutral-450 hover:text-neutral-700"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> 2. Nhập trực tiếp từ Google Sheets
          </button>
        </div>

        {/* Step instruction blocks - shown in both, customized */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-neutral-800 text-white font-mono text-xs font-bold flex items-center justify-center">1</span>
            <h4 className="text-xs font-bold text-neutral-800 uppercase">Cấu trúc các cột</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
              Các cột bắt buộc: <strong className="text-neutral-700 font-bold">en</strong> (Tiếng Anh), <strong className="text-neutral-700 font-bold">vn</strong> (Tiếng Việt).
              <br />
              Cột tùy chọn: <code className="text-[10px] bg-neutral-200 px-1 rounded">color</code>, <code className="text-[10px] bg-neutral-200 px-1 rounded">pos</code>, <code className="text-[10px] bg-neutral-200 px-1 rounded">ipa</code>, <code className="text-[10px] bg-neutral-200 px-1 rounded">definition</code>, <code className="text-[10px] bg-neutral-200 px-1 rounded">status</code> (draft/published).
            </p>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono text-xs font-bold flex items-center justify-center">2</span>
            <h4 className="text-xs font-bold text-emerald-800 uppercase">Hỗ trợ Song ngữ & Chêm xen</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
              Hệ thống tự nhận các cột <code className="text-[10px] bg-neutral-200 px-0.5 rounded">example_en_1</code>, <code className="text-[10px] bg-neutral-200 px-0.5 rounded">example_vn_1</code>... để tạo ngay các mẫu câu bối cảnh trực quan nhất cho người học.
            </p>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-xl space-y-2">
            <span className="w-6 h-6 rounded-full bg-neutral-800 text-white font-mono text-xs font-bold flex items-center justify-center">3</span>
            <h4 className="text-xs font-bold text-neutral-800 uppercase">Bảo toàn dữ liệu</h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
              Trùng slug sẽ tự động rơi vào chế độ <strong className="text-amber-700">Cập Nhật Ghi Đè</strong>, đảm bảo dữ liệu luôn nhất quán theo file gốc mới nhất mà bạn biên soạn.
            </p>
          </div>
        </div>

        {/* Dynamic Inner Panel View depending on active mode Tab */}
        {activeTab === "csv" ? (
          <div className="space-y-4">
            {/* Templates selector pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-600 flex items-center gap-1 font-sans">
                <Clipboard className="w-3.5 h-3.5 text-neutral-400" /> Điền nhanh dữ liệu mẫu học thử:
              </span>
              <button
                onClick={() => loadTemplate(TEMPLATE_BASIC)}
                className="p-1 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors font-sans"
              >
                Mẫu Cơ Bản (CSV 4 từ)
              </button>
              <button
                onClick={() => loadTemplate(TEMPLATE_ADVANCED)}
                className="p-1 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors font-sans"
              >
                Mẫu Đầy Đủ (Có ví dụ)
              </button>
              {inputText && (
                <button
                  onClick={() => {
                    setInputText("");
                    setImportResult(null);
                  }}
                  className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg ml-auto cursor-pointer flex items-center gap-1 font-sans"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa nội dung nhập
                </button>
              )}
            </div>

            {/* Textarea Import fields input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block font-sans">
                Dán dữ liệu CSV/TSV tại đây (Bao gồm dòng tiêu đề cột):
              </label>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setImportResult(null);
                }}
                placeholder={`Chép bảng tính Excel của bạn (hoặc dữ liệu CSV ngăn cách bằng dấu phẩy) rồi dán vào đây...
Ví dụ:
en,vn,color,pos
"feel blue","buồn bã tẻ nhạt","red","idiom"
"in front of","ở phía trước","blue","phrase"`}
                rows={8}
                className="w-full p-4.5 bg-neutral-50/50 hover:bg-neutral-50/20 focus:bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-400 rounded-xl font-mono text-xs leading-relaxed transition-all"
                id="csv-raw-textarea-field"
              />
            </div>
          </div>
        ) : (
          /* GOOGLE SHEETS MODE */
          <div className="bg-neutral-50/30 border border-neutral-200 p-5 rounded-xl space-y-4 font-sans text-neutral-800" id="google-sheets-dashboard-connector">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-3">
              <div>
                <h4 className="font-extrabold text-xs text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                  Phương Thức Nạp Bảng Tính Google Sheets
                </h4>
                <p className="text-[11px] text-neutral-450 mt-0.5">
                  Bạn có thể dùng link Google Sheet <strong>đã được chia sẻ công khai</strong>, hoặc đăng nhập Tài Khoản Google để truy cập an toàn các tệp ẩn tư.
                </p>
              </div>

              {/* Login block */}
              <div className="flex items-center gap-2">
                {user ? (
                  <div className="flex items-center gap-2 bg-neutral-100 p-1.5 px-3 rounded-lg border border-neutral-200">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || "User"} className="w-5 h-5 rounded-full border" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-5 h-5 bg-emerald-100 flex items-center justify-center font-bold text-[9px] rounded-full text-emerald-800">G</span>
                    )}
                    <span className="text-[10px] font-bold text-neutral-700 truncate max-w-[120px]" title={user.email || ""}>
                      {user.displayName || user.email}
                    </span>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="text-red-650 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1 ml-2"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Thoát
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="gsi-material-button transition-transform hover:scale-[1.02] cursor-pointer"
                    style={{ margin: 0 }}
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapperClassName flex items-center gap-2 p-1.5 px-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 bg-white">
                      <div className="gsi-material-button-icon flex shrink-0">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "14px", height: "14px" }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="text-[10px] font-extrabold text-neutral-700">Đăng nhập tài khoản Google</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Google Sheets URL input */}
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-neutral-405" /> Dán Đường Dẫn liên kết Google Sheet (hoặc Spreadsheet ID):
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  className="w-full p-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Range block - only useful in authenticated mode, shown as helpful options */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block flex items-center gap-1">
                  Vùng Dữ Liệu (Range):
                </label>
                <input
                  type="text"
                  value={sheetRange}
                  onChange={(e) => setSheetRange(e.target.value)}
                  placeholder="Sheet1!A:K"
                  className="w-full p-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Ví dụ Sheet1!A:H. Tiêu đề cần trùng với tiêu chuẩn: en, vn, color (không bắt buộc), pos, ipa..."
                />
              </div>
            </div>

            {sheetError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold leading-relaxed">{sheetError}</span>
              </div>
            )}

            {sheetSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-220 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span className="font-bold leading-relaxed">{sheetSuccessMessage}</span>
              </div>
            )}

            <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3.5 flex items-start gap-2.5 max-w-2xl text-[11px] text-emerald-950 font-sans">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý cột tiêu chuẩn Google Sheets:</strong> Hàng 1 (Header dòng đầu) bắt buộc phải ghi tên cột khớp mẫu: 
                <span className="font-bold underline ml-1">en</span> (tính từ cột tự do), 
                <span className="font-bold underline ml-1">vn</span>, 
                <span className="font-bold underline ml-1">color</span> (green, blue, red, pink), 
                <span className="font-bold underline ml-1">pos</span>, 
                <span className="font-bold underline ml-1">ipa</span>, 
                <span className="font-bold underline ml-1">definition</span>...
              </div>
            </div>

            {/* Synchronization & Export block */}
            <div className="bg-neutral-100/50 hover:bg-neutral-100/80 border border-dashed border-neutral-300 p-4.5 rounded-xl space-y-3.5 mt-3 transition-colors">
              <div className="flex items-center gap-2">
                <span className="p-1 px-1.5 bg-neutral-200 text-[9px] font-mono font-bold tracking-widest text-neutral-600 rounded uppercase">
                  Google Drive Hub
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-350 block" />
                <h5 className="text-[11px] font-extrabold uppercase text-neutral-800 font-sans">
                  Xuất mẫu & Đồng bộ dữ liệu ra Google Sheets
                </h5>
              </div>

              <p className="text-[11px] text-neutral-550 leading-relaxed font-sans">
                Nếu bạn muốn tạo một bảng tính mẫu chuẩn có sẵn từ điển hiện tại của hệ thống, hoặc muốn xuất dữ liệu hệ thống ghi đè ngược ra file Google Sheet bạn đã dán, hãy chọn các hành động nhanh bên dưới (Yêu cầu Đăng nhập tài khoản Google để thực hiện).
              </p>

              {syncResult && (
                <div className={`p-3 text-[11px] rounded-lg border leading-relaxed font-sans flex items-start gap-2.5 ${
                  syncResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
                    : "bg-rose-50 border-rose-200 text-rose-950"
                }`}>
                  <div className="shrink-0 mt-0.5">
                    {syncResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-650" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-bold block">Trạng thái đồng bộ:</span>
                    <span>{syncResult.message}</span>
                    {syncResult.url && (
                      <a
                        href={syncResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-extrabold text-emerald-700 hover:underline block"
                      >
                        👉 Bấm vào đây để mở Google Sheet mới của bạn trong tab mới
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-205">
                <button
                  type="button"
                  onClick={handleCreateAndSyncNewSheet}
                  disabled={!token || isSyncingSheet}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-650 active:scale-95 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
                  title={!token ? "Hãy đăng nhập tài khoản Google trước" : "Tạo và đồng bộ ngay"}
                >
                  {isSyncingSheet ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý đồng bộ...
                    </>
                  ) : (
                    <>
                      ➕ Tạo Sheet mới & Đồng bộ
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncToExistingSheet}
                  disabled={!token || isSyncingSheet || !sheetUrl.trim()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
                  title="Xuất dữ liệu ghi đè lên file đã dán"
                >
                  {isSyncingSheet ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang ghi dữ liệu...
                    </>
                  ) : (
                    <>
                      📤 Đồng bộ ghi đè vào Sheet hiện hữu
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Fetch button */}
            <div className="flex justify-between items-center pt-2.5 border-t border-neutral-200">
              <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">
                Hai chiều hoạt động thông suốt
              </span>
              <button
                type="button"
                onClick={fetchGoogleSheetData}
                disabled={isFetchingSheet || !sheetUrl.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {isFetchingSheet ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang nạp từ Google Sheet...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    Nạp và Phân Tích Bảng Dữ Liệu
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Live response message blocks if successfully finished or failed */}
        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`p-4 rounded-xl border ${
                importResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-red-50 border-red-200 text-red-950"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {importResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 font-sans">Cập nhật hệ thống thành công! ✨</h4>
                      <p className="text-xs mt-1 font-sans">
                        Hoàn thành import <strong>{importResult.total}</strong> bản ghi từ nguồn dữ liệu. Trong đó: 
                        <span className="font-bold text-emerald-700 ml-1">+{importResult.added} từ mới hoàn toàn</span> và 
                        <span className="font-bold text-blue-700 ml-1.5">~{importResult.updated} từ cũ được cập nhật ghi đè</span>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 font-sans">Lỗi biên soạn hàng loạt</h4>
                      <p className="text-xs mt-1 text-red-700 font-sans">{importResult.error}</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Parsed Preview Live table */}
        {parsedItems.length > 0 && (
          <div className="space-y-3.5 animate-fade-in" id="bulk-import-live-preview-grid">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="text-xs font-bold text-neutral-800 uppercase flex items-center gap-1.5 font-sans">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" /> Bản xem trước dòng nhập ({parsedItems.length} dòng hiển thị)
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-850 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-150">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Sẽ thêm mới: {newItemsCount} từ
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-850 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-150">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Sẽ ghi đè cũ: {duplicateItemsCount} từ
                </div>
                {totalErrors > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-850 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-red-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Bị lỗi bỏ qua: {totalErrors} lỗi
                  </div>
                )}
                <span className="text-[10px] text-neutral-500 font-bold font-sans ml-1">
                  (Khớp chuẩn: <strong className="text-emerald-600 font-extrabold">{validItemsCount}/{parsedItems.length}</strong> dòng)
                </span>
              </div>
            </div>

            {/* Simulated Live Table */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden overflow-x-auto bg-neutral-50/20 max-h-96">
              <table className="min-w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100/80 border-b border-neutral-200 text-[10px] font-bold text-neutral-550 uppercase tracking-wider select-none font-sans">
                    <th className="p-3 w-12 text-center font-sans">Dòng</th>
                    <th className="p-3 w-28 font-sans">Thể loại Chunks</th>
                    <th className="p-3 w-40 font-sans">Cụm từ tiếng Anh</th>
                    <th className="p-3 w-40 font-sans">Dịch tiếng Việt</th>
                    <th className="p-3 w-24 font-sans">IPA / Loại từ</th>
                    <th className="p-3 min-w-[250px] font-sans">Lưu ý / Định nghĩa</th>
                    <th className="p-3 w-28 font-sans">Trạng thái phát hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {parsedItems.map((item, index) => {
                    const colorMeta = categoryColorMeta[item.color];
                    const hasError = item.validationErrors.length > 0;

                    return (
                      <tr key={index} className={`hover:bg-neutral-50/50 ${hasError ? "bg-red-50/30" : ""}`}>
                        <td className="p-3 text-center text-neutral-400 font-mono text-[11px]">
                          #{item.rowNumber}
                        </td>

                        {/* Category Color */}
                        <td className="p-3">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 w-max ${colorMeta.bg} ${colorMeta.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dot}`} />
                            {colorMeta.label}
                          </span>
                        </td>

                        {/* English with potential validation error display */}
                        <td className="p-3">
                          <div>
                            <span className="font-extrabold text-neutral-850 uppercase font-sans text-xs">
                              {item.en || <span className="text-red-500 italic font-semibold font-mono">Trống</span>}
                            </span>
                            {item.examples.length > 0 && (
                              <span className="block text-[9px] font-medium text-emerald-700 uppercase mt-0.5 font-sans">
                                ⭐ Kèm {item.examples.length} ví dụ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Vietnamese */}
                        <td className="p-3">
                          <span className="font-medium text-neutral-600 block font-sans">
                            {item.vn || <span className="text-red-500 italic font-semibold font-mono font-sans text-xs">Trống</span>}
                          </span>
                        </td>

                        {/* IPA and POS */}
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-neutral-400 block">
                              {item.ipa ? `/ ${item.ipa} /` : "—"}
                            </span>
                            <span className="px-1 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] font-bold rounded font-mono uppercase tracking-wide w-max block">
                              {item.pos}
                            </span>
                          </div>
                        </td>

                        {/* Definition and explanation columns */}
                        <td className="p-3 text-neutral-550 truncate max-w-[280px]" title={item.definition}>
                          {item.definition || <span className="text-neutral-350 italic font-sans">Chưa điền</span>}
                        </td>

                        {/* Detect status and collision status */}
                        <td className="p-3 whitespace-nowrap">
                          {hasError ? (
                            <div className="space-y-1">
                              {item.validationErrors.map((err, i) => (
                                <span key={i} className="text-[10px] font-bold text-red-650 flex items-center gap-1 font-sans">
                                  ⚠️ {err}
                                </span>
                              ))}
                            </div>
                          ) : item.isDuplicate ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-805 border border-yellow-250 font-bold rounded-lg text-[9px] uppercase tracking-wider font-sans">
                              🔄 Ghi Đè Lên Từ Cũ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-805 border border-emerald-250 font-extrabold rounded-lg text-[9px] uppercase tracking-wider font-sans">
                              ➕ Thêm Mới
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Perform Import Trigger button control */}
            <div className="flex items-center justify-between bg-neutral-50/50 border border-neutral-150 p-4 rounded-xl">
              <div className="flex items-start gap-1.5 text-neutral-550 max-w-lg">
                <HelpCircle className="w-4 h-4 text-neutral-401 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed font-sans">
                  Nhấp <strong>"TIẾN HÀNH IMPORT"</strong> để nạp hoàn chỉnh các dòng hợp lệ vào cơ sở dữ liệu. Sau khi hoàn tất, hệ thống từ vựng sẽ tự động tải lại trên thiết bị. Các dòng có cảnh báo đỏ sẽ tạm thời bị bỏ qua.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePerformImportSubmit}
                disabled={isSubmitting || validItemsCount === 0}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all h-max flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40 disabled:pointer-events-none font-sans"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ĐANG IMPORT...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    TIẾN HÀNH IMPORT ({validItemsCount} từ hợp lệ)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Alert Toast/Banner */}
      <AnimatePresence>
        {importAlertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-[9999] bg-neutral-900 text-white p-4.5 rounded-xl shadow-2xl flex items-center gap-3.5 border border-neutral-800 max-w-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-505" />
            <div className="text-xs font-bold font-sans leading-relaxed">{importAlertMessage}</div>
            <button
              type="button"
              onClick={() => setImportAlertMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors ml-auto cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Sync Confirm Modal */}
      <AnimatePresence>
        {showSyncConfirm && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <RefreshCw className="w-7 h-7" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Đồng bộ Google Sheet
                </h4>
              </div>
              <p className="text-xs text-neutral-550 leading-relaxed font-semibold font-sans">
                Cảnh báo! Thao tác này sẽ <strong className="text-red-650">GHI ĐÈ</strong> toàn bộ danh sách từ vựng hiện tại lên Google Sheet đã chọn tại vị trí {sheetRange || "Sheet1!A1"}. Bạn có chắc chắn muốn xuất dữ liệu và đồng bộ tiếp tục?
              </p>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSyncConfirm(false)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSyncConfirm(false);
                    proceedSyncToExistingSheet();
                  }}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, truyền ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Database Import Confirm Modal */}
      <AnimatePresence>
        {showImportConfirm && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-655">
                <Play className="w-7 h-7" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Nhập Từ Vựng Vào Từ Điển
                </h4>
              </div>
              <p className="text-xs text-neutral-555 leading-relaxed font-semibold font-sans">
                Bạn có chắc chắn muốn biên soạn và tải lên <strong className="text-red-650">{parsedItems.filter((it) => it.validationErrors.length === 0).length}</strong> từ vựng mới/cập nhật này vào hệ thống cơ sở dữ liệu không?
              </p>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportConfirm(false)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportConfirm(false);
                    proceedPerformImportSubmit();
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, nạp từ điển
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
