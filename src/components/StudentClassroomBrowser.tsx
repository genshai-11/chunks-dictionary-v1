import React, { useState, useEffect } from "react";
import { Users, FileText, Check, ChevronRight, ArrowLeft, Bookmark, CheckCircle2, Circle, Sparkles, Loader2 } from "lucide-react";
import { ClassItem, DictionaryEntry } from "../types";
import AudioPlayerButton from "./AudioPlayerButton";

export default function StudentClassroomBrowser({ 
  entries,
  savedEntryIds,
  toggleBookmark,
  openDetail
}: { 
  entries: DictionaryEntry[],
  savedEntryIds: string[],
  toggleBookmark: (id: string, e: React.MouseEvent) => void,
  openDetail: (entry: DictionaryEntry) => void
}) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  // Local storage for completed chunks per class
  const [completedChunks, setCompletedChunks] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchClasses();
    const savedCompleted = localStorage.getItem("chunks_student_completed");
    if (savedCompleted) {
      try {
        setCompletedChunks(JSON.parse(savedCompleted));
      } catch (e) {}
    }
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleComplete = (classId: string, chunkId: string) => {
    setCompletedChunks(prev => {
      const classCompleted = prev[classId] || [];
      let updated: string[];
      if (classCompleted.includes(chunkId)) {
        updated = classCompleted.filter(id => id !== chunkId);
      } else {
        updated = [...classCompleted, chunkId];
      }
      const newState = { ...prev, [classId]: updated };
      localStorage.setItem("chunks_student_completed", JSON.stringify(newState));
      
      // Toast Simulation
      if (!classCompleted.includes(chunkId)) {
        // Just completed
        const alertBox = document.createElement("div");
        alertBox.className = "fixed bottom-10 right-10 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-xl z-50 animate-fade-in flex items-center gap-2";
        alertBox.innerHTML = `<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Đã hoàn thành luyện phát âm... Great job!`;
        document.body.appendChild(alertBox);
        setTimeout(() => alertBox.remove(), 3000);
      }

      return newState;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (selectedClass) {
    const classCompleted = completedChunks[selectedClass.id] || [];
    const assignedEntries = entries.filter(e => selectedClass.assignedChunks?.includes(e.id));

    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in font-sans">
        <div className="flex items-center gap-2 md:gap-4 font-sans mb-4">
          <button 
            onClick={() => setSelectedClass(null)} 
            className="p-1.5 md:p-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-500 hover:text-neutral-800 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-800">{selectedClass.name}</h2>
            <p className="text-[11px] md:text-xs font-semibold text-neutral-500 uppercase tracking-widest">{selectedClass.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400">CHỈ TIẾU TỪ VỰNG ({assignedEntries.length})</h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full space-x-1 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 inline-block -mt-0.5" /> 
                {classCompleted.length} / {assignedEntries.length} hoàn thành
              </span>
            </div>

            <div className="space-y-3">
              {assignedEntries.map(entry => {
                const isCompleted = classCompleted.includes(entry.id);
                const isSaved = savedEntryIds.includes(entry.id);
                
                return (
                  <div 
                    key={entry.id} 
                    className={`bg-white border ${isCompleted ? 'border-emerald-200 shadow-emerald-500/10' : 'border-neutral-200'} rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all shadow-xs`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <button 
                        onClick={() => toggleComplete(selectedClass.id, entry.id)}
                        className={`mt-1 shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-neutral-300 hover:text-emerald-400'}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                      <div className="flex-1 cursor-pointer" onClick={() => openDetail(entry)}>
                        <h4 className="font-bold text-base text-neutral-800 flex items-center gap-2 group hover:text-red-650 transition-colors">
                          {entry.en}
                          {isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Đạt</span>}
                        </h4>
                        <p className="text-sm text-neutral-500 font-medium">{entry.vn}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-neutral-150/40 p-1.5 rounded-full border border-neutral-200/40 self-end sm:self-auto ml-10 sm:ml-0">
                      {/* Using the standard Audio Player for TTS / Teacher Audio Playback */}
                      <AudioPlayerButton text={entry.en} size="sm" variant="circle" />
                      <AudioPlayerButton text={entry.vn} lang="vi" size="sm" variant="circle" />
                      
                      <button 
                        title="Đánh dấu Yêu thích/Saved"
                        onClick={(e) => toggleBookmark(entry.id, e)}
                        className={`p-2 rounded-full border flex items-center justify-center transition-all cursor-pointer bg-white border-neutral-200 text-neutral-400 hover:text-red-650 hover:border-red-200 hover:bg-red-50`}
                      >
                         <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current text-red-650" : ""}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {assignedEntries.length === 0 && (
                <div className="bg-white border min-h-[150px] border-neutral-200 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <FileText className="w-8 h-8 text-neutral-300 mb-2" />
                  <p className="text-sm font-bold text-neutral-600">Giáo viên chưa phân bổ bài học</p>
                  <p className="text-xs text-neutral-400 mt-1">Hãy quay lại sau nhé.</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Bảng tin & Thông báo
            </h3>
            
            <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-3 before:w-0.5 before:bg-neutral-100 pl-8">
              {(selectedClass.announcements || []).map((ann, i) => (
                <div key={ann.id} className="relative bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
                  <div className="absolute top-5 -left-[27px] w-3 h-3 rounded-full bg-red-500 border-4 border-white shadow-sm"></div>
                  <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 mt-3 pt-2 border-t border-neutral-100">
                    {new Date(ann.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))}
              
              {(!selectedClass.announcements || selectedClass.announcements.length === 0) && (
                <div className="relative bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-center">
                  <p className="text-xs text-neutral-500 font-medium">Chưa có thông báo nào từ Ban biên soạn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in font-sans">
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-650 border border-blue-100 text-[9px] font-bold uppercase tracking-wider">
          <Users className="w-2.5 h-2.5" /> Classroom Hub
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-800 uppercase">
          Lớp Học & Luyện Tập
        </h1>
        <p className="text-neutral-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
          Tham gia các lớp học do giáo viên tổ chức để nhận bài tập và thông báo mới nhất.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {classes.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-600">Hệ thống chưa có lớp học nào</p>
            <p className="text-xs text-neutral-400 mt-1">Vui lòng chờ giáo viên mở lớp học.</p>
          </div>
        ) : (
          classes.map(c => (
            <div 
              key={c.id}
              onClick={() => setSelectedClass(c)}
              className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <h3 className="text-base font-bold text-neutral-800 group-hover:text-red-650 transition-colors mb-1.5 line-clamp-2">{c.name}</h3>
                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{c.description}</p>
              </div>
              <div className="flex items-center justify-between mt-4 border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded uppercase tracking-wider">
                    <FileText className="w-3 h-3" /> {(c.assignedChunks || []).length} bài
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 rounded uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> {(c.announcements || []).length} tin
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-neutral-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:text-red-600" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
