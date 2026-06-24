import React, { useState, useEffect } from "react";
import { DictionaryEntry } from "../types";
import { Search, Pin, CheckCircle2, AlertCircle, Save, X, Sparkles, BookOpen } from "lucide-react";

interface TeacherDashboardRecommendationsProps {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
}

export default function TeacherDashboardRecommendations({
  entries,
  onUpdateEntries
}: TeacherDashboardRecommendationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  // Initialize selected pins from loaded database state
  useEffect(() => {
    const recommended = entries.filter(e => e.isRecommended).map(e => e.id);
    setSelectedIds(recommended);
  }, [entries]);

  const handleToggleRecommended = (id: string) => {
    setSaveStatus(null);
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        // Limit warning: recommend max 8 for outstanding screen composition
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch("/api/entries/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendedIds: selectedIds }),
      });

      if (response.ok) {
        setSaveStatus({
          success: true,
          msg: `Đã lưu thành công cấu hình đề xuất! ${selectedIds.length} cụm từ đã được ghim hiển thị.`
        });
        await onUpdateEntries();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Không thể cập nhật danh sách đề xuất.");
      }
    } catch (err: any) {
      setSaveStatus({
        success: false,
        msg: err.message || "Đã xảy ra lỗi khi lưu cấu hình."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter entries to search
  const filteredEntries = entries.filter(entry => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      entry.en.toLowerCase().includes(q) ||
      entry.vn.toLowerCase().includes(q) ||
      entry.pos.toLowerCase().includes(q)
    );
  });

  const categoryColorMeta: Record<string, { bg: string; dot: string; label: string }> = {
    green: { bg: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500", label: "Từ nối câu" },
    blue: { bg: "bg-blue-50 text-blue-850", dot: "bg-blue-500", label: "Khung câu" },
    red: { bg: "bg-red-50 text-red-800", dot: "bg-red-500", label: "Thành ngữ" },
    pink: { bg: "bg-pink-50 text-pink-800", dot: "bg-pink-500", label: "Từ khóa" }
  };

  const currentlyRecommendedEntries = entries.filter(e => selectedIds.includes(e.id));

  return (
    <div className="space-y-6" id="teacher-recommendations-panel">
      
      {/* Visual Banner */}
      <div className="bg-gradient-to-r from-neutral-950 to-neutral-850 text-white border border-neutral-900 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12 blur-2xl" />
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-800/65 text-neutral-200 border border-neutral-700/50 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" /> Đề xuất trang chủ
          </div>
          <h3 className="text-lg md:text-xl font-bold font-display uppercase tracking-wide">
            CẤU HÌNH ĐỀ XUẤT TỰ VỰNG (MAIN PAGE)
          </h3>
          <p className="max-w-2xl text-[12px] md:text-xs text-neutral-300 leading-relaxed font-sans">
            Ghim những cụm từ vựng quan trọng xuất hiện trực tiếp tại mục <strong>"Gợi ý hôm nay"</strong> của học viên trên trang chủ. Thiết lập này giúp bạn định hướng chủ đề học tập linh hoạt theo tuần hoặc tháng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* LEFT: CURRENTLY RECOMMENDED LIST (1/3 Width) */}
        <div className="xl:col-span-1 bg-white border border-neutral-200 rounded-xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-105 pb-2.5">
            <span className="text-[11px] font-bold uppercase text-neutral-450 tracking-wider flex items-center gap-1.5 font-sans">
              <Pin className="w-3.5 h-3.5 text-red-600 rotate-45 shrink-0" /> Đang chọn ghim ({selectedIds.length})
            </span>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setSelectedIds([])}
                className="text-[10px] text-neutral-400 hover:text-red-600 font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                Hủy hết
              </button>
            )}
          </div>

          {currentlyRecommendedEntries.length === 0 ? (
            <div className="py-8 text-center text-neutral-400 font-sans text-xs space-y-2">
              <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center mx-auto text-neutral-400 border border-neutral-100">
                <Pin className="w-4 h-4 rotate-45" />
              </div>
              <p className="text-neutral-450">Chưa có cụm từ nào được ghim.</p>
              <p className="text-[10px] text-neutral-400">Chọn các từ từ danh sách bên phải để thêm vào đây.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {currentlyRecommendedEntries.map(entry => {
                const meta = categoryColorMeta[entry.color] || { bg: "bg-neutral-55", dot: "bg-neutral-450", label: "Khác" };
                return (
                  <div 
                    key={`pin-${entry.id}`}
                    className="p-2.5 rounded-lg border border-neutral-150 hover:border-neutral-300 bg-neutral-50/50 flex items-center justify-between gap-3 animate-fade-in text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 select-none">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className="text-[9px] uppercase tracking-wider text-neutral-450 font-bold font-sans">
                          {meta.label}
                        </span>
                      </div>
                      <div className="font-bold text-neutral-800 truncate font-sans uppercase text-[11.5px]">
                        {entry.vn}
                      </div>
                      <div className="text-red-700 font-semibold font-sans truncate text-[11px]">
                        {entry.en}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleRecommended(entry.id)}
                      className="p-1 hover:bg-neutral-200 hover:text-red-600 text-neutral-400 rounded cursor-pointer"
                      title="Bỏ ghim"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-2 bg-red-600 hover:bg-red-550 disabled:bg-neutral-250 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 font-sans cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Đang lưu..." : "LƯU CẤU HÌNH ĐỀ XUẤT"}
            </button>
          </div>

          {saveStatus && (
            <div className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2 ${
              saveStatus.success 
                ? "bg-emerald-50 border border-emerald-150 text-emerald-800" 
                : "bg-red-50 border border-red-150 text-red-800"
            }`}>
              {saveStatus.success ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="font-sans font-semibold">{saveStatus.msg}</span>
            </div>
          )}
        </div>

        {/* RIGHT: SEARCH & DICTIONARY SELECTOR (2/3 Width) */}
        <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-xl p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-105 pb-3">
            <span className="text-[11px] font-bold uppercase text-neutral-450 tracking-wider flex items-center gap-1.5 font-sans">
              <BookOpen className="w-3.5 h-3.5 text-neutral-405 shrink-0" /> Khám phá & Chọn Từ Ghim ({filteredEntries.length} từ phù hợp)
            </span>
            
            {/* Search filter inline */}
            <div className="relative w-full sm:max-w-xs flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm từ khóa tiếng Anh / dịch tiếng Việt..."
                className="w-full pl-8 pr-3 py-1 bg-neutral-50/70 border border-neutral-200 rounded-lg text-xs font-sans text-neutral-800 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="divide-y divide-neutral-100 max-h-[480px] overflow-y-auto pr-2">
            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 font-sans text-xs">
                Không tìm thấy cụm từ nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              filteredEntries.map(entry => {
                const isChecked = selectedIds.includes(entry.id);
                const meta = categoryColorMeta[entry.color] || { bg: "bg-neutral-50 text-neutral-800", dot: "bg-neutral-500", label: "Khác" };
                return (
                  <div 
                    key={`entry-sel-${entry.id}`}
                    onClick={() => handleToggleRecommended(entry.id)}
                    className={`py-3 px-2 flex items-center justify-between gap-4 cursor-pointer transition-colors rounded-lg select-none ${
                      isChecked 
                        ? "bg-red-50/20 hover:bg-red-55/35" 
                        : "hover:bg-neutral-50/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border font-sans ${meta.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="text-[9.5px] font-semibold text-neutral-400 uppercase font-mono tracking-wider">
                          {entry.pos}
                        </span>
                      </div>
                      <div className="font-bold text-neutral-800 flex items-center gap-1.5 text-sm uppercase">
                        {entry.vn}
                      </div>
                      <div className="text-xs text-neutral-500 font-semibold font-sans">
                        Translate: <span className="text-red-700 font-bold">{entry.en}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center pr-1">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-red-600 border-red-600 text-white" 
                          : "border-neutral-300 bg-white hover:border-neutral-400"
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
