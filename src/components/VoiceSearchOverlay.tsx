import { useState, useEffect, useRef, useMemo } from "react";
import { Mic, X, Search, AlertCircle, RefreshCw, ArrowRight, Volume2, Sparkles } from "lucide-react";
import { DictionaryEntry } from "../types";

interface VoiceSearchOverlayProps {
  entries: DictionaryEntry[];
  onClose: () => void;
  onResultMatched: (entries: DictionaryEntry[], spokenTranscript: string) => void;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function rankLocalMatches(entries: DictionaryEntry[], query: string): DictionaryEntry[] {
  const q = normalizeText(query);
  if (!q) return [];

  return entries
    .map((entry) => {
      const en = normalizeText(entry.en);
      const vn = normalizeText(entry.vn);
      const tags = normalizeText((entry.tags || []).join(" "));
      const haystack = `${en} ${vn} ${tags}`;
      let score = 0;
      if (en === q || vn === q) score += 100;
      if (en.includes(q)) score += 60;
      if (vn.includes(q)) score += 55;
      if (q.includes(en) && en.length > 2) score += 45;
      if (q.includes(vn) && vn.length > 2) score += 40;
      q.split(" ").filter(Boolean).forEach((token) => {
        if (haystack.includes(token)) score += token.length >= 3 ? 8 : 2;
      });
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.entry);
}

export default function VoiceSearchOverlay({ entries, onClose, onResultMatched }: VoiceSearchOverlayProps) {
  const [isCustomSTT] = useState(() => localStorage.getItem("ninerouter_use_custom_stt") === "true");
  const [sttModel] = useState(() => localStorage.getItem("ninerouter_stt_model") || "WebSpeech");
  const [isListening, setIsListening] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [errorText, setErrorText] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    isCustomSTT ? "Đang dùng model Speech-to-Text trong AI & 9Router." : "Đang dùng WebSpeech của trình duyệt."
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const localSuggestions = useMemo(() => rankLocalMatches(entries, transcript), [entries, transcript]);
  const shownSuggestions = suggestions.length > 0 ? suggestions : localSuggestions;

  const stopAndCleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Failed to abort speech recognition:", e);
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const mergeMatches = (apiMatches: DictionaryEntry[], queryText: string) => {
    const byId = new Map<string, DictionaryEntry>();
    apiMatches.forEach((entry) => byId.set(entry.id, entry));
    rankLocalMatches(entries, queryText).forEach((entry) => byId.set(entry.id, entry));
    return Array.from(byId.values()).slice(0, 6);
  };

  const startListeningSession = async () => {
    stopAndCleanup();
    setErrorText("");
    setIsProcessing(false);
    setHasSearched(false);
    setSuggestions([]);

    if (isCustomSTT) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorText("Trình duyệt không hỗ trợ microphone media.");
        setIsListening(false);
        return;
      }

      try {
        audioChunksRef.current = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAudioWith9Router(audioBlob);
        };

        mediaRecorder.start(250);
        setIsListening(true);
        setStatusMessage("Đang ghi âm… nói cụm tiếng Anh hoặc nghĩa tiếng Việt, bấm mic lần nữa để tra cứu.");
      } catch (err: any) {
        console.error("Mic access denied:", err);
        setErrorText("Không thể truy cập microphone. Hãy kiểm tra quyền thiết bị.");
        setIsListening(false);
      }
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setErrorText("Trình duyệt không hỗ trợ WebSpeech. Hãy dùng Chrome/Safari hoặc bật 9Router STT.");
        setIsListening(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "vi-VN";
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorText("");
          setStatusMessage("Đang nghe… có thể nói tiếng Việt hoặc tiếng Anh.");
        };

        recognition.onerror = (event: any) => {
          if (event.error === "aborted") return;
          if (event.error === "not-allowed") {
            setErrorText("Vui lòng cấp quyền microphone để tra cứu bằng giọng nói.");
          } else if (event.error === "no-speech") {
            setErrorText("Không nhận thấy âm thanh nào. Hãy thử nói lại.");
          } else {
            setErrorText(`Lỗi nhận diện: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
          const resultString = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join("");
          setTranscript(resultString);
          setStatusMessage("Đang nhận diện transcript…");
          if (event.results[0].isFinal) {
            setTimeout(() => triggerSearch(resultString), 500);
          }
        };

        recognition.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition:", err);
        setErrorText(`Lỗi khởi tạo Speech: ${err.message || err}`);
        setIsListening(false);
      }
    }
  };

  const transcribeAudioWith9Router = async (blob: Blob) => {
    setIsProcessing(true);
    setStatusMessage("Đang chuyển giọng nói thành transcript qua AI & 9Router…");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Clean = base64data.split(",")[1];
        const nrUrl = localStorage.getItem("ninerouter_url") || "";
        const nrKey = localStorage.getItem("ninerouter_key") || "";
        const nrModel = localStorage.getItem("ninerouter_stt_model") || "";

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nrUrl && nrModel) {
          headers["x-ninerouter-url"] = nrUrl;
          if (nrKey) headers["x-ninerouter-key"] = nrKey;
          headers["x-ninerouter-stt-model"] = nrModel;
        }

        try {
          const response = await fetch("/api/voice-search", {
            method: "POST",
            headers,
            body: JSON.stringify({ audioBase64: base64Clean }),
          });
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `HTTP ${response.status}`);
          }
          const data = await response.json();
          if (data?.transcript) {
            setTranscript(data.transcript);
            setSuggestions(mergeMatches(data.results || [], data.transcript));
            setHasSearched(true);
            setStatusMessage("Đã bắt được transcript. Chọn gợi ý đúng nhất hoặc sửa lại rồi tra cứu.");
          } else {
            throw new Error("Mô hình phản hồi trống. Kiểm tra mic hoặc STT model.");
          }
        } catch (e: any) {
          console.error(e);
          setErrorText(`STT thất bại: ${e.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      console.error(err);
      setErrorText("Lỗi đọc luồng âm thanh.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    startListeningSession();
    return () => stopAndCleanup();
  }, []);

  const triggerSearch = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    setStatusMessage("Đang tìm gợi ý phù hợp trong từ điển…");
    setIsProcessing(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
      if (response.ok) {
        const matches: DictionaryEntry[] = await response.json();
        const merged = mergeMatches(matches, clean);
        setSuggestions(merged);
        setStatusMessage(merged.length > 0 ? "Chọn kết quả đúng nhất bên dưới." : "Chưa tìm thấy cụm khớp. Hãy sửa transcript hoặc nói lại.");
      } else {
        setErrorText("Tìm kiếm gặp trục trặc hệ thống.");
      }
    } catch (_) {
      setErrorText("Lỗi mạng khi tìm kiếm giọng nói.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakOutput = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const chooseEntry = (entry: DictionaryEntry) => {
    onResultMatched([entry], transcript || entry.en);
    onClose();
    speakOutput(entry.en);
  };

  const handleManualSubmit = () => triggerSearch(transcript);

  const handleMicClick = () => {
    if (isCustomSTT) {
      if (isListening) {
        if (mediaRecorderRef.current && isListening) {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      } else {
        setTranscript("");
        startListeningSession();
      }
    } else {
      setTranscript("");
      setSuggestions([]);
      setErrorText("");
      startListeningSession();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/45 backdrop-blur-sm" id="voice-overlay-container">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-neutral-150 bg-neutral-50/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-100 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" /> Tra từ nhanh bằng giọng nói
            </div>
            <h3 className="text-lg font-black text-neutral-900 uppercase leading-tight">Nói cụm từ hoặc nghĩa tiếng Việt</h3>
            <p className="text-xs text-neutral-500 font-semibold">
              {isCustomSTT ? `Speech-to-Text: ${sttModel}` : "WebSpeech trình duyệt"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 text-neutral-500 rounded-xl transition-colors cursor-pointer" aria-label="Đóng tra cứu giọng nói">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          <div className="rounded-2xl border border-red-100 bg-red-50/45 p-4 flex flex-col items-center justify-center text-center space-y-4">
            <button
              id="voice-mic-trigger"
              onClick={handleMicClick}
              disabled={isProcessing}
              className={`relative w-28 h-28 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 disabled:opacity-50 ${
                isListening ? "bg-red-600 hover:bg-red-500 text-white animate-pulse" : "bg-white hover:bg-neutral-50 text-red-650 border border-red-150"
              }`}
            >
              {isProcessing ? <RefreshCw className="w-11 h-11 animate-spin" /> : <Mic className="w-11 h-11" />}
            </button>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-800">
                {isProcessing ? "Đang xử lý" : isListening ? "Đang nghe" : "Sẵn sàng"}
              </p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {isCustomSTT ? "Bấm mic lần nữa để dừng ghi âm và gửi STT." : "WebSpeech tự nhận transcript khi bạn nói xong."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Transcript bắt được</label>
              <div className="relative">
                <input
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    setSuggestions([]);
                    setHasSearched(false);
                  }}
                  placeholder="Transcript sẽ hiện ở đây — có thể sửa trước khi tìm…"
                  className="w-full pl-3.5 pr-11 py-3 bg-white border border-neutral-200 rounded-xl text-sm font-semibold text-neutral-850 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!transcript.trim() || isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Tra cứu transcript"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed bg-neutral-50 border border-neutral-150 rounded-xl px-3 py-2">
              {statusMessage}
            </p>

            {errorText && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-150 rounded-xl text-red-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Gợi ý phù hợp</h4>
                {!isListening && !isProcessing && (
                  <button onClick={handleMicClick} className="text-[11px] font-bold text-red-650 hover:text-red-700 inline-flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Nói lại
                  </button>
                )}
              </div>

              {shownSuggestions.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {shownSuggestions.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => chooseEntry(entry)}
                      className="w-full text-left p-3 rounded-xl border border-neutral-150 hover:border-red-200 hover:bg-red-50/35 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-neutral-850 text-sm truncate">{entry.en}</span>
                          <span className="text-[9px] uppercase font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{entry.color}</span>
                        </div>
                        <p className="text-xs text-neutral-500 font-semibold truncate">{entry.vn}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-350 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 p-5 text-center space-y-2">
                  <Volume2 className="w-5 h-5 mx-auto text-neutral-350" />
                  <p className="text-xs text-neutral-450 font-semibold">
                    {hasSearched ? "Chưa có gợi ý khớp. Hãy sửa transcript hoặc nói lại rõ hơn." : "Gợi ý sẽ hiện sau khi bắt được transcript."}
                  </p>
                </div>
              )}
            </div>

            {shownSuggestions.length > 0 && (
              <button
                onClick={() => {
                  onResultMatched(shownSuggestions, transcript);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-widest transition-colors"
              >
                Xem danh sách kết quả theo transcript
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
