import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  Play,
  Square,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Check,
  CheckSquare,
  X,
  HelpCircle,
  Filter,
  Flame,
  CheckCircle,
  Pause
} from "lucide-react";
import { DictionaryEntry, ChunkColor, ExampleItem, TeacherAudioItem } from "../types";

interface TeacherDashboardBulkAudioProps {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "success" | "error" | "warn";
  message: string;
}

export default function TeacherDashboardBulkAudio({
  entries,
  onUpdateEntries
}: TeacherDashboardBulkAudioProps) {
  // Config state
  const [targetType, setTargetType] = useState<"headwords" | "examples">("headwords");
  const [speakerName, setSpeakerName] = useState("Chunks AI");
  const [exampleAudioMode, setExampleAudioMode] = useState<"en" | "vi" | "full">("en");
  const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState<number>(() => {
    const stored = Number(localStorage.getItem("ninerouter_playback_speed") || "1");
    return Number.isFinite(stored) && stored > 0 ? stored : 1.0;
  });
  const [colorFilter, setColorFilter] = useState<"all" | ChunkColor>("all");
  const [missingAudioOnly, setMissingAudioOnly] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [throttleDelay, setThrottleDelay] = useState(1000); // ms delay between calls

  useEffect(() => {
    const syncPlaybackSpeed = () => {
      const stored = Number(localStorage.getItem("ninerouter_playback_speed") || "1");
      setDefaultPlaybackSpeed(Number.isFinite(stored) && stored > 0 ? stored : 1.0);
    };

    syncPlaybackSpeed();
    window.addEventListener("ninerouter_settings_updated", syncPlaybackSpeed);
    return () => window.removeEventListener("ninerouter_settings_updated", syncPlaybackSpeed);
  }, []);

  // Table selection state
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [selectedExampleIds, setSelectedExampleIds] = useState<string[]>([]); // "entry_id:example_id"

  // Process runner state
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  // Sandboxed iframe-safe notification/modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isRunningRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync references
  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) {
      setCurrentIndex(0);
    }
  }, [isRunning]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Populate selection based on filter changes
  useEffect(() => {
    // Reset selection on target shift
    setSelectedWordIds([]);
    setSelectedExampleIds([]);
  }, [targetType, colorFilter, missingAudioOnly, forceRegenerate, searchQuery]);

  const addLog = (type: "info" | "success" | "error" | "warn", message: string) => {
    const timestamp = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    setLogs((prev) => [...prev, { timestamp, type, message }]);
  };

  // Compute vocabulary targeting lists
  const currentVocabularyTargets = entries.filter((item) => {
    const matchesColor = colorFilter === "all" || item.color === colorFilter;
    const matchesSearch =
      !searchQuery ||
      item.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vn.toLowerCase().includes(searchQuery.toLowerCase());
    
    const hasVocabularyAudioEn = item.teacher_audios?.some((audio) => audio.lang === "en");
    const hasVocabularyAudioVi = item.teacher_audios?.some((audio) => audio.lang === "vi");
    const hasAudio = !!hasVocabularyAudioEn && !!hasVocabularyAudioVi;
    const matchesMissing = forceRegenerate || !missingAudioOnly || !hasAudio;

    return matchesColor && matchesSearch && matchesMissing;
  });

  // Compute example targets
  const currentExampleTargets: { entryId: string; entryEn: string; ex: ExampleItem }[] = [];
  entries.forEach((item) => {
    if (colorFilter !== "all" && item.color !== colorFilter) return;
    if (item.examples && item.examples.length > 0) {
      item.examples.forEach((ex) => {
        const matchesSearch =
          !searchQuery ||
          ex.text_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.text_vn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.en.toLowerCase().includes(searchQuery.toLowerCase());
        
        const hasAudio = !!ex.audio_url;
        const matchesMissing = forceRegenerate || !missingAudioOnly || !hasAudio;

        if (matchesSearch && matchesMissing) {
          currentExampleTargets.push({
            entryId: item.id,
            entryEn: item.en,
            ex
          });
        }
      });
    }
  });

  // Table selection triggers
  const handleToggleSelectWord = (id: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectExample = (compositeId: string) => {
    setSelectedExampleIds((prev) =>
      prev.includes(compositeId)
        ? prev.filter((item) => item !== compositeId)
        : [...prev, compositeId]
    );
  };

  const handleSelectAll = () => {
    if (targetType === "headwords") {
      const allIds = currentVocabularyTargets.map((item) => item.id);
      const isAllSelected = allIds.every((id) => selectedWordIds.includes(id));
      if (isAllSelected) {
        setSelectedWordIds((prev) => prev.filter((id) => !allIds.includes(id)));
      } else {
        setSelectedWordIds((prev) => Array.from(new Set([...prev, ...allIds])));
      }
    } else {
      const allCompositeIds = currentExampleTargets.map(
        (target) => `${target.entryId}:${target.ex.id}`
      );
      const isAllSelected = allCompositeIds.every((id) => selectedExampleIds.includes(id));
      if (isAllSelected) {
        setSelectedExampleIds((prev) => prev.filter((id) => !allCompositeIds.includes(id)));
      } else {
        setSelectedExampleIds((prev) => Array.from(new Set([...prev, ...allCompositeIds])));
      }
    }
  };

  const handleSelectNone = () => {
    if (targetType === "headwords") {
      setSelectedWordIds([]);
    } else {
      setSelectedExampleIds([]);
    }
  };

  const handleTogglePlayAudioLocally = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // -------------------------------------------------------------
  // CORE BULK RUNNER PROCESS
  // -------------------------------------------------------------
  const startBulkGenerationJobs = async () => {
    const listToWork = targetType === "headwords" ? selectedWordIds : selectedExampleIds;

    if (listToWork.length === 0) {
      setAlertMessage("Vui lòng chọn ít nhất một mục từ danh sách để khởi tạo tiến trình.");
      return;
    }

    setShowConfirmModal(true);
  };

  const proceedBulkGeneration = async () => {
    const listToWork = targetType === "headwords" ? selectedWordIds : selectedExampleIds;

    setIsRunning(true);
    isRunningRef.current = true;
    setLogs([]);
    setSuccessCount(0);
    setFailCount(0);
    setCurrentIndex(0);
    setTotalToProcess(listToWork.length);

    addLog("info", `🚀 Khởi chạy chiến dịch TTS ${forceRegenerate ? "REGENERATE/OVERWRITE" : "tạo thiếu"} cho ${listToWork.length} mục...`);
    addLog("info", `🎙️ AI Speaker: ${speakerName} | Delay kìm nén: ${throttleDelay}ms`);

    // Helper sleep function
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const nrUrl = localStorage.getItem("ninerouter_url") || "";
    const nrKey = localStorage.getItem("ninerouter_key") || "";
    const nrModel = localStorage.getItem("ninerouter_tts_model") || "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (nrUrl && nrModel) {
      headers["x-ninerouter-url"] = nrUrl;
      if (nrKey) {
        headers["x-ninerouter-key"] = nrKey;
      }
      headers["x-ninerouter-tts-model"] = nrModel;
    }

    let localSuccess = 0;
    let localFail = 0;

    if (targetType === "headwords") {
      // -----------------------------------------------------------
      // TARGET 1: ENGLISH VOCABULARY HEADWORDS
      // -----------------------------------------------------------
      for (let i = 0; i < selectedWordIds.length; i++) {
        if (!isRunningRef.current) {
          addLog("warn", "🛑 Tiến trình đã được dừng bởi giảng viên.");
          break;
        }

        const id = selectedWordIds[i];
        setCurrentIndex(i + 1);

        const currentEntry = entries.find((e) => e.id === id);
        if (!currentEntry) {
          addLog("error", `[Mục #${i + 1}] Lỗi: Không tìm thấy Từ khóa "${id}" trong hệ thống.`);
          localFail++;
          setFailCount(localFail);
          continue;
        }

        addLog("info", `⏳ [${i + 1}/${selectedWordIds.length}] Đang nạp sinh âm cho từ vựng: "${currentEntry.en}"`);

        try {
          let updatedEntry = { ...currentEntry };
          let anyChange = false;

          // 1. English Headword
          const hasEnAudio = currentEntry.teacher_audios?.some(a => a.lang === "en");
          if (forceRegenerate || !hasEnAudio) {
            addLog("info", `   - Đang tạo âm tiếng Anh cho "${currentEntry.en}"...`);
            const ttsResponse = await fetch("/api/tts", {
              method: "POST",
              headers,
              body: JSON.stringify({ text: currentEntry.en })
            });

            if (!ttsResponse.ok) {
              throw new Error(`Mã phản hồi server không hợp lệ cho Tiếng Anh: ${ttsResponse.status}`);
            }

            const ttsData = await ttsResponse.json();
            if (ttsData && ttsData.audio) {
              const base64Audio = `data:audio/mp3;base64,${ttsData.audio}`;
              const mockDuration = Math.max(1, Math.round(currentEntry.en.length * 0.12));
              const newAudio: TeacherAudioItem = {
                id: `ai-voice-en-${currentEntry.en.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
                teacher_name: speakerName,
                audio_url: base64Audio,
                duration_sec: mockDuration,
                created_at: new Date().toISOString(),
                playback_speed: defaultPlaybackSpeed,
                lang: "en" as const
              };
              updatedEntry.teacher_audios = [newAudio, ...(updatedEntry.teacher_audios || []).filter((audio) => audio.lang !== "en")];
              anyChange = true;
            }
          }

          // 2. Vietnamese Headword
          const hasViAudio = currentEntry.teacher_audios?.some(a => a.lang === "vi");
          if (forceRegenerate || !hasViAudio) {
            addLog("info", `   - Đang tạo âm tiếng Việt cho "${currentEntry.vn}"...`);
            const nrModelVi = localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";
            const headersVi = { ...headers };
            if (nrUrl && nrModelVi) {
              headersVi["x-ninerouter-tts-model"] = nrModelVi;
            }

            const ttsResponseVi = await fetch("/api/tts", {
              method: "POST",
              headers: headersVi,
              body: JSON.stringify({ text: currentEntry.vn })
            });

            if (!ttsResponseVi.ok) {
              throw new Error(`Mã phản hồi server không hợp lệ cho Tiếng Việt: ${ttsResponseVi.status}`);
            }

            const ttsDataVi = await ttsResponseVi.json();
            if (ttsDataVi && ttsDataVi.audio) {
              const base64Audio = `data:audio/mp3;base64,${ttsDataVi.audio}`;
              const mockDuration = Math.max(1, Math.round(currentEntry.vn.length * 0.15));
              const newAudio: TeacherAudioItem = {
                id: `ai-voice-vi-${currentEntry.vn.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
                teacher_name: speakerName,
                audio_url: base64Audio,
                duration_sec: mockDuration,
                created_at: new Date().toISOString(),
                playback_speed: defaultPlaybackSpeed,
                lang: "vi" as const
              };
              updatedEntry.teacher_audios = [newAudio, ...(updatedEntry.teacher_audios || []).filter((audio) => audio.lang !== "vi")];
              anyChange = true;
            }
          }

          if (anyChange) {
            // Save to server
            const saveResponse = await fetch("/api/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedEntry)
            });

            if (!saveResponse.ok) {
              throw new Error("Lưu trữ audio thất bại lên hệ thống.");
            }

            addLog("success", `✓ "${currentEntry.en}": Tạo audio và lưu thành công! ✨`);
            localSuccess++;
            setSuccessCount(localSuccess);
          } else {
            addLog("info", `ℹ️ "${currentEntry.en}": Đã có đầy đủ audio.`);
            localSuccess++;
            setSuccessCount(localSuccess);
          }

        } catch (error: any) {
          addLog("error", `✗ Lỗi tạo từ "${currentEntry.en}": ${error.message}`);
          localFail++;
          setFailCount(localFail);
        }

        // Apply throttle sleep to prevent API abuse
        if (i < selectedWordIds.length - 1) {
          await sleep(throttleDelay);
        }
      }
    } else {
      // -----------------------------------------------------------
      // TARGET 2: ENGLISH EXAMPLE SENTENCES
      // -----------------------------------------------------------
      for (let i = 0; i < selectedExampleIds.length; i++) {
        if (!isRunningRef.current) {
          addLog("warn", "🛑 Tiến trình đã được dừng bởi giảng viên.");
          break;
        }

        const compositeId = selectedExampleIds[i];
        const [entryId, exId] = compositeId.split(":");
        setCurrentIndex(i + 1);

        const currentEntry = entries.find((e) => e.id === entryId);
        if (!currentEntry) {
          addLog("error", `[Mục #${i + 1}] Lỗi: Không tìm thấy từ vựng gốc liên kết.`);
          localFail++;
          setFailCount(localFail);
          continue;
        }

        const targetExample = currentEntry.examples?.find((ex) => ex.id === exId);
        if (!targetExample) {
          addLog("error", `[Mục #${i + 1}] Lỗi: Không tìm thấy ví dụ trùng khớp.`);
          localFail++;
          setFailCount(localFail);
          continue;
        }

        let speechText = targetExample.text_en;
        let resolvedModel = nrModel;
        
        if (exampleAudioMode === "vi") {
          speechText = targetExample.text_vn;
          resolvedModel = localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";
        } else if (exampleAudioMode === "full") {
          speechText = `${targetExample.text_en}. Nghĩa là: ${targetExample.text_vn}`;
          resolvedModel = localStorage.getItem("ninerouter_tts_codemix_model") || localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";
        }

        const loopHeaders = { ...headers };
        if (nrUrl && resolvedModel) {
          loopHeaders["x-ninerouter-url"] = nrUrl;
          if (nrKey) {
            loopHeaders["x-ninerouter-key"] = nrKey;
          }
          loopHeaders["x-ninerouter-tts-model"] = resolvedModel;
        }

        addLog("info", `⏳ [${i + 1}/${selectedExampleIds.length}] Đang sinh âm cho ví dụ: "${speechText.substring(0, 45)}..."`);

        try {
          // Call API TTS
          const ttsResponse = await fetch("/api/tts", {
            method: "POST",
            headers: loopHeaders,
            body: JSON.stringify({ text: speechText })
          });

          if (!ttsResponse.ok) {
            throw new Error(`Mã phản hồi server không hợp lệ: ${ttsResponse.status}`);
          }

          const ttsData = await ttsResponse.json();
          if (!ttsData || !ttsData.audio) {
            throw new Error("Dữ liệu Audio trả về trống.");
          }

          const base64Audio = `data:audio/mp3;base64,${ttsData.audio}`;

          // Update this example item in the list
          const updatedExamples = currentEntry.examples.map((ex) => {
            if (ex.id === exId) {
              return { 
                ...ex, 
                audio_url: base64Audio,
                playback_speed: defaultPlaybackSpeed
              };
            }
            return ex;
          });

          const updatedEntry: DictionaryEntry = {
            ...currentEntry,
            examples: updatedExamples
          };

          // Save to server
          const saveResponse = await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedEntry)
          });

          if (!saveResponse.ok) {
            throw new Error("Lưu trữ audio thất bại lên hệ thống.");
          }

          addLog("success", `✓ Ví dụ "${targetExample.text_en.substring(0, 30)}...": Lưu thành công! ✨`);
          localSuccess++;
          setSuccessCount(localSuccess);

        } catch (error: any) {
          addLog("error", `✗ Lỗi tạo cho câu ví dụ: ${error.message}`);
          localFail++;
          setFailCount(localFail);
        }

        // Apply throttle sleep to prevent API abuse
        if (i < selectedExampleIds.length - 1) {
          await sleep(throttleDelay);
        }
      }
    }

    addLog("info", "🏁 Hoàn tất tiến trình tạo hàng loạt!");
    addLog("success", `🎉 Đã đồng bộ thành công: +${localSuccess} mục. Thất bại: ${localFail} mục.`);
    setIsRunning(false);
    
    // Callback update dictionary
    await onUpdateEntries();
  };

  const handleStopRun = () => {
    setIsRunning(false);
    isRunningRef.current = false;
  };

  // Color mapping utilities
  const categoryColorMeta: Record<ChunkColor, { title: string; dot: string; bg: string; text: string }> = {
    green: { title: "Gap Fillers", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    blue: { title: "Sentence Frames", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    red: { title: "Idioms & Nuance", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
    pink: { title: "Key Terms", dot: "bg-pink-500", bg: "bg-pink-50", text: "text-pink-700" }
  };

  const isAllCurrentSelected =
    targetType === "headwords"
      ? currentVocabularyTargets.length > 0 &&
        currentVocabularyTargets.every((item) => selectedWordIds.includes(item.id))
      : currentExampleTargets.length > 0 &&
        currentExampleTargets.every((target) =>
          selectedExampleIds.includes(`${target.entryId}:${target.ex.id}`)
        );

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4" id="bulk-audio-generator-board">
      {/* Header and Counters */}
      <div className="p-5 bg-neutral-50/70 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-800 uppercase font-sans tracking-wide flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-red-650" /> TẠO AUDIO PHÁT ÂM HÀNG LOẠT (TTS VOICES)
          </h3>
          <p className="text-xs text-neutral-550 font-medium font-sans">
            Tạo tự động, nhanh chóng giọng nói AI bản xứ chất lượng cao bằng Gemini Voice cho tất cả từ vựng & câu ví dụ chưa có âm thanh mẫu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-neutral-250/50 text-neutral-750 font-bold rounded-full text-[10px] font-mono">
            Tổng từ vựng: {entries.length} từ
          </span>
          <span className="px-3 py-1 bg-red-50 text-red-800 font-extrabold rounded-full text-[10px] font-mono">
            Đang chọn: {targetType === "headwords" ? selectedWordIds.length : selectedExampleIds.length} mục
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Configurations */}
        <div className="lg:col-span-4 space-y-4 font-sans">
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-850 flex items-center gap-1.5 border-b border-neutral-200 pb-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Cấu hình sinh Audio AI
            </h4>

            {/* Target Select */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-neutral-500">Cấu hình tạo Text-to-speech</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("headwords")}
                  disabled={isRunning}
                  className={`py-2 px-3 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                    targetType === "headwords"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                  }`}
                >
                  📝 Từ Vựng chính
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("examples")}
                  disabled={isRunning}
                  className={`py-2 px-3 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                    targetType === "examples"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                  }`}
                >
                  💬 Câu Ví Dụ mẫu
                </button>
              </div>
            </div>

            {/* Target-specific speech mode for examples */}
            {targetType === "examples" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-neutral-500 block">Chế độ sinh âm câu ví dụ</label>
                <select
                  value={exampleAudioMode}
                  onChange={(e) => setExampleAudioMode(e.target.value as any)}
                  disabled={isRunning}
                  className="w-full text-xs p-2 bg-white border border-neutral-200 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none"
                >
                  <option value="en">🇺🇸 Chỉ tiếng Anh (English Only)</option>
                  <option value="vi">🇻🇳 Chỉ tiếng Việt (Vietnamese Only)</option>
                  <option value="full">🗣️ Cả hai / code-mixing model (English + Nghĩa là + Vietnamese)</option>
                </select>
              </div>
            )}

            {/* Playback speed is configured only in AI & 9Router */}
            <div className="space-y-1 rounded-lg border border-red-100 bg-red-50/50 p-3">
              <label className="text-[11px] font-bold uppercase text-neutral-500 flex items-center justify-between">
                <span>Tốc độ phát đồng bộ</span>
                <span className="font-mono text-red-600 bg-white px-1.5 py-0.5 rounded text-[10px] font-bold">{defaultPlaybackSpeed.toFixed(1)}x</span>
              </label>
              <span className="text-[9px] text-neutral-500 block italic leading-snug">
                Giá trị này được đồng bộ từ AI & 9Router. Muốn đổi tốc độ, vào tab AI & 9Router để thiết lập — không chỉnh tại màn hình người dùng hoặc Bulk Audio.
              </span>
            </div>

            {/* Audio speaker input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-neutral-500 block">Tên Chunks AI (Speaker Label)</label>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                disabled={isRunning}
                className="w-full text-xs p-2.5 bg-white border border-neutral-200 rounded-lg focus:ring-1 focus:ring-red-400 focus:outline-none focus:bg-white"
                placeholder="Ví dụ: Chunks AI Speaker..."
              />
            </div>

            {/* Delay rate limiting */}
            <div className="space-y-1 block">
              <label className="text-[11px] font-bold uppercase text-neutral-500 flex items-center justify-between">
                <span>Khoảng cách giãn cách</span>
                <span className="font-mono text-neutral-600 bg-neutral-200/60 px-1 rounded block">{throttleDelay}ms</span>
              </label>
              <input
                type="range"
                min="500"
                max="4000"
                step="250"
                value={throttleDelay}
                onChange={(e) => setThrottleDelay(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-red-600 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-400 block italic leading-none">
                Giãn cách gửi gói mạng ngăn chặn API cảnh báo lạm dụng (Rate limits).
              </span>
            </div>

            {/* Missing/regenerate filters */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={missingAudioOnly}
                  onChange={(e) => setMissingAudioOnly(e.target.checked)}
                  disabled={isRunning || forceRegenerate}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs font-bold text-neutral-700">Chỉ hiện những từ CHƯA CÓ AUDIO</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
                <input
                  type="checkbox"
                  checked={forceRegenerate}
                  onChange={(e) => setForceRegenerate(e.target.checked)}
                  disabled={isRunning}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-400 accent-amber-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-900 leading-snug">
                  Regenerate / overwrite toàn bộ audio đã chọn
                  <span className="block text-[10px] font-medium text-amber-700 mt-0.5">
                    Dùng khi đổi model TTS mới. Audio EN/VI cũ sẽ được thay bằng bản mới, lời giảng chi tiết vẫn giữ nguyên.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Active progress / Action zone */}
          <div className="bg-neutral-50/50 border border-neutral-200 p-4.5 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-850 flex items-center gap-1">
              🚀 Trạng thái tiến trình
            </h4>

            {isRunning ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-semibold flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-650" />
                    Đang thiết lập: {currentIndex}/{totalToProcess} mục...
                  </span>
                  <span className="font-mono font-extrabold text-neutral-800">
                    {Math.round((currentIndex / totalToProcess) * 100)}%
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-red-600 transition-all duration-300"
                    style={{ width: `${(currentIndex / totalToProcess) * 100}%` }}
                  />
                </div>

                {/* Progress statistics counts */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-600 block uppercase">Hoàn tất</span>
                    <strong className="text-emerald-700 text-sm font-mono">+ {successCount}</strong>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">Thất bại</span>
                    <strong className="text-rose-700 text-sm font-mono">{failCount}</strong>
                  </div>
                </div>

                {/* Stop button */}
                <button
                  type="button"
                  onClick={handleStopRun}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-900 active:scale-97 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Pause className="w-4 h-4" /> Dừng sinh tiến trình
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-neutral-500 leading-relaxed font-semibold">
                  Chọn các dòng bên phải bằng checkbox, sau đó bấm nút khởi động bên dưới để cấu hình sinh tự động hàng loạt!
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={startBulkGenerationJobs}
                    disabled={
                      (targetType === "headwords" && selectedWordIds.length === 0) ||
                      (targetType === "examples" && selectedExampleIds.length === 0)
                    }
                    className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-97 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Volume2 className="w-4 h-4 text-white shrink-0" />
                    Khởi tạo TTS hàng loạt (
                    {targetType === "headwords" ? selectedWordIds.length : selectedExampleIds.length} mục)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selection Grid & Live Listing */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Filtering bar in target lists */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            {/* Search query field */}
            <div className="relative w-full sm:max-w-xs shrink-0">
              <input
                type="text"
                placeholder="Tìm từ vựng cần sinh audio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isRunning}
                className="w-full text-xs pl-3.5 pr-8 py-1.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-neutral-450 hover:text-neutral-750"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Colors filter button lists */}
            <div className="flex items-center gap-1 px-1 overflow-x-auto w-full md:w-auto">
              <button
                type="button"
                onClick={() => setColorFilter("all")}
                disabled={isRunning}
                className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all ${
                  colorFilter === "all"
                    ? "bg-neutral-800 text-white"
                    : "bg-white border text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Tất cả
              </button>
              {Object.keys(categoryColorMeta).map((colorKey) => {
                const color = colorKey as ChunkColor;
                const meta = categoryColorMeta[color];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColorFilter(color)}
                    disabled={isRunning}
                    className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg border flex items-center gap-1 transition-all ${
                      colorFilter === color
                        ? "bg-neutral-800 text-white border-neutral-800"
                        : "bg-white text-neutral-600 hover:bg-neutral-100 border-neutral-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick operations toggles */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isRunning}
                className="p-1 px-2.5 bg-neutral-105 hover:bg-neutral-200/65 border text-neutral-700 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
              >
                {isAllCurrentSelected ? "❌ Bỏ chọn tất cả dòng lọc" : "✓ Chọn tất cả dòng lọc"}
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                disabled={isRunning}
                className="p-1 px-2.5 border text-neutral-500 hover:text-neutral-700 text-[11px] font-semibold rounded-lg cursor-pointer"
              >
                Hủy mọi lựa chọn
              </button>
            </div>

            <div className="text-neutral-450 font-medium">
              Tìm thấy:{" "}
              <strong className="text-neutral-850">
                {targetType === "headwords" ? currentVocabularyTargets.length : currentExampleTargets.length}
              </strong>{" "}
              dòng phù hợp
            </div>
          </div>

          {/* Table Container list */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto">
            <table className="min-w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 bg-white z-10">
                  <th className="p-3 w-12 text-center">✓</th>
                  <th className="p-3 w-28">Thể loại Chunks</th>
                  <th className="p-3">Chuỗi text Anh (English Text)</th>
                  <th className="p-3">Chuỗi text Việt (Translation)</th>
                  <th className="p-3 w-20 text-center">Audio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {targetType === "headwords" ? (
                  // Map headword dictionary entries
                  currentVocabularyTargets.length > 0 ? (
                    currentVocabularyTargets.map((item) => {
                      const id = item.id;
                      const isSelected = selectedWordIds.includes(id);
                      const hasVocabularyAudioEn = item.teacher_audios?.some((audio) => audio.lang === "en");
                      const hasVocabularyAudioVi = item.teacher_audios?.some((audio) => audio.lang === "vi");
                      const hasAudio = !!hasVocabularyAudioEn && !!hasVocabularyAudioVi;
                      const colorMeta = categoryColorMeta[item.color];

                      return (
                        <tr
                          key={id}
                          onClick={() => !isRunning && handleToggleSelectWord(id)}
                          className={`hover:bg-neutral-50 transition-colors group cursor-pointer ${
                            isSelected ? "bg-red-50/15" : ""
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isRunning}
                              onChange={() => handleToggleSelectWord(id)}
                              className="w-4 h-4 text-red-650 cursor-pointer accent-red-600 rounded"
                            />
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 w-max ${colorMeta.bg} ${colorMeta.text}`}>
                              <span className={`w-1 h-1 rounded-full ${colorMeta.dot}`} />
                              {colorMeta.title}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-neutral-850 uppercase text-xs">
                                {item.en}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePlayAudioLocally(item.en);
                                }}
                                className="p-1 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors"
                                title="Nghe thử TTS chuẩn của trình duyệt"
                              >
                                <Play className="w-3 h-3 ml-0.5 fill-current" />
                              </button>
                            </div>
                          </td>

                          <td className="p-3 text-neutral-500 font-medium">
                            {item.vn}
                          </td>

                          <td className="p-3 text-center">
                            {hasAudio ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                                ✓ Có EN + VI
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 uppercase">
                                ✗ Chưa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400 font-medium">
                        Không có từ vựng nào thỏa bộ lọc.
                      </td>
                    </tr>
                  )
                ) : (
                  // Map example targets
                  currentExampleTargets.length > 0 ? (
                    currentExampleTargets.map((target, idx) => {
                      const compositeId = `${target.entryId}:${target.ex.id}`;
                      const isSelected = selectedExampleIds.includes(compositeId);
                      const hasAudio = !!target.ex.audio_url;
                      const parentEntry = entries.find((e) => e.id === target.entryId);
                      const colorMeta = parentEntry
                        ? categoryColorMeta[parentEntry.color]
                        : { title: "Chung", dot: "bg-neutral-500", bg: "bg-neutral-50", text: "text-neutral-550" };

                      return (
                        <tr
                          key={idx}
                          onClick={() => !isRunning && handleToggleSelectExample(compositeId)}
                          className={`hover:bg-neutral-50 transition-colors group cursor-pointer ${
                            isSelected ? "bg-red-50/15" : ""
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isRunning}
                              onChange={() => handleToggleSelectExample(compositeId)}
                              className="w-4 h-4 text-red-650 cursor-pointer accent-red-600 rounded"
                            />
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 w-max ${colorMeta.bg} ${colorMeta.text}`}>
                              <span className={`w-1 h-1 rounded-full ${colorMeta.dot}`} />
                              Ex: {target.entryEn}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-neutral-800 text-[11px]">
                                {target.ex.text_en}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePlayAudioLocally(target.ex.text_en);
                                }}
                                className="p-1 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors"
                              >
                                <Play className="w-3 h-3 ml-0.5 fill-current" />
                              </button>
                            </div>
                          </td>

                          <td className="p-3 text-neutral-500 italic max-w-xs truncate">
                            {target.ex.text_vn}
                          </td>

                          <td className="p-3 text-center">
                            {hasAudio ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                                ✓ Sẵn
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 uppercase">
                                ✗ Chưa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400 font-medium">
                        Không có câu ví dụ học tập nào thỏa bộ lọc.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* LIVE TERMINAL LOGGER */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block font-mono">
              📟 NHẬT KÝ ĐỒNG BỘ AI ENGINE (REALTIME LOGS)
            </span>
            <div
              ref={logsContainerRef}
              className="w-full h-36 bg-neutral-900 border border-neutral-950 p-3 rounded-lg overflow-y-auto text-[10px] font-mono leading-relaxed space-y-1 select-all"
            >
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  let badgeColor = "text-neutral-450";
                  if (log.type === "success") badgeColor = "text-emerald-400 font-bold";
                  if (log.type === "error") badgeColor = "text-rose-450 font-black";
                  if (log.type === "warn") badgeColor = "text-yellow-450";

                  return (
                    <div key={index} className="flex gap-2 text-neutral-300">
                      <span className="text-neutral-500">[{log.timestamp}]</span>
                      <span className={badgeColor}>[{log.type.toUpperCase()}]</span>
                      <span>{log.message}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-neutral-550 italic h-full flex items-center justify-center">
                  -- Sẵn sàng, hãy chọn các dòng mục và click "Khởi tạo" để theo dõi console --
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Alert Toast/Banner */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-[9999] bg-neutral-900 text-white p-4.5 rounded-xl shadow-2xl flex items-center gap-3.5 border border-neutral-800 max-w-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div className="text-xs font-bold font-sans leading-relaxed">{alertMessage}</div>
            <button
              type="button"
              onClick={() => setAlertMessage(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors ml-auto cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <Volume2 className="w-7 h-7" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Xác Nhận Tạo Audio Hàng Loạt
                </h4>
              </div>
              <p className="text-xs text-neutral-550 leading-relaxed font-semibold font-sans">
                Hệ thống sẽ tiến hành gửi <strong className="text-red-650">{targetType === "headwords" ? selectedWordIds.length : selectedExampleIds.length}</strong> yêu cầu sinh giọng nói AI bản xứ trực tuyến. Thao tác này diễn ra tuần tự với khoảng trễ {throttleDelay}ms để bảo đảm an toàn. Bạn có đồng ý tiếp tục?
              </p>
              {forceRegenerate && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 font-semibold leading-relaxed">
                  <strong>Regenerate đang bật:</strong> audio EN/VI hoặc audio ví dụ trong các mục đã chọn sẽ được tạo lại theo model TTS hiện tại và ghi đè bản cũ. Lời giảng chi tiết của Chunks AI/giáo viên sẽ không bị xóa.
                </div>
              )}
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    proceedBulkGeneration();
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, chạy ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
