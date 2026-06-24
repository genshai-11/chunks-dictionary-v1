import { useState, useEffect, useRef } from "react";
import { Mic, X, WifiOff, Volume2, Search, VolumeX, AlertCircle, RefreshCw } from "lucide-react";
import { DictionaryEntry } from "../types";

interface VoiceSearchOverlayProps {
  onClose: () => void;
  onResultMatched: (entries: DictionaryEntry[], spokenTranscript: string) => void;
}

export default function VoiceSearchOverlay({ onClose, onResultMatched }: VoiceSearchOverlayProps) {
  // Read STT mode configuration from localStorage
  const [isCustomSTT] = useState(() => {
    return localStorage.getItem("ninerouter_use_custom_stt") === "true";
  });

  const [isListening, setIsListening] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [errorText, setErrorText] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    isCustomSTT ? "Đang sử dụng 9Router STT. Hãy nói và click Bấm để Dịch!" : "Hãy nói cụm tiếng Anh hoặc Việt..."
  );
  const [isProcessing, setIsProcessing] = useState(false);
  
  // WebSpeech recognition reference
  const recognitionRef = useRef<any>(null);

  // Custom MediaRecorder references for 9Router STT
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop everything
  const stopAndCleanup = () => {
    // 1. Cleanup WebSpeech
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

    // 2. Cleanup MediaRecorder recording stream
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

  // Start dual mode listening
  const startListeningSession = async () => {
    stopAndCleanup();
    setErrorText("");
    setIsProcessing(false);

    if (isCustomSTT) {
      // MODE A: Custom 9Router MediaRecorder recording
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorText("Trình duyệt của bạn không hỗ trợ Microphone Media.");
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
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAudioWith9Router(audioBlob);
        };

        mediaRecorder.start(250);
        setIsListening(true);
        setStatusMessage("🔴 Đang ghi âm... Hãy nói cụm từ và Click nút Mic một lần nữa để tra cứu!");
      } catch (err: any) {
        console.error("Mic access denied:", err);
        setErrorText("Không thể truy cập Microphone. Hãy kiểm tra quyền thiết bị!");
        setIsListening(false);
      }
    } else {
      // MODE B: Standard WebSpeech recognition as fallback
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setErrorText("Trình duyệt không hỗ trợ Nhận diện giọng nói WebSpeech. Hãy dùng Chrome/Safari!");
        setStatusMessage("Không hỗ trợ hệ thống WebSpeech.");
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
          setStatusMessage("Đang nghe... Speak now!");
        };

        recognition.onerror = (event: any) => {
          if (event.error === "aborted") return;
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setErrorText("Vui lòng cấp quyền Microphone để sử dụng tính năng tra cứu bằng giọng nói.");
          } else if (event.error === "no-speech") {
            setErrorText("Không nhận thấy âm thanh nào. Hãy thử nói lại.");
          } else {
            setErrorText(`Lỗi: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const resultString = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join("");
          setTranscript(resultString);
          setStatusMessage("Đang nhận diện ngôn từ...");
          // If result is final, search automatically after a short delay
          if (event.results[0].isFinal) {
            setTimeout(() => {
              triggerSearch(resultString);
            }, 800);
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

  // Convert Recorded sound to base64 and hit 9Router STT
  const transcribeAudioWith9Router = async (blob: Blob) => {
    setIsProcessing(true);
    setStatusMessage("Đang chuyển đổi giọng nói qua 9Router...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Clean = base64data.split(",")[1];

        // Gather 9Router configurations from localStorage
        const nrUrl = localStorage.getItem("ninerouter_url") || "";
        const nrKey = localStorage.getItem("ninerouter_key") || "";
        const nrModel = localStorage.getItem("ninerouter_stt_model") || "";

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nrUrl && nrModel) {
          headers["x-ninerouter-url"] = nrUrl;
          if (nrKey) {
            headers["x-ninerouter-key"] = nrKey;
          }
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
          if (data && data.transcript) {
            setTranscript(data.transcript);
            setStatusMessage("Dịch thành công! Đang tra cứu...");
            
            // Perform direct search & update layout matched items
            if (data.results) {
              onResultMatched(data.results, data.transcript);
              onClose();
              if (data.results.length > 0) {
                speakOutput(data.results[0].en);
              }
            } else {
              triggerSearch(data.transcript);
            }
          } else {
            throw new Error("Mô hình phản hồi trống. Thầy cô vui lòng kiểm tra lại mic/9Router.");
          }
        } catch (e: any) {
          console.error(e);
          setErrorText(`9Router STT thất bại: ${e.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setErrorText("Lỗi đọc luồng âm thanh.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    startListeningSession();
    return () => {
      stopAndCleanup();
    };
  }, []);

  // When speech ends and a transcript is complete, we search
  const triggerSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setStatusMessage("Đang tra cứu từ điển...");
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(queryText)}`);
      if (response.ok) {
        const matches: DictionaryEntry[] = await response.json();
        onResultMatched(matches, queryText);
        onClose();
        if (matches.length > 0) {
          speakOutput(matches[0].en);
        }
      } else {
        setErrorText("Tìm kiếm gặp trục trặc hệ thống.");
      }
    } catch (e) {
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

  const handleManualSubmit = () => {
    if (transcript.trim()) {
      triggerSearch(transcript);
    }
  };

  // Trigger click on Mic
  const handleMicClick = () => {
    if (isCustomSTT) {
      if (isListening) {
        // Stop recording which triggers transcription event
        stopRecordingMedia();
      } else {
        // Start a fresh recording session
        startListeningSession();
      }
    } else {
      // Standard restart
      setTranscript("");
      setErrorText("");
      startListeningSession();
    }
  };

  const stopRecordingMedia = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md"
      id="voice-overlay-container"
    >
      {/* Absolute top close button */}
      <button 
        id="voice-overlay-close"
        onClick={onClose}
        className="absolute top-6 right-6 p-3 text-neutral-400 hover:text-white bg-slate-800/50 hover:bg-zinc-800/80 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer animate-fade-in"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md text-center flex flex-col items-center">
        {/* Kinetic Crimson Branding */}
        <p className="text-red-500 font-bold label-caps tracking-widest text-sm mb-2 uppercase">
          Kinetic Crimson Voice Search
        </p>
        <span className="text-zinc-400 font-sans text-xs italic mb-8 block">
          "Tra cứu âm thanh trả về âm thanh"
        </span>

        {/* Live status pill */}
        <span className="mb-12 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
          <span className={`w-1.5 h-1.5 rounded-full ${isCustomSTT ? "bg-red-500" : "bg-blue-500"}`} />
          {isCustomSTT ? "9Router STT Active" : "WebSpeech Active"}
        </span>

        {/* Visual Pulse Waveform Generator */}
        <div className="relative flex items-center justify-center w-64 h-64 mb-10">
          {(isListening || isProcessing) && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-600/10 animate-ping duration-1000 scale-125 pointer-events-none" />
              <div className="absolute w-52 h-52 rounded-full border border-red-500/20 animate-pulse duration-700 pointer-events-none" />
              <div className="absolute w-40 h-40 rounded-full bg-red-600/10 animate-ping duration-1000 delay-300 pointer-events-none" />
            </>
          )}
          
          {/* Main central circular microphone button */}
          <button
            id="voice-mic-trigger"
            onClick={handleMicClick}
            disabled={isProcessing}
            className={`relative z-10 w-32 h-32 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 disabled:opacity-50 ${
              isListening 
              ? "bg-red-600 hover:bg-red-500 text-white animate-pulse" 
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-14 h-14 animate-spin text-white" />
            ) : (
              <Mic className={`w-14 h-14 ${isListening ? "scale-110" : ""}`} />
            )}
          </button>
        </div>

        {/* Dynamic Speech Transcription Text with responsive design */}
        <div className="min-h-16 w-full text-center px-4 mb-4">
          {transcript ? (
            <p className="text-white text-2xl font-semibold tracking-wide font-sans break-words animate-fade-in">
              "{transcript}"
            </p>
          ) : (
            <p className="text-zinc-500 text-lg font-sans italic select-none">
              {isListening ? (isCustomSTT ? "Hãy nói điều gì đó, bấm mic để dừng và tra" : "Hãy lên tiếng bài trò...") : "Ghi âm đã dừng..."}
            </p>
          )}
        </div>

        {/* Real-time Status subtitle */}
        <p className="text-zinc-400 text-sm font-sans mb-8 leading-normal max-w-sm">
          {statusMessage}
        </p>

        {/* Display errors gracefully */}
        {errorText && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-950/80 border border-red-800 rounded-lg text-red-300 text-sm mb-6 max-w-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Actions Controls button row */}
        <div className="flex items-center gap-4">
          {!isListening && !isProcessing && (
            <button
              id="voice-btn-retry"
              onClick={handleMicClick}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all focus:ring-2 focus:ring-red-400 cursor-pointer active:scale-95"
            >
              Nói lại (Retry)
            </button>
          )}
          
          {transcript && !isProcessing && (
            <button
              id="voice-btn-search"
              onClick={handleManualSubmit}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold label-caps tracking-widest rounded-lg transition-all focus:ring-2 focus:ring-red-400 cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Search className="w-4 h-4" /> Tra cứu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
