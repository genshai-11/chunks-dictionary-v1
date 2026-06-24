import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Trash2,
  Download,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
  Music,
  Check,
  CheckSquare,
  Square,
  Volume2,
  Calendar,
  Clock,
  Filter,
  X,
  Edit,
  Mic,
  Upload
} from "lucide-react";
import { DictionaryEntry, ChunkColor, TeacherAudioItem } from "../types";

interface TeacherDashboardAudioManagerProps {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
}

interface FlattenedAudioItem extends TeacherAudioItem {
  entry_id: string;
  entry_vn: string;
  entry_en: string;
  entry_color: ChunkColor;
  note_text?: string;
}

export default function TeacherDashboardAudioManager({
  entries,
  onUpdateEntries
}: TeacherDashboardAudioManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ChunkColor>("all");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Flattened id selection

  // State for Add Section
  const [showAddSection, setShowAddSection] = useState(false);
  const [addSelectedEntryId, setAddSelectedEntryId] = useState("");
  const [addTeacherName, setAddTeacherName] = useState("Chunker");
  const [addRecordingDuration, setAddRecordingDuration] = useState(0);
  const [isAddRecording, setIsAddRecording] = useState(false);
  const [addAudioRecordedUrl, setAddAudioRecordedUrl] = useState<string | null>(null);
  const [addAudioUploadedBase64, setAddAudioUploadedBase64] = useState<string | null>(null);
  const [addAudioUploadedFileName, setAddAudioUploadedFileName] = useState<string | null>(null);
  const [addAudioDurationSec, setAddAudioDurationSec] = useState<number>(0);
  const [addInputMethod, setAddInputMethod] = useState<"record" | "upload">("record");

  // State for Re-recording in Edit Modal
  const [isModalRecording, setIsModalRecording] = useState(false);
  const [modalRecordingDuration, setModalRecordingDuration] = useState(0);
  const [modalRecordedUrl, setModalRecordedUrl] = useState<string | null>(null);
  const [modalUploadedBase64, setModalUploadedBase64] = useState<string | null>(null);
  const [modalUploadedFileName, setModalUploadedFileName] = useState<string | null>(null);
  const [modalAudioDurationSec, setModalAudioDurationSec] = useState<number>(0);
  const [modalInputMethod, setModalInputMethod] = useState<"record" | "upload">("record");

  // Audio preview / test play states
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewAudioObj, setPreviewAudioObj] = useState<HTMLAudioElement | null>(null);

  // References for MediaRecorder and Timers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Audio system state
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Sandboxed iframe-safe notification/modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<FlattenedAudioItem | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [managerNotification, setManagerNotification] = useState<string | null>(null);

  // Edit Audio States
  const [showEditModal, setShowEditModal] = useState<FlattenedAudioItem | null>(null);
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editCreatedAt, setEditCreatedAt] = useState("");
  const [editDurationSec, setEditDurationSec] = useState<number>(0);

  // References
  const progressTimerRef = useRef<any>(null);

  // Clean audio / synthesis on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
    }
    if (previewAudioObj) {
      previewAudioObj.pause();
      setPreviewAudioObj(null);
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    window.speechSynthesis.cancel();
    setPlayingAudioId(null);
    setPlaybackProgress(0);
    setIsSynthesizing(false);
    setPreviewPlaying(false);
  };

  // Recording methods
  const startRecordingFlow = async (location: "add" | "modal") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = { mimeType: "audio/webm" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          if (location === "add") {
            setAddAudioRecordedUrl(base64Data);
          } else {
            setModalRecordedUrl(base64Data);
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      let seconds = 0;
      if (location === "add") {
        setIsAddRecording(true);
        setAddRecordingDuration(0);
        setAddAudioDurationSec(0);
      } else {
        setIsModalRecording(true);
        setModalRecordingDuration(0);
        setModalAudioDurationSec(0);
      }

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        if (location === "add") {
          setAddRecordingDuration(seconds);
          setAddAudioDurationSec(seconds);
        } else {
          setModalRecordingDuration(seconds);
          setModalAudioDurationSec(seconds);
          setEditDurationSec(seconds);
        }
      }, 1000);

    } catch (err) {
      console.error("Microphone capture issue: ", err);
      setManagerNotification("Không thể khởi động thiết bị thu âm. Hãy kiểm tra quyền truy cập Microphone của trình duyệt.");
    }
  };

  const stopRecordingFlow = (location: "add" | "modal") => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (location === "add") {
      setIsAddRecording(false);
    } else {
      setIsModalRecording(false);
    }
  };

  // Handle local previews of recorded / uploaded audios
  const togglePlayPreview = (audioUrl: string | null) => {
    if (!audioUrl) return;
    if (previewPlaying) {
      if (previewAudioObj) {
        previewAudioObj.pause();
      }
      setPreviewPlaying(false);
    } else {
      try {
        const pAudio = new Audio(audioUrl);
        setPreviewAudioObj(pAudio);
        pAudio.onended = () => {
          setPreviewPlaying(false);
        };
        pAudio.onerror = () => {
          setPreviewPlaying(false);
          setManagerNotification("Audio preview error.");
        };
        setPreviewPlaying(true);
        pAudio.play();
      } catch (err) {
        console.error("Preview blocked: ", err);
        setPreviewPlaying(false);
      }
    }
  };

  // Upload selectors helper
  const handleUploadedAudioFile = (e: React.ChangeEvent<HTMLInputElement>, location: "add" | "modal") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setManagerNotification("Vui lòng chọn một file âm thanh hợp lệ (mp3, wav, m4a, webm...).");
      return;
    }

    if (location === "add") {
      setAddAudioUploadedFileName(file.name);
    } else {
      setModalUploadedFileName(file.name);
    }

    const objectUrl = URL.createObjectURL(file);
    const audioEl = new Audio(objectUrl);
    audioEl.addEventListener("loadedmetadata", () => {
      const dur = Math.round(audioEl.duration) || 12;
      if (location === "add") {
        setAddAudioDurationSec(dur);
      } else {
        setModalAudioDurationSec(dur);
        setEditDurationSec(dur);
      }
    });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      if (location === "add") {
        setAddAudioUploadedBase64(base64Data);
      } else {
        setModalUploadedBase64(base64Data);
      }
    };
  };

  // Helper map styles
  const categoryColorMeta: Record<ChunkColor, { label: string; dot: string; bg: string; text: string }> = {
    green: {
      label: "Gap Fillers",
      dot: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700"
    },
    blue: {
      label: "Sentence Frames",
      dot: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-700"
    },
    red: {
      label: "Idioms & Nuance",
      dot: "bg-red-500",
      bg: "bg-red-50",
      text: "text-red-700"
    },
    pink: {
      label: "Key Terms",
      dot: "bg-pink-500",
      bg: "bg-pink-50",
      text: "text-pink-700"
    }
  };

  // Gather all items
  const flattenedAudios: FlattenedAudioItem[] = entries.reduce((acc, entry) => {
    if (entry.teacher_audios && entry.teacher_audios.length > 0) {
      entry.teacher_audios.forEach((audio) => {
        acc.push({
          ...audio,
          entry_id: entry.id,
          entry_vn: entry.vn,
          entry_en: entry.en,
          entry_color: entry.color,
          note_text: entry.note_text
        });
      });
    }
    return acc;
  }, [] as FlattenedAudioItem[]);

  // Filter items
  const filteredAudios = flattenedAudios.filter((audio) => {
    const matchesCategory = categoryFilter === "all" || audio.entry_color === categoryFilter;
    const normSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !normSearch ||
      audio.entry_en.toLowerCase().includes(normSearch) ||
      audio.entry_vn.toLowerCase().includes(normSearch) ||
      audio.teacher_name.toLowerCase().includes(normSearch);

    return matchesCategory && matchesSearch;
  });

  // Handle Play/Pause
  const handleTogglePlay = (audio: FlattenedAudioItem) => {
    // If clicking the currently playing audio
    if (playingAudioId === audio.id) {
      cleanupAudio();
      return;
    }

    // Reset previous playing audio
    cleanupAudio();

    const isRealAudio =
      audio.audio_url &&
      (audio.audio_url.startsWith("data:") ||
        audio.audio_url.startsWith("blob:") ||
        audio.audio_url.startsWith("http"));

    setPlayingAudioId(audio.id);
    setPlaybackProgress(0);

    if (isRealAudio) {
      try {
        const audioInstance = new Audio(audio.audio_url);
        setActiveAudio(audioInstance);

        audioInstance.ontimeupdate = () => {
          if (audioInstance.duration && !isNaN(audioInstance.duration)) {
            setPlaybackProgress((audioInstance.currentTime / audioInstance.duration) * 100);
          }
        };

        audioInstance.onended = () => {
          setPlayingAudioId(null);
          setPlaybackProgress(0);
          setActiveAudio(null);
        };

        audioInstance.onerror = () => {
          console.error("Audio error, falling back to TTS speech synthesis");
          runSpeechSynthesisFallback(audio);
        };

        audioInstance.play().catch((err) => {
          console.warn("Autoplay blocked, falling back to synthesis", err);
          runSpeechSynthesisFallback(audio);
        });
      } catch (err) {
        runSpeechSynthesisFallback(audio);
      }
    } else {
      runSpeechSynthesisFallback(audio);
    }
  };

  const runSpeechSynthesisFallback = (audio: FlattenedAudioItem) => {
    setIsSynthesizing(true);
    setPlaybackProgress(0);

    const txt = audio.note_text || `Lưu ý học và luyện tập cụm từ ${audio.entry_en} trong giao tiếp nhé.`;
    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = "vi-VN";

    const approxDurationMs = Math.max(3000, txt.length * 80);
    const startTime = Date.now();

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / approxDurationMs) * 100);
      setPlaybackProgress(pct);
      if (pct >= 100 || !window.speechSynthesis.speaking) {
        clearInterval(progressTimerRef.current);
      }
    }, 100);

    utterance.onend = () => {
      cleanupAudio();
    };

    utterance.onerror = () => {
      cleanupAudio();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Download Trigger
  const handleDownload = (audio: FlattenedAudioItem) => {
    try {
      const url = audio.audio_url;
      const cleanEnName = audio.entry_en.replace(/[^a-zA-Z0-9]+/g, "_");
      const filename = `Giao_vien_giang_giai_${cleanEnName}_${Date.now()}.webm`;

      if (url.startsWith("data:") || url.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setManagerNotification("Bản ghi âm giả định (TTS) không thể tải xuống dưới dạng file vật lý. Bạn có thể nghe thử thông qua trình điều khiển.");
      }
    } catch (err) {
      console.error("Download failure:", err);
      setManagerNotification("Đã xảy ra lỗi khi cố gắng tải xuống file âm thanh.");
    }
  };

  // Core Edit Single
  const handleEditSingle = (audio: FlattenedAudioItem) => {
    setShowEditModal(audio);
    setEditTeacherName(audio.teacher_name);

    let formattedDate = "";
    try {
      const d = new Date(audio.created_at);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (err) {
      formattedDate = new Date().toISOString().substring(0, 16);
    }
    setEditCreatedAt(formattedDate);
    setEditDurationSec(audio.duration_sec);
  };

  const proceedEditSingle = async () => {
    if (!showEditModal) return;
    setIsUpdating(true);
    cleanupAudio();

    try {
      const parentEntry = entries.find((e) => e.id === showEditModal.entry_id);
      if (!parentEntry) {
        setManagerNotification("Không tìm thấy từ vựng gốc của bản ghi.");
        return;
      }

      const updatedAudios = (parentEntry.teacher_audios || []).map((item) => {
        if (item.id === showEditModal.id) {
          const finalAudioUrl = modalRecordedUrl || modalUploadedBase64 || item.audio_url;
          return {
            ...item,
            teacher_name: editTeacherName,
            created_at: new Date(editCreatedAt).toISOString(),
            duration_sec: Number(editDurationSec) || 0,
            audio_url: finalAudioUrl
          };
        }
        return item;
      });

      const updatedEntry: DictionaryEntry = {
        ...parentEntry,
        teacher_audios: updatedAudios,
        updated_at: new Date().toISOString()
      };

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEntry)
      });

      if (res.ok) {
        await onUpdateEntries();
        setManagerNotification("Đã cập nhật thông tin và file ghi âm thành công! ✨");
        setShowEditModal(null);
        setModalRecordedUrl(null);
        setModalUploadedBase64(null);
        setModalUploadedFileName(null);
        setModalAudioDurationSec(0);
      } else {
        setManagerNotification("Không thể lưu thay đổi sau khi sửa trên máy chủ.");
      }
    } catch (error) {
      console.error(error);
      setManagerNotification("Lỗi hệ thống khi cập nhật thông tin bản ghi.");
    } finally {
      setIsUpdating(false);
    }
  };

  const proceedAddAudio = async () => {
    if (!addSelectedEntryId) {
      setManagerNotification("Vui lòng chọn từ vựng muốn gán bản ghi âm!");
      return;
    }
    const finalAudioUrl = addInputMethod === "record" ? addAudioRecordedUrl : addAudioUploadedBase64;
    if (!finalAudioUrl) {
      setManagerNotification("Vui lòng thực hiện ghi âm hoặc chọn tải lên file âm thanh trước!");
      return;
    }

    setIsUpdating(true);
    cleanupAudio();

    try {
      const parentEntry = entries.find((e) => e.id === addSelectedEntryId);
      if (!parentEntry) {
        setManagerNotification("Không tìm thấy từ vựng gốc tương ứng.");
        return;
      }

      const newAudioItem: TeacherAudioItem = {
        id: "ta_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        teacher_name: addTeacherName || "Giáo viên",
        audio_url: finalAudioUrl,
        duration_sec: addAudioDurationSec || 5,
        created_at: new Date().toISOString()
      };

      const updatedEntry: DictionaryEntry = {
        ...parentEntry,
        teacher_audios: [...(parentEntry.teacher_audios || []), newAudioItem],
        updated_at: new Date().toISOString()
      };

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEntry)
      });

      if (res.ok) {
        await onUpdateEntries();
        setManagerNotification("Đã thêm mới bản ghi âm giảng giải thành công cho từ vựng lẻ! ✨");
        setAddSelectedEntryId("");
        setAddAudioRecordedUrl(null);
        setAddAudioUploadedBase64(null);
        setAddAudioUploadedFileName(null);
        setAddAudioDurationSec(0);
        setShowAddSection(false);
      } else {
        setManagerNotification("Máy chủ báo lỗi khi cố gắng lưu bài giảng.");
      }
    } catch (err) {
      console.error(err);
      setManagerNotification("Lỗi mạng xảy ra khi lưu file ghi âm mới.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Core Delete Single
  const handleDeleteSingle = async (audio: FlattenedAudioItem) => {
    setShowDeleteConfirm(audio);
  };

  const proceedDeleteSingle = async (audio: FlattenedAudioItem) => {
    setIsUpdating(true);
    cleanupAudio();

    try {
      const parentEntry = entries.find((e) => e.id === audio.entry_id);
      if (!parentEntry) return;

      const remainingAudios = (parentEntry.teacher_audios || []).filter((item) => item.id !== audio.id);
      const updatedEntry: DictionaryEntry = {
        ...parentEntry,
        teacher_audios: remainingAudios,
        updated_at: new Date().toISOString()
      };

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEntry)
      });

      if (res.ok) {
        await onUpdateEntries();
        // Clear deletion ID from array if selected
        setSelectedIds((prev) => prev.filter((id) => id !== audio.id));
        setManagerNotification("Đã xóa bản ghi âm thành công! ✨");
      } else {
        setManagerNotification("Không thể lưu thay đổi sau khi xóa trên máy chủ.");
      }
    } catch (error) {
      console.error(error);
      setManagerNotification("Lỗi mạng khi thực hiện xóa.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Bulk Delete Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const proceedBulkDelete = async () => {
    setIsUpdating(true);
    cleanupAudio();

    try {
      // Find entries that contain selected audio items
      const audiosToDelete = flattenedAudios.filter((aud) => selectedIds.includes(aud.id));
      
      // Separate them out by matching entryId
      const removalsByEntry: Record<string, string[]> = {};
      audiosToDelete.forEach((aud) => {
        if (!removalsByEntry[aud.entry_id]) {
          removalsByEntry[aud.entry_id] = [];
        }
        removalsByEntry[aud.entry_id].push(aud.id);
      });

      // Update and POST sequentially
      for (const entryId of Object.keys(removalsByEntry)) {
        const parentEntry = entries.find((e) => e.id === entryId);
        if (!parentEntry) continue;

        const audioIdsToRemove = removalsByEntry[entryId];
        const remainingAudios = (parentEntry.teacher_audios || []).filter(
          (ta) => !audioIdsToRemove.includes(ta.id)
        );

        const updatedEntry: DictionaryEntry = {
          ...parentEntry,
          teacher_audios: remainingAudios,
          updated_at: new Date().toISOString()
        };

        await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEntry)
        });
      }

      await onUpdateEntries();
      setSelectedIds([]);
      setManagerNotification("Đã hoàn tất xóa hàng loạt thành công các bản ghi âm đã chọn! ✨");
    } catch (e) {
      console.error("Bulk delete failure:", e);
      setManagerNotification("Vấp phải lỗi cơ sở dữ liệu khi cố gắng xóa hàng loạt.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Select / Deselect Logic
  const handleToggleSelectRow = (audioId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(audioId)) {
        return prev.filter((id) => id !== audioId);
      } else {
        return [...prev, audioId];
      }
    });
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredAudios.map((a) => a.id);
    const areAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      // Deselect all filtered items
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Union of all current selected and all filtered IDs
      setSelectedIds((prev) => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const areAllCurrentFilteredSelected =
    filteredAudios.length > 0 && filteredAudios.every((a) => selectedIds.includes(a.id));

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4" id="audio-management-board">
      {/* Header and Counters */}
      <div className="p-5 bg-neutral-50/70 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-800 uppercase font-sans tracking-wide flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-red-600" /> QUẢN LÝ FILE ÂM THANH GIẢNG GIẢI
          </h3>
          <p className="text-xs text-neutral-550 font-medium">
            Quản lý trực quan, tải xuống hoặc xóa hàng loạt các file audio/giọng nói đính kèm trong cơ sở dữ liệu từ điển.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 bg-neutral-200/60 text-neutral-700 font-bold rounded-full text-[10px] font-mono">
            Tổng số: {flattenedAudios.length} file ghi âm
          </span>
          {selectedIds.length > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 font-extrabold rounded-full text-[10px] animate-pulse">
              Đang chọn: {selectedIds.length} file
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Audio Creation Board */}
      <div className="px-5 pt-1">
        <div className="bg-neutral-50/60 border border-[#e3dacd]/70 rounded-2xl p-4.5 space-y-4 shadow-3xs animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-red-50 text-[#c10b0d] rounded-xl shrink-0">
                <Mic className="w-5 h-5 text-[#c10b0d]" />
              </span>
              <div>
                <h4 className="text-xs font-black text-[#5b5350] uppercase tracking-wider font-display">
                  🎙️ BIÊN SOẠN & THIẾT LẬP FILE GHI ÂM MỚI
                </h4>
                <p className="text-[10px] text-neutral-500 font-medium font-sans leading-relaxed">
                  Lựa chọn từ vựng bất kỳ, ghi âm bình luận trực tiếp hoặc tải lên file giải thích định dạng .mp3, .wav.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddSection(!showAddSection)}
              className="px-3.5 py-1.5 border border-[#e3dacd] hover:bg-[#fffcfb] text-neutral-700 hover:text-[#c10b0d] hover:border-[#c10b0d]/50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-3xs cursor-pointer"
            >
              {showAddSection ? "Ẩn bảng" : "Thiết lập audio mới"}
            </button>
          </div>

          <AnimatePresence>
            {showAddSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4 pt-4 border-t border-neutral-200/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Controls */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-[#5b5350] block">
                        Chọn từ vựng muốn gán audio giảng giải
                      </label>
                      <select
                        value={addSelectedEntryId}
                        onChange={(e) => setAddSelectedEntryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#c10b0d] bg-white cursor-pointer"
                      >
                        <option value="">-- Click chọn từ vựng trong kho từ điển --</option>
                        {entries.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.en} / {entry.vn} (Nhóm: {entry.color})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-[#5b5350] block">
                          Tên Giáo Viên
                        </label>
                        <input
                          type="text"
                          value={addTeacherName}
                          onChange={(e) => setAddTeacherName(e.target.value)}
                          placeholder="Thầy Mark, Chunker..."
                          className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#c10b0d] bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-[#5b5350] block">
                          Phương thức nhập liệu
                        </label>
                        <div className="grid grid-cols-2 gap-1 bg-neutral-200/40 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              stopRecordingFlow("add");
                              setAddInputMethod("record");
                            }}
                            className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              addInputMethod === "record"
                                ? "bg-white text-[#c10b0d] shadow-3xs"
                                : "text-neutral-500 hover:text-neutral-800"
                            }`}
                          >
                            🎙️ Ghi âm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopRecordingFlow("add");
                              setAddInputMethod("upload");
                            }}
                            className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              addInputMethod === "upload"
                                ? "bg-white text-[#c10b0d] shadow-3xs"
                                : "text-neutral-500 hover:text-neutral-800"
                            }`}
                          >
                            📁 Upload file
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Active Recorder or Box */}
                  <div className="bg-white border border-[#e3dacd]/50 rounded-2xl p-4 flex flex-col justify-between min-h-[150px] shadow-3xs relative overflow-hidden">
                    {addInputMethod === "record" ? (
                      <div className="flex flex-col items-center justify-center py-2 space-y-3.5">
                        {isAddRecording ? (
                          <div className="flex flex-col items-center space-y-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#c10b0d] border border-red-200 text-[10px] font-black uppercase rounded-full animate-pulse select-none">
                              <span className="w-1.5 h-1.5 bg-[#c10b0d] rounded-full animate-ping" /> GHI ÂM LIVE ({addRecordingDuration} Giây)
                            </span>
                            {/* Animated sound wave */}
                            <div className="flex items-center gap-1 justify-center h-4 py-1">
                              {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3].map((val, idx) => (
                                <motion.div
                                  key={idx}
                                  animate={{ height: isAddRecording ? [4, val * 3, 4] : 4 }}
                                  transition={{ repeat: Infinity, duration: 0.6 + idx * 0.05 }}
                                  className="w-0.5 bg-[#c10b0d] rounded-full"
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => stopRecordingFlow("add")}
                              className="px-4 py-1.5 bg-[#201a19] hover:bg-neutral-850 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                            >
                              <Square className="w-3.5 h-3.5" /> Dừng thu âm
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2">
                            {addAudioRecordedUrl ? (
                              <div className="flex flex-col items-center space-y-2 w-full">
                                <span className="text-[10px] text-emerald-700 font-extrabold uppercase flex items-center gap-1">
                                  <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                                  Đã thu âm thành công ({addAudioDurationSec} giây)
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => togglePlayPreview(addAudioRecordedUrl)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      previewPlaying
                                        ? "bg-red-500 text-white animate-pulse"
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    }`}
                                  >
                                    {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    Nghe thử
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startRecordingFlow("add")}
                                    className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-all"
                                  >
                                    Ghi âm lại
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-2 text-center">
                                <p className="text-[11px] text-neutral-500 max-w-xs font-sans leading-relaxed">
                                  Bắt đầu nhấn nút để thu âm bài giảng trực tiếp thông qua micro của thiết bị.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => startRecordingFlow("add")}
                                  className="px-4.5 py-2 bg-[#c10b0d] hover:bg-[#a0090a] text-white font-bold text-xs uppercase rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                                >
                                  <Mic className="w-4 h-4" /> Bắt đầu thâu âm
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 space-y-3">
                        {addAudioUploadedBase64 ? (
                          <div className="flex flex-col items-center space-y-2 w-full">
                            <span className="text-[10px] text-emerald-700 font-extrabold uppercase flex items-center gap-1 text-center max-w-xs truncate">
                              <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                              Đã nhận file: {addAudioUploadedFileName} ({addAudioDurationSec} giây)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => togglePlayPreview(addAudioUploadedBase64)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  previewPlaying
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                }`}
                              >
                                {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                Nghe thử
                              </button>
                              <label className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-all cursor-pointer block">
                                Chọn file khác
                                <input
                                  type="file"
                                  accept="audio/*"
                                  onChange={(e) => handleUploadedAudioFile(e, "add")}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full">
                            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 hover:border-[#c10b0d]/50 bg-[#fffdfb] rounded-xl p-4 cursor-pointer transition-all">
                              <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                              <span className="text-xs font-bold text-neutral-600 font-sans">Chọn file từ máy tính</span>
                              <span className="text-[9px] text-neutral-400 font-medium font-sans mt-0.5">MP3, WAV, M4A, WEBM...</span>
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleUploadedAudioFile(e, "add")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action inside add state */}
                    <div className="border-t border-neutral-100 pt-2.5 flex items-center justify-between mt-auto">
                      <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Phân hệ tích hợp âm thanh
                      </span>
                      <button
                        type="button"
                        onClick={proceedAddAudio}
                        disabled={isUpdating || !addSelectedEntryId || (!addAudioRecordedUrl && !addAudioUploadedBase64)}
                        className="px-4 py-1.5 bg-[#201a19] hover:bg-[#c10b0d] text-white font-extrabold text-xs uppercase rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-[#201a19] cursor-pointer"
                      >
                        {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Lưu Bài Giảng Cô/Thầy
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Navigation Filters & Pill Switchers */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-neutral-400" />
            </span>
            <input
              type="text"
              placeholder="Tìm theo cụm từ hoặc giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-xs leading-none focus:outline-none focus:ring-1 focus:ring-red-500 bg-neutral-50/50"
            />
          </div>

          {/* Color Categories Filters */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Tất cả Chunks
            </button>
            {Object.keys(categoryColorMeta).map((colorKey) => {
              const color = colorKey as ChunkColor;
              const meta = categoryColorMeta[color];
              const isActive = categoryFilter === color;
              return (
                <button
                  key={color}
                  onClick={() => setCategoryFilter(color)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] fold-bold uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-transparent ${
                    isActive
                      ? `${meta.bg} ${meta.text} font-extrabold border-current`
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global actions and bulk delete controllers */}
        {selectedIds.length > 0 && (
          <div className="bg-red-50 border border-red-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-red-650 shrink-0" />
              <span className="text-xs text-red-950 font-sans font-medium">
                Bạn đã chọn <strong>{selectedIds.length}</strong> file âm thanh ghi âm. Thao tác tiếp theo sẽ dọn dẹp các bản ghi này khỏi từ điển.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-colors cursor-pointer"
              >
                Hủy chọn
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isUpdating}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Xóa {selectedIds.length} file đã chọn
              </button>
            </div>
          </div>
        )}

        {/* Tables & Layout List of Files */}
        {filteredAudios.length > 0 ? (
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/30">
            <table className="min-w-full text-left border-collapse" id="audio-files-catalog-table">
              <thead>
                <tr className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-500 text-[10px] font-bold uppercase tracking-wider select-none">
                  <th className="p-3.5 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-neutral-200/60 rounded text-neutral-600 cursor-pointer"
                      title="Chọn tất cả hiển thị"
                    >
                      {areAllCurrentFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-650" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 min-w-[120px]">Giáo viên / Ngày ghi</th>
                  <th className="p-3.5 min-w-[180px]">Cụm từ liên kết</th>
                  <th className="p-3.5 max-w-[200px] hidden md:table-cell">Ghi chú huấn luyện</th>
                  <th className="p-3.5 w-[75px] text-center">T/Lượng</th>
                  <th className="p-3.5 w-[300px] text-center">Nghe thử & Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                <AnimatePresence>
                  {filteredAudios.map((audio) => {
                    const isPlaying = playingAudioId === audio.id;
                    const isSelected = selectedIds.includes(audio.id);
                    const isBase64 = audio.audio_url && audio.audio_url.startsWith("data:");
                    const colorMeta = categoryColorMeta[audio.entry_color];

                    return (
                      <motion.tr
                        key={audio.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-neutral-50 transition-colors group ${
                          isSelected ? "bg-red-50/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSelectRow(audio.id)}
                            className="p-1 hover:bg-neutral-100 rounded text-neutral-500 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-red-650" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-300 group-hover:text-neutral-450" />
                            )}
                          </button>
                        </td>

                        {/* Teacher Info */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-neutral-800 block leading-tight">
                              {audio.teacher_name}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-neutral-350" />
                              {new Date(audio.created_at).toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Associated Chunk Word */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${colorMeta?.dot}`} />
                              <span className="font-extrabold text-xs text-red-655 uppercase font-sans">
                                {audio.entry_en}
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-500 font-sans block italic">
                              Hán-Việt / Nghĩa: {audio.entry_vn}
                            </span>
                          </div>
                        </td>

                        {/* Training note fallback */}
                        <td className="p-3.5 text-xs text-neutral-500 max-w-[200px] truncate hidden md:table-cell italic font-sans" title={audio.note_text}>
                          {audio.note_text || "Không có ghi chú bổ sung"}
                        </td>

                        {/* Duration */}
                        <td className="p-3.5 text-center font-mono text-xs text-neutral-500 whitespace-nowrap">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-300" />
                            {audio.duration_sec}s
                          </span>
                        </td>

                        {/* Play and action controls */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-2">
                            {/* Visual Progress bar inside table row */}
                            <div className="flex items-center gap-2 w-full bg-neutral-50 border border-neutral-100 rounded-lg p-1.5 shadow-xs">
                              <button
                                onClick={() => handleTogglePlay(audio)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all fill-current shrink-0 ${
                                  isPlaying
                                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                    : "bg-neutral-850 hover:bg-neutral-900"
                                }`}
                                title={isPlaying ? "Tạm dừng nghe thử" : "Nghe thử ghi âm của giáo viên"}
                              >
                                {isPlaying ? (
                                  isSynthesizing ? (
                                    <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                                  ) : (
                                    <Pause className="w-3.5 h-3.5" />
                                  )
                                ) : (
                                  <Play className="w-3.5 h-3.5 ml-0.5" />
                                )}
                              </button>

                              <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden relative">
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-red-600 transition-all duration-100"
                                  style={{ width: `${isPlaying ? playbackProgress : 0}%` }}
                                />
                              </div>

                              <span className="text-[9px] font-mono text-neutral-400 select-none shrink-0 pr-1">
                                {isPlaying ? `${Math.ceil(playbackProgress)}%` : isBase64 ? "Mic" : "TTS"}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-1.5">
                              {/* Download trigger */}
                              <button
                                onClick={() => handleDownload(audio)}
                                className="p-1 px-2.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-650 hover:text-neutral-850 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Tải file ghi âm"
                              >
                                <Download className="w-3.5 h-3.5" /> Tải về
                              </button>

                              {/* Individual Edit trigger */}
                              <button
                                onClick={() => handleEditSingle(audio)}
                                className="p-1 px-2.5 bg-neutral-150 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Sửa thông tin ghi âm"
                              >
                                <Edit className="w-3.5 h-3.5" /> Sửa
                              </button>

                              {/* Individual Delete trigger */}
                              <button
                                onClick={() => handleDeleteSingle(audio)}
                                className="p-1 px-2.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                title="Xóa file ghi âm này"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty Search results or Empty list state */
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-150 rounded-2xl bg-neutral-50/50 space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
              <Music className="w-6 h-6 text-neutral-350" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-neutral-700">Không tìm thấy bản ghi âm nào phù hợp</h4>
              <p className="text-xs text-neutral-450 max-w-sm">
                Thay đổi bộ lọc màu sắc hoặc nhập cụm từ tìm kiếm khác. Giáo viên có thể ghi âm bài giảng mới bằng cách bấm "Sửa" trực tiếp trên từ vựng ở bảng Biên soạn.
              </p>
            </div>

            {(searchQuery || categoryFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white text-[10px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info notice helpful for teachers */}
      <div className="p-4 px-5 bg-orange-50/50 border-t border-neutral-200/60 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-neutral-500 leading-normal">
          <strong>Lưu ý đồng bộ hóa:</strong> Mọi thao tác Xóa (hoặc Xóa hàng loạt) trên bảng Ghi âm này sẽ tự động loại bỏ trường <code>teacher_audios</code> của từ vựng tương ứng và cập nhật trực tiếp lên hệ thống cơ sở dữ liệu. Vui lòng cân nhắc kỹ trước khi xóa.
        </p>
      </div>

      {/* Custom Alert Toast/Banner */}
      <AnimatePresence>
        {managerNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-[9999] bg-neutral-900 text-white p-4.5 rounded-xl shadow-2xl flex items-center gap-3.5 border border-neutral-800 max-w-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-555" />
            <div className="text-xs font-bold font-sans leading-relaxed">{managerNotification}</div>
            <button
              type="button"
              onClick={() => setManagerNotification(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors ml-auto cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="w-7 h-7" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Ẩn/Xóa Bản Ghi Âm
                </h4>
              </div>
              <p className="text-xs text-neutral-555 leading-relaxed font-semibold font-sans">
                Bạn có chắc muốn xóa bản ghi âm giải thích của cô/thầy <strong className="text-neutral-850">"{showDeleteConfirm.teacher_name}"</strong> cho cụm từ <strong className="text-red-650">"{showDeleteConfirm.entry_en}"</strong>? Thao tác này không thể khôi phục!
              </p>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const audio = showDeleteConfirm;
                    setShowDeleteConfirm(null);
                    proceedDeleteSingle(audio);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Bulk Delete Confirm Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-655">
                <AlertCircle className="w-7 h-7" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Xóa Nhiều Bản Ghi Âm
                </h4>
              </div>
              <p className="text-xs text-neutral-555 leading-relaxed font-semibold font-sans">
                Cảnh báo! Bạn đã chọn <strong className="text-red-650">{selectedIds.length}</strong> bản ghi âm giải thích của giáo viên để xóa đồng loạt khỏi từ điển. Thao tác này không thể phục hồi. Bạn có muốn tiếp tục?
              </p>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkDeleteConfirm(false);
                    proceedBulkDelete();
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, xóa hàng loạt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Edit Info Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-neutral-800">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-655 flex items-center justify-center shrink-0">
                    <Edit className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                      Cập nhật & Ghi âm lại bài giảng
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-medium">
                      Chỉnh sửa thông tin giáo viên, thâu âm trực tiếp hoặc tải file thay thế.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopRecordingFlow("modal");
                    setShowEditModal(null);
                  }}
                  className="p-1 px-2 border border-neutral-100 hover:bg-neutral-50 rounded-lg text-neutral-450 hover:text-neutral-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">Cụm từ liên kết</span>
                <span className="font-extrabold text-xs text-red-655 uppercase block">
                  {showEditModal.entry_en}
                </span>
                <span className="text-[10px] text-neutral-550 block italic">
                  {showEditModal.entry_vn}
                </span>
              </div>

              {/* Core Layout: Grid form */}
              <div className="space-y-4 max-h-[365px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Teacher Name Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block">
                      Tên giáo viên
                    </label>
                    <input
                      type="text"
                      required
                      value={editTeacherName}
                      onChange={(e) => setEditTeacherName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-red-500 bg-neutral-50/50"
                      placeholder="ví dụ: Chunker..."
                    />
                  </div>

                  {/* Duration Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block">
                      Thời lượng chỉnh tay (s)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      required
                      value={editDurationSec}
                      onChange={(e) => setEditDurationSec(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500 bg-neutral-50/50"
                    />
                  </div>
                </div>

                {/* Sub Panel: Replace Audio section */}
                <div className="border border-[#e3dacd]/75 rounded-2xl p-4 bg-neutral-50/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[9px] uppercase font-black tracking-widest text-[#5b5350]">
                      📻 Thay thế file Audio (Không bắt buộc)
                    </h5>
                    <div className="flex bg-neutral-250/50 p-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          stopRecordingFlow("modal");
                          setModalInputMethod("record");
                        }}
                        className={`px-3 py-0.5 rounded-lg text-[9px] uppercase font-bold transition ${
                          modalInputMethod === "record" ? "bg-white text-neutral-850 shadow-3xs" : "text-neutral-500"
                        }`}
                      >
                        Ghi âm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopRecordingFlow("modal");
                          setModalInputMethod("upload");
                        }}
                        className={`px-3 py-0.5 rounded-lg text-[9px] uppercase font-bold transition ${
                          modalInputMethod === "upload" ? "bg-white text-neutral-850 shadow-3xs" : "text-neutral-500"
                        }`}
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {modalInputMethod === "record" ? (
                    <div className="flex flex-col items-center justify-center py-1 space-y-2.5">
                      {isModalRecording ? (
                        <div className="flex flex-col items-center space-y-2">
                          <span className="flex items-center gap-1 bg-red-100 text-red-750 px-3 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                            🎙️ Đang thu live: {modalRecordingDuration} giây
                          </span>
                          <button
                            type="button"
                            onClick={() => stopRecordingFlow("modal")}
                            className="px-4 py-1 bg-neutral-850 hover:bg-[#c10b0d] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Dừng ghi âm
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          {modalRecordedUrl ? (
                            <div className="flex flex-col items-center space-y-1.5">
                              <span className="text-[9px] text-emerald-700 font-bold uppercase flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Đã ghi thâu mới hoàn thành!
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => togglePlayPreview(modalRecordedUrl)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                    previewPlaying ? "bg-[#c10b0d] text-white" : "bg-neutral-200 text-neutral-700"
                                  }`}
                                >
                                  {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  Nghe lại
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startRecordingFlow("modal")}
                                  className="px-3 py-1 bg-neutral-150 hover:bg-neutral-200 text-neutral-750 rounded-lg text-[10px] font-bold"
                                >
                                  Ghi lại
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startRecordingFlow("modal")}
                              className="px-4 py-2 bg-red-655 hover:bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                              <Mic className="w-4 h-4 animate-bounce" /> Bắt đầu thâu âm đè lên bản cũ
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-1">
                      {modalUploadedBase64 ? (
                        <div className="flex flex-col items-center space-y-1.5">
                          <span className="text-[9px] text-emerald-700 font-bold uppercase truncate max-w-xs block">
                            Đã nhận file: {modalUploadedFileName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => togglePlayPreview(modalUploadedBase64)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                previewPlaying ? "bg-[#c10b0d] text-white animate-pulse" : "bg-neutral-200 text-neutral-700"
                              }`}
                            >
                              {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              Nghe thử
                            </button>
                            <label className="px-3 py-1 bg-neutral-150 hover:bg-neutral-200 text-neutral-750 rounded-lg text-[10px] font-bold cursor-pointer">
                              Chọn file khác
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleUploadedAudioFile(e, "modal")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full text-center border border-dashed border-neutral-300 hover:border-red-500/50 bg-white rounded-xl p-3 cursor-pointer block transition">
                          <Upload className="w-4 h-4 mx-auto mb-1 text-neutral-400" />
                          <span className="text-[10px] font-bold text-neutral-600">Bấm chọn file từ thiết bị (.mp3/wav)</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleUploadedAudioFile(e, "modal")}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Date Input */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block">
                    Ngày ghi thâu từ điển
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    className="w-full px-3.5 py-2 border border-neutral-200 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-red-500 bg-neutral-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    stopRecordingFlow("modal");
                    setShowEditModal(null);
                  }}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isUpdating || !editTeacherName.trim() || !editCreatedAt}
                  onClick={proceedEditSingle}
                  className="px-4 py-1.5 bg-[#201a19] hover:bg-[#c10b0d] text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
