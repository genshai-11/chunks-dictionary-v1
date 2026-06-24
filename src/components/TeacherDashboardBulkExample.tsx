import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, RefreshCw, X, AlertCircle, Play, Pause } from "lucide-react";
import { DictionaryEntry, ChunkColor, ExampleItem } from "../types";

export default function TeacherDashboardBulkExample({
  entries,
  onUpdateEntries
}: {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
}) {
  const [exampleType, setExampleType] = useState<"full_english" | "code_mixing" | "both">("full_english");
  const [exampleCount, setExampleCount] = useState(3);
  const [batchSize, setBatchSize] = useState(50);
  const [throttleDelay, setThrottleDelay] = useState(1500);

  const [colorFilter, setColorFilter] = useState<"all" | ChunkColor>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [missingExamplesOnly, setMissingExamplesOnly] = useState(true);

  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  
  interface LogEntry { timestamp: string; type: "info"| "success"| "error"| "warn"; message: string; }
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isRunningRef = useRef(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (!isRunning) setCurrentIndex(0);
  }, [isRunning]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    setSelectedWordIds([]);
  }, [colorFilter, missingExamplesOnly, searchQuery]);

  const addLog = (type: "info" | "success" | "error" | "warn", message: string) => {
    const timestamp = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  const currentTargets = entries.filter((item) => {
    if (colorFilter !== "all" && item.color !== colorFilter) return false;
    if (searchQuery && !item.en.toLowerCase().includes(searchQuery.toLowerCase()) && !item.vn.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (missingExamplesOnly && item.examples && item.examples.length >= exampleCount) return false;
    return true;
  });

  const handleToggleSelectWord = (id: string) => {
    setSelectedWordIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const allIds = currentTargets.map((item) => item.id);
    const isAllSelected = allIds.every((id) => selectedWordIds.includes(id));
    if (isAllSelected) {
      setSelectedWordIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedWordIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleSelectNone = () => setSelectedWordIds([]);

  const isAllCurrentSelected = currentTargets.length > 0 && currentTargets.every((item) => selectedWordIds.includes(item.id));

  const categoryColorMeta: Record<ChunkColor, { title: string; dot: string; bg: string; text: string }> = {
    green: { title: "Gap Fillers", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    blue: { title: "Sentence Frames", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    red: { title: "Idioms & Nuance", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
    pink: { title: "Key Terms", dot: "bg-pink-500", bg: "bg-pink-50", text: "text-pink-700" }
  };

  const startGeneration = () => {
    if (selectedWordIds.length === 0) {
      setAlertMessage("Vui lòng chọn ít nhất một mục từ danh sách.");
      return;
    }
    setShowConfirmModal(true);
  };

  const proceedGeneration = async () => {
    setIsRunning(true);
    isRunningRef.current = true;
    setLogs([]);
    setSuccessCount(0);
    setFailCount(0);
    setCurrentIndex(0);
    
    // We only process up to batchSize items at a time
    const itemsToProcess = selectedWordIds.slice(0, batchSize);
    setTotalToProcess(itemsToProcess.length);

    addLog("info", `🚀 Khởi chạy chiến dịch Sinh Ví Dụ cho ${itemsToProcess.length} từ...`);
    addLog("info", `Tùy chọn: ${exampleType} | Số câu: ${exampleCount} | Batch: ${batchSize}`);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const nrUrl = localStorage.getItem("ninerouter_url") || "";
    const nrKey = localStorage.getItem("ninerouter_key") || "";
    const llmModel = localStorage.getItem("ninerouter_llm_model") || "";

    let localSuccess = 0;
    let localFail = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      if (!isRunningRef.current) {
        addLog("warn", "🛑 Tiến trình đã được dừng bởi giảng viên.");
        break;
      }
      
      const id = itemsToProcess[i];
      setCurrentIndex(i + 1);
      const currentEntry = entries.find(e => e.id === id);
      
      if (!currentEntry) {
        localFail++;
        setFailCount(localFail);
        continue;
      }

      addLog("info", `⏳ [${i + 1}/${itemsToProcess.length}] Đang sinh ví dụ cho: "${currentEntry.en}"`);

      try {
        const res = await fetch("/api/ai/examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             en: currentEntry.en,
             vn: currentEntry.vn,
             color: currentEntry.color,
             count: exampleCount,
             type: exampleType,
             ninerouter_url: nrUrl,
             ninerouter_key: nrKey,
             ninerouter_llm_model: llmModel
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const generatedExamples = await res.json();
        
        if (!Array.isArray(generatedExamples) || generatedExamples.length === 0) {
          throw new Error("Không lấy được mảng ví dụ hợp lệ từ AI");
        }

        const newExamples: ExampleItem[] = generatedExamples.map((ex: any, idx: number) => ({
          id: `ai-ex-${Date.now()}-${idx}`,
          type: "normal",
          text_en: ex.text_en || ex.en || "",
          text_vn: ex.text_vn || ex.vn || "",
          audio_url: undefined
        }));

        // Option: Append or Replace? Let's append for safety, or replace if empty
        const mergedExamples = [...(currentEntry.examples || []), ...newExamples];
        
        const updatedEntry = {
          ...currentEntry,
          examples: mergedExamples
        };

        const saveRes = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEntry)
        });

        if (!saveRes.ok) throw new Error("Thất bại khi lưu vào database");

        addLog("success", `✓ "${currentEntry.en}": Thành công (+${newExamples.length} ví dụ)`);
        localSuccess++;
        setSuccessCount(localSuccess);

      } catch (err: any) {
         addLog("error", `✗ Lỗi "${currentEntry.en}": ${err.message}`);
         localFail++;
         setFailCount(localFail);
      }

      if (i < itemsToProcess.length - 1) await sleep(throttleDelay);
    }
    
    addLog("info", "🏁 Hoàn tất phiên chạy!");
    setIsRunning(false);
    await onUpdateEntries();
  };

  const handleStopRun = () => {
    setIsRunning(false);
    isRunningRef.current = false;
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4">
      {/* Target Config */}
      <div className="p-5 flex flex-col md:flex-row gap-4 justify-between bg-neutral-50/70 border-b border-neutral-200">
        <div>
          <h3 className="text-base font-bold text-neutral-800 uppercase font-sans tracking-wide flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-650" /> BATCH EXAMPLE GENERATION (LLM)
          </h3>
          <p className="text-xs text-neutral-550 font-medium">Tự động sinh ví dụ ngữ cảnh (Full English / Code-mixing) cho số lượng lớn từ vựng.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-50 text-red-800 font-extrabold rounded-full text-[10px] font-mono">
            Đang chọn: {selectedWordIds.length} mục
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column Config */}
        <div className="lg:col-span-4 space-y-4 font-sans">
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-850 border-b border-neutral-200 pb-2">Cấu hình tham số AI</h4>
            
            <div>
              <label className="text-[11px] font-bold uppercase text-neutral-500 block mb-1">Loại ví dụ</label>
              <select 
                title="Loại ví dụ"
                value={exampleType}
                onChange={e => setExampleType(e.target.value as any)}
                disabled={isRunning}
                className="w-full text-xs p-2 bg-white border border-neutral-200 rounded-lg"
              >
                <option value="full_english">Full English (Thuần tiếng Anh)</option>
                <option value="code_mixing">Code-Mixing (Pha trộn Anh-Việt)</option>
                <option value="both">Hỗn hợp (Both)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-neutral-500 flex justify-between mb-1">
                Số lượng câu / 1 từ <span className="text-red-600 font-bold">{exampleCount}</span>
              </label>
              <input type="range" min="1" max="5" value={exampleCount} onChange={e => setExampleCount(Number(e.target.value))} disabled={isRunning} className="w-full accent-red-600" />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-neutral-500 block mb-1">Batch Size (Số dòng tối đa / lần chạy)</label>
              <input type="number" min="1" max="100" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} disabled={isRunning} className="w-full text-xs p-2 bg-white border border-neutral-200 rounded-lg" />
            </div>

            <div className="block pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={missingExamplesOnly}
                  onChange={(e) => setMissingExamplesOnly(e.target.checked)}
                  disabled={isRunning}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-400 accent-red-600"
                />
                <span className="text-xs font-bold text-neutral-700">Chỉ hiện từ thiếu ví dụ</span>
              </label>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-4">
            {isRunning ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{currentIndex}/{totalToProcess} tiến độ</span>
                  <span className="text-red-600">{Math.round(currentIndex/totalToProcess*100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all" style={{ width: `${(currentIndex/totalToProcess)*100}%` }}></div>
                </div>
                <button onClick={handleStopRun} className="w-full py-2 bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                  <Pause className="w-4 h-4" /> Dừng sinh AI
                </button>
              </div>
            ) : (
               <button
                  type="button"
                  onClick={startGeneration}
                  disabled={selectedWordIds.length === 0}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <MessageSquare className="w-4 h-4" /> Bắt đầu tạo (Batch {Math.min(selectedWordIds.length, batchSize)})
               </button>
            )}
          </div>
        </div>

        {/* Right Column: Listing & Logs */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
           {/* Filters */}
           <div className="flex bg-neutral-50 p-2 rounded-lg border border-neutral-200 gap-2">
              <input type="text" placeholder="Tìm từ khóa..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={isRunning} className="text-xs px-3 py-1.5 rounded border border-neutral-200 w-full max-w-xs" />
              <button onClick={handleSelectAll} disabled={isRunning} className="text-[10px] font-bold uppercase bg-white border border-neutral-200 px-3 rounded hover:bg-neutral-100">Toggle Tất cả</button>
           </div>

           {/* Table */}
           <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white max-h-[300px] overflow-y-auto">
             <table className="min-w-full text-left text-xs">
               <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[10px] uppercase font-bold text-neutral-500">
                 <tr>
                   <th className="p-2 w-10 text-center">✓</th>
                   <th className="p-2">English</th>
                   <th className="p-2">Vietnam</th>
                   <th className="p-2 text-center w-20">Ví dụ hiện có</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-neutral-100">
                 {currentTargets.length === 0 ? (
                   <tr><td colSpan={4} className="p-6 text-center text-neutral-400">Không tìm thấy dữ liệu</td></tr>
                 ) : currentTargets.map(item => {
                   const isSel = selectedWordIds.includes(item.id);
                   const count = item.examples?.length || 0;
                   return (
                     <tr key={item.id} onClick={() => !isRunning && handleToggleSelectWord(item.id)} className={`cursor-pointer hover:bg-neutral-50 ${isSel?'bg-red-50/50':''}`}>
                        <td className="p-2 text-center"><input type="checkbox" checked={isSel} readOnly className="accent-red-600" /></td>
                        <td className="p-2 font-bold">{item.en}</td>
                        <td className="p-2 text-neutral-500">{item.vn}</td>
                        <td className="p-2 text-center font-bold text-neutral-600">{count} câu</td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>

           {/* Logs */}
           <div className="space-y-1">
             <span className="text-[10px] font-mono font-bold text-neutral-400">📟 LLM GENERATION LOGS</span>
             <div ref={logsContainerRef} className="w-full h-32 bg-neutral-900 border border-neutral-950 p-3 rounded-lg overflow-y-auto text-[10px] font-mono space-y-1">
                {logs.length === 0 ? <div className="text-neutral-500 italic">Chờ khởi chạy...</div> : logs.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-neutral-500">[{l.timestamp}]</span>
                    <span className={l.type === 'error' ? 'text-rose-400' : l.type === 'success' ? 'text-emerald-400' : 'text-neutral-300'}>{l.message}</span>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>

       {showConfirmModal && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 flex items-center gap-2">
                 <AlertCircle className="text-red-600 w-5 h-5"/> Xác nhận chạy AI Batch
              </h4>
              <p className="text-xs text-neutral-550 leading-relaxed">
                 Sẽ gửi <strong className="text-red-600">{Math.min(selectedWordIds.length, batchSize)}</strong> yêu cầu (lô batch) tới mô hình LLM để sinh ví dụ. Bạn đã thiết lập xong Ninerouter trong thẻ Cấu Hình AI chưa?
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowConfirmModal(false)} className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-xs font-bold rounded-lg">Hủy</button>
                <button onClick={() => {setShowConfirmModal(false); proceedGeneration();}} className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg">Chạy LLM ngay</button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}
