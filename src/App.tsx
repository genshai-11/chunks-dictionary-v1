import React, { useState, useEffect, MouseEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Tag,
  BookOpen,
  Mic,
  Plus,
  Edit2,
  Trash2,
  FileText,
  User,
  Heart,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle,
  ListFilter,
  Loader2,
  Square,
  History,
  Eye,
  Users,
  Settings,
  FolderInput,
  Library,
  Bot,
  Scissors
} from "lucide-react";
import { DictionaryEntry, ChunkColor, ExampleItem, RelatedTermItem } from "./types";
import { inferPosFromCategory } from "./lib/vocabularyMeta";
import Navigation from "./components/Navigation";
import AudioPlayerButton from "./components/AudioPlayerButton";
import chunksLogoUrl from "../assets/.aistudio/logo.png";
import VoiceSearchOverlay from "./components/VoiceSearchOverlay";
import SentenceSegmenter from "./components/SentenceSegmenter";
import TeacherDashboardAudioManager from "./components/TeacherDashboardAudioManager";
import TeacherDashboardBulkImport from "./components/TeacherDashboardBulkImport";
import TeacherDashboardAIGenerator from "./components/TeacherDashboardAIGenerator";
import TeacherDashboard9RouterSettings from "./components/TeacherDashboard9RouterSettings";
import TeacherDashboardRecommendations from "./components/TeacherDashboardRecommendations";
import TeacherDashboardClassroom from "./components/TeacherDashboardClassroom";
import TeacherDashboardVocabulary from "./components/TeacherDashboardVocabulary";
import StudentClassroomBrowser from "./components/StudentClassroomBrowser";

// Helper to extract terms to highlight from a dictionary entry
const getHighlightTerms = (entry: DictionaryEntry): string[] => {
  const terms: string[] = [];
  
  if (entry.en) {
    const enClean = entry.en.trim();
    terms.push(enClean);
    
    // If plural, add singular
    if (enClean.toLowerCase().endsWith('s')) {
      terms.push(enClean.slice(0, -1).trim());
    }
    // Handle flip-flops -> flip-flop, flip flop, flipflops
    if (enClean.includes('-')) {
      terms.push(enClean.replace(/-/g, ' ').trim());
      terms.push(enClean.replace(/-/g, '').trim());
    }
  }
  
  if (entry.vn) {
    const vnClean = entry.vn.trim();
    if (vnClean.includes('/')) {
      vnClean.split('/').forEach(part => {
        const p = part.trim();
        if (p) terms.push(p);
      });
    } else {
      terms.push(vnClean);
    }
  }

  // Deduplicate, filter short terms, and sort descending by length
  return Array.from(new Set(terms))
    .filter(t => t && t.length > 1)
    .sort((a, b) => b.length - a.length);
};

