import React, { useState } from "react";
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Info, 
  BookOpen, 
  Settings, 
  Sliders, 
  Code, 
  User, 
  Image, 
  HelpCircle,
  Activity,
  CheckCircle,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Award,
  Layers,
  Play,
  BookOpenCheck,
  Check,
  Volume2,
  Lightbulb,
  Scissors
} from "lucide-react";
import { SegmentationResult, ChunkColor, DictionaryEntry } from "../types";
import AudioPlayerButton from "./AudioPlayerButton";

interface SentenceSegmenterProps {
  onNavigateToDetail: (entryId: string) => void;
  entries: DictionaryEntry[];
}

export default function SentenceSegmenter({ onNavigateToDetail, entries }: SentenceSegmenterProps) {
  // Main Sub-Tab switcher: english | cvr-analyzer | batch-generator
  const [segmentSubTab, setSegmentSubTab] = useState<"english" | "cvr-analyzer" | "batch-generator">("english");
  
  // ----------------------------------------------------
  // SUB-TAB: ENG SEGMENTER (EXISTING STATE)
  // ----------------------------------------------------
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SegmentationResult | null>(null);
  const [errorText, setErrorText] = useState("");

  // Chunker Persona States (with LocalStorage persistency)
  const [chunkerName, setChunkerName] = useState(() => {
    return localStorage.getItem("chunker_name") || "Chunker AI";
  });
  const [chunkerAvatar, setChunkerAvatar] = useState(() => {
    return localStorage.getItem("chunker_avatar") || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop";
  });
  const [chunkerRole, setChunkerRole] = useState(() => {
    return localStorage.getItem("chunker_role") || "Trợ Lý Phân Tích Ngữ Pháp";
  });
  const [showSettings, setShowSettings] = useState(false);

  // ----------------------------------------------------
  // SUB-TAB: CO-MEASURE CVR STATE (VIETNAMESE ANALYZER)
  // ----------------------------------------------------
  const [cvrTranscript, setCvrTranscript] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrError, setCvrError] = useState("");
  const [cvrResult, setCvrResult] = useState<any>(null);
  const [includeLibrary, setIncludeLibrary] = useState(true);
  const [cvrApiKeyOverriding, setCvrApiKeyOverriding] = useState(() => {
    return localStorage.getItem("m2m_cvr_api_key") || "";
  });

  // ----------------------------------------------------
  // SUB-TAB: BATCH GENERATOR STATE
  // ----------------------------------------------------
  const [quantity, setQuantity] = useState(3);
  const [sentenceLength, setSentenceLength] = useState<"Very Short" | "Short" | "Medium" | "Long">("Short");
  const [theme, setTheme] = useState("Health & Daily Life");
  const [topicLevel, setTopicLevel] = useState(1.3);
  const [targetU, setTargetU] = useState(20);
  const [preferredColors, setPreferredColors] = useState<string[]>(["Pink", "Red", "Green", "Blue"]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchResult, setBatchResult] = useState<any[]>([]);

  // Clipboard Copied Trigger State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Core English Segment API call
  const handleAnalyze = async (textToUse?: string) => {
    const text = textToUse || inputText;
    if (!text.trim()) return;

    setIsLoading(true);
    setErrorText("");
    try {
      const response = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: text,
          ninerouter_url: localStorage.getItem("ninerouter_url") || "",
          ninerouter_key: localStorage.getItem("ninerouter_key") || "",
          ninerouter_llm_model: localStorage.getItem("ninerouter_llm_model") || ""
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể phân tích ngữ pháp. Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình API.");
      }

      const data: SegmentationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Đã xảy ra lỗi không mong muốn trong khi phân tích.");
    } finally {
      setIsLoading(false);
    }
  };

  // CVR Measure API Action through secure local node proxy
  const handleCvrMeasure = async (textToUse?: string) => {
    const text = textToUse || cvrTranscript;
    if (!text.trim()) return;

    setCvrLoading(true);
    setCvrError("");
    try {
      // Map local vocabulary to Resources shape expected by M2M API
      const apiResources = includeLibrary ? entries.map(e => {
        const colorCapped = e.color.charAt(0).toUpperCase() + e.color.slice(1).toLowerCase();
        const ohmValues: Record<string, number> = { Green: 5, Blue: 7, Pink: 3, Red: 9 };
        return {
          id: e.id,
          name: e.vn,
          color: colorCapped,
          ohm: ohmValues[colorCapped] || 5,
          userId: "dictionary_sync",
          createdAt: e.updated_at || new Date().toISOString()
        };
      }) : [];

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (cvrApiKeyOverriding.trim()) {
        headers["X-API-Key"] = cvrApiKeyOverriding;
      }

      const response = await fetch("/api/measure-cvr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          transcript: text,
          resources: apiResources
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Không thể thực hiện đo đạc CVR từ cổng dịch vụ Cloud Run.");
      }

      const resultData = await response.json();
      if (resultData.status === "error") {
        throw new Error(resultData.error || "Đại diện API trả về trạng thái lỗi.");
      }
      setCvrResult(resultData);
    } catch (err: any) {
      console.error(err);
      setCvrError(err.message || "Lỗi cuộc gọi API đo lường độ khó CVR.");
    } finally {
      setCvrLoading(false);
    }
  };

  // Chunks Batch generation API Action
  const handleGenerateBatch = async () => {
    setBatchLoading(true);
    setBatchError("");
    try {
      const apiResources = entries.map(e => {
        const colorCapped = e.color.charAt(0).toUpperCase() + e.color.slice(1).toLowerCase();
        const ohmValues: Record<string, number> = { Green: 5, Blue: 7, Pink: 3, Red: 9 };
        return {
          id: e.id,
          name: e.vn,
          color: colorCapped,
          ohm: ohmValues[colorCapped] || 5,
          userId: "dictionary_sync",
          createdAt: e.updated_at || new Date().toISOString()
        };
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (cvrApiKeyOverriding.trim()) {
        headers["X-API-Key"] = cvrApiKeyOverriding;
      }

      const payload = {
        quantity: Number(quantity) || 3,
        sentenceLength: sentenceLength,
        theme: theme.trim() || undefined,
        topicLevel: Number(topicLevel) || 1.3,
        targetU: Number(targetU) || 20,
        colorPreferences: preferredColors,
        availableResources: apiResources
      };

      const response = await fetch("/api/chunk-generate/batch", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Máy chủ Cloud Run từ chối sinh chuỗi hàng loạt.");
      }

      const resultData = await response.json();
      if (resultData.status === "error") {
        throw new Error(resultData.error || "Lỗi trích xuất cụm từ.");
      }

      setBatchResult(resultData.data || []);
    } catch (err: any) {
      console.error(err);
      setBatchError(err.message || "Xảy ra sự cố khi tự động sinh đoạn văn Chunks.");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const colorConfig: Record<ChunkColor, { border: string; bg: string; text: string; label: string }> = {
    green: {
      border: "border-emerald-600",
      bg: "bg-emerald-50 text-emerald-950 border-emerald-250",
      text: "text-emerald-700 decoration-emerald-500",
      label: "Đàm thoại Fillers (Green)"
    },
    blue: {
      border: "border-blue-600",
      bg: "bg-blue-50 text-blue-950 border-blue-250",
      text: "text-blue-700 decoration-blue-500",
      label: "Khung câu Skeletons (Blue)"
    },
    red: {
      border: "border-red-600",
      bg: "bg-red-50 text-red-950 border-red-250",
      text: "text-red-700 decoration-red-500",
      label: "Thành ngữ Idioms (Red)"
    },
    pink: {
      border: "border-pink-600",
      bg: "bg-pink-50 text-pink-950 border-pink-250",
      text: "text-pink-700 decoration-pink-500",
      label: "Từ khóa chính Key Terms (Pink)"
    }
  };

  const sampleSentences = [
    "To be honest with you, I think there's no such thing as a free lunch in this business.",
    "Actually, you should bear in mind that learning takes time.",
    "To cut a long story short, we went with our flip-flops anyway!"
  ];

  const sampleVietnameseTranscripts = [
    "Thành thật mà nói, hạ đường huyết không phải chuyện nhỏ.",
    "Đi dép lào thực ra cũng rất thời trang đúng không bạn của tôi?",
    "Để tôi tóm tắt lại, có những chuyện không có gì miễn phí cả đâu."
  ];

  const handleSampleClick = (sample: string) => {
    setInputText(sample);
    handleAnalyze(sample);
  };

  const handleCvrSampleClick = (sample: string) => {
    setCvrTranscript(sample);
    handleCvrMeasure(sample);
  };

  const avatarPresets = [
    {
      name: "Cầu Pha Lê",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop"
    },
    {
      name: "Lõi Thần Kinh AI",
      url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=300&auto=format&fit=crop"
    },
    {
      name: "Rô bốt Tương Lai",
      url: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=300&auto=format&fit=crop"
    },
    {
      name: "Chunker",
      url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop"
    }
  ];

  const persistConfig = (name: string, url: string, role: string) => {
    setChunkerName(name);
    setChunkerAvatar(url);
    setChunkerRole(role);
    localStorage.setItem("chunker_name", name);
    localStorage.setItem("chunker_avatar", url);
    localStorage.setItem("chunker_role", role);
  };

  const persistCvrKey = (key: string) => {
    setCvrApiKeyOverriding(key);
    localStorage.setItem("m2m_cvr_api_key", key);
  };

  // Dynamic status-based bubble greeting
  const getChunkerGreeting = () => {
    if (segmentSubTab === "english") {
      if (isLoading) {
        return `Đang bóc tách câu... Tôi đang phân tích ngữ nghĩa và liên kết với từ điển mẫu câu, đợi tôi một xíu nhé! ✨`;
      }
      if (errorText) {
        return `Ối! Đã có lỗi xảy ra mất rồi. Hãy chuẩn bị lại câu hoặc cấu hình khóa API trong mục Settings nhé! 🛠️`;
      }
      if (result) {
        const chunkCount = result.chunks.filter(c => c.color).length;
        return `Phân tích thành công rồi! Tôi tìm thấy ${chunkCount} cụm từ (chunks) đặc quyền có màu. Hãy rê chuột hoặc xem chi tiết bóc tách bên dưới nhé! 📚`;
      }
      return `Chào bạn học! Tôi là ${chunkerName}, trợ lý bóc tách Chunks thông minh. Nhập một câu tiếng Anh ở khung bên cạnh để tôi chia thành các cụm từ ngữ pháp tự nhiên ngay!`;
    } else if (segmentSubTab === "cvr-analyzer") {
      if (cvrLoading) {
        return `Đang đo lường chỉ số CVR... Phân tích TC (Ohm), LC (độ dài) và TL (sức nặng ngữ cảnh). Chờ tôi vài tích tắc nhé! ⚡`;
      }
      if (cvrError) {
        return `Có trục trặc khi đo lường CVR. Vui lòng thử lại hoặc kiểm tra lại kết nối mạng nhé! ⚠️`;
      }
      if (cvrResult) {
        return `Tuyệt hảo! Chỉ số CVR của văn bản này là ${cvrResult.data?.predictedCVR} điểm. Tôi đã bóc tách chi tiết độ kháng trở bên dưới! 📊`;
      }
      return `Phân hệ Đo lường độ khó CVR chuẩn công thức CVR = TC × LC × TL. Nhập một câu hoặc dán đoạn dịch tiếng Việt để tôi định sai số và liên kết thư viện Chunks!`;
    } else {
      if (batchLoading) {
        return `Đang sản xuất loạt Chunks đồng bộ... Đang pha trộn ngẫu nhiên từ thư viện, điều phối điện thế U và tạo các ngữ cảnh hấp dẫn! ⏳`;
      }
      if (batchError) {
        return `Gặp sự cố khi sinh loạt bài tập Chunks. Khuyên bạn điều chỉnh lại tham số độ khó hoặc dung lượng nhé! ⚙️`;
      }
      if (batchResult.length > 0) {
        return `Máy phát Chunks đã sản xuất thành công ${batchResult.length} bài tập song ngữ chuẩn CEFR! Bạn có thể lưu trữ, nghe thử TTS hoặc sao chép nhanh! 🎁`;
      }
      return `Chế độ sinh câu song ngữ hàng loạt (Batch Generator). Chỉ định số lượng, khối lượng, độ căng kịch bản mạt ngữ cảnh để sinh bài tập lập tức!`;
    }
  };

  // Custom highlights in Vietnamese transcript matching computed resources
  const renderCvrHighlightedText = (text: string, matched: any[] = [], candidates: any[] = []) => {
    if (!text) return null;
    const allItems: any[] = [];
    
    matched.forEach((m: any) => {
      allItems.push({ ...m, type: "matched" });
    });
    
    candidates.forEach((c: any) => {
      // Avoid duplicate text matching
      if (!allItems.some(item => item.text.toLowerCase() === c.text.toLowerCase())) {
        allItems.push({ ...c, type: "candidate" });
      }
    });

    if (allItems.length === 0) return <span className="text-neutral-800 font-medium">{text}</span>;

    // Sort items by length descending, to match longer terms first
    allItems.sort((a, b) => b.text.length - a.text.length);

    const escapedTexts = allItems.map(item => item.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTexts.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <div className="flex flex-wrap gap-x-1.5 gap-y-2 text-neutral-850 font-sans text-sm md:text-base leading-relaxed font-bold">
        {parts.map((part, index) => {
          const found = allItems.find(item => item.text.toLowerCase() === part.toLowerCase());
          if (found) {
            const rawCol = (found.color || "green").toLowerCase() as ChunkColor;
            const cfg = colorConfig[rawCol] || colorConfig["green"];
            const isLib = found.type === "matched";
            
            return (
              <span
                key={index}
                className={`inline-block px-2 py-0.5 rounded-lg border-b-2 font-black tracking-tight cursor-default select-all relative group transition-all transform hover:scale-102 duration-75 ${cfg.bg} ${cfg.border}`}
                title={isLib ? "Khớp trực tiếp thư viện từ điển của bạn" : "Mẫu đề xuất tự học bởi Trợ Lý AI"}
              >
                {part}
                <span className="ml-1 text-[8px] font-mono select-none px-1 rounded-sm bg-black/10 text-black/60">
                  {found.ohm}Ω
                </span>
                {/* Micro tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[9px] font-bold text-white bg-neutral-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10 leading-none">
                  {isLib ? "🛒 Đã có trong thư viện" : "🤖 Chunks mới đề xuất"}
                </span>
              </span>
            );
          }
          return <span key={index} className="text-neutral-700 font-medium">{part}</span>;
        })}
      </div>
    );
  };

  // Helper score badges description
  const getCvrDifficultyMeta = (score: number) => {
    if (score <= 10) {
      return { label: "Dễ (A1 - A2)", flexStyle: "from-emerald-50 to-emerald-100/50 text-emerald-800 border-emerald-250" };
    } else if (score <= 25) {
      return { label: "Trung bình (B1 - B2)", flexStyle: "from-blue-50 to-blue-100/50 text-blue-800 border-blue-250" };
    } else {
      return { label: "Nâng cao (C1 - C2)", flexStyle: "from-red-50 to-rose-100/50 text-[#c10b0d] border-red-250" };
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="sentence-segmenter-widget">
      
      {/* Redesigned grid: Left for main interface, Right for Mascot/Settings character */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Playground & Results (Desktop Col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
          
          {/* Header Title Section with tab swapper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-150 pb-5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-[#c10b0d] animate-pulse" />
              <div>
                <h2 className="text-lg font-black font-display text-neutral-800 uppercase tracking-wide">
                  Hệ thống phân tích & sinh Chunks đồng bộ
                </h2>
                <p className="text-xs text-neutral-450 font-sans mt-0.5">
                  Quản trị độ phức tạp văn bản và sản sinh câu song ngữ Lexical Approach.
                </p>
              </div>
            </div>
          </div>

          {/* New Sub-Tab Navigation Bar */}
          <div className="grid grid-cols-3 bg-neutral-100/75 p-1 rounded-xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => setSegmentSubTab("english")}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                segmentSubTab === "english" ? "bg-white text-neutral-900 shadow-3xs" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" /> Bóc tách English
            </button>
            <button
              type="button"
              onClick={() => setSegmentSubTab("cvr-analyzer")}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                segmentSubTab === "cvr-analyzer" ? "bg-white text-neutral-900 shadow-3xs" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Đo độ khó CVR
            </button>
            <button
              type="button"
              onClick={() => setSegmentSubTab("batch-generator")}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                segmentSubTab === "batch-generator" ? "bg-white text-neutral-900 shadow-3xs" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Sinh loạt Chunks
            </button>
          </div>

          {/* ----------------------------------------------------
              VIEW 1: ENGLISH SEGMENTER
              ---------------------------------------------------- */}
          {segmentSubTab === "english" && (
            <div className="space-y-5 animate-fade-in">
              <div className="relative">
                <textarea
                  id="segment-sentence-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập câu tiếng Anh bất kỳ để bóc tách thành các lexical chunks..."
                  className="w-full p-4 pr-12 min-h-[110px] bg-neutral-50 hover:bg-neutral-50/50 border border-neutral-200 rounded-xl text-neutral-800 font-sans text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-y transition-all"
                />
                <button
                  id="segment-btn-submit"
                  onClick={() => handleAnalyze()}
                  disabled={isLoading || !inputText.trim()}
                  className="absolute right-3.5 bottom-3.5 p-2.5 bg-[#c10b0d] hover:bg-neutral-900 text-white rounded-lg transition-all focus:outline-none disabled:opacity-40 cursor-pointer"
                  title="Phân tích câu"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Quick sample recommendations */}
              <div id="segment-samples-area">
                <p className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider mb-2">
                  💡 Thực hành nhanh với câu mẫu tiếng Anh:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {sampleSentences.map((sample, idx) => (
                    <button
                      key={idx}
                      id={`segment-sample-btn-${idx}`}
                      onClick={() => handleSampleClick(sample)}
                      className="px-3 py-2 text-xs text-neutral-700 hover:text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg text-left transition-all leading-normal cursor-pointer hover:border-red-300"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Board */}
              {errorText && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm rounded-xl flex items-start gap-2.5" id="segment-error-box">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Lỗi xử lý bóc tách:</p>
                    <p className="mt-0.5 opacity-90">{errorText}</p>
                  </div>
                </div>
              )}

              {/* Loading Animation Skeleton */}
              {isLoading && (
                <div className="space-y-4 py-4 border-t border-neutral-100 pt-6 animate-pulse" id="segment-loader-box">
                  <div className="h-6 bg-neutral-100 rounded-md w-1/4"></div>
                  <div className="h-16 bg-neutral-50 rounded-xl w-full"></div>
                  <div className="space-y-2">
                    <div className="h-10 bg-neutral-100 rounded-md w-full"></div>
                    <div className="h-10 bg-neutral-100 rounded-md w-5/6"></div>
                  </div>
                </div>
              )}

              {/* Render Output Results */}
              {result && !isLoading && (
                <div className="animate-fade-in border-t border-neutral-100 pt-5 space-y-6" id="segment-output-area">
                  <div className="p-5 bg-neutral-50/70 border border-neutral-200 rounded-2xl relative">
                    <h3 className="text-[10px] font-black text-neutral-450 uppercase tracking-widest mb-3.5 select-none">
                      📌 Kết quả bóc tách Lexical Chunks
                    </h3>
                    <div className="text-lg md:text-xl font-bold leading-relaxed tracking-wide text-neutral-850 font-sans break-words flex flex-wrap gap-x-1.5 gap-y-1">
                      {result.chunks.map((chunk, i) => {
                        if (chunk.color) {
                          const cfg = colorConfig[chunk.color];
                          return (
                            <span
                              key={i}
                              id={`segmented-chunk-highlight-${i}`}
                              onClick={() => chunk.entry_id && onNavigateToDetail(chunk.entry_id)}
                              className={`relative inline-block underline decoration-3 underline-offset-4 cursor-pointer select-none transition-all hover:bg-neutral-150/85 rounded-md px-1 group ${cfg.text}`}
                            >
                              {chunk.text}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[11px] font-bold text-white bg-neutral-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-10 font-sans leading-none">
                                {cfg.label}
                              </span>
                            </span>
                          );
                        } else {
                          return (
                            <span key={i} className="text-neutral-700 font-medium">
                              {chunk.text}
                            </span>
                          );
                        }
                      })}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-end w-full border-t border-neutral-200 pt-3 text-neutral-700">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-neutral-450 italic font-medium">Nghe đọc toàn câu:</span>
                        <AudioPlayerButton text={result.sentence} variant="solid" size="sm" className="font-semibold text-xs bg-neutral-900 hover:bg-neutral-850 text-white rounded-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Sequential itemized breakdown definitions */}
                  <div className="space-y-3.5" id="segmented-detail-blocks">
                    <h4 className="text-xs font-black font-display uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 select-none">
                      🔎 Bảng giải thích chi tiết dán màu:
                    </h4>
                    
                    <div className="space-y-3">
                      {result.chunks.filter(c => c.color).map((chunk, i) => {
                        const color = chunk.color as ChunkColor;
                        const cfg = colorConfig[color];

                        return (
                          <div
                            key={i}
                            id={`segmented-chunk-card-${i}`}
                            className={`flex flex-col md:flex-row items-stretch border-l-4 ${cfg.border} bg-white border border-neutral-200 rounded-r-xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow duration-155`}
                          >
                            <div className={`p-4 md:w-48 shrink-0 flex flex-col justify-between ${cfg.bg} border-b md:border-b-0 md:border-r border-neutral-150/40`}>
                              <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-85">
                                  {cfg.label}
                                </span>
                                <p className="text-base font-bold font-display uppercase tracking-wide mt-1 text-neutral-850">
                                  {chunk.text}
                                </p>
                              </div>
                              
                              {chunk.entry_id && (
                                <button
                                  id={`btn-match-dictionary-${chunk.entry_id}`}
                                  onClick={() => onNavigateToDetail(chunk.entry_id!)}
                                  className="mt-3 text-xs font-bold flex items-center gap-1 hover:underline text-left cursor-pointer text-[#c10b0d] shrink-0"
                                >
                                  <BookOpen className="w-3.5 h-3.5" /> Chi tiết từ điển →
                                </button>
                              )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between relative bg-white border-neutral-100">
                              <div>
                                <p className="text-neutral-850 font-bold font-sans text-sm md:text-base">
                                  {chunk.translation || "Chưa có bản dịch thực tế"}
                                </p>
                                <p className="text-neutral-550 font-sans text-xs md:text-sm mt-1.5 leading-relaxed">
                                  {chunk.explanation || "Nghĩa của cụm từ lấp đầy khoảng trống hữu ích theo ngữ cảnh chuẩn."}
                                </p>
                              </div>

                              <div className="mt-3.5 flex items-center justify-between border-t border-neutral-200 pt-2.5">
                                <span className="text-[11px] text-neutral-450 italic">
                                  Phát âm Chunks riêng lẻ:
                                </span>
                                <AudioPlayerButton text={chunk.text} size="sm" variant="circle" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------
              VIEW 2: VIETNAMESE CVR DIFFICULTY METRIC ANALYZER
              ---------------------------------------------------- */}
          {segmentSubTab === "cvr-analyzer" && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
                <Activity className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase">Phương thức đo lường CVR: </span>
                  Tính toán dựa trên công thức tương tác <span className="font-bold underline">CVR = TC × LC × TL</span>. 
                  Giúp định mức trở kháng (Ohm) của các thành ngữ/khung câu, từ nối (TC), nhân lượng từ vựng (LC), và ngữ cảnh (TL) để biết độ kịch tính và kỹ năng cần có của học viên.
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={cvrTranscript}
                  onChange={(e) => setCvrTranscript(e.target.value)}
                  placeholder="Nhập câu tiếng Việt chuẩn (dịch hoặc văn bản bất kỳ) chứa cụm từ lặp để tính chỉ số trở kháng CVR đối chiếu..."
                  className="w-full p-4 pr-12 min-h-[90px] bg-neutral-50 hover:bg-neutral-50/50 border border-neutral-200 rounded-xl text-neutral-800 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-y transition-all"
                />
                <button
                  onClick={() => handleCvrMeasure()}
                  disabled={cvrLoading || !cvrTranscript.trim()}
                  className="absolute right-3.5 bottom-3.5 p-2.5 bg-neutral-850 hover:bg-[#c10b0d] text-white rounded-lg transition-all focus:outline-none disabled:opacity-40 cursor-pointer"
                  title="Tính chỉ số CVR"
                >
                  {cvrLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Preferences Configuration Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeLibrary}
                      onChange={(e) => setIncludeLibrary(e.target.checked)}
                      className="rounded border-neutral-300 text-red-650 focus:ring-red-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <span className="font-bold block text-neutral-800">Sát nhập từ vựng thư viện ({entries.length} từ)</span>
                      <span className="text-neutral-500 block text-[10px]">Tải đối sánh Ohm trực tiếp từ kho thuật ngữ Chunks của bạn</span>
                    </div>
                  </label>
                </div>

                <div>
                  <div className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider mb-1 block">
                    Đè mã khóa M2M Key (Lưu cấu hình):
                  </div>
                  <input
                    type="password"
                    value={cvrApiKeyOverriding}
                    onChange={(e) => persistCvrKey(e.target.value)}
                    placeholder="Dùng m2m_CHUNK_ANALYZER_SECURE_2026..."
                    className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Sample list */}
              <div>
                <p className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider mb-2">
                  💡 Đo mẫu văn bản thực tế:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {sampleVietnameseTranscripts.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCvrSampleClick(sample)}
                      className="px-3 py-2 text-xs text-neutral-700 hover:text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg text-left transition-all cursor-pointer hover:border-[#c10b0d]"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Box */}
              {cvrError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Lỗi đo lường CVR:</p>
                    <p className="text-[11px] mt-0.5 opacity-90">{cvrError}</p>
                  </div>
                </div>
              )}

              {/* API Result Panel */}
              {cvrResult && !cvrLoading && (() => {
                const data = cvrResult.data || {};
                const diffMeta = getCvrDifficultyMeta(data.predictedCVR || 1);
                
                return (
                  <div className="space-y-6 border-t border-neutral-200 pt-5 animate-fade-in">
                    
                    {/* Visual CVR Dashboard summary info card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Big circle gauge */}
                      <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center bg-gradient-to-br ${diffMeta.flexStyle}`}>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-75">
                          ĐIỂM TRỞ KHÁNG CVR
                        </span>
                        <div className="text-4xl md:text-5xl font-black font-display my-2 tracking-tighter">
                          {data.predictedCVR}
                        </div>
                        <span className="px-3 py-0.5 rounded-full bg-white/80 border border-current text-[10px] font-extrabold shadow-3xs block">
                          {diffMeta.label}
                        </span>
                      </div>

                      {/* Formula & Explanation metadata details */}
                      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl md:col-span-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-xs font-black text-neutral-500 uppercase tracking-widest">
                            <Zap className="w-3.5 h-3.5 text-yellow-600" /> Công thức áp dụng:
                          </div>
                          <p className="text-base font-extrabold font-mono mt-1 text-neutral-800">
                            {data.calculationString || "N/A"}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-sans mt-1.5 leading-relaxed">
                            Chỉ gồm các thành phần: <strong>TC</strong> (Trở kháng cụm từ bị giới hạn) × <strong>LC</strong> (Quy chuẩn kích thước câu) × <strong>TL</strong> (Hệ số nặng từ vựng theo dải CEFR).
                          </p>
                        </div>

                        <div className="border-t border-neutral-150 pt-2 flex items-center justify-between text-[11px] text-neutral-450 italic mt-3">
                          <span>API gateway: Hoạt động</span>
                          <span>Chẩn đoán: Khớp định dạng</span>
                        </div>
                      </div>
                    </div>

                    {/* Marked text render display */}
                    <div className="p-5.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2.5 select-none">
                        Văn bản đã bóc tách & phân loại từ vựng tự động:
                      </div>
                      
                      {renderCvrHighlightedText(
                        data.transcriptRaw,
                        data.tcBreakdown?.matchedResources,
                        data.tcBreakdown?.candidateResources
                      )}

                      <div className="mt-4 flex items-center justify-end w-full border-t border-neutral-150 pt-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-neutral-450 italic">Nghe đọc mẫu câu:</span>
                          <AudioPlayerButton text={data.transcriptRaw} variant="circle" size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Axes Tabs */}
                    <div className="space-y-4">
                      
                      {/* axis: TC BREAKDOWN */}
                      <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-3xs">
                        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-250 flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#c10b0d]" /> Trở kháng Chunks cụm từ (TC Axis)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px] font-bold">
                            Chỉ số TC: {data.tcBreakdown?.estimatedTC || 0}Ω
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4 bg-white text-xs leading-relaxed">
                          <p className="text-neutral-500 text-[11px]">
                            Tính toán: <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-bold">{data.tcBreakdown?.calculation || "Chưa tính"}</span>
                          </p>

                          {/* Matched library resources matching the local dictionary */}
                          <div>
                            <h5 className="font-bold text-neutral-800 mb-2.5 text-[11px] uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Cụm từ khớp trong Từ điển của bạn ({data.tcBreakdown?.matchedResources?.length || 0})
                            </h5>
                            
                            {data.tcBreakdown?.matchedResources?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {data.tcBreakdown.matchedResources.map((item: any, i: number) => (
                                  <div key={i} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex justify-between items-center">
                                    <div>
                                      <span className="font-bold block text-neutral-850 font-sans">{item.text}</span>
                                      <span className="text-[10px] block font-medium opacity-75">Trở kháng: {item.ohm}Ω — màu: {item.color}</span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">Thư viện</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-neutral-400 italic text-[11px]">Không tìm thấy cụm từ nào khớp trực tiếp trong thư viện.</p>
                            )}
                          </div>

                          {/* Candidate Vocabulary resources suggested by AI */}
                          <div className="border-t border-neutral-100 pt-3">
                            <h5 className="font-bold text-[#c10b0d] mb-2.5 text-[11px] uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Chunks tiềm năng AI phát hiện ({data.tcBreakdown?.candidateResources?.length || 0})
                            </h5>
                            
                            {data.tcBreakdown?.candidateResources?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {data.tcBreakdown.candidateResources.map((item: any, i: number) => (
                                  <div key={i} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-bold block text-neutral-850 font-sans">{item.text}</span>
                                        <span className="text-[10px] block font-medium opacity-75">Trở kháng: {item.ohm}Ω — màu: {item.color}</span>
                                      </div>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-red-750 font-bold uppercase tracking-wider">AI Đề Xuất</span>
                                    </div>
                                    {item.reasoning && (
                                      <p className="mt-1.5 text-[10px] text-neutral-500 border-t border-neutral-200/50 pt-1 italic font-medium leading-normal">
                                        " {item.reasoning} "
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-neutral-400 italic text-[11px]">AI chưa phát hiện đề xuất ngữ vựng tiềm năng mới trong đoạn văn này.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* axis: LC BREAKDOWN */}
                      <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-3xs">
                        <div className="bg-neutral-50 px-3.5 py-2 border-b border-neutral-250 flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-blue-600" /> Hệ số kịch thước (LC Axis)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-250 text-neutral-800 font-mono text-[10px] font-bold">
                            Hệ số LC: {data.lcBreakdown?.lcValue || 1.0}
                          </span>
                        </div>
                        <div className="p-4 text-xs font-sans text-neutral-700 bg-white grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-neutral-400 uppercase font-bold text-[9px] block">Số từ tiếng Việt:</span>
                            <span className="text-sm font-extrabold text-neutral-850 mt-0.5 block">{data.lcBreakdown?.wordCount || 0} từ</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 uppercase font-bold text-[9px] block">Dải giới hạn (Word Band):</span>
                            <span className="text-sm font-extrabold text-neutral-850 mt-0.5 block">{data.lcBreakdown?.lengthBand || "Không rõ"}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 uppercase font-bold text-[9px] block">Lí giải (Multiplier Reason):</span>
                            <span className="text-[11px] text-neutral-500 mt-0.5 block italic">{data.lcBreakdown?.reasoning || "Tải thành công."}</span>
                          </div>
                        </div>
                      </div>

                      {/* axis: TL BREAKDOWN */}
                      <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-3xs">
                        <div className="bg-neutral-50 px-3.5 py-2 border-b border-neutral-250 flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-amber-600" /> Sức rỗng ngữ nghĩa & Độc quyền (TL Axis)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-250 text-neutral-800 font-mono text-[10px] font-bold">
                            Chỉ số TL: {data.tlBreakdown?.tlValue || 1.0}
                          </span>
                        </div>
                        <div className="p-4 text-xs font-sans text-neutral-700 bg-white space-y-2">
                          <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                            <span className="text-neutral-400 uppercase font-extrabold text-[9px]">Phân loại Đăng ký:</span>
                            <span className="text-xs font-black text-neutral-800">{data.tlBreakdown?.band || "Phổ thông / Sinh hoạt"}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-start mt-2">
                            <span className="text-neutral-400 uppercase font-extrabold text-[9px]">Lập luận định tính từ Trợ lý AI:</span>
                            <p className="text-[11px] italic text-neutral-550 leading-relaxed font-sans">{data.tlBreakdown?.reasoning || "Ngữ cảnh được đánh giá ổn định."}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ----------------------------------------------------
              VIEW 3: BATCH CHUNKS GENERATOR (AI BOT BATCH PRODUCTION)
              ---------------------------------------------------- */}
          {segmentSubTab === "batch-generator" && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-red-50 border border-red-200 text-red-950 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
                <Sparkles className="w-4 h-4 text-[#c10b0d] shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-extrabold uppercase">Công cụ CHUNKS Generator hàng loạt: </span>
                  Trợ lý AI sẽ khai thác sâu kho thông tin, tạo sinh các câu song ngữ (English + Vietnamese) có liên kết chặt chẽ với trở kháng Ohm để phục vụ dịch văn bản theo quy chuẩn tự nhiên nhất.
                </div>
              </div>

              {/* Parameter Settings Area */}
              <div className="p-5 border border-neutral-200 bg-neutral-50/45 rounded-2xl space-y-4">
                <span className="text-[10px] font-black tracking-widest uppercase text-neutral-450 block select-none mb-1">
                  ⚙️ Thiết lập đầu vào bộ tạo:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject hint */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase">
                      Chủ đề/Ngữ cảnh hướng tới (Theme):
                    </label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="ví dụ: Health, Daily Life, Business..."
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase">
                      Số lượng câu xuất sắc cần sinh: {quantity}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full accent-[#c10b0d] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200/60 pt-4">
                  {/* Sentence Length dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase">
                      Độ dài câu mẫu (Sentence Length):
                    </label>
                    <select
                      value={sentenceLength}
                      onChange={(e: any) => setSentenceLength(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                    >
                      <option value="Very Short">Rất ngắn (≤ 18 từ)</option>
                      <option value="Short">Ngắn (≤ 30 từ)</option>
                      <option value="Medium">Trung bình (≤ 60 từ)</option>
                      <option value="Long">Dài (&gt; 60 từ)</option>
                    </select>
                  </div>

                  {/* Target Voltage (U) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase">
                      Điện áp mục tiêu (Target Difficulty - U): {targetU}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={targetU}
                      onChange={(e) => setTargetU(Number(e.target.value))}
                      className="w-full accent-[#c10b0d] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200/60 pt-4">
                  {/* Topic level CEFR Register */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase">
                      Cấp độ ngữ vựng (Register Level): {topicLevel}
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.1"
                      value={topicLevel}
                      onChange={(e) => setTopicLevel(Number(e.target.value))}
                      className="w-full accent-[#c10b0d] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-450">
                      <span>A1-A2 (1.0 - 1.2)</span>
                      <span>B1-B2 (1.3 - 1.7)</span>
                      <span>C1-C2 (1.8 - 2.0)</span>
                    </div>
                  </div>

                  {/* Preferred Colors checkbox */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase mb-1">
                      Ưu tiên tông màu Chunks:
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {["Pink", "Red", "Green", "Blue"].map((col) => {
                        const isChecked = preferredColors.includes(col);
                        return (
                          <label key={col} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setPreferredColors(preferredColors.filter(p => p !== col));
                                } else {
                                  setPreferredColors([...preferredColors, col]);
                                }
                              }}
                              className="rounded border-neutral-300 text-red-650 focus:ring-[#c10b0d] w-3.5 h-3.5"
                            />
                            <span className="font-bold text-neutral-700">{col}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-200/60 pt-4 flex justify-end">
                  <button
                    onClick={() => handleGenerateBatch()}
                    disabled={batchLoading}
                    className="px-5 py-2.5 bg-neutral-900 hover:bg-[#c10b0d] hover:scale-101 text-white font-black uppercase text-xs tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang vận hành sinh câu...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-400" /> Khởi kích máy phát Chunks
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error block */}
              {batchError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lỗi vận hành AI:</span>
                    <p className="mt-0.5 opacity-90">{batchError}</p>
                  </div>
                </div>
              )}

              {/* Generated Batch lists display results */}
              {batchResult.length > 0 && !batchLoading && (
                <div className="space-y-5 animate-fade-in border-t border-neutral-200 pt-5">
                  <h4 className="text-xs font-black uppercase text-neutral-550 flex items-center gap-1">
                    🎓 Thành phẩm sản xuất ({batchResult.length} Chunks song ngữ):
                  </h4>

                  <div className="space-y-4">
                    {batchResult.map((item, idx) => (
                      <div key={idx} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden p-5 shadow-3xs hover:shadow-2xs transition-shadow space-y-4">
                        
                        {/* Header metadata layout */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-10 inner-border text-[#c10b0d] text-[10px] font-black uppercase tracking-wider block">
                            📁 {item.category || theme || "Song Ngữ Chunks"}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[9px] font-black" title="Voltage (Difficulty index)">
                              ⚡ U: {item.uTotal}V
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[9px] font-black" title="Resistance (ohm total)">
                              🔌 R: {item.rTotal}Ω
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[9px] font-black" title="Current (multiplier)">
                              🌊 I: {item.iValue}
                            </span>
                          </div>
                        </div>

                        {/* Core Content: Bilingual texts layout */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-400 block tracking-wider">Tiếng Việt (Transcript):</span>
                              <p className="text-neutral-850 font-bold font-sans text-sm md:text-base leading-relaxed">
                                {item.vieSentence}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopyText(item.vieSentence, idx * 2)}
                              className="p-1 px-2 border border-neutral-150 rounded-lg hover:bg-neutral-50 text-neutral-450 hover:text-neutral-700 transition transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1 shrink-0"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedIndex === idx * 2 ? "Copied!" : "Copy"}
                            </button>
                          </div>

                          <div className="flex items-start justify-between gap-4 bg-neutral-50 p-3 rounded-xl border border-neutral-150/60 mt-1">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-extrabold uppercase text-neutral-400 block tracking-wider">Tiếng Anh (Lexical Target):</span>
                              <p className="text-neutral-800 font-extrabold font-sans text-xs md:text-sm leading-normal">
                                {item.engSentence}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <AudioPlayerButton text={item.engSentence} variant="circle" size="sm" />
                              <button
                                onClick={() => handleCopyText(item.engSentence, idx * 2 + 1)}
                                className="p-1 px-2 bg-white border border-neutral-150 rounded-lg hover:bg-neutral-50 text-neutral-450 hover:text-neutral-700 transition transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {copiedIndex === idx * 2 + 1 ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Resources used block */}
                        {item.resourcesUsed && item.resourcesUsed.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-neutral-100">
                            <span className="text-[9px] uppercase font-black tracking-widest text-[#5b5350] block">
                              📦 Cụm từ thông dụng được khảm mộc:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.resourcesUsed.map((res: any, rIdx: number) => {
                                const rawCol = (res.color || "green").toLowerCase() as ChunkColor;
                                const cfg = colorConfig[rawCol] || colorConfig["green"];
                                return (
                                  <span key={rIdx} className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border-b-2 flex items-center gap-1 ${cfg.bg} ${cfg.border}`}>
                                    {res.name}
                                    <span className="opacity-60 text-[8px] font-mono">({res.ohm}Ω)</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Mascot persona ("Chunker AI") & interactive settings panel (Desktop Col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Chunker Mascot Identity Card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5.5 shadow-2xs space-y-4">
            
            <div className="flex items-center gap-3">
              {/* Pulsing Avatar Frame */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-red-500/30 shadow-sm shrink-0 select-none bg-neutral-100">
                <img
                  src={chunkerAvatar}
                  alt={chunkerName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Sẵn sàng bóc tách" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c10b0d] block leading-tight">
                  {chunkerRole}
                </span>
                <h3 className="font-bold text-neutral-800 text-base font-display mt-0.5">
                  {chunkerName}
                </h3>
              </div>
            </div>

            {/* Speech bubble */}
            <div className="relative bg-white border border-neutral-200/90 rounded-2xl p-4 text-xs md:text-sm text-neutral-700 leading-relaxed font-sans shadow-xs">
              {/* Cute speech visual triangle pointing to avatar */}
              <div className="absolute -left-2.5 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent filter drop-shadow-[-1px_0_0_rgba(229,229,229,1)]" />
              <p className="font-semibold text-neutral-800 italic leading-relaxed">
                "{getChunkerGreeting()}"
              </p>
            </div>

            {/* Custom Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-neutral-150 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Settings className={`w-3.5 h-3.5 ${showSettings ? "rotate-90" : ""} transition-transform text-neutral-500`} />
              {showSettings ? "Đóng cài đặt Chunker" : "Cá nhân hóa Chunker & Avatar"}
            </button>

            {/* Collapsing customizable controls */}
            {showSettings && (
              <div className="p-4 bg-white border border-neutral-200 rounded-xl animate-fade-in space-y-4 shadow-3xs">
                <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2 mb-1">
                  <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Cấu hình nhân vật</span>
                </div>

                {/* Input Name field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 select-none">
                    <User className="w-2.5 h-2.5 text-neutral-400" /> Tên hiển thị:
                  </label>
                  <input
                    type="text"
                    value={chunkerName}
                    onChange={(e) => persistConfig(e.target.value, chunkerAvatar, chunkerRole)}
                    placeholder="Ví dụ: Chunker AI..."
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 font-sans focus:outline-none focus:ring-1 focus:ring-red-400 focus:bg-white"
                  />
                </div>

                {/* Input Custom Role field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 select-none">
                    <Sliders className="w-2.5 h-2.5 text-neutral-400" /> Vai trò trợ lý:
                  </label>
                  <input
                    type="text"
                    value={chunkerRole}
                    onChange={(e) => persistConfig(chunkerName, chunkerAvatar, e.target.value)}
                    placeholder="Ví dụ: Trợ lý học thuật..."
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 font-sans focus:outline-none focus:ring-1 focus:ring-red-400 focus:bg-white"
                  />
                </div>

                {/* Avatar presets Selection list */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 select-none">
                    <Image className="w-2.5 h-2.5 text-neutral-400" /> Chọn Avatar nhanh:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {avatarPresets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => persistConfig(chunkerName, preset.url, chunkerRole)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          chunkerAvatar === preset.url ? "border-[#c10b0d] scale-95 shadow-xs" : "border-transparent hover:border-neutral-200"
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL Field */}
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Hoặc dùng ảnh URL tùy chỉnh:
                  </label>
                  <input
                    type="text"
                    value={chunkerAvatar}
                    onChange={(e) => persistConfig(chunkerName, e.target.value, chunkerRole)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-[10px] text-neutral-500 font-mono focus:outline-none focus:ring-1 focus:ring-red-400 block"
                  />
                </div>

                {/* Quick reset button */}
                <button
                  type="button"
                  onClick={() => {
                    persistConfig("Chunker AI", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop", "Trợ Lý Phân Tích Ngữ Pháp");
                  }}
                  className="w-full py-1.5 text-center bg-neutral-100 hover:bg-neutral-150 text-neutral-500 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Khôi phục mặc định
                </button>
              </div>
            )}

          </div>

          {/* Mascot Presets & Personalization are under this column */}

        </div>

      </div>

    </div>
  );
}
