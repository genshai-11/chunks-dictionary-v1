import React, { useState, useMemo, useRef, useEffect } from "react";
import { ListFilter, Search, Edit2, Trash2, CheckSquare, Square, Check, BookOpen, AlertCircle, Volume2, Pause, Loader2 } from "lucide-react";
import { DictionaryEntry, ChunkColor } from "../types";
import AudioPlayerButton from "./AudioPlayerButton";

const categoryColorMeta: Record<ChunkColor, { dot: string }> = {
  green: { dot: "bg-emerald-500" },
  blue: { dot: "bg-blue-500" },
  red: { dot: "bg-red-500" },
  pink: { dot: "bg-pink-500" }
};

interface TeacherDashboardVocabularyProps {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
  openDetail: (item: DictionaryEntry) => void;
  startEditingWord: (item: DictionaryEntry) => void;
}

export default function TeacherDashboardVocabulary({
  entries,
  onUpdateEntries,
  openDetail,
  startEditingWord
}: TeacherDashboardVocabularyProps) {
  const [search, setSearch] = useState("");
  const [filterMissing, setFilterMissing] = useState<string>("all"); 
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({
    color: "",
    status: "",
    pos: "",
    level: ""
  });

  const [filterColor, setFilterColor] = useState<string>("all");
  const [showTTSBatchModal, setShowTTSBatchModal] = useState(false);
  const [isTtsRunning, setIsTtsRunning] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsLogs, setTtsLogs] = useState<string[]>([]);
  const ttsLogsRef = useRef<HTMLDivElement>(null);
  const stopTtsRef = useRef<boolean>(false);

  const [showAIBatchModal, setShowAIBatchModal] = useState(false);
  const [aiConfig, setAiConfig] = useState({ type: "full_english" as "full_english" | "code_mixing" | "both", count: 3 });
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [aiLogs]);

  useEffect(() => {
    if (ttsLogsRef.current) {
      ttsLogsRef.current.scrollTop = ttsLogsRef.current.scrollHeight;
    }
  }, [ttsLogs]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = search ? (e.en.toLowerCase().includes(search.toLowerCase()) || e.vn.toLowerCase().includes(search.toLowerCase())) : true;
      if (!matchSearch) return false;

      if (filterLevel !== "all" && e.level !== filterLevel) {
        return false;
      }

      if (filterColor !== "all" && e.color !== filterColor) {
        return false;
      }

      if (filterMissing === "missing_examples") {
        return !e.examples || e.examples.length === 0;
      }
      if (filterMissing === "missing_ipa") {
        return !e.ipa || e.ipa.trim() === "";
      }
      if (filterMissing === "missing_definition") {
        return !e.definition || e.definition.trim() === "";
      }
      if (filterMissing === "missing_audio") {
        return !e.teacher_audios || e.teacher_audios.length === 0;
      }
      if (filterMissing === "missing_tts") {
        const hasEn = e.teacher_audios?.some(a => a.lang === "en" || !a.lang);
        const hasVi = e.teacher_audios?.some(a => a.lang === "vi");
        const hasAllEx = e.examples && e.examples.length > 0 ? e.examples.every(ex => !!ex.audio_url) : true;
        return !hasEn || !hasVi || !hasAllEx;
      }
      return true;
    });
  }, [entries, search, filterMissing, filterLevel, filterColor]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length && filteredEntries.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.id));
    }
  };

  const deleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa từ này?")) return;
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        onUpdateEntries();
        setSelectedIds(prev => prev.filter(x => x !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.length} mục đã chọn? Hành động này không thể hoàn tác.`)) return;

    for (const id of selectedIds) {
      try {
        await fetch(`/api/entries/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedIds([]);
    onUpdateEntries();
  };

  const handleBatchEditSubmit = async () => {
    if (selectedIds.length === 0) return;
    
    for (const id of selectedIds) {
      const entry = entries.find(e => e.id === id);
      if (!entry) continue;

      const updates: any = {};
      if (batchEditForm.color) updates.color = batchEditForm.color;
      if (batchEditForm.status) updates.status = batchEditForm.status;
      if (batchEditForm.pos) updates.pos = batchEditForm.pos;
      if (batchEditForm.level) updates.level = batchEditForm.level;

      if (Object.keys(updates).length > 0) {
        try {
          await fetch(`/api/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({...entry, ...updates})
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
    setShowBatchEditModal(false);
    setSelectedIds([]);
    onUpdateEntries();
    setBatchEditForm({ color: "", status: "", pos: "", level: "" });
  };

  const handleBatchAIGenerate = async () => {
    if (selectedIds.length === 0) return;
    setIsAiRunning(true);
    setAiProgress(0);
    setAiLogs(["🚀 Khởi tạo sinh AI cho " + selectedIds.length + " từ..."]);

    const nrUrl = localStorage.getItem("ninerouter_url") || "";
    const nrKey = localStorage.getItem("ninerouter_key") || "";
    const llmModel = localStorage.getItem("ninerouter_llm_model") || "";

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const entry = entries.find(e => e.id === id);
      if (!entry) {
        setAiProgress(i + 1);
        continue;
      }

      setAiLogs(prev => [...prev, `⏳ Đang sinh ví dụ cho: ${entry.en}`]);
      
      try {
        const res = await fetch("/api/ai/examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            en: entry.en,
            vn: entry.vn,
            color: entry.color,
            pos: entry.pos,
            count: aiConfig.count,
            type: aiConfig.type,
            ninerouter_url: nrUrl,
            ninerouter_key: nrKey,
            ninerouter_llm_model: llmModel
          })
        });

        if (res.ok) {
          const generatedExamples = await res.json();
          if (Array.isArray(generatedExamples) && generatedExamples.length > 0) {
            const newExs = generatedExamples.map((ex: any, idx: number) => ({
              id: `ai-ex-${Date.now()}-${idx}`,
              text_en: ex.text_en || ex.en || "",
              text_vn: ex.text_vn || ex.vn || ""
            }));
            const updatedExamples = [...(entry.examples || []), ...newExs];
            await fetch(`/api/entries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({...entry, examples: updatedExamples})
            });
            setAiLogs(prev => [...prev, `✓ Hoàn thành: ${entry.en} (+${newExs.length} câu)`]);
          } else {
             setAiLogs(prev => [...prev, `⚠️ Lỗi: ${entry.en} (AI không trả về câu nào)`]);
          }
        } else {
          setAiLogs(prev => [...prev, `✗ Lỗi API (Status: ${res.status}) cho: ${entry.en}`]);
        }
      } catch (err: any) {
        setAiLogs(prev => [...prev, `✗ Ngoại lệ ở ${entry.en}: ${err.message}`]);
      }
      setAiProgress(i + 1);
      
      // small delay to not bombard the API (if local, it's fast anyway, but for external APIs it's safe)
      await new Promise(r => setTimeout(r, 1000));
    }

    setAiLogs(prev => [...prev, `🏁 Hoàn thành lô ${selectedIds.length} từ!`]);
    setIsAiRunning(false);
    onUpdateEntries();
  };

  const handleBatchTTSGenerate = async () => {
    if (selectedIds.length === 0) return;
    setIsTtsRunning(true);
    setTtsProgress(0);
    stopTtsRef.current = false;
    setTtsLogs(["🚀 Khởi động tiến trình tạo TTS hàng loạt cho " + selectedIds.length + " cụm từ..."]);

    const nrUrl = localStorage.getItem("ninerouter_url") || "";
    const nrKey = localStorage.getItem("ninerouter_key") || "";
    const nrModelEn = localStorage.getItem("ninerouter_tts_model") || "edge-tts/en-US-JennyNeural";
    const nrModelVi = localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";

    const headersEn: Record<string, string> = { "Content-Type": "application/json" };
    if (nrUrl && nrModelEn) {
      headersEn["x-ninerouter-url"] = nrUrl;
      if (nrKey) headersEn["x-ninerouter-key"] = nrKey;
      headersEn["x-ninerouter-tts-model"] = nrModelEn;
    }

    const headersVi: Record<string, string> = { ...headersEn };
    if (nrUrl && nrModelVi) {
      headersVi["x-ninerouter-tts-model"] = nrModelVi;
    }

    for (let i = 0; i < selectedIds.length; i++) {
      if (stopTtsRef.current) {
        setTtsLogs(prev => [...prev, "🛑 Tiến trình đã được dừng bởi giảng viên."]);
        break;
      }

      const id = selectedIds[i];
      const entry = entries.find(e => e.id === id);
      if (!entry) {
        setTtsProgress(i + 1);
        continue;
      }

      setTtsLogs(prev => [...prev, `⏳ [${i + 1}/${selectedIds.length}] Đang xử lý: "${entry.en}"`]);

      let updatedEntry = { ...entry };
      let anyChange = false;

      // 1. English headword TTS
      const hasEnAudio = entry.teacher_audios?.some(a => a.lang === "en" || !a.lang);
      if (!hasEnAudio) {
        setTtsLogs(prev => [...prev, `   - Đang tạo âm tiếng Anh cho: "${entry.en}"...`]);
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: headersEn,
            body: JSON.stringify({ text: entry.en })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.audio) {
              const base64Audio = `data:audio/mp3;base64,${data.audio}`;
              const mockDuration = Math.max(1, Math.round(entry.en.length * 0.12));
              const newAudio = {
                id: `ai-voice-en-${entry.en.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
                teacher_name: "Sophia AI (TTS)",
                audio_url: base64Audio,
                duration_sec: mockDuration,
                created_at: new Date().toISOString(),
                lang: "en" as const
              };
              updatedEntry.teacher_audios = [newAudio, ...(updatedEntry.teacher_audios || [])];
              anyChange = true;
              setTtsLogs(prev => [...prev, `   ✓ Đã tạo xong âm tiếng Anh.`]);
            }
          } else {
            setTtsLogs(prev => [...prev, `   ✗ Lỗi tạo âm tiếng Anh (Mã: ${res.status})`]);
          }
        } catch (err: any) {
          setTtsLogs(prev => [...prev, `   ✗ Ngoại lệ âm tiếng Anh: ${err.message}`]);
        }
        await new Promise(r => setTimeout(r, 800));
      }

      // 2. Vietnamese headword TTS
      const hasViAudio = entry.teacher_audios?.some(a => a.lang === "vi");
      if (!hasViAudio) {
        setTtsLogs(prev => [...prev, `   - Đang tạo âm tiếng Việt cho: "${entry.vn}"...`]);
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: headersVi,
            body: JSON.stringify({ text: entry.vn })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.audio) {
              const base64Audio = `data:audio/mp3;base64,${data.audio}`;
              const mockDuration = Math.max(1, Math.round(entry.vn.length * 0.15));
              const newAudio = {
                id: `ai-voice-vi-${entry.vn.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
                teacher_name: "Sophia AI (TTS)",
                audio_url: base64Audio,
                duration_sec: mockDuration,
                created_at: new Date().toISOString(),
                lang: "vi" as const
              };
              updatedEntry.teacher_audios = [newAudio, ...(updatedEntry.teacher_audios || [])];
              anyChange = true;
              setTtsLogs(prev => [...prev, `   ✓ Đã tạo xong âm tiếng Việt.`]);
            }
          } else {
            setTtsLogs(prev => [...prev, `   ✗ Lỗi tạo âm tiếng Việt (Mã: ${res.status})`]);
          }
        } catch (err: any) {
          setTtsLogs(prev => [...prev, `   ✗ Ngoại lệ âm tiếng Việt: ${err.message}`]);
        }
        await new Promise(r => setTimeout(r, 800));
      }

      // 3. Examples' TTS
      if (entry.examples && entry.examples.length > 0) {
        const updatedExamples = [];
        for (const ex of entry.examples) {
          if (!ex.audio_url) {
            setTtsLogs(prev => [...prev, `   - Đang tạo âm cho ví dụ: "${ex.text_en.substring(0, 30)}..."`]);
            try {
              const res = await fetch("/api/tts", {
                method: "POST",
                headers: headersEn,
                body: JSON.stringify({ text: ex.text_en })
              });
              if (res.ok) {
                const data = await res.json();
                if (data && data.audio) {
                  const base64Audio = `data:audio/mp3;base64,${data.audio}`;
                  updatedExamples.push({
                    ...ex,
                    audio_url: base64Audio
                  });
                  anyChange = true;
                  setTtsLogs(prev => [...prev, `     ✓ Đã tạo xong âm cho ví dụ.`]);
                } else {
                  updatedExamples.push(ex);
                }
              } else {
                updatedExamples.push(ex);
                setTtsLogs(prev => [...prev, `     ✗ Lỗi tạo âm ví dụ (Mã: ${res.status})`]);
              }
            } catch (err: any) {
              updatedExamples.push(ex);
              setTtsLogs(prev => [...prev, `     ✗ Ngoại lệ âm ví dụ: ${err.message}`]);
            }
            await new Promise(r => setTimeout(r, 800));
          } else {
            updatedExamples.push(ex);
          }
        }
        updatedEntry.examples = updatedExamples;
      }

      // Save if updated
      if (anyChange) {
        try {
          const saveRes = await fetch(`/api/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedEntry)
          });
          if (saveRes.ok) {
            setTtsLogs(prev => [...prev, `✅ Đã lưu thay đổi cho "${entry.en}" vào cơ sở dữ liệu.`]);
          } else {
            setTtsLogs(prev => [...prev, `❌ Lỗi lưu dữ liệu (Mã: ${saveRes.status}) cho "${entry.en}"`]);
          }
        } catch (saveErr: any) {
          setTtsLogs(prev => [...prev, `❌ Ngoại lệ khi lưu từ "${entry.en}": ${saveErr.message}`]);
        }
      } else {
        setTtsLogs(prev => [...prev, `ℹ️ Không có thay đổi nào cần thiết.`]);
      }

      setTtsProgress(i + 1);
    }

    setTtsLogs(prev => [...prev, "🏁 Hoàn thành tiến trình tạo TTS hàng loạt!"]);
    setIsTtsRunning(false);
    onUpdateEntries();
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4">
      <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
            <ListFilter className="w-4 h-4 text-red-600" /> Hệ thống ({filteredEntries.length}/{entries.length})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm Anh/Việt..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg w-48 focus:ring-1 focus:ring-red-500 outline-none"
            />
          </div>
          <select 
            value={filterMissing}
            onChange={e => setFilterMissing(e.target.value)}
            className="px-2 py-1.5 text-xs border border-neutral-200 rounded-lg outline-none cursor-pointer bg-white"
          >
            <option value="all">Mục thiếu trường</option>
            <option value="missing_examples">Thiếu ví dụ</option>
            <option value="missing_ipa">Thiếu phiên âm (IPA)</option>
            <option value="missing_definition">Thiếu định nghĩa</option>
            <option value="missing_audio">Thiếu Audio bản xứ</option>
            <option value="missing_tts">Thiếu TTS (Chưa có Audio)</option>
          </select>

          <select 
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-2 py-1.5 text-xs border border-neutral-200 rounded-lg outline-none cursor-pointer bg-white font-bold text-neutral-750"
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="easy">🟢 Dễ (Easy)</option>
            <option value="medium">🟡 Vừa (Medium)</option>
            <option value="hard">🔴 Khó (Hard)</option>
          </select>

          <select 
            value={filterColor}
            onChange={e => setFilterColor(e.target.value)}
            className="px-2 py-1.5 text-xs border border-neutral-200 rounded-lg outline-none cursor-pointer bg-white font-bold text-neutral-750"
          >
            <option value="all">Tất cả loại từ</option>
            <option value="green">🟢 Gap Fillers (Từ nối)</option>
            <option value="blue">🔵 Sentence Frames (Khung câu)</option>
            <option value="red">🔴 Idioms & Nuance (Thành ngữ)</option>
            <option value="pink">💗 Key Terms (Từ khóa)</option>
          </select>

          {filterMissing === "missing_tts" && filteredEntries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds(filteredEntries.map(e => e.id));
                setShowTTSBatchModal(true);
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" /> Tạo TTS hàng loạt cho {filteredEntries.length} mục thiếu
            </button>
          )}
        </div>
      </div>

      {/* Redesigned Actions & List Area */}
      <div className="flex flex-col border-t border-neutral-100">
        {/* Selection Control Bar - Redesigned above the list area */}
        <div className="px-4 py-2.5 bg-neutral-50/50 border-b border-neutral-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`px-3 py-1.5 border rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs ${
                selectedIds.length === filteredEntries.length && filteredEntries.length > 0
                  ? "bg-red-50 text-[#c10b0d] border-red-200 hover:bg-red-100/50"
                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {selectedIds.length === filteredEntries.length && filteredEntries.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#c10b0d]" /> Bỏ chọn tất cả ({filteredEntries.length})
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-neutral-400" /> Chọn tất cả ({filteredEntries.length})
                </>
              )}
            </button>
            <span className="text-xs text-neutral-500 font-sans font-medium">
              Chọn tất cả để thực hiện hành động hàng loạt trên danh sách hiển thị
            </span>
          </div>
          
          {selectedIds.length > 0 && (
            <span className="text-xs font-bold text-[#c10b0d] bg-red-50/80 px-2.5 py-1 rounded-full border border-red-100 font-mono">
              Selected: {selectedIds.length} / {filteredEntries.length}
            </span>
          )}
        </div>

        {/* Batch Actions Bar (Only if selected) */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-3 bg-red-50/30 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <span className="text-xs font-bold text-red-800 tracking-wide">
              Đang chọn {selectedIds.length} mục để chỉnh sửa đồng loạt
            </span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAIBatchModal(true)} className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                <span className="text-sm">🪄</span> Tạo ví dụ AI
              </button>
              <button onClick={() => setShowTTSBatchModal(true)} className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-neutral-600" /> Tạo TTS hàng loạt
              </button>
              <button onClick={() => setShowBatchEditModal(true)} className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                <Edit2 className="w-3 h-3" /> Sửa hàng loạt
              </button>
              <button onClick={handleBatchDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                <Trash2 className="w-3 h-3" /> Xóa đã chọn
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-100 overflow-x-auto min-w-full max-h-[600px] overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs">Không tìm thấy từ vựng nào phù hợp.</div>
        ) : (
          filteredEntries.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors ${isSelected ? "bg-red-50/30" : "hover:bg-neutral-50"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1 select-none">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4 text-neutral-300" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${categoryColorMeta[item.color]?.dot || 'bg-neutral-500'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {item.color}
                      </span>
                      <span className="px-1.5 py-0.5 bg-neutral-100 text-[9px] font-bold font-mono text-neutral-500 rounded uppercase tracking-wider">
                        {item.pos}
                      </span>
                      {item.level && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold border rounded uppercase tracking-wider ${
                          item.level === "easy" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
                          item.level === "medium" ? "bg-amber-50 text-amber-800 border-amber-100" :
                          "bg-rose-50 text-rose-850 border-rose-100"
                        }`}>
                          Mức độ: {item.level === "easy" ? "Dễ" : item.level === "medium" ? "Vừa" : "Khó"}
                        </span>
                      )}
                      {(!item.examples || item.examples.length === 0) && (
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded uppercase tracking-wider">
                          Thiếu ví dụ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-neutral-800 uppercase font-sans">
                        {item.vn} <span className="text-red-650 font-sans font-extrabold text-sm ml-1">({item.en})</span>
                      </h4>
                      <div onClick={(e) => e.stopPropagation()} className="inline-flex gap-1">
                        <AudioPlayerButton 
                          text={item.en} 
                          lang="en" 
                          size="sm" 
                          audioUrl={item.teacher_audios?.find(a => a.lang === "en" || !a.lang)?.audio_url} 
                        />
                        <AudioPlayerButton 
                          text={item.vn} 
                          lang="vi" 
                          size="sm" 
                          audioUrl={item.teacher_audios?.find(a => a.lang === "vi")?.audio_url} 
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      IPA: {item.ipa || '-'} • Ví dụ: {item.examples?.length || 0} • Lịch sửa: {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-7 sm:ml-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openDetail(item)}
                    className="p-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                    title="Xem trước"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startEditingWord(item)}
                    className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Chỉnh sửa chi tiết"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => deleteSingle(item.id, e)}
                    className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>

      {showBatchEditModal && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-red-600" /> Sửa nhanh {selectedIds.length} mục
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Trạng thái (Status)</label>
                <select 
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 p-2 rounded-lg"
                  value={batchEditForm.status}
                  onChange={e => setBatchEditForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên --</option>
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="published">Công khai (Published)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Phân loại (Color)</label>
                <select 
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 p-2 rounded-lg"
                  value={batchEditForm.color}
                  onChange={e => setBatchEditForm(f => ({ ...f, color: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên --</option>
                  <option value="green">Green (Gap Fillers)</option>
                  <option value="blue">Blue (Sentence Frames)</option>
                  <option value="red">Red (Idioms & Nuance)</option>
                  <option value="pink">Pink (Key Terms)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Từ loại (POS)</label>
                <input 
                  type="text" 
                  placeholder="VD: noun, phrase, idiom (để trống: giữ nguyên)"
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 p-2 rounded-lg"
                  value={batchEditForm.pos}
                  onChange={e => setBatchEditForm(f => ({ ...f, pos: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Mức độ từ (Level)</label>
                <select 
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 p-2 rounded-lg"
                  value={batchEditForm.level}
                  onChange={e => setBatchEditForm(f => ({ ...f, level: e.target.value }))}
                >
                  <option value="">-- Giữ nguyên --</option>
                  <option value="easy">Dễ (Easy)</option>
                  <option value="medium">Vừa (Medium)</option>
                  <option value="hard">Khó (Hard)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end mt-6">
              <button 
                onClick={() => setShowBatchEditModal(false)}
                className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleBatchEditSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIBatchModal && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="text-lg">🪄</span> Sinh ví dụ tự động (AI) cho {selectedIds.length} từ
            </h3>

            {!isAiRunning && aiProgress === 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Loại câu ví dụ</label>
                  <select 
                    className="w-full text-sm border border-neutral-200 bg-neutral-50 p-2 rounded-lg outline-none"
                    value={aiConfig.type}
                    onChange={e => setAiConfig(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="full_english">Thuần Tiếng Anh (Full English)</option>
                    <option value="code_mixing">Pha trộn Anh-Việt (Code-mixing)</option>
                    <option value="both">Hỗn hợp (Both)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-500 flex justify-between mb-1.5">
                    Số lượng câu / từ <span className="text-red-600 font-bold">{aiConfig.count}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" max="5" 
                    value={aiConfig.count} 
                    onChange={e => setAiConfig(prev => ({ ...prev, count: Number(e.target.value) }))} 
                    className="w-full accent-red-600" 
                  />
                </div>

                <div className="flex items-center gap-2 justify-end mt-6">
                  <button 
                    onClick={() => setShowAIBatchModal(false)}
                    className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Đóng
                  </button>
                  <button 
                    onClick={handleBatchAIGenerate}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Bắt đầu chạy AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Tiến trình xử lý</span>
                  <span className="text-red-600">{Math.round((aiProgress / selectedIds.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all" style={{ width: `${(aiProgress / selectedIds.length) * 100}%` }}></div>
                </div>

                <div ref={logsRef} className="w-full h-40 bg-neutral-900 border border-neutral-950 p-3 rounded-lg overflow-y-auto text-[10px] font-mono space-y-1">
                  {aiLogs.map((l, i) => (
                    <div key={i} className="text-neutral-300">{l}</div>
                  ))}
                </div>

                {!isAiRunning && (
                  <button 
                    onClick={() => setShowAIBatchModal(false)}
                    className="w-full mt-4 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Đóng
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showTTSBatchModal && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="relative bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-red-600" /> Tạo TTS hàng loạt cho {selectedIds.length} mục
            </h3>

            {!isTtsRunning && ttsProgress === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                  Hệ thống sẽ tạo tts bản xứ chất lượng cao bằng AI (Sophia TTS) cho các từ vựng đã chọn. Tiến trình gồm:
                </p>
                <ul className="text-xs text-neutral-600 space-y-1.5 list-disc pl-4 font-semibold">
                  <li>Tạo Audio Tiếng Anh của từ vựng (<span className="text-red-655 font-bold">en</span>) nếu chưa có</li>
                  <li>Tạo Audio Tiếng Việt của từ vựng (<span className="text-red-655 font-bold">vi</span>) nếu chưa có</li>
                  <li>Tạo Audio Tiếng Anh cho mọi câu ví dụ (<span className="text-red-655 font-bold">examples</span>) chưa có</li>
                </ul>

                <div className="flex items-center gap-2 justify-end mt-6">
                  <button 
                    onClick={() => setShowTTSBatchModal(false)}
                    className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button 
                    onClick={handleBatchTTSGenerate}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4" /> Bắt đầu chạy TTS
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    {isTtsRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    Tiến trình xử lý: {ttsProgress}/{selectedIds.length} từ
                  </span>
                  <span className="text-red-600 font-mono font-bold">{Math.round((ttsProgress / selectedIds.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(ttsProgress / selectedIds.length) * 100}%` }}></div>
                </div>

                <div ref={ttsLogsRef} className="w-full h-44 bg-neutral-900 border border-neutral-950 p-3 rounded-lg overflow-y-auto text-[10px] font-mono space-y-1">
                  {ttsLogs.map((l, i) => (
                    <div key={i} className={l.startsWith("✅") ? "text-emerald-400" : l.startsWith("❌") || l.includes("✗") ? "text-rose-400" : l.includes("✓") ? "text-amber-300" : "text-neutral-300"}>{l}</div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {isTtsRunning ? (
                    <button 
                      onClick={() => { stopTtsRef.current = true; }}
                      className="w-full py-2 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-4 h-4" /> Dừng tiến trình
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setShowTTSBatchModal(false);
                        setTtsProgress(0);
                        setTtsLogs([]);
                      }}
                      className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Đóng
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