// Component to render text with styled highlights
const renderHighlightedText = (text: string, terms: string[], colorClass: string) => {
  if (!text || !terms || terms.length === 0) return <span>{text}</span>;
  
  // Escape regex markers safely
  const escapedTerms = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  
  // Create matching regex
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        const isMatched = terms.some(t => t.toLowerCase() === part.toLowerCase());
        if (isMatched) {
          return (
            <span
              key={i}
              className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md border font-bold text-[102%] tracking-tight shadow-xs transform hover:scale-102 transition-transform duration-100 select-all cursor-help ${colorClass}`}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export default function App() {
  // Global states
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const loggedIn = localStorage.getItem("chunks_teacher_logged_in") === "true";
      if (path === "/teacher" || path === "/admin-teacher") {
        return loggedIn ? "teacher-dashboard" : "teacher";
      } else if (path === "/setting" || path === "/settings") {
        return loggedIn ? "settings" : "teacher";
      } else if (path === "/saved") {
        return "saved";
      } else if (path === "/classroom") {
        return "classroom";
      } else if (path === "/segment") {
        return "segment";
      } else if (path.startsWith("/entry/")) {
        const id = path.substring("/entry/".length);
        return `detail-${id}`;
      }
    }
    return "search";
  }); // search | saved | segment | teacher | detail-{id}
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [savedEntryIds, setSavedEntryIds] = useState<string[]>([]);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState<string>("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  const handleRemoveRecentSearch = (termToRemove: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((t) => t.toLowerCase() !== termToRemove.toLowerCase());
      localStorage.setItem("chunks_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("chunks_recent_searches");
  };

  // Tracks and debounces search history
  useEffect(() => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm || cleanTerm.length < 2) return;

    const timer = setTimeout(() => {
      setRecentSearches((prev) => {
        const filtered = prev.filter((t) => t.toLowerCase() !== cleanTerm.toLowerCase());
        const updated = [cleanTerm, ...filtered].slice(0, 5);
        localStorage.setItem("chunks_recent_searches", JSON.stringify(updated));
        return updated;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Detail views state
  const [detailEntry, setDetailEntry] = useState<DictionaryEntry | null>(null);
  const [exampleFilter, setExampleFilter] = useState<'all' | 'normal' | 'codemix'>('all');

  // Simulated recording and real audio playback states in dictionary
  const [isPlayingTeacherAudio, setIsPlayingTeacherAudio] = useState(false);
  const [teacherAudioProgress, setTeacherAudioProgress] = useState(0);
  const [activeTeacherAudio, setActiveTeacherAudio] = useState<HTMLAudioElement | null>(null);

  // Teacher login & dashboard states
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chunks_teacher_logged_in") === "true";
    } catch (_) {
      return false;
    }
  });
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [editingEntry, setEditingEntry] = useState<Partial<DictionaryEntry> | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isCodemixGenerating, setIsCodemixGenerating] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState("");
  const [teacherSubTab, setTeacherSubTab] = useState<'vocabulary' | 'recommendations' | 'audios' | 'bulk-import' | 'bulk-audio' | '9router-settings' | 'segment'>('vocabulary');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chunks_teacher_sidebar_collapsed") === "true";
    } catch (_) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newVal = !prev;
      try {
        localStorage.setItem("chunks_teacher_sidebar_collapsed", newVal ? "true" : "false");
      } catch (_) {}
      return newVal;
    });
  };

  // Sandboxed iframe-safe notification/modal states for App.tsx
  const [appAlertMessage, setAppAlertMessage] = useState<string | null>(null);
  const [wordToDeleteId, setWordToDeleteId] = useState<string | null>(null);

  // Teacher Voice Recording Room states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlaybackPreviewing, setIsPlaybackPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewAudioInstance, setPreviewAudioInstance] = useState<HTMLAudioElement | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<any>(null);

  // Clean local recording states on word transition or editor close
  useEffect(() => {
    setAudioBlob(null);
    setPreviewAudioUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsPlaybackPreviewing(false);
    setPreviewProgress(0);
    if (previewAudioInstance) {
      previewAudioInstance.pause();
      setPreviewAudioInstance(null);
    }
  }, [editingEntry?.id]);

  // Load entries on mount
  useEffect(() => {
    fetchEntries();
    // Load bookmarks
    const saved = localStorage.getItem("chunks_bookmarks");
    if (saved) {
      setSavedEntryIds(JSON.parse(saved));
    }
    // Load recent searches
    const savedRecent = localStorage.getItem("chunks_recent_searches");
    if (savedRecent) {
      try {
        setRecentSearches(JSON.parse(savedRecent));
      } catch (err) {
        console.error("Failed to parse recent searches from localStorage", err);
      }
    }
  }, []);

  // 1. Bidirectional HTML5 Routing Synchronizer
  useEffect(() => {
    const handleRouteSync = () => {
      const path = window.location.pathname;
      if (path === "/teacher" || path === "/admin-teacher") {
        if (isTeacherLoggedIn) {
          setActiveTab("teacher-dashboard");
        } else {
          setActiveTab("teacher");
        }
      } else if (path === "/setting" || path === "/settings") {
        if (isTeacherLoggedIn) {
          setActiveTab("settings");
        } else {
          setActiveTab("teacher");
        }
      } else if (path === "/saved") {
        setActiveTab("saved");
      } else if (path === "/classroom") {
        setActiveTab("classroom");
      } else if (path === "/segment") {
        setActiveTab("segment");
      } else if (path.startsWith("/entry/")) {
        const entryId = path.substring("/entry/".length);
        if (entries.length > 0) {
          const found = entries.find(
            (e) => e.id === entryId || e.en.toLowerCase().replace(/[^a-z0-9]+/g, "-") === entryId
          );
          if (found) {
            setDetailEntry(found);
            setActiveTab(`detail-${found.id}`);
          } else {
            setActiveTab("search");
          }
        }
      } else if (path === "/main") {
        setActiveTab("search");
      } else {
        // Fallback standard root
        if (path === "/") {
          setActiveTab("search");
        }
      }
    };

    handleRouteSync();

    window.addEventListener("popstate", handleRouteSync);
    return () => window.removeEventListener("popstate", handleRouteSync);
  }, [entries, isTeacherLoggedIn]);

  // 2. Active tab URL pusher
  useEffect(() => {
    let targetPath = "/";
    if (activeTab === "search") {
      targetPath = "/";
    } else if (activeTab === "classroom") {
      targetPath = "/classroom";
    } else if (activeTab === "saved") {
      targetPath = "/saved";
    } else if (activeTab === "segment") {
      targetPath = "/segment";
    } else if (activeTab === "settings") {
      targetPath = "/setting";
    } else if (activeTab === "teacher" || activeTab === "teacher-dashboard" || activeTab === "teacher-editor") {
      targetPath = "/admin-teacher";
    } else if (activeTab.startsWith("detail-")) {
      const entryId = activeTab.substring("detail-".length);
      targetPath = `/entry/${entryId}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  }, [activeTab]);

  // 3. Synchronize detailEntry automatically when activeTab changes to a detail view
  useEffect(() => {
    if (activeTab.startsWith("detail-")) {
      const entryId = activeTab.substring("detail-".length);
      if (entries.length > 0) {
        const found = entries.find(
          (e) => e.id === entryId || e.en.toLowerCase().replace(/[^a-z0-9]+/g, "-") === entryId
        );
        if (found && (!detailEntry || detailEntry.id !== found.id)) {
          setDetailEntry(found);
          setExampleFilter('all');
        }
      }
    }
  }, [activeTab, entries, detailEntry]);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error("Failed to load entries from server:", err);
    }
  };

  // Persists bookmark IDs
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const current = [...savedEntryIds];
    const idx = current.indexOf(id);
    let updated;
    if (idx >= 0) {
      updated = current.filter(item => item !== id);
    } else {
      updated = [...current, id];
    }
    setSavedEntryIds(updated);
    localStorage.setItem("chunks_bookmarks", JSON.stringify(updated));
  };

  // Handles switching to vocabulary detail view
  const openDetail = (entry: DictionaryEntry) => {
    setDetailEntry(entry);
    setExampleFilter('all');
    
    if (activeTeacherAudio) {
      activeTeacherAudio.pause();
      setActiveTeacherAudio(null);
    }
    window.speechSynthesis.cancel();

    setIsPlayingTeacherAudio(false);
    setTeacherAudioProgress(0);
    setActiveTab(`detail-${entry.id}`);
  };

  // Toggle play/pause for Teacher's Audio Explanation in student view
  const toggleTeacherAudioPlayback = (entry: DictionaryEntry) => {
    if (isPlayingTeacherAudio) {
      if (activeTeacherAudio) {
        activeTeacherAudio.pause();
        setActiveTeacherAudio(null);
      }
      window.speechSynthesis.cancel();
      setIsPlayingTeacherAudio(false);
      setTeacherAudioProgress(0);
      return;
    }

    window.speechSynthesis.cancel();

    // Check if there is an actual recorded custom explanation
    const customAudioItem = entry.teacher_audios?.find(
      (ta) => ta.audio_url && (ta.audio_url.startsWith("data:") || ta.audio_url.startsWith("blob:"))
    );

    if (customAudioItem) {
      try {
        const audio = new Audio(customAudioItem.audio_url);
        setActiveTeacherAudio(audio);
        setIsPlayingTeacherAudio(true);
        setTeacherAudioProgress(0);

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            setTeacherAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        };

        audio.onended = () => {
          setIsPlayingTeacherAudio(false);
          setTeacherAudioProgress(0);
          setActiveTeacherAudio(null);
        };

        audio.onerror = (e) => {
          console.error("Audio playback error, falling back to speech synthesis simulation", e);
          setIsPlayingTeacherAudio(false);
          setTeacherAudioProgress(0);
          setActiveTeacherAudio(null);
          runSynthesisPlaybackOfNote(entry.note_text);
        };

        audio.play().catch((err) => {
          console.warn("Audio autoplay blocked, running verbal synthesis speech engine", err);
          runSynthesisPlaybackOfNote(entry.note_text);
        });
      } catch (err) {
        runSynthesisPlaybackOfNote(entry.note_text);
      }
    } else {
      runSynthesisPlaybackOfNote(
        entry.note_text || "Lưu ý luyện tập phát âm và cách kết hợp cụm màu này vào cuộc hội thoại thường ngày nha các bạn!"
      );
    }
  };

  const runSynthesisPlaybackOfNote = (text: string) => {
    setIsPlayingTeacherAudio(true);
    setTeacherAudioProgress(0);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";

    const approxDurationMs = Math.max(3000, text.length * 80);
    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / approxDurationMs) * 100);
      setTeacherAudioProgress(pct);
      if (pct >= 100 || !window.speechSynthesis.speaking) {
        clearInterval(progressTimer);
      }
    }, 150);

    utterance.onend = () => {
      clearInterval(progressTimer);
      setIsPlayingTeacherAudio(false);
      setTeacherAudioProgress(100);
      setTimeout(() => setTeacherAudioProgress(0), 400);
    };

    utterance.onerror = () => {
      clearInterval(progressTimer);
      setIsPlayingTeacherAudio(false);
      setTeacherAudioProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Recording action handlers
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setAudioBlob(null);
    setPreviewAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const collectedBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setAudioBlob(collectedBlob);
        const audioUrl = URL.createObjectURL(collectedBlob);
        setPreviewAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Camera/Mic access error:", err);
      setAppAlertMessage("Không thể sử dụng Microphone. Vui lòng cấp quyền truy cập Mic trong trình duyệt của bạn!");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const togglePreviewPlayback = () => {
    if (isPlaybackPreviewing) {
      if (previewAudioInstance) {
        previewAudioInstance.pause();
        previewAudioInstance.currentTime = 0;
      }
      setIsPlaybackPreviewing(false);
      setPreviewProgress(0);
      return;
    }

    if (previewAudioUrl) {
      const audio = new Audio(previewAudioUrl);
      setPreviewAudioInstance(audio);
      setIsPlaybackPreviewing(true);
      setPreviewProgress(0);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlaybackPreviewing(false);
        setPreviewProgress(0);
        setPreviewAudioInstance(null);
      };

      audio.onerror = () => {
        setIsPlaybackPreviewing(false);
        setPreviewProgress(0);
        setPreviewAudioInstance(null);
      };

      audio.play().catch((e) => {
        console.error("Preview play request error:", e);
        setIsPlaybackPreviewing(false);
      });
    }
  };

  const applyRecordedAudio = () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const duration = recordingSeconds || 5;

      const newAudioItem = {
        id: `ta-${Date.now()}`,
        teacher_name: "Chunker",
        audio_url: base64Audio,
        duration_sec: duration,
        created_at: new Date().toISOString()
      };

      setEditingEntry((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          teacher_audios: [newAudioItem]
        };
      });

      setAudioBlob(null);
      setPreviewAudioUrl(null);
      setRecordingSeconds(0);
      setAppAlertMessage("Đã ghi nhận bài nói giảng giải của Chunker! Hãy bấm nút 'Lưu & Phát Bản' để lưu lại thay đổi này vào từ điển.");
    };

    reader.readAsDataURL(audioBlob);
  };

  const deleteExistingRecordedAudio = () => {
    setEditingEntry((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        teacher_audios: []
      };
    });
  };

  // Search filter computes
  const filteredEntries = entries.filter(e => {
    const matchesColor = selectedColor === "all" || e.color === selectedColor;
    const matchesSearch = !searchTerm || e.vn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.tags && e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesColor && matchesSearch;
  });

  // Simulated or physical timer manager or fallback clock updater
  useEffect(() => {
    let timer: any;
    if (isPlayingTeacherAudio && !activeTeacherAudio) {
      timer = setInterval(() => {
        setTeacherAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingTeacherAudio(false);
            return 0;
          }
          return prev + 2.2; // roughly simulate tick
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingTeacherAudio, activeTeacherAudio]);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    // Standard teacher workspace password credentials verification
    if (teacherEmail === "teacher@chunks.edu.vn" || teacherPassword === "admin123") {
      setIsTeacherLoggedIn(true);
      try {
        localStorage.setItem("chunks_teacher_logged_in", "true");
      } catch (_) {}
      setActiveTab("teacher-dashboard");
    } else {
      setLoginError("Email hoặc Mật khẩu chưa chính xác. (Hint: password: admin123)");
    }
  };

  const handleTeacherLogout = () => {
    setIsTeacherLoggedIn(false);
    try {
      localStorage.removeItem("chunks_teacher_logged_in");
    } catch (_) {}
    setActiveTab("search");
    setTeacherEmail("");
    setTeacherPassword("");
    
    if (activeTeacherAudio) {
      activeTeacherAudio.pause();
      setActiveTeacherAudio(null);
    }
    
    if (previewAudioInstance) {
      previewAudioInstance.pause();
      setPreviewAudioInstance(null);
    }
    
    setIsPlayingTeacherAudio(false);
    setTeacherAudioProgress(0);
    window.speechSynthesis.cancel();
  };

  const startEditingWord = (entry?: DictionaryEntry) => {
    if (entry) {
      setEditingEntry({ ...entry });
    } else {
      setEditingEntry({
        vn: "",
        en: "",
        color: "pink",
        pos: inferPosFromCategory("pink"),
        ipa: "",
        definition: "",
        definition_en: "",
        tags: [],
        level: "easy",
        examples: [],
        related_terms: [],
        status: "published"
      });
    }
    setActiveTab("teacher-editor");
  };

  const saveWordEditor = async () => {
    if (!editingEntry?.en || !editingEntry?.vn) {
      setAppAlertMessage("Vui lòng nhập đầy đủ Cụm tiếng Anh và Vietnamese Headword!");
      return;
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEntry)
      });

      if (res.ok) {
        const result = await res.json();
        setDbStatusMsg("Đã lưu và xuất bản từ điển thành công! ✨");
        fetchEntries();
        setTimeout(() => setDbStatusMsg(""), 3500);
        setActiveTab("teacher-dashboard");
      } else {
        setAppAlertMessage("Có lỗi trong quá trình lưu lên máy chủ.");
      }
    } catch (e) {
      setAppAlertMessage("Lỗi mạng khi lưu từ vựng.");
    }
  };

  const deleteWord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWordToDeleteId(id);
  };

  const proceedDeleteWord = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEntries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI-powered generator trigger using Server API (Claude Gemini 3.5 Flash)
  const generateAiExamples = async () => {
    if (!editingEntry?.en) {
      setAppAlertMessage("Vui lòng ghi cụm tiếng Anh trước khi gọi AI!");
      return;
    }
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/ai/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingEntry,
          ninerouter_url: localStorage.getItem("ninerouter_url") || "",
          ninerouter_key: localStorage.getItem("ninerouter_key") || "",
          ninerouter_llm_model: localStorage.getItem("ninerouter_llm_model") || ""
        })
      });
      if (res.ok) {
        const data: ExampleItem[] = await res.json();
        const currentExamples = editingEntry.examples || [];
        setEditingEntry({
          ...editingEntry,
          examples: [...currentExamples, ...data.map((item, i) => ({
            id: `ai-ex-${Date.now()}-${i}`,
            type: "normal" as const,
            text_en: item.text_en,
            text_vn: item.text_vn
          }))]
        });
      } else {
        setAppAlertMessage("Lỗi tải ví dụ từ Gemini. Hãy đảm bảo API key được cấu hình.");
      }
    } catch (e) {
      console.error("AI examples error:", e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Code mixing proposal generator
  const generateAiCodemix = async () => {
    if (!editingEntry?.en) {
      setAppAlertMessage("Vui lòng ghi cụm tiếng Anh trước khi gọi AI!");
      return;
    }
    setIsCodemixGenerating(true);
    try {
      const res = await fetch("/api/ai/codemix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingEntry,
          ninerouter_url: localStorage.getItem("ninerouter_url") || "",
          ninerouter_key: localStorage.getItem("ninerouter_key") || "",
          ninerouter_llm_model: localStorage.getItem("ninerouter_llm_model") || ""
        })
      });
      if (res.ok) {
        const data: ExampleItem[] = await res.json();
        const currentExamples = editingEntry.examples || [];
        setEditingEntry({
          ...editingEntry,
          examples: [...currentExamples, ...data.map((item, i) => ({
            id: `ai-cm-${Date.now()}-${i}`,
            type: "codemix" as const,
            text_en: item.text_en,
            text_vn: item.text_vn
          }))]
        });
      } else {
        setAppAlertMessage("Lỗi tải ví dụ code-mixing.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCodemixGenerating(false);
    }
  };

  const handleAddField = (type: "example" | "related") => {
    if (type === "example") {
      const current = editingEntry?.examples || [];
      setEditingEntry({
        ...editingEntry,
        examples: [...current, { id: `manual-${Date.now()}`, type: "normal", text_en: "", text_vn: "" }]
      });
    } else {
      const current = editingEntry?.related_terms || [];
      setEditingEntry({
        ...editingEntry,
        related_terms: [...current, { term_en: "", term_vn: "", example_en: "", example_vn: "" }]
      });
    }
  };

  const handleRemoveField = (type: "example" | "related", index: number) => {
    if (type === "example") {
      const current = editingEntry?.examples || [];
      const updated = current.filter((_, i) => i !== index);
      setEditingEntry({ ...editingEntry, examples: updated });
    } else {
      const current = editingEntry?.related_terms || [];
      const updated = current.filter((_, i) => i !== index);
      setEditingEntry({ ...editingEntry, related_terms: updated });
    }
  };

  const handleVoiceSearchResult = (matched: DictionaryEntry[], transcript: string) => {
    setSearchTerm(transcript);
    setSelectedColor("all");
    if (matched.length > 0) {
      openDetail(matched[0]);
    } else {
      setActiveTab("search");
    }
  };

  // Helper map styles
  const categoryColorMeta: Record<ChunkColor, { border: string; bg: string; text: string; label: string; dot: string }> = {
    green: {
      border: "border-emerald-600",
      bg: "bg-emerald-50 text-emerald-900",
      text: "text-emerald-700",
      label: "GAP FILLERS (Từ nối câu)",
      dot: "bg-emerald-500"
    },
    blue: {
      border: "border-blue-600",
      bg: "bg-blue-50 text-blue-900",
      text: "text-blue-700",
      label: "SENTENCE FRAMES (Khung câu)",
      dot: "bg-blue-500"
    },
    red: {
      border: "border-red-600",
      bg: "bg-red-50 text-red-900",
      text: "text-red-700",
      label: "IDIOMS & NUANCE (Thành ngữ)",
      dot: "bg-red-500"
    },
    pink: {
      border: "border-pink-600",
      bg: "bg-pink-50 text-pink-900",
      text: "text-pink-700",
      label: "KEY TERMS (Từ khóa hội thoại)",
      dot: "bg-pink-500"
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] text-neutral-900 flex flex-col font-sans">
      
      {/* 4. Global Navigation Tab Menu */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isTeacher={isTeacherLoggedIn}
        onLogout={handleTeacherLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        entries={entries}
        onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-8" id="chunks-main-layout">
        
        <AnimatePresence mode="wait">
          
          {/* VIEW: Search and filter homepage (P1 & P2 combined) */}
          {activeTab === "search" && (
            <motion.div
              key="search-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-7 max-w-3xl mx-auto"
            >
              
              {/* Minimal Header Title Section */}
              <div className="text-center space-y-2 py-4 select-none">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-100 text-[9px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Thư viện Lexical Chunks
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-display text-neutral-800 uppercase" id="app-hero-title">
                  Học Tiếng Anh Theo Cụm
                </h1>
                <p className="text-neutral-450 font-sans text-xs md:text-[12px] max-w-md mx-auto leading-relaxed">
                  Tra cứu và luyện nghe các mẫu câu thông minh, cụm từ nối tự nhiên.
                </p>
              </div>

              {/* Real-time Search Controller bar (P2) */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 md:p-5 shadow-xs space-y-3 max-w-2xl mx-auto" id="search-bar-card">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Search className="w-4 h-4 text-neutral-405 absolute left-2.5" />
                    <input
                      id="search-phrase-input"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nhập cụm tiếng Anh hoặc ý nghĩa tiếng Việt..."
                      className="w-full pl-8 pr-3 py-1.5 bg-transparent text-neutral-855 font-sans text-xs focus:outline-none placeholder:text-neutral-400 font-medium"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded-full mr-1 hover:bg-neutral-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Compact Voice search mic button */}
                  <button
                    id="search-btn-mic"
                    onClick={() => setIsVoiceSearchOpen(true)}
                    className="p-1.5 px-3 bg-red-50 hover:bg-red-150 text-red-655 border border-red-150 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    title="Tra cứu giọng nói"
                  >
                    <Mic className="w-3.5 h-3.5 animate-pulse text-red-600" />
                    <span className="hidden sm:inline">Nói để tìm</span>
                  </button>
                </div>

              </div>

              {/* Recent Searches Panel */}
              {recentSearches.length > 0 && (
                <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-2 px-1 text-xs text-neutral-500 animate-fade-in" id="recent-searches-box">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                    <History className="w-3 h-3 text-neutral-400" /> Lịch sử:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {recentSearches.map((term, i) => (
                      <div
                        key={`${term}-${i}`}
                        id={`recent-search-pill-${i}`}
                        className="inline-flex items-center gap-1 bg-neutral-100 hover:bg-neutral-150 border border-neutral-200/75 text-neutral-650 font-semibold text-[10.5px] px-2 py-0.5 rounded-full transition-all"
                      >
                        <button
                          onClick={() => setSearchTerm(term)}
                          id={`recent-search-btn-term-${i}`}
                          className="hover:text-red-650 cursor-pointer text-left"
                          title={`Tìm lại "${term}"`}
                        >
                          {term}
                        </button>
                        <button
                          onClick={() => handleRemoveRecentSearch(term)}
                          id={`recent-search-btn-remove-${i}`}
                          className="p-0.5 text-neutral-400 hover:text-red-650 rounded-full hover:bg-neutral-200 cursor-pointer"
                          title="Xóa"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleClearAllRecentSearches}
                      id="btn-clear-recent-searches"
                      className="text-[9px] uppercase font-bold text-neutral-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-neutral-100 transition-colors ml-auto cursor-pointer"
                      title="Xóa lịch sử tìm kiếm"
                    >
                      Xóa hết
                    </button>
                  </div>
                </div>
              )}

              {/* Character color categorization tabs */}
              <div className="space-y-2 max-w-2xl mx-auto" id="color-filtering-section">
                <div className="flex items-center justify-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                    Khám phá Kho Cụm từ theo Thể loại:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <button
                    id="filter-color-all"
                    onClick={() => setSelectedColor("all")}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedColor === "all"
                        ? "bg-neutral-800 text-white border-neutral-800 shadow-2xs"
                        : "bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    Tất cả ({entries.length})
                  </button>
                  <button
                    id="filter-color-green"
                    onClick={() => setSelectedColor("green")}
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColor === "green"
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                        : "bg-white hover:bg-emerald-50/50 text-emerald-800 border-emerald-200/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Từ nối
                  </button>
                  <button
                    id="filter-color-blue"
                    onClick={() => setSelectedColor("blue")}
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColor === "blue"
                        ? "bg-blue-700 text-white border-blue-700 shadow-2xs"
                        : "bg-white hover:bg-blue-50/50 text-blue-800 border-blue-200/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Khung câu
                  </button>
                  <button
                    id="filter-color-red"
                    onClick={() => setSelectedColor("red")}
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColor === "red"
                        ? "bg-red-700 text-white border-red-700 shadow-2xs"
                        : "bg-white hover:bg-red-50/50 text-red-800 border-red-200/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Thành ngữ
                  </button>
                  <button
                    id="filter-color-pink"
                    onClick={() => setSelectedColor("pink")}
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColor === "pink"
                        ? "bg-pink-700 text-white border-pink-700 shadow-2xs"
                        : "bg-white hover:bg-pink-50/50 text-pink-800 border-pink-200/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                    Từ khóa
                  </button>
                </div>
              </div>

              {/* MAIN BODY LAYOUT ENGINE */}
              <div className="space-y-6 pt-4" id="curated-main-layout-renderer">
                {/* If no search input & color filter is set to "all", show limited-cards recommendation spotlight (Avoids over-texting). Otherwise show matched results */}
                {!searchTerm && selectedColor === "all" ? (
                  <div className="space-y-4 max-w-2xl mx-auto pt-4" id="curated-daily-spotlight">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <span className="text-xs md:text-[13px] font-bold text-neutral-600 uppercase tracking-wider block select-none">
                        ✨ Gợi ý hôm nay (Daily Study Chunks)
                      </span>
                      <button 
                        onClick={() => {
                          // Click to show filter categories implicitly
                          setSelectedColor("green");
                        }}
                        className="text-xs md:text-sm font-bold text-neutral-550 hover:text-red-505 flex items-center gap-0.5 transition-colors cursor-pointer"
                      >
                        Duyệt theo Thể loại <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5" id="spotlight-cards-grid">
                      {(() => {
                        // Check if there are teacher recommendations
                        const teacherRecommended = entries.filter(e => e.isRecommended);
                        const curatedList: DictionaryEntry[] = [];
                        
                        if (teacherRecommended.length > 0) {
                          // Display up to 6 recommended items
                          curatedList.push(...teacherRecommended.slice(0, 6));
                        } else {
                          // Custom selection fallback: exactly 1 of each color type
                          const TARGET_COLORS: ChunkColor[] = ["green", "blue", "red", "pink"];
                          
                          TARGET_COLORS.forEach(col => {
                            const hit = entries.find(e => e.color === col);
                            if (hit) curatedList.push(hit);
                          });

                          // fallback fill-in up to 4 words if we miss colors
                          while (curatedList.length < 4 && curatedList.length < entries.length) {
                            const fallbackItem = entries.find(e => !curatedList.includes(e));
                            if (fallbackItem) curatedList.push(fallbackItem);
                          }
                        }

                        return curatedList.map((item) => {
                          const colorMeta = categoryColorMeta[item.color];
                          const isSaved = savedEntryIds.includes(item.id);

                          return (
                            <div
                              key={item.id}
                              id={`spotlight-card-${item.id}`}
                              onClick={() => openDetail(item)}
                              className="group relative bg-white border border-neutral-200 hover:border-neutral-350 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 p-4 md:p-5 shadow-sm hover:shadow-md flex flex-col justify-between min-h-[148px] space-y-3"
                            >
                              <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 select-none z-10">
                                <button
                                  id={`spotlight-btn-fav-${item.id}`}
                                  onClick={(e) => toggleBookmark(item.id, e)}
                                  className="p-1 px-1.5 text-neutral-450 hover:text-red-505 rounded bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
                                  title="Tủ cụm từ"
                                >
                                  <Heart className={`w-4 h-4 ${isSaved ? "fill-red-500 text-red-550" : ""}`} />
                                </button>
                              </div>

                              <div className="space-y-1.5 pr-8 flex-1 min-w-0">
                                <div className="flex items-center gap-1 select-none text-[10px] md:text-xs font-bold tracking-wider uppercase leading-none mb-1 flex-wrap">
                                  <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dot}`} />
                                  <span className="text-neutral-500">{colorMeta.label.split(" (")[0]}</span>
                                  {item.isRecommended && (
                                    <span className="ml-1.5 px-1 py-0.5 bg-red-100/80 text-red-700 text-[8px] font-black rounded-xs uppercase tracking-widest leading-none flex items-center gap-0.5 select-none shrink-0" title="Đề xuất của giáo viên">
                                      ✨ GHIM
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-800 group-hover:text-red-650 transition-colors truncate">
                                    {item.vn}
                                  </h3>
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 leading-none">
                                    <AudioPlayerButton text={item.vn} lang="vi" size="sm" className="scale-90" />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`${colorMeta.text} font-bold text-xs md:text-sm font-sans`}>
                                    {item.en}
                                  </span>
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 leading-none">
                                    <AudioPlayerButton text={item.en} lang="en" size="sm" className="scale-90" audioUrl={item.teacher_audios?.[0]?.audio_url} />
                                  </div>
                                  {item.ipa && (
                                    <span className="text-[11px] md:text-xs text-neutral-500 font-mono">
                                      {item.ipa}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-neutral-50 pt-3 text-[11px] md:text-xs select-none text-neutral-400 mt-1">
                                <span className="group-hover:text-neutral-700 font-semibold flex items-center gap-0.5 transition-colors">
                                  Chi tiết <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Active Search / Filter list of matching elements */
                  <div className="space-y-4 max-w-2xl mx-auto" id="search-results-viewport">
                    <div className="flex items-center justify-between text-neutral-600 text-xs md:text-sm px-1 select-none">
                      <span className="font-semibold text-neutral-800">
                        Kết quả tìm thấy ({filteredEntries.length} cụm từ)
                      </span>
                      {(searchTerm || selectedColor !== "all") && (
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedColor("all");
                          }}
                          className="text-red-650 hover:underline hover:text-red-750 font-bold transition-all text-xs"
                        >
                          Đặt lại bộ lọc
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="dictionary-entries-grid-view">
                      {filteredEntries.length > 0 ? (
                        filteredEntries.map((item) => {
                          const colorMeta = categoryColorMeta[item.color];
                          const isSaved = savedEntryIds.includes(item.id);

                          return (
                            <div
                              key={item.id}
                              id={`entry-card-${item.id}`}
                              onClick={() => openDetail(item)}
                              className="group relative bg-white hover:bg-neutral-50/20 border border-neutral-150 hover:border-neutral-350 rounded-xl overflow-hidden transition-all duration-150 cursor-pointer p-4 flex flex-col justify-between min-h-[135px] border-l-[4px] shadow-2xs hover:shadow-xs space-y-2.5"
                              style={{ borderLeftColor: item.color === 'green' ? '#10b981' : item.color === 'blue' ? '#3b82f6' : item.color === 'red' ? '#ef4444' : '#ec4899' }}
                            >
                              <div className="absolute right-3 top-3 z-10">
                                <button
                                  id={`btn-favorite-${item.id}`}
                                  onClick={(e) => toggleBookmark(item.id, e)}
                                  className="p-1 px-1.5 text-neutral-450 hover:text-red-500 rounded bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-red-500 text-red-550" : ""}`} />
                                </button>
                              </div>

                              <div className="space-y-1.5 pr-6 flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-neutral-400 uppercase tracking-wider leading-none">
                                  <span className={`w-1.5 h-1.5 rounded-full ${colorMeta.dot}`} />
                                  {colorMeta.label.split(" (")[0]}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-800 group-hover:text-red-650 transition-colors truncate">
                                    {item.vn}
                                  </h3>
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 leading-none">
                                    <AudioPlayerButton text={item.vn} lang="vi" size="sm" className="scale-90" />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap text-red-605">
                                  <span className="font-sans font-bold text-xs md:text-sm truncate">{item.en}</span>
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 leading-none">
                                    <AudioPlayerButton text={item.en} lang="en" size="sm" className="scale-90" audioUrl={item.teacher_audios?.[0]?.audio_url} />
                                  </div>
                                  {item.ipa && (
                                    <span className="text-[11px] md:text-xs text-neutral-400 font-normal font-mono">
                                      {item.ipa}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-neutral-50 pt-2 text-[10px] md:text-xs text-neutral-500 mt-1 select-none">
                                <span className="font-semibold flex items-center gap-0.5 group-hover:text-neutral-700 transition-colors">
                                  Chi tiết cụm <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-1 sm:col-span-2 text-center py-10 bg-white border border-neutral-200 rounded-xl space-y-2">
                          <HelpCircle className="w-8 h-8 text-neutral-300 mx-auto animate-bounce" />
                          <p className="text-neutral-500 font-bold text-sm">Không tìm thấy cụm từ nào khớp.</p>
                          <p className="text-neutral-400 text-xs">Hãy thử từ khác hoặc đặt lại bộ lọc để tra cứu lại!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Newsletter & Luxury Slogan Banner component on the search page */}
                <aside 
                  className="mt-16 bg-[#FFFDFB] border border-[#e6bdb7] border-l-[8px] border-l-[#960005] p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative shadow-md hover:shadow-lg transition-all duration-300 max-w-2xl mx-auto" 
                  id="editorial-email-subscribe"
                >
                  {/* Decorative faint background quote mark */}
                  <div className="absolute top-2 right-4 text-[120px] font-serif text-[#960005]/5 select-none leading-none pointer-events-none font-extrabold">
                    “
                  </div>

                  <div className="relative z-10 md:w-2/3 space-y-4">
                    {/* Slogan & Definition header */}
                    <div className="space-y-1.5 select-text">
                      <div className="flex items-center gap-2">
                        <img
                          src={chunksLogoUrl}
                          alt="CHUNKS"
                          className="h-7 w-auto object-contain drop-shadow-sm"
                          loading="lazy"
                        />
                        <span className="font-display text-[10px] md:text-xs font-black uppercase tracking-widest text-[#960005]">
                          LINGUISTICS
                        </span>
                      </div>
                      
                      <h3 className="font-display text-xl md:text-2xl text-[#281715] font-black uppercase tracking-wide leading-tight">
                        NGÔN NGỮ <span className="font-serif italic text-xs md:text-sm text-neutral-400 font-normal lowercase tracking-normal">(Danh từ)</span>
                      </h3>
                      
                      <p className="font-serif text-sm md:text-base text-[#5d403b] leading-relaxed italic border-l-2 border-[#e6bdb7] pl-3.5 my-3 py-1 bg-[#fffaf9] rounded-r">
                        "Là nghệ thuật chọn lựa <strong className="font-black text-[#960005] not-italic border-b border-b-[#960005]/45 pb-0.5">NGÔN</strong> từ để hình thành nên <strong className="font-black text-[#960005] not-italic border-b border-b-[#960005]/45 pb-0.5">NGỮ</strong> cảnh cuộc đời bạn."
                      </p>
                    </div>

                    {/* Email subscribe widget embedded cleanly */}
                    <div className="pt-2 border-t border-dashed border-[#e6bdb7]/50">
                      <p className="text-[10px] md:text-xs text-neutral-500 font-sans font-bold uppercase tracking-wider mb-2">
                        Đăng ký Bản tin CHUNKS hằng tuần:
                      </p>
                      
                      {!newsletterSubscribed ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
                            setAppAlertMessage("Vui lòng nhập địa chỉ email hợp lệ!");
                            return;
                          }
                          setNewsletterSubscribed(true);
                        }} className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="email"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder="Email của bạn..."
                            required
                            className="bg-white border border-[#e6bdb7] rounded-lg px-4 py-2 font-sans text-xs flex-1 focus:ring-1 focus:ring-[#960005] focus:outline-none placeholder:text-neutral-300 text-neutral-800 animate-fade-in"
                          />
                          <button 
                            type="submit"
                            className="bg-[#960005] hover:bg-[#bf080b] text-white px-5 py-2 font-display text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all duration-150 cursor-pointer text-center whitespace-nowrap"
                          >
                            Đăng ký
                          </button>
                        </form>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-50/90 p-3 rounded-lg border border-emerald-200 flex items-center gap-2.5"
                        >
                          <span className="text-sm">🎉</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-emerald-800 font-extrabold text-[11px] font-sans">
                              Đăng ký thành công!
                            </p>
                            <p className="text-emerald-700/85 text-[10px] font-sans truncate">
                              Đã xác nhận gửi tới: <strong className="font-bold">{newsletterEmail}</strong>
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              setNewsletterSubscribed(false);
                              setNewsletterEmail("");
                            }}
                            className="text-[10px] text-neutral-400 hover:text-neutral-600 underline font-semibold cursor-pointer shrink-0"
                          >
                            Thay đổi
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  {/* Decorative Editorial Visual Book Picture (representing study & focus) */}
                  <div className="md:w-1/3 aspect-video md:aspect-square bg-[#ffe9e6] rounded-xl relative overflow-hidden shrink-0 border border-[#e6bdb7]/30 shadow-xs self-stretch md:self-auto min-h-[140px]">
                    <img 
                      alt="Linguistic Editorial Concept" 
                      className="w-full h-full object-cover grayscale contrast-125 opacity-80" 
                      src="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=600&q=80"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-[#960005]/10 mix-blend-multiply"></div>
                  </div>
                </aside>
              </div>

            </motion.div>
          )}

          {/* VIEW: Bookmarks list of favorited entries (P3 favored index) */}
          {activeTab === "saved" && (
            <motion.div
              key="saved-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 pb-4 border-b border-neutral-200">
                <Bookmark className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold font-display uppercase tracking-wide">
                  Sổ tay cụm từ tủ của bạn ({savedEntryIds.length})
                </h2>
              </div>

              {savedEntryIds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entries.filter(e => savedEntryIds.includes(e.id)).map((item) => {
                    const colorMeta = categoryColorMeta[item.color];
                    return (
                      <div
                        key={item.id}
                        id={`bookmark-card-${item.id}`}
                        onClick={() => openDetail(item)}
                        className={`group relative flex flex-col justify-between bg-white hover:bg-neutral-50/50 border border-neutral-200 hover:border-neutral-350 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border-l-[4px] ${colorMeta.border} min-h-[155px] p-4 shadow-sm hover:shadow-md space-y-3`}
                      >
                        <button
                          onClick={(e) => toggleBookmark(item.id, e)}
                          className="absolute right-3 top-3 p-1 px-1.5 text-red-550 hover:text-neutral-450 bg-red-50/80 rounded-md transition-colors cursor-pointer"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <div>
                          <span className="text-[11px] md:text-xs font-bold text-neutral-450 uppercase tracking-wider mb-1.5 block">
                            {colorMeta.label}
                          </span>
                          <h3 className="text-sm md:text-base font-bold tracking-tight text-neutral-800 group-hover:text-red-650 transition-colors truncate block">
                            {item.vn}
                          </h3>
                          <p className="text-red-650 font-sans font-bold text-[13px] md:text-sm mt-1 truncate">
                            {item.en}
                          </p>

                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-white border border-neutral-200 rounded-xl space-y-4">
                  <Bookmark className="w-14 h-14 text-neutral-200 mx-auto" />
                  <h3 className="text-lg font-bold text-neutral-700">Tủ cụm từ của bạn đang trống</h3>
                  <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                    Trong khi học, hãy nhấn vào biểu tượng Trái tim để lưu cụm từ tủ của riêng mình và hiển thị tại đây nhé!
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW: Syntactic analysis sentence separator tool (P4) */}
          {activeTab === "classroom" && (
            <motion.div
              key="classroom-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StudentClassroomBrowser 
                entries={entries}
                savedEntryIds={savedEntryIds}
                toggleBookmark={toggleBookmark}
                openDetail={openDetail}
              />
            </motion.div>
          )}



          {/* VIEW: Word detailed page - DOL microstructure format (P3 Detail) */}
          {activeTab.startsWith("detail-") && detailEntry && (() => {
            const highlightTerms = getHighlightTerms(detailEntry);
            const highlightColorClasses: Record<ChunkColor, string> = {
              green: "bg-emerald-50 text-emerald-800 border-b border-emerald-300 font-bold px-0.5 rounded-2xs",
              blue: "bg-blue-50 text-blue-800 border-b border-blue-300 font-bold px-0.5 rounded-2xs",
              red: "bg-rose-50 text-rose-800 border-b border-rose-300 font-bold px-0.5 rounded-2xs",
              pink: "bg-pink-50 text-pink-800 border-b border-pink-300 font-bold px-0.5 rounded-2xs",
            };
            const highlightClass = highlightColorClasses[detailEntry.color];

            // Dynamic customizable Chunker persona
            const currentChunkerName = localStorage.getItem("chunker_name") || "Chunker AI";
            const currentChunkerAvatar = localStorage.getItem("chunker_avatar") || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop";
            const currentChunkerRole = localStorage.getItem("chunker_role") || "Trợ Lý Phân Tích Ngữ Pháp";

            return (
              <motion.div
                key={`detail-${detailEntry.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 max-w-3xl mx-auto"
              >
                {/* Back to list controller */}
                <button
                  id="detail-back-button"
                  onClick={() => setActiveTab("search")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md text-xs font-semibold transition-colors cursor-pointer select-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Quay lại từ điển
                </button>

                {/* Main Card Wrapper */}
                <div className="bg-white border border-neutral-200/95 rounded-2xl p-6 md:p-8 shadow-xs space-y-7" id="detail-card-container">
                  
                  {/* Header ribbon & Bookmark button */}
                  <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3">
                    <span className={`px-2.5 py-1 font-bold text-[11px] md:text-xs uppercase tracking-wider rounded bg-neutral-50 text-neutral-700 border-l-[3px] ${categoryColorMeta[detailEntry.color].border}`}>
                      {categoryColorMeta[detailEntry.color].label}
                    </span>
                    
                    <button
                      onClick={() => toggleBookmark(detailEntry.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs md:text-sm font-bold transition-all cursor-pointer select-none ${
                        savedEntryIds.includes(detailEntry.id)
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${savedEntryIds.includes(detailEntry.id) ? "fill-red-500 text-red-500" : ""}`} />
                      {savedEntryIds.includes(detailEntry.id) ? "Đã lưu" : "Lưu tủ"}
                    </button>
                  </div>

                  {/* Vocabulary Identity Section */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap" id="detail-word-vn-title-outer">
                        <h2 className="text-xl md:text-2xl font-bold font-display uppercase tracking-wide text-neutral-800" id="detail-word-vn-title">
                          {renderHighlightedText(detailEntry.vn, highlightTerms, highlightClass)}
                        </h2>
                        <AudioPlayerButton text={detailEntry.vn} lang="vi" size="sm" variant="circle" />
                      </div>
                      <p className="text-neutral-500 font-sans text-xs md:text-sm uppercase font-bold tracking-wider shrink-0">
                        <span className="font-mono lowercase text-neutral-600 select-all">{detailEntry.ipa}</span>
                      </p>
                    </div>

                    <div className={`inline-flex items-center gap-2.5 border p-2 px-3.5 rounded-lg ${categoryColorMeta[detailEntry.color].bg} ${categoryColorMeta[detailEntry.color].border}`}>
                      <p className="text-base md:text-lg font-bold font-sans tracking-wide select-all">
                        {detailEntry.en}
                      </p>
                      <AudioPlayerButton text={detailEntry.en} size="md" variant="circle" audioUrl={detailEntry.teacher_audios?.[0]?.audio_url} />
                    </div>
                  </div>

                  {/* Audio Chú Thích custom board (Giảng viên giải thích) */}
                  <div className="bg-emerald-50/70 rounded-xl p-4.5 border border-emerald-150/50 space-y-3" id="detail-audio-chuthich">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 ml-[1px]">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-250 shrink-0 select-none bg-neutral-150">
                          <img
                            src={currentChunkerAvatar}
                            alt={currentChunkerName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-emerald-600 block leading-tight">
                            {currentChunkerRole}
                          </span>
                          <h4 className="font-bold text-neutral-800 text-sm font-sans mt-0.5">
                            {currentChunkerName}
                          </h4>
                        </div>
                      </div>
                      
                      {/* Compact Audio Scrubber Card */}
                      <div className="bg-white rounded-lg py-1 px-3 border border-emerald-100/80 flex items-center gap-2.5 flex-1 sm:flex-initial">
                        <button
                          onClick={() => toggleTeacherAudioPlayback(detailEntry)}
                          className="w-6.5 h-6.5 rounded-full bg-emerald-600 hover:bg-emerald-550 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                          title="Phát ghi âm"
                        >
                          {isPlayingTeacherAudio ? (
                            <div className="w-1.5 h-1.5 bg-white rounded-xs animate-ping" />
                          ) : (
                            <Volume2 className="w-3 h-3 fill-current" />
                          )}
                        </button>

                        {/* Timeline Scrubber */}
                        <div className="flex-1 h-1 bg-neutral-150 rounded-full overflow-hidden relative min-w-[100px] max-w-[150px]">
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-300" 
                            style={{ width: `${teacherAudioProgress}%` }}
                          />
                        </div>
                        
                        <span className="text-xs font-mono text-neutral-500 select-none shrink-0">
                          {isPlayingTeacherAudio 
                            ? `0:${Math.floor((teacherAudioProgress / 100) * (detailEntry.teacher_audios?.[0]?.duration_sec || 45)).toString().padStart(2, "0")}`
                            : `0:${(detailEntry.teacher_audios?.[0]?.duration_sec || 45).toString().padStart(2, "0")}`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Acoustic Soundwave Visualizer */}
                    <div className="flex items-center justify-center gap-[3px] h-8 bg-emerald-100/10 rounded-lg border border-emerald-150/10 py-1.5 px-4 mt-2 select-none overflow-hidden">
                      {Array.from({ length: 32 }).map((_, i) => {
                        const baseHeights = [14, 26, 18, 10, 16, 30, 20, 12, 14, 28, 22, 14, 18, 30, 24, 16, 12, 24, 18, 10, 15, 28, 20, 12, 16, 26, 15, 10, 18, 24, 14, 8];
                        const ht = baseHeights[i % baseHeights.length];
                        const delaySec = ((i * 0.05) % 0.9).toFixed(2);
                        return (
                          <div
                            key={i}
                            className={`w-[3.5px] rounded-full bg-emerald-500 transition-all duration-300 ${
                              isPlayingTeacherAudio ? "animate-chunk-wave" : "h-[4px] bg-emerald-600/30"
                            }`}
                            style={{
                              height: isPlayingTeacherAudio ? `${ht}px` : "4px",
                              animationDelay: isPlayingTeacherAudio ? `${delaySec}s` : undefined,
                              animationDuration: "0.9s"
                            } as React.CSSProperties}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Redesigned content sections: vertical block list to maximize space and avoid wrapping */}
                  <div className="space-y-6 pt-1" id="detail-subsections-container">
                    
                    {/* Bilingual Examples segment (Full Width) */}
                    <div className="space-y-4" id="detail-examples-section">
                      {(() => {
                        const allCount = detailEntry.examples?.length || 0;
                        const normalCount = detailEntry.examples?.filter(e => e.type === "normal").length || 0;
                        const codemixCount = detailEntry.examples?.filter(e => e.type === "codemix").length || 0;
                        const filteredExamples = detailEntry.examples?.filter(ex => {
                          if (exampleFilter === "normal") return ex.type === "normal";
                          if (exampleFilter === "codemix") return ex.type === "codemix";
                          return true;
                        }) || [];

                        return (
                          <>
                            <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                              <div>
                                <h3 className="text-xs md:text-sm font-bold font-sans uppercase tracking-wider text-neutral-800 flex items-center gap-1.5 select-none">
                                  💡 Ví dụ song ngữ
                                  <span className="text-xs md:text-[13px] bg-red-100 text-red-750 px-2.5 py-0.5 rounded-full font-bold">
                                    {allCount} câu
                                  </span>
                                </h3>
                              </div>

                              {/* Filter selection pills */}
                              <div className="flex items-center gap-1.5 p-0.5 bg-neutral-150/70 rounded-md select-none" id="example-filter-tabs-bar">
                                <button
                                  onClick={() => setExampleFilter('all')}
                                  className={`px-2 py-0.5 rounded text-xs md:text-[13px] font-bold transition-all cursor-pointer ${
                                    exampleFilter === 'all'
                                      ? "bg-white text-neutral-800 shadow-2xs"
                                      : "text-neutral-550 hover:text-neutral-850"
                                  }`}
                                >
                                  Tất cả ({allCount})
                                </button>
                                {normalCount > 0 && (
                                  <button
                                    onClick={() => setExampleFilter('normal')}
                                    className={`px-2 py-0.5 rounded text-xs md:text-[13px] font-bold transition-all cursor-pointer ${
                                      exampleFilter === 'normal'
                                        ? "bg-white text-neutral-800 shadow-2xs"
                                        : "text-neutral-550 hover:text-neutral-850"
                                    }`}
                                  >
                                    EN ({normalCount})
                                  </button>
                                )}
                                {codemixCount > 0 && (
                                  <button
                                    onClick={() => setExampleFilter('codemix')}
                                    className={`px-2 py-0.5 rounded text-xs md:text-[13px] font-bold transition-all cursor-pointer ${
                                      exampleFilter === 'codemix'
                                        ? "bg-white text-pink-705 shadow-2xs"
                                        : "text-neutral-550 hover:text-neutral-850"
                                    }`}
                                  >
                                    Mix ({codemixCount})
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              {filteredExamples.length === 0 ? (
                                <div className="p-4 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                                  <p className="text-xs md:text-sm text-neutral-450 italic">Không có ví dụ phù hợp bộ lọc.</p>
                                </div>
                              ) : (
                                <div className="bg-neutral-50/50 border border-neutral-200/90 rounded-xl overflow-hidden divide-y divide-neutral-200/80" id="detail-examples-unified-container">
                                  {filteredExamples.map((ex, i) => {
                                    const isCodemix = ex.type === "codemix";
                                    return (
                                      <div
                                        key={ex.id || i}
                                        className="group/ex p-4 hover:bg-neutral-50/60 transition-all duration-150 flex items-start gap-4 relative"
                                        id={isCodemix ? `example-codemix-row-${i}` : `example-normal-row-${i}`}
                                      >
                                        {/* Subtle sequence indicators WITHOUT redundant title label to avoid word dropping */}
                                        <div className="flex flex-col items-center select-none shrink-0 pt-0.5">
                                          <span className={`w-6 h-6 rounded-full ${categoryColorMeta[detailEntry.color].bg} text-neutral-700 group-hover/ex:bg-neutral-200 flex items-center justify-center text-xs md:text-sm font-bold font-mono transition-colors border border-neutral-200/60`}>
                                            {i + 1}
                                          </span>
                                        </div>

                                        <div className="space-y-2 flex-1 min-w-0 break-words">
                                          <div className="flex items-center gap-1.5 select-none text-[11px] font-bold tracking-wider uppercase">
                                            {isCodemix ? (
                                              <span className="text-pink-655 bg-pink-50/60 px-1.5 py-0.5 rounded border border-pink-100 flex items-center gap-0.5">
                                                <Sparkles className="w-2.5 h-2.5" /> Song ngữ Mix
                                              </span>
                                            ) : (
                                              <span className="text-neutral-550 bg-neutral-100/80 px-1.5 py-0.5 rounded border border-neutral-100">
                                                Chuẩn Anh-Anh
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-neutral-855 font-bold text-sm md:text-base leading-relaxed break-words pr-2">
                                            {renderHighlightedText(ex.text_en, highlightTerms, highlightClass)}
                                          </p>

                                          <p className="text-neutral-500 text-xs md:text-sm leading-relaxed font-sans italic border-l border-neutral-150 pl-2 break-words pr-2">
                                            {renderHighlightedText(ex.text_vn, highlightTerms, highlightClass)}
                                          </p>
                                        </div>

                                        <div className="shrink-0 self-center flex items-center gap-1.5 bg-neutral-100/50 p-1.5 rounded-xl border border-neutral-200/40">
                                          <AudioPlayerButton text={ex.text_en} variant="circle" size="sm" audioUrl={ex.audio_url} />
                                          <AudioPlayerButton text={ex.text_vn} variant="circle" size="sm" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* REDESIGNED: Related terms & tags moved to the absolute bottom in a full-width layout with cards, preventing wrapping */}
                    {((detailEntry.related_terms && detailEntry.related_terms.length > 0) || (detailEntry.tags && detailEntry.tags.length > 0)) && (
                      <div className="pt-3 border-t border-neutral-100 space-y-6" id="detail-sidebar-related">
                        
                        {/* Related chunks terms */}
                        {detailEntry.related_terms && detailEntry.related_terms.length > 0 && (
                          <div className="space-y-3" id="detail-related-terms">
                            <p className="text-xs md:text-[13px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                              Chủ đề Chunks liên quan mở rộng
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {detailEntry.related_terms.map((term, i) => {
                                const matchedEntry = entries.find(e => 
                                  e.en.toLowerCase().trim() === term.term_en.toLowerCase().trim() ||
                                  e.vn.toLowerCase().trim() === term.term_vn.toLowerCase().trim()
                                );
                                const hasPath = !!matchedEntry;
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      if (hasPath) {
                                        openDetail(matchedEntry);
                                      } else {
                                        setSearchTerm(term.term_vn);
                                        setSelectedColor("all");
                                        setActiveTab("search");
                                      }
                                    }}
                                    className="bg-neutral-50/50 hover:bg-red-50/25 border border-neutral-200/50 hover:border-red-200/70 p-4 rounded-xl flex flex-col justify-center items-start text-left gap-1 transition-all shadow-3xs cursor-pointer group"
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className="font-bold text-neutral-800 text-sm md:text-base group-hover:text-red-600 transition-colors">
                                        {term.term_vn}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0 font-bold" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Inline visual tags list */}
                        {detailEntry.tags && detailEntry.tags.length > 0 && (
                          <div className="space-y-2.5">
                            <p className="text-xs md:text-[13px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                              <Tag className="w-3.5 h-3.5" /> Chủ đề tags liên quan:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {detailEntry.tags?.map((tg, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSearchTerm(tg);
                                    setSelectedColor("all");
                                    setActiveTab("search");
                                  }}
                                  className="px-3.5 py-1.5 bg-neutral-55 hover:bg-neutral-100 text-neutral-555 hover:text-neutral-850 text-xs font-bold rounded-lg transition-all border border-neutral-200/40 cursor-pointer"
                                >
                                  #{tg}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>

                </div>
              </motion.div>
            );
          })()}

          {/* VIEW: Teacher Login form page (P5) */}
          {activeTab === "teacher" && !isTeacherLoggedIn && (
            <motion.div
              key="auth-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto py-12"
            >
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <User className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold font-display uppercase tracking-wide">
                    Đăng nhập Giáo Viên (Teacher Portal)
                  </h2>
                  <p className="text-neutral-400 font-sans text-xs">
                    Ủy quyền chỉnh sửa định nghĩa, ví dụ, ghi âm và AI đề xuất.
                  </p>
                </div>

                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Email</label>
                    <input
                      type="email"
                      required
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="teacher@chunks.edu.vn"
                      className="w-full p-3 bg-neutral-50 hover:bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-neutral-500 tracking-wider">Mật khẩu</label>
                    <input
                      type="password"
                      required
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 bg-neutral-50 hover:bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold label-caps tracking-widest rounded-lg transition-all active:scale-98 cursor-pointer text-sm"
                  >
                    Đăng nhập Portal
                  </button>
                </form>

                <div className="pt-2 text-center text-[11px] text-neutral-400 font-mono">
                  Sử dụng tài khoản bất kỳ hoặc password <span className="bg-neutral-100 text-neutral-600 px-1 rounded font-bold">admin123</span> để truy cập.
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: Teacher Dashboard workspace (P6) */}
          {activeTab === "teacher-dashboard" && isTeacherLoggedIn && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                <div>
                  <h2 className="text-2xl font-bold font-display uppercase tracking-wide text-neutral-800">
                    Bảng Quản Lý Biên Soạn Từ Điển
                  </h2>
                </div>

                <button
                  id="dashboard-btn-create"
                  onClick={() => startEditingWord()}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold label-caps tracking-widest rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Thêm Cụm Từ Mới
                </button>
              </div>

              {dbStatusMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg animate-fade-in flex items-center gap-2">
                  <Check className="w-5 h-5 shrink-0" />
                  <span>{dbStatusMsg}</span>
                </div>
              )}

              {/* Split layout: Sidebar Left + Workspace Right */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start" id="teacher-designer-split-grid">
                
                {/* Left Navigation Panel */}
                <div className={`${isSidebarCollapsed ? 'hidden' : 'lg:col-span-1 space-y-4'}`} id="teacher-sidebar-container">
                  <div className="bg-white border border-[#e3dacd] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#e3dacd]/50 pb-2.5 mb-3">
                      <div className="text-[10px] font-extrabold text-[#5b5350] font-display uppercase tracking-[0.16em] pl-2.5 select-none animate-fade-in">
                        MENU BIÊN SOẠN
                      </div>
                      <button
                        type="button"
                        onClick={toggleSidebar}
                        className="p-1 text-[#5b5350] hover:text-[#c10b0d] hover:bg-[#fff8f6] rounded-lg transition-all cursor-pointer border border-transparent hover:border-[#e3dacd]/50"
                        title="Thu nhỏ Menu"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      id="tab-btn-classroom"
                      onClick={() => setTeacherSubTab('classroom' as any)}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'classroom' as any
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'classroom' as any ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Quản lý lớp học</span>
                      </div>
                      {teacherSubTab === 'classroom' as any && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>
                    
                    <button
                      type="button"
                      id="tab-btn-vocabulary"
                      onClick={() => setTeacherSubTab('vocabulary')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'vocabulary'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Library className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'vocabulary' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Từ vựng ({entries.length})</span>
                      </div>
                      {teacherSubTab === 'vocabulary' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-recommendations"
                      onClick={() => setTeacherSubTab('recommendations')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'recommendations'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'recommendations' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Đề xuất trang chủ</span>
                      </div>
                      {teacherSubTab === 'recommendations' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-audio-manager"
                      onClick={() => setTeacherSubTab('audios')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'audios'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Mic className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'audios' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Quản lý ghi âm</span>
                      </div>
                      {teacherSubTab === 'audios' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-bulk-import"
                      onClick={() => setTeacherSubTab('bulk-import')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'bulk-import'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FolderInput className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'bulk-import' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Nhập hàng loạt</span>
                      </div>
                      {teacherSubTab === 'bulk-import' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-ai-generator"
                      onClick={() => setTeacherSubTab('ai-generator' as any)}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'ai-generator' as any
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bot className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'ai-generator' as any ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">AI Generator</span>
                      </div>
                      {teacherSubTab === 'ai-generator' as any && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-segment"
                      onClick={() => setTeacherSubTab('segment')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === 'segment'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Scissors className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === 'segment' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">Phân tích câu</span>
                      </div>
                      {teacherSubTab === 'segment' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>

                    <button
                      type="button"
                      id="tab-btn-9router-settings"
                      onClick={() => setTeacherSubTab('9router-settings')}
                      className={`w-full flex items-center justify-between group px-3.5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-left border-l-[3px] ${
                        teacherSubTab === '9router-settings'
                          ? 'border-[#c10b0d] bg-[#fff8f6] text-[#c10b0d] font-extrabold shadow-3xs'
                          : 'border-transparent text-[#5b5350] hover:bg-[#fffcfb]/80 hover:text-[#201a19] hover:border-[#e3dacd]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${teacherSubTab === '9router-settings' ? 'text-[#c10b0d]' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                        <span className="font-sans leading-none">AI & 9Router</span>
                      </div>
                      {teacherSubTab === '9router-settings' && <div className="w-1.5 h-1.5 rounded-full bg-[#c10b0d]" />}
                    </button>
                  </div>

                  {/* Context note */}
                  <div className="bg-[#fffdf9] border border-[#e3dacd] rounded-2xl p-4 text-[11px] text-[#5b5350] font-sans leading-relaxed space-y-1.5 select-none shadow-3xs animate-fade-in">
                    <p className="font-bold text-[#c10b0d] flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#c10b0d]" />
                      <span className="font-display tracking-wider uppercase text-[10px]">Gợi ý biên soạn</span>
                    </p>
                    <p className="text-neutral-600 leading-normal">
                      Mục <strong className="text-[#c10b0d]">Đề xuất trang chủ</strong> cho phép bạn chỉ định từ vựng muốn hiển thị nổi bật cho học sinh, thay cho cơ chế ngẫu nhiên.
                    </p>
                  </div>
                </div>

                {/* Right Workspace Content (3/4 width) */}
                <div className={`${isSidebarCollapsed ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-6 transition-all duration-300`} id="teacher-workspace-sidebar-body">
                  {isSidebarCollapsed && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#e3dacd] rounded-2xl p-4 shadow-3xs animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={toggleSidebar}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fff8f6] hover:bg-[#fff0ed] text-[#c10b0d] border border-[#e3dacd]/50 hover:border-red-350 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-3xs"
                          title="Mở rộng Menu"
                        >
                          <ChevronRight className="w-4 h-4" /> Hiện Menu biên soạn
                        </button>
                        <span className="text-xs text-neutral-500 font-sans font-medium">
                          Giao diện đang mở rộng tối đa để tăng diện tích biên soạn.
                        </span>
                      </div>
                    </div>
                  )}

              {teacherSubTab === 'classroom' as any && (
                <TeacherDashboardClassroom entries={entries} />
              )}

              {teacherSubTab === 'vocabulary' && (
                <TeacherDashboardVocabulary
                  entries={entries}
                  onUpdateEntries={fetchEntries}
                  openDetail={openDetail}
                  startEditingWord={startEditingWord}
                />
              )}

              {teacherSubTab === 'audios' && (
                <TeacherDashboardAudioManager
                  entries={entries}
                  onUpdateEntries={fetchEntries}
                />
              )}

              {teacherSubTab === 'bulk-import' && (
                <TeacherDashboardBulkImport
                  entries={entries}
                  onImportComplete={fetchEntries}
                />
              )}

              {teacherSubTab === 'ai-generator' as any && (
                <TeacherDashboardAIGenerator
                  entries={entries}
                  onUpdateEntries={fetchEntries}
                />
              )}

              {teacherSubTab === '9router-settings' && (
                <TeacherDashboard9RouterSettings />
              )}

              {teacherSubTab === 'segment' && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-2xs space-y-4">
                  <div className="pb-4 border-b border-neutral-150">
                    <h3 className="text-lg font-black uppercase text-neutral-800 tracking-wide font-display">
                      🛠️ Phân Phối Trích Xuất & Phân Tích Câu (Lexical Segmenter)
                    </h3>
                    <p className="text-xs text-neutral-500 font-sans mt-0.5">
                      Dán câu hoặc đoạn hội thoại bất kỳ để bóc tách thành các lexical chunks và so sánh đối chiếu với kho từ điển hiện tại.
                    </p>
                  </div>
                  <SentenceSegmenter 
                    onNavigateToDetail={(id) => {
                      const found = entries.find(e => e.id === id);
                      if (found) openDetail(found);
                    }} 
                    entries={entries}
                  />
                </div>
              )}

              {teacherSubTab === 'recommendations' && (
                <TeacherDashboardRecommendations
                  entries={entries}
                  onUpdateEntries={fetchEntries}
                />
              )}
                </div> {/* lg:col-span-3 (teacher-workspace-sidebar-body) */}
              </div> {/* grid (teacher-designer-split-grid) */}
            </motion.div>
          )}

          {/* VIEW: Independent AI / 9Router Settings Page (For Route: /setting, /settings) */}
          {activeTab === "settings" && (
            <motion.div
              key="settings-route-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="space-y-6"
            >
              <div className="pb-4 border-b border-neutral-200">
                <h2 className="text-2xl font-bold font-display uppercase tracking-wide text-neutral-850">
                  CẤU HÌNH HỆ THỐNG AI & 9ROUTER
                </h2>
                <p className="text-sm text-neutral-500 font-sans mt-0.5">
                  Điều chỉnh máy chủ 9Router, Token Key API, giọng nói biểu cảm (TTS) và các mô hình tự động phân tích âm thanh (STT) ngoại tuyến.
                </p>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-xs">
                <TeacherDashboard9RouterSettings />
              </div>
            </motion.div>
          )}

          {/* VIEW: Redesigned Workspace split, incorporating real-time high-fidelity Student Card Live Preview */}
          {activeTab === "teacher-editor" && editingEntry && (() => {
            const previewChunkerName = localStorage.getItem("chunker_name") || "Chunker";
            const previewChunkerAvatar = localStorage.getItem("chunker_avatar") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop";

            return (
              <motion.div
                key="editor-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="space-y-8"
              >
                {/* Clean Top Status & Master Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-5 gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-250 text-[10px] font-bold uppercase tracking-wider">
                      🛠️ WORKSPACE BIÊN SOẠN CHUYÊN SÂU
                    </div>
                    <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-wide text-neutral-850">
                      {editingEntry.id ? "Hiệu Chỉnh Mục Từ Điển" : "Thêm Mục Từ Chỉ Định Mới"}
                    </h2>
                    <p className="text-xs md:text-sm text-neutral-500 font-sans">
                      Điều chỉnh chuyên môn hoá từ vựng, tự động đồng bộ hoá với giao diện hiển thị của toàn bộ học viên.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveTab("teacher-dashboard")}
                      className="px-4 py-2 border border-neutral-250 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      id="editor-btn-save"
                      onClick={saveWordEditor}
                      className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl cursor-pointer shadow-md shadow-neutral-200 transition-all hover:scale-[1.01]"
                    >
                      Lưu & Phát Bản 🚀
                    </button>
                  </div>
                </div>

                {/* 12-Column Grid Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* LEFT WORKSPACE PANEL: Sophisticated form builders (Col-span 7) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Section 1: Core Vocabulary Information */}
                    <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                        <span className="text-lg">🏷️</span>
                        <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">Cấu hình từ vựng gốc</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Vietnamese Headword (Từ khoá Việt)</label>
                          <input
                            type="text"
                            required
                            value={editingEntry.vn || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, vn: e.target.value })}
                            placeholder="Ví dụ: Dép lào"
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-neutral-450 focus:bg-white transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">English phrase (Cụm tiếng Anh)</label>
                          <input
                            type="text"
                            required
                            value={editingEntry.en || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, en: e.target.value })}
                            placeholder="Ví dụ: flip-flops"
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-neutral-450 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Cấu trúc phân màu (Category)</label>
                          <select
                            value={editingEntry.color || "pink"}
                            onChange={(e) => {
                              const color = e.target.value as ChunkColor;
                              setEditingEntry({ ...editingEntry, color, pos: inferPosFromCategory(color) });
                            }}
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-bold focus:bg-white transition-colors cursor-pointer"
                          >
                            <option value="pink">🌸 Pink - Key Terms (Từ vựng)</option>
                            <option value="red">🔥 Red - Idioms (Thành ngữ)</option>
                            <option value="blue">⚡ Blue - Sentence Frames (Khung câu)</option>
                            <option value="green">✨ Green - Gap Fillers (Từ nối câu)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Từ loại (POS)</label>
                          <input
                            type="text"
                            value={editingEntry.pos || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, pos: e.target.value })}
                            placeholder="Tự map theo Category, vẫn có thể sửa tay"
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Phiên âm IPA (Phonetic)</label>
                          <input
                            type="text"
                            value={editingEntry.ipa || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, ipa: e.target.value })}
                            placeholder="e.g. /flip-flops/"
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Mức độ từ (Level)</label>
                          <select
                            value={editingEntry.level || "easy"}
                            onChange={(e) => setEditingEntry({ ...editingEntry, level: e.target.value as any })}
                            className="w-full px-3.5 py-2 sm:py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-bold focus:bg-white transition-colors cursor-pointer"
                          >
                            <option value="easy">🟢 Dễ (Easy)</option>
                            <option value="medium">🟡 Vừa (Medium)</option>
                            <option value="hard">🔴 Khó (Hard)</option>
                          </select>
                        </div>
                      </div>
                    </div>



                    {/* Section 3: Media, tags & Audio Lesson Studio */}
                    <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                        <span className="text-lg">🎨</span>
                        <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">Tư liệu & Giọng đọc giảng bài</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Ảnh minh họa (Illustration Image URL)</label>
                          <input
                            type="text"
                            value={editingEntry.image_url || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, image_url: e.target.value })}
                            placeholder="Uống từ Unsplash link..."
                            className="w-full px-3.5 py-2 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none text-neutral-600 transition-colors"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Thẻ tìm kiếm (Ngăn cách bằng dấu phẩy)</label>
                          <input
                            type="text"
                            value={editingEntry.tags?.join(", ") || ""}
                            onChange={(e) => setEditingEntry({ ...editingEntry, tags: e.target.value.split(",").map(t => t.trim()) })}
                            placeholder="dep lào, summer, casual"
                            className="w-full px-3.5 py-2 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs focus:outline-none text-neutral-700 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Lời khuyên / Lưu ý huấn luyện học phát âm (Teacher Voice Note)</label>
                        <textarea
                          value={editingEntry.note_text || ""}
                          onChange={(e) => setEditingEntry({ ...editingEntry, note_text: e.target.value })}
                          placeholder="Chia sẻ cách nhớ, mẹo dùng từ hoặc bối cảnh biểu cảm..."
                          className="w-full p-3 bg-neutral-50/50 border border-neutral-200 rounded-lg text-xs focus:outline-none resize-y min-h-[60px]"
                        />
                      </div>

                      {/* Rec Booth interface */}
                      <div className="bg-red-50/50 border border-red-150 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-red-200/50 pb-2">
                          <div>
                            <h5 className="font-bold text-xs text-neutral-850 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              🎙️ Bảng ghi âm lời giảng chi tiết
                            </h5>
                            <p className="text-[10px] text-neutral-450 font-medium">
                              Ghi âm phân tích cụm từ giúp học viên bấm nghe mọi lúc mọi nơi.
                            </p>
                          </div>
                          {isRecording && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-650 text-white font-black text-[9px] uppercase tracking-widest rounded-md animate-pulse">
                              <span className="w-1.5 h-1.5 bg-white rounded-full" /> GHI ÂM LIVE
                            </span>
                          )}
                        </div>

                        {editingEntry.teacher_audios && editingEntry.teacher_audios.length > 0 ? (
                          <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-3 shadow-2xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 select-none border border-emerald-100">
                                  🎤
                                </div>
                                <div className="space-y-[1px]">
                                  <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block leading-none">
                                    Bản ghi âm gốc đã liên kết
                                  </span>
                                  <p className="text-xs font-extrabold text-neutral-800">
                                    Chunker: {editingEntry.teacher_audios[0].teacher_name || "Chunker"}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 font-medium">
                                    Thời lượng: ~{editingEntry.teacher_audios[0].duration_sec} giây • Ngày ghi: {new Date(editingEntry.teacher_audios[0].created_at || Date.now()).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={deleteExistingRecordedAudio}
                                className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-655 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0"
                              >
                                Thử Ghi lại
                              </button>
                            </div>

                            <div className="flex items-center gap-3 pt-1 border-t border-neutral-100/60">
                              <button
                                type="button"
                                onClick={() => {
                                  const hasAud = editingEntry.teacher_audios?.[0]?.audio_url;
                                  if (!hasAud) return;
                                  if (isPlaybackPreviewing) {
                                    if (previewAudioInstance) {
                                      previewAudioInstance.pause();
                                      setPreviewAudioInstance(null);
                                    }
                                    window.speechSynthesis.cancel();
                                    setIsPlaybackPreviewing(false);
                                    setPreviewProgress(0);
                                  } else {
                                    const isRealAudio = hasAud.startsWith("data:") || hasAud.startsWith("blob:") || hasAud.startsWith("http");
                                    if (isRealAudio) {
                                      const audio = new Audio(hasAud);
                                      setPreviewAudioInstance(audio);
                                      setIsPlaybackPreviewing(true);
                                      setPreviewProgress(0);
                                      audio.ontimeupdate = () => {
                                        if (audio.duration && !isNaN(audio.duration)) {
                                          setPreviewProgress((audio.currentTime / audio.duration) * 100);
                                        }
                                      };
                                      audio.onended = () => {
                                        setIsPlaybackPreviewing(false);
                                        setPreviewProgress(0);
                                        setPreviewAudioInstance(null);
                                      };
                                      audio.onerror = () => {
                                        setIsPlaybackPreviewing(false);
                                        setPreviewProgress(0);
                                        setPreviewAudioInstance(null);
                                      };
                                      audio.play().catch(() => setIsPlaybackPreviewing(false));
                                    } else {
                                      setIsPlaybackPreviewing(true);
                                      setPreviewProgress(0);
                                      window.speechSynthesis.cancel();
                                      const textToSpeak = editingEntry.note_text || "Lưu ý luyện tập phát âm cụm từ này trong giao tiếp hàng ngày nhé.";
                                      const utterance = new SpeechSynthesisUtterance(textToSpeak);
                                      utterance.lang = "vi-VN";
                                      const approxDurationMs = Math.max(3000, textToSpeak.length * 80);
                                      const startTm = Date.now();
                                      const progressInterval = setInterval(() => {
                                        const elapsed = Date.now() - startTm;
                                        const pct = Math.min(100, (elapsed / approxDurationMs) * 100);
                                        setPreviewProgress(pct);
                                        if (pct >= 100 || !window.speechSynthesis.speaking) {
                                          clearInterval(progressInterval);
                                        }
                                      }, 100);
                                      utterance.onend = () => {
                                        clearInterval(progressInterval);
                                        setIsPlaybackPreviewing(false);
                                        setPreviewProgress(0);
                                      };
                                      window.speechSynthesis.speak(utterance);
                                    }
                                  }
                                }}
                                className="p-1.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                {isPlaybackPreviewing ? "⏸️ Dừng Thử" : "▶️ Nghe Thử"}
                              </button>
                              <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden relative">
                                <div 
                                  className="absolute top-0 bottom-0 left-0 bg-neutral-800 transition-all duration-100"
                                  style={{ width: `${isPlaybackPreviewing ? previewProgress : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {isRecording ? (
                              <div className="bg-neutral-950 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 relative overflow-hidden" id="recording-booth-board">
                                <span className="text-[9px] text-neutral-400 font-mono tracking-widest uppercase animate-pulse">
                                  MICROPHONE ĐANG HOẠT ĐỘNG
                                </span>
                                <div className="text-2xl font-black text-white font-mono">
                                  00:{recordingSeconds.toString().padStart(2, "0")} <span className="text-xs text-neutral-500 font-sans">/ 45s</span>
                                </div>
                                <div className="flex items-center gap-1 h-6 py-1 select-none">
                                  {[...Array(12)].map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-1 bg-red-600 rounded-full animate-bounce"
                                      style={{
                                        height: `${Math.floor(Math.random() * 16 + 4)}px`,
                                        animationDelay: `${i * 0.05}s`,
                                        animationDuration: `${0.3 + Math.random() * 0.4}s`
                                      }}
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="px-3.5 py-1.5 bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  🔴 Dừng Ghi Âm
                                </button>
                              </div>
                            ) : previewAudioUrl ? (
                              <div className="bg-amber-55/60 border border-amber-205 rounded-xl p-3.5 space-y-2">
                                <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                                  🎉 Đoạn ghi âm học tập vừa hoàn tất!
                                </h5>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={togglePreviewPlayback}
                                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    {isPlaybackPreviewing ? "⏸️ Tạm Dừng" : "▶️ Nghe Thử"}
                                  </button>
                                  <div className="flex-1 text-[10px] text-neutral-600 font-sans leading-none">
                                    <span>Thời lượng vừa thu: {recordingSeconds} giây</span>
                                    <div className="w-full bg-neutral-200 h-1 rounded-full overflow-hidden mt-1 relative">
                                      <div 
                                        className="absolute left-0 top-0 bottom-0 bg-neutral-800 transition-all duration-100"
                                        style={{ width: `${previewProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-amber-200/50">
                                  <button
                                    type="button"
                                    onClick={applyRecordedAudio}
                                    className="flex-1 py-1.5 bg-neutral-850 hover:bg-neutral-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    ✓ Liên kết ghi âm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAudioBlob(null);
                                      setPreviewAudioUrl(null);
                                      setRecordingSeconds(0);
                                    }}
                                    className="px-3 py-1.5 border border-neutral-350 hover:bg-neutral-50 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer"
                                  >
                                    Hủy bỏ
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-red-200 bg-red-50/10 rounded-xl space-y-2">
                                <div 
                                  className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-650 flex items-center justify-center shadow-2xs cursor-pointer hover:scale-105 transition-all"
                                  onClick={startRecording}
                                  title="Ghi âm ngay"
                                >
                                  <Mic className="w-5 h-5" />
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-bold text-neutral-750 font-sans">Bấm bật Microphone để bắt đầu ghi âm giảng bài</p>
                                  <p className="text-[10px] text-neutral-400 mt-0.5">Thời hạn giới hạn tối đa 45 giây. Giọng thu rõ, không vang rền.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 4: Dynamic Examples Manager */}
                    <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div>
                          <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">Kho câu song ngữ học tập</h4>
                          <p className="text-[10px] text-neutral-450 font-medium">Bổ sung ví dụ chất lượng đời thường giúp thấu rõ ngữ nghĩa Chunks.</p>
                        </div>

                        {/* Smart AI Engines integration */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            id="editor-btn-ai-examples"
                            onClick={generateAiExamples}
                            disabled={isAiGenerating || !editingEntry.en}
                            className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-white text-[10px] font-extrabold uppercase tracking-wide rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isAiGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-amber-300" />
                            )}
                            Tạo 3 ví dụ chuẩn
                          </button>

                          <button
                            id="editor-btn-ai-codemix"
                            onClick={generateAiCodemix}
                            disabled={isCodemixGenerating || !editingEntry.en}
                            className="px-2.5 py-1.5 bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 text-neutral-850 text-[10px] font-extrabold uppercase tracking-wide rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isCodemixGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-pink-500 animate-spin" style={{ animationDuration: '3s' }} />
                            )}
                            Bilingual Mix
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {editingEntry.examples?.map((ex, idx) => (
                          <div
                            key={ex.id || idx}
                            className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-3"
                          >
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-extrabold uppercase text-neutral-400 tracking-wider">Câu Tiếng Anh (English / Code-mixed)</label>
                                <input
                                  type="text"
                                  required
                                  value={ex.text_en}
                                  onChange={(e) => {
                                    const updated = [...(editingEntry.examples || [])];
                                    updated[idx].text_en = e.target.value;
                                    setEditingEntry({ ...editingEntry, examples: updated });
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                                  placeholder="He kicked off his flip-flops at the gate..."
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-extrabold uppercase text-neutral-400 tracking-wider">Bản Dịch Tiếng Việt</label>
                                <input
                                  type="text"
                                  required
                                  value={ex.text_vn}
                                  onChange={(e) => {
                                    const updated = [...(editingEntry.examples || [])];
                                    updated[idx].text_vn = e.target.value;
                                    setEditingEntry({ ...editingEntry, examples: updated });
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs"
                                  placeholder="Anh ấy cởi phắt đôi dép lào ở cửa trước..."
                                />
                              </div>

                              <div className="md:col-span-2 flex items-center justify-between pt-1 border-t border-neutral-100">
                                <div className="flex items-center gap-3">
                                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`type-ex-${idx}`}
                                      checked={ex.type === "normal"}
                                      onChange={() => {
                                        const updated = [...(editingEntry.examples || [])];
                                        updated[idx].type = "normal";
                                        setEditingEntry({ ...editingEntry, examples: updated });
                                      }}
                                      className="text-neutral-900 focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className="text-[11px] font-bold text-neutral-500">Chuẩn Anh-Anh</span>
                                  </label>

                                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`type-ex-${idx}`}
                                      checked={ex.type === "codemix"}
                                      onChange={() => {
                                        const updated = [...(editingEntry.examples || [])];
                                        updated[idx].type = "codemix";
                                        setEditingEntry({ ...editingEntry, examples: updated });
                                      }}
                                      className="text-pink-600 focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className="text-[11px] font-bold text-neutral-500">Mix Song ngữ</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveField("example", idx)}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-3.5 cursor-pointer transition-colors"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddField("example")}
                          className="w-full py-2 border border-dashed border-neutral-300 text-neutral-600 hover:bg-neutral-50 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Bổ sung dòng ví dụ khác thủ công
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT PANEL: Live Interactive Student Preview Card (Col-span 5) */}
                  <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
                    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-sm text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 font-sans leading-none">
                            LIVECARD VISUALIZER
                          </h4>
                          <span className="text-[10px] text-neutral-500 leading-none">Mô phòng chính xác giao diện của học sinh.</span>
                        </div>
                      </div>
                    </div>

                    {/* Styled student card reproduction */}
                    <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-md space-y-6 relative overflow-hidden">
                      {/* Class Badge Strip */}
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                        <span className={`px-2.5 py-0.5 font-black text-[9px] uppercase tracking-wider rounded bg-neutral-50 text-neutral-800 border-l-[3px] ${categoryColorMeta[editingEntry.color || 'pink'].border}`}>
                          {categoryColorMeta[editingEntry.color || 'pink'].label}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase select-none">
                          <Heart className="w-3.5 h-3.5" /> Lưu tủ
                        </div>
                      </div>

                      {/* Headword Area */}
                      <div className="space-y-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-xl md:text-2xl font-black font-display uppercase tracking-wide text-neutral-850 truncate max-w-[250px]">
                            {editingEntry.vn || "Dép Lào (Mẫu)"}
                          </h3>
                          <span className="text-[10px] font-mono font-medium text-neutral-400">
                            {editingEntry.ipa || "/ipa_phonetics/"}
                          </span>
                        </div>

                        {/* Keyword bubble themed automatically based on class color chooser */}
                        <div className={`inline-flex items-center gap-2 border p-1.5 px-3 rounded-lg ${categoryColorMeta[editingEntry.color || 'pink'].bg} ${categoryColorMeta[editingEntry.color || 'pink'].border}`}>
                          <span className="text-sm font-black font-sans leading-none tracking-wide">
                            {editingEntry.en || "flip-flops"}
                          </span>
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      </div>

                      {/* Video-Style Audio Lesson explanation snippet block */}
                      <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-200 shrink-0 bg-neutral-200">
                            <img
                              src={previewChunkerAvatar}
                              alt={previewChunkerName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-neutral-800 text-xs font-sans">
                              {previewChunkerName}
                            </h5>
                          </div>
                        </div>

                        {/* Custom Audio lesson bar template logic */}
                        <p className="text-[11px] text-emerald-850 leading-relaxed italic bg-emerald-100/20 px-2.5 py-1.5 rounded border border-emerald-100/10">
                          "{editingEntry.note_text || "Luyện phát âm rõ, tròn cụm từ và tích lũy nó vào kho tàng giao tiếp phản xạ tự nhiên của riêng bạn."}"
                        </p>
                      </div>



                      {/* Render lists of dynamic bilingual examples previews with highlight mappings */}
                      <div className="space-y-2.5">
                        <div className="border-b border-neutral-100 pb-1 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Câu ví dụ thực tế học viên</span>
                          <span className="text-[8px] font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full select-none">
                            {editingEntry.examples?.length || 0} câu
                          </span>
                        </div>

                        {editingEntry.examples && editingEntry.examples.length > 0 ? (
                          <div className="space-y-1.5 divide-y divide-neutral-100">
                            {editingEntry.examples.map((ex, idx) => {
                              const isCodemix = ex.type === "codemix";
                              return (
                                <div key={idx} className="pt-2 pb-1 text-left space-y-0.5">
                                  <div className="flex items-center gap-1.5 select-none text-[8px] font-bold uppercase pb-0.5">
                                    {isCodemix ? (
                                      <span className="text-pink-650 bg-pink-50 px-1 py-0.2 rounded border border-pink-100 leading-none">
                                        ✨ Song ngữ Mix
                                      </span>
                                    ) : (
                                      <span className="text-neutral-500 bg-neutral-50 px-1 py-0.2 rounded border border-neutral-100 leading-none">
                                        Anh-Anh Chuẩn
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-neutral-800 leading-relaxed break-words pr-2">
                                    {ex.text_en || "He kicked off his shoes..."}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 italic pr-2 break-words text-left">
                                    {ex.text_vn || "Anh ấy đã tháo đôi giày của mình..."}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                            <span className="text-[10px] text-neutral-400 italic">Chưa nhập câu ví dụ thực tế</span>
                          </div>
                        )}
                      </div>

                      {/* Display Keywords Tag footer block */}
                      {editingEntry.tags && editingEntry.tags.some(t => t.trim()) && (
                        <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-1 leading-none select-none">
                          {editingEntry.tags.map((tg, i) => tg.trim() && (
                            <span key={i} className="text-[9px] bg-neutral-50 text-neutral-500 border border-neutral-200/80 px-1.5 py-0.5 rounded-md font-medium animate-fade-in">
                              #{tg.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })()}

        </AnimatePresence>

      </main>

      {/* Global share/deployment Footer info broadsheet */}
      <footer className="bg-[#960005] text-white py-10 mt-16 shadow-inner" id="app-footer">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1.5">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <img
                src={chunksLogoUrl}
                alt="CHUNKS Dictionary"
                className="h-10 w-auto object-contain opacity-95"
                loading="lazy"
              />
              <h5 className="font-extrabold font-display uppercase tracking-widest text-red-100">
                DICTIONARY
              </h5>
            </div>
            <p className="text-xs text-red-200/90 max-w-sm">
              Chunks gợi ý mẫu câu, cụm diễn đạt và ví dụ đời thường để bạn tìm đúng cụm, bắt đúng sắc thái, nói tự nhiên hơn — và “có ý” hơn.
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <span className="text-xs text-red-100/90 font-medium">Bản quyền © 2026 Chunks Dictionary.</span>
          </div>
        </div>
      </footer>

      {/* Full screen voice audio overlay microphone popup (incorporating Feature 2) */}
      <AnimatePresence>
        {isVoiceSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <VoiceSearchOverlay 
              onClose={() => setIsVoiceSearchOpen(false)} 
              onResultMatched={handleVoiceSearchResult}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Alert Toast/Banner */}
      <AnimatePresence>
        {appAlertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-[9999] bg-neutral-900 text-white p-4.5 rounded-xl shadow-2xl flex items-center gap-3.5 border border-neutral-800 max-w-sm cursor-pointer"
            onClick={() => setAppAlertMessage(null)}
          >
            <div className="w-2 h-2 rounded-full bg-red-650 shrink-0" />
            <div className="text-xs font-bold font-sans leading-relaxed pr-2">{appAlertMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Iframe-Safe Delete Confirm Modal */}
      <AnimatePresence>
        {wordToDeleteId && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full overflow-hidden p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <span className="text-xl">⚠️</span>
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-neutral-850 font-sans">
                  Xác Nhận Xóa Từ Vựng
                </h4>
              </div>
              <p className="text-xs text-neutral-555 leading-relaxed font-semibold font-sans">
                Bạn có chắc chắn muốn xoá cụm từ này khỏi từ điển? Thao tác này không thể thu hồi và sẽ xóa vĩnh viễn trên cơ sở dữ liệu.
              </p>
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWordToDeleteId(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 cursor-pointer transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = wordToDeleteId;
                    setWordToDeleteId(null);
                    proceedDeleteWord(id);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all"
                >
                  Đồng ý, xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
