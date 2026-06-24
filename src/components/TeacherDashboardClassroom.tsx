import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Users, FileText, Check, AlertCircle, Save, Loader2, ArrowLeft } from "lucide-react";
import { ClassItem, DictionaryEntry, AnnouncementItem } from "../types";

function generateId() {
  return "class-" + Date.now();
}

export default function TeacherDashboardClassroom({ entries }: { entries: DictionaryEntry[] }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const [announcementText, setAnnouncementText] = useState("");

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

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setView("list");
        setFormData({ name: "", description: "" });
        fetchClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn giải tán lớp học này không?")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateSelectedClass = async (updates: Partial<ClassItem>) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedClass(updated);
        fetchClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostAnnouncement = () => {
    if (!announcementText.trim() || !selectedClass) return;
    const newAnn: AnnouncementItem = {
      id: "ann-" + Date.now(),
      content: announcementText.trim(),
      createdAt: new Date().toISOString()
    };
    updateSelectedClass({
      announcements: [newAnn, ...selectedClass.announcements]
    });
    setAnnouncementText("");
  };

  const toggleAssignChunk = (chunkId: string) => {
    if (!selectedClass) return;
    const currentlyAssigned = selectedClass.assignedChunks || [];
    let updated: string[];
    if (currentlyAssigned.includes(chunkId)) {
      updated = currentlyAssigned.filter(id => id !== chunkId);
    } else {
      updated = [...currentlyAssigned, chunkId];
    }
    updateSelectedClass({ assignedChunks: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <button onClick={() => setView('list')} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800">Khai giảng lớp mới</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Tên lớp học</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Lớp Luyện nói Giao tiếp IELTS"
              className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-2 font-sans text-sm rounded-lg focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Mô tả mục tiêu</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập mô tả mục tiêu lớp học..."
              rows={3}
              className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-2 font-sans text-sm rounded-lg focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all resize-none"
            />
          </div>
          <button
            onClick={handleCreate}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm"
          >
            Khai giảng
          </button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedClass) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-500">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">{selectedClass.name}</h2>
                <p className="text-xs text-neutral-500">{selectedClass.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 border-b border-neutral-100 pb-2">
              <FileText className="w-3.5 h-3.5" /> Bảng tin lớp học
            </h3>
            <div className="space-y-2">
              <textarea
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Nhập thông báo mới..."
                rows={2}
                className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-3 py-2 font-sans text-xs rounded-lg focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all resize-none"
              />
              <button
                onClick={handlePostAnnouncement}
                className="w-full bg-neutral-800 hover:bg-neutral-900 text-white font-bold py-1.5 rounded-lg text-xs transition-all"
              >
                Đăng tải thông báo
              </button>
            </div>
            <div className="space-y-3 mt-4">
              {selectedClass.announcements.map(ann => (
                <div key={ann.id} className="bg-neutral-50 p-3 rounded-lg text-xs font-sans border border-neutral-100">
                  <p className="text-neutral-800 whitespace-pre-wrap">{ann.content}</p>
                  <p className="text-[10px] text-neutral-400 mt-1.5">{new Date(ann.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              ))}
              {selectedClass.announcements.length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-4">Chưa có thông báo nào</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 border-b border-neutral-100 pb-2">
              <Check className="w-3.5 h-3.5" /> Phân bổ Từ vựng
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-2">
              {entries.map(entry => {
                const isAssigned = selectedClass.assignedChunks?.includes(entry.id);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg border border-transparent hover:border-neutral-100 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-800">{entry.vn}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{entry.en}</span>
                    </div>
                    <button
                      onClick={() => toggleAssignChunk(entry.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors border ${
                        isAssigned 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {isAssigned ? 'Đã giao' : 'Giao bài'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // list view
  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Quản lý Lớp học ({classes.length})
        </span>
        <button
          onClick={() => setView('create')}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Khai giảng
        </button>
      </div>

      <div className="divide-y divide-neutral-100">
        {classes.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm font-sans flex flex-col items-center justify-center">
            <Users className="w-12 h-12 mb-3 text-neutral-200" />
            <p className="font-semibold text-neutral-600">Chưa có lớp học nào</p>
            <p className="text-xs mt-1">Bấm Khai giảng để tạo lớp mới và giao bài.</p>
          </div>
        ) : (
          classes.map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div>
                <h4 className="font-bold text-neutral-800 text-sm">{c.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">{c.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.studentCount || 0} Học viên</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {(c.assignedChunks || []).length} Bài tập</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {(c.announcements || []).length} Tin tức</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedClass(c); setView('detail'); }}
                  className="px-3 py-1.5 bg-neutral-800 text-white hover:bg-neutral-900 rounded-lg text-xs font-bold transition-all"
                >
                  Quản lý
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
