import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Link,
  Key,
  Cpu,
  Mic,
  Volume2,
  RefreshCw,
  Play,
  Square,
  Upload,
  Check,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle,
  Info,
  Sliders,
  Sparkles
} from "lucide-react";

export default function TeacherDashboard9RouterSettings() {
  // Settings states persisted to localStorage
  const [endpoint, setEndpoint] = useState(() => {
    return localStorage.getItem("ninerouter_url") || "https://api.9router.ai/v1";
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("ninerouter_key") || "";
  });
  const [ttsProvider, setTtsProvider] = useState<"ninerouter" | "google-gemini">(() => {
    return localStorage.getItem("tts_gateway_provider") === "google-gemini" ? "google-gemini" : "ninerouter";
  });
  const [googleApiKey, setGoogleApiKey] = useState(() => {
    return localStorage.getItem("google_ai_api_key") || "";
  });
  const [googleTtsModel, setGoogleTtsModel] = useState(() => {
    return localStorage.getItem("google_tts_model") || "gemini-2.5-flash-preview-tts";
  });
  const [googleTtsVoice, setGoogleTtsVoice] = useState(() => {
    return localStorage.getItem("google_tts_voice") || "Kore";
  });
  const [llmModel, setLlmModel] = useState(() => {
    return localStorage.getItem("ninerouter_llm_model") || "gpt-4o";
  });
  const [sttModel, setSttModel] = useState(() => {
    return localStorage.getItem("ninerouter_stt_model") || "openai/whisper-1";
  });
  const [ttsModel, setTtsModel] = useState(() => {
    return localStorage.getItem("ninerouter_tts_model") || "edge-tts/en-US-JennyNeural";
  });
  const [ttsVietnameseModel, setTtsVietnameseModel] = useState(() => {
    return localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";
  });
  const [ttsCodemixModel, setTtsCodemixModel] = useState(() => {
    return localStorage.getItem("ninerouter_tts_codemix_model") || localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural";
  });
  const [ttsCodemixProvider, setTtsCodemixProvider] = useState<"inherit" | "ninerouter" | "google-gemini">(() => {
    const stored = localStorage.getItem("tts_codemix_provider");
    return stored === "ninerouter" || stored === "google-gemini" ? stored : "inherit";
  });
  const [useCustomSTT, setUseCustomSTT] = useState(() => {
    return localStorage.getItem("ninerouter_use_custom_stt") === "true";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const stored = Number(localStorage.getItem("ninerouter_playback_speed") || "1");
    return Number.isFinite(stored) && stored > 0 ? stored : 1.0;
  });

  // Password visibility
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);

  // Discovery lists
  const [discoveredLLM, setDiscoveredLLM] = useState<string[]>([]);
  const [discoveredSTT, setDiscoveredSTT] = useState<string[]>([]);
  const [discoveredTTS, setDiscoveredTTS] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Saving state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Testing TTS States
  const [ttsText, setTtsText] = useState(
    "To cut a long story short, I will be a great English speaker in the long run!"
  );
  const [ttsVietnameseText, setTtsVietnameseText] = useState(
    "Nói tóm lại, tôi chắc chắn sẽ trở thành một người nói tiếng Anh trôi chảy trong tương lai!"
  );
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedAudio, setSynthesizedAudio] = useState<string | null>(null);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);
  const [ttsTestError, setTtsTestError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Testing Vietnamese TTS States
  const [isSynthesizingVi, setIsSynthesizingVi] = useState(false);
  const [synthesizedAudioVi, setSynthesizedAudioVi] = useState<string | null>(null);
  const [isPlayingTestAudioVi, setIsPlayingTestAudioVi] = useState(false);
  const [ttsTestErrorVi, setTtsTestErrorVi] = useState("");
  const audioViRef = useRef<HTMLAudioElement | null>(null);

  // Testing STT States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttTestError, setSttTestError] = useState("");

  // Testing LLM States
  const [llmTestInput, setLlmTestInput] = useState({
    en: "",
    vn: "",
    pos: "noun",
    color: "pink"
  });
  const [isLlmTesting, setIsLlmTesting] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<any>(null);
  const [llmTestError, setLlmTestError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<any>(null);

  // Default values to provide high-quality presets
  const defaultLLMs = ["gpt-4o", "anthropic/claude-3-5-sonnet", "google/gemini-2.5-flash", "google/gemini-1.5-pro"];
  const defaultSTTs = ["openai/whisper-1", "groq/whisper-large-v3", "google/speech-to-text"];
  const defaultTTSs = [
    "edge-tts/vi-VN-HoaiMyNeural",
    "edge-tts/vi-VN-NamMinhNeural",
    "edge-tts/en-US-JennyNeural",
    "edge-tts/en-US-GuyNeural"
  ];
  const defaultGoogleTTSModels = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
  const defaultGoogleTTSVoices = ["Kore", "Puck", "Charon", "Fenrir", "Leda", "Orus", "Aoede", "Zephyr"];

  const llmOptions = discoveredLLM.length > 0 ? discoveredLLM : defaultLLMs;
  const sttOptions = discoveredSTT.length > 0 ? discoveredSTT : defaultSTTs;
  const ttsOptions = discoveredTTS.length > 0 ? discoveredTTS : defaultTTSs;
  const playbackSpeedOptions = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5];

  // Save changes to localStorage with animation
  const handleSaveSettings = () => {
    setSaveStatus("saving");
    
    setTimeout(() => {
      localStorage.setItem("ninerouter_url", endpoint.trim());
      localStorage.setItem("ninerouter_key", apiKey.trim());
      localStorage.setItem("tts_gateway_provider", ttsProvider);
      localStorage.setItem("google_ai_api_key", googleApiKey.trim());
      localStorage.setItem("google_tts_model", googleTtsModel.trim());
      localStorage.setItem("google_tts_voice", googleTtsVoice.trim());
      localStorage.setItem("ninerouter_llm_model", llmModel.trim());
      localStorage.setItem("ninerouter_stt_model", sttModel.trim());
      localStorage.setItem("ninerouter_tts_model", ttsModel.trim());
      localStorage.setItem("ninerouter_tts_vietnamese_model", ttsVietnameseModel.trim());
      localStorage.setItem("ninerouter_tts_codemix_model", ttsCodemixModel.trim());
      localStorage.setItem("tts_codemix_provider", ttsCodemixProvider);
      localStorage.setItem("ninerouter_use_custom_stt", String(useCustomSTT));
      localStorage.setItem("ninerouter_playback_speed", String(playbackSpeed));

      // Also dispatch an event so standard search/TTS button components are updated instantly!
      window.dispatchEvent(new Event("ninerouter_settings_updated"));
      
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }, 1000);
  };

  // Discover models list
  const fetchDiscoveredModels = async () => {
    setIsLoadingModels(true);
    setModelFetchError("");
    setSyncSuccess(false);

    try {
      // Fetch STT models
      let hasError = false;
      const sttRes = await fetch(
        `/api/9router/models?endpoint=${encodeURIComponent(endpoint.trim())}&apiKey=${encodeURIComponent(
          apiKey.trim()
        )}&kind=stt`
      );
      if (sttRes.ok) {
        const data = await sttRes.json();
        if (data.data && Array.isArray(data.data)) {
          setDiscoveredSTT(data.data.map((m: any) => m.id));
        }
      } else {
        hasError = true;
      }

      // Fetch TTS models
      const ttsRes = await fetch(
        `/api/9router/models?endpoint=${encodeURIComponent(endpoint.trim())}&apiKey=${encodeURIComponent(
          apiKey.trim()
        )}&kind=tts`
      );
      if (ttsRes.ok) {
        const data = await ttsRes.json();
        if (data.data && Array.isArray(data.data)) {
          setDiscoveredTTS(data.data.map((m: any) => m.id));
        }
      } else {
        hasError = true;
      }

      // Fetch LLM models
      const llmRes = await fetch(
        `/api/9router/models?endpoint=${encodeURIComponent(endpoint.trim())}&apiKey=${encodeURIComponent(
          apiKey.trim()
        )}&kind=llm`
      ).catch(() => null);

      if (llmRes && llmRes.ok) {
        const data = await llmRes.json();
        if (data.data && Array.isArray(data.data)) {
          setDiscoveredLLM(data.data.map((m: any) => m.id));
        }
      }

      if (hasError) {
        setModelFetchError("Không thể tải đầy đủ danh sách. Kiểm tra kết nối API.");
      } else {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setModelFetchError(`Không thể đồng bộ danh sách models từ 9Router: ${err.message}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const buildTestTtsHeaders = (nrModel: string): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ttsProvider === "google-gemini") {
      headers["x-tts-provider"] = "google-gemini";
      if (googleApiKey.trim()) headers["x-gemini-api-key"] = googleApiKey.trim();
      headers["x-gemini-tts-model"] = googleTtsModel.trim() || "gemini-2.5-flash-preview-tts";
      headers["x-gemini-tts-voice"] = googleTtsVoice.trim() || "Kore";
      return headers;
    }
    if (endpoint.trim() && nrModel.trim()) {
      headers["x-ninerouter-url"] = endpoint.trim();
      if (apiKey.trim()) headers["x-ninerouter-key"] = apiKey.trim();
      headers["x-ninerouter-tts-model"] = nrModel.trim();
    }
    return headers;
  };

  // Test Synthesis TTS (Convert test text to voice)
  const handleTestTTS = async () => {
    if (!ttsText.trim()) {
      setTtsTestError("Hãy nhập nội dung văn bản nghe thử");
      return;
    }
    setIsSynthesizing(true);
    setTtsTestError("");
    setSynthesizedAudio(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: buildTestTtsHeaders(ttsModel.trim()),
        body: JSON.stringify({ text: ttsText.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.audio) {
        setSynthesizedAudio(`data:audio/mp3;base64,${data.audio}`);
      } else {
        throw new Error("API phản hồi không có luồng dữ liệu âm thanh.");
      }
    } catch (err: any) {
      console.error(err);
      setTtsTestError(`Yêu cầu TTS thất bại: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handlePlayTestAudio = () => {
    if (audioRef.current) {
      if (isPlayingTestAudio) {
        audioRef.current.pause();
        setIsPlayingTestAudio(false);
      } else {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch((e) => {
          console.error(e);
          setTtsTestError("Không thể phát âm thanh: " + e.message);
        });
        setIsPlayingTestAudio(true);
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.onended = () => {
        setIsPlayingTestAudio(false);
      };
    }
  }, [synthesizedAudio, playbackSpeed]);

  // Test Synthesis Vietnamese TTS
  const handleTestTTSVi = async () => {
    if (!ttsVietnameseText.trim()) {
      setTtsTestErrorVi("Hãy nhập nội dung văn bản tiếng Việt nghe thử");
      return;
    }
    setIsSynthesizingVi(true);
    setTtsTestErrorVi("");
    setSynthesizedAudioVi(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: buildTestTtsHeaders(ttsVietnameseModel.trim()),
        body: JSON.stringify({ text: ttsVietnameseText.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.audio) {
        setSynthesizedAudioVi(`data:audio/mp3;base64,${data.audio}`);
      } else {
        throw new Error("API phản hồi không có luồng dữ liệu âm thanh.");
      }
    } catch (err: any) {
      console.error(err);
      setTtsTestErrorVi(`Yêu cầu TTS Tiếng Việt thất bại: ${err.message}`);
    } finally {
      setIsSynthesizingVi(false);
    }
  };

  const handlePlayTestAudioVi = () => {
    if (audioViRef.current) {
      if (isPlayingTestAudioVi) {
        audioViRef.current.pause();
        setIsPlayingTestAudioVi(false);
      } else {
        audioViRef.current.playbackRate = playbackSpeed;
        audioViRef.current.play().catch((e) => {
          console.error(e);
          setTtsTestErrorVi("Không thể phát âm thanh tiếng Việt: " + e.message);
        });
        setIsPlayingTestAudioVi(true);
      }
    }
  };

  useEffect(() => {
    if (audioViRef.current) {
      audioViRef.current.playbackRate = playbackSpeed;
      audioViRef.current.onended = () => {
        setIsPlayingTestAudioVi(false);
      };
    }
  }, [synthesizedAudioVi, playbackSpeed]);

  // Micro recording system
  const startRecording = async () => {
    setAudioBlob(null);
    setTranscriptionResult("");
    setSttTestError("");
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSttTestError("Trình duyệt không hỗ trợ trực tiếp Microphone Media.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((duration) => duration + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setSttTestError(`Quyền truy cập Micro bị từ chối: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  // Upload custom test audio file
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setTranscriptionResult("");
      setSttTestError("");
    }
  };

  // Convert Test audio to Text
  const handleTestSTT = async () => {
    if (!audioBlob) {
      setSttTestError("Hãy ghi âm hoặc tải lên file âm thanh (mp3/wav/webm) để test.");
      return;
    }

    setIsTranscribing(true);
    setSttTestError("");
    setTranscriptionResult("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Clean = base64data.split(",")[1];

        try {
          const response = await fetch("/api/9router/test-stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: endpoint.trim(),
              apiKey: apiKey.trim(),
              model: sttModel.trim(),
              audioBase64: base64Clean,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data && data.text) {
            setTranscriptionResult(data.text);
          } else {
            throw new Error("Phản hồi STT trống hoặc không hợp lệ.");
          }
        } catch (e: any) {
          console.error(e);
          setSttTestError(`Lỗi xử lý file âm thanh (STT): ${e.message}`);
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setSttTestError(`FileReader lỗi: ${err.message}`);
      setIsTranscribing(false);
    }
  };

  const handleTestLLM = async () => {
    setIsLlmTesting(true);
    setLlmTestError("");
    setLlmTestResult(null);

    try {
      const res = await fetch("/api/ai/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...llmTestInput,
          ninerouter_url: endpoint.trim(),
          ninerouter_key: apiKey.trim(),
          ninerouter_llm_model: llmModel.trim(),
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setLlmTestResult(data);
    } catch (err: any) {
      console.error(err);
      setLlmTestError(`Lỗi sinh dữ liệu LLM: ${err.message}`);
    } finally {
      setIsLlmTesting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in" id="ninerouter-settings-panel">
      {/* Page Heading */}
      <header className="mb-8 pl-4 py-1.5 border-l-[6px] border-[#960005]">
        <h1 className="font-display text-4xl uppercase tracking-wider text-[#201a19] font-bold">
          Cấu hình AI Gateway & TTS
        </h1>
        <p className="font-sans text-[#5b5350] mt-1.5 text-base">
          LLM tạo câu dùng 9Router; riêng Text-To-Speech có thể chọn 9Router hoặc Google Gemini.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Main Settings) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Connection Config Card */}
          <section className="bg-[#FFFDFA] border border-[#E3DACD] rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-[#E3DACD]/60 pb-4 mb-5">
              <Link className="w-5 h-5 text-[#960005]" />
              <h2 className="font-sans font-bold text-[#201a19] text-lg uppercase tracking-wide">
                Thông số kết nối 9Router & Google Gemini TTS
              </h2>
            </div>

            <div className="space-y-5">
              {/* Endpoint */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  API Gateway Endpoint
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.9router.ai/v1"
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-mono text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                  />
                </div>
                <span className="text-[11px] text-[#5b5350]">
                  Endpoint API tiêu chuẩn, mặc định là địa chỉ của 9Router Cloud.
                </span>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  API Authentication Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-9router-..."
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-mono text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] pr-12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-3.5 text-[#5b5350] hover:text-[#201a19]"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-[#5b5350]">
                  Khóa cấp quyền truy cập 9Router cho LLM tạo câu, STT và TTS nếu chọn 9Router.
                </span>
              </div>

              {/* TTS Provider */}
              <div className="space-y-1.5 border-t border-[#E3DACD]/40 pt-4">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Nguồn tạo Text-To-Speech
                </label>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value as "ninerouter" | "google-gemini")}
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                >
                  <option value="ninerouter">9Router / Edge TTS (mặc định)</option>
                  <option value="google-gemini">Google Gemini TTS only</option>
                </select>
                <span className="text-[11px] text-[#5b5350] block">
                  Chỉ áp dụng cho tạo/phát audio. Sinh câu ví dụ, code-mixing và phân tích câu vẫn dùng LLM 9Router phía dưới.
                </span>
              </div>

              {/* Google Gemini API Key for TTS only */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Google Gemini API Key (chỉ TTS)
                </label>
                <div className="relative">
                  <input
                    type={showGoogleApiKey ? "text" : "password"}
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="Dán API key Google AI Studio tại đây — không lưu trong source code"
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-mono text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] pr-12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleApiKey(!showGoogleApiKey)}
                    className="absolute right-3.5 top-3.5 text-[#5b5350] hover:text-[#201a19]"
                  >
                    {showGoogleApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-amber-700 block">
                  Vì key đã từng được chia sẻ trong chat, nên sau khi test ổn hãy rotate/revoke key cũ trên Google AI Studio/Cloud Console.
                </span>
              </div>
            </div>
          </section>

          {/* Model Selections Card */}
          <section className="bg-[#FFFDFA] border border-[#E3DACD] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E3DACD]/60 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-[#960005]" />
                <h2 className="font-sans font-bold text-[#201a19] text-lg uppercase tracking-wide">
                  Lựa chọn mẫu mô hình (Models)
                </h2>
              </div>
              <button
                type="button"
                disabled={isLoadingModels}
                onClick={fetchDiscoveredModels}
                className="px-3 py-1.5 border border-[#960005] text-[#960005] hover:bg-[#960005]/5 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
                Đồng bộ Models
              </button>
            </div>

            {modelFetchError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modelFetchError}</span>
              </div>
            )}

            {syncSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg mb-4 flex items-center gap-2 animate-fade-in_up">
                <Check className="w-4 h-4 shrink-0" />
                <span>Cập nhật danh sách từ 9Router thành công!</span>
              </div>
            )}

            <div className="space-y-5">
              {/* LLM Model Select */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Mô hình LLM (Sinh ví dụ & Tách câu)
                </label>
                <div className="relative">
                  <input
                    list="llm-options-list"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    placeholder="Nhập tên model hoặc chọn..."
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                  />
                  <datalist id="llm-options-list">
                    {llmOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
                <span className="text-[11px] text-[#5b5350]">
                  Gõ chọn mô hình hoặc nhập custom. Mô hình xử lý AI tạo tự động 3 ví dụ chất lượng cao, bài sinh Code-mixing và Chunker ngữ pháp.
                </span>
              </div>

              {/* STT Model Select */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Mô hình Speech-To-Text (Phát hiện giọng nói)
                </label>
                <div className="relative">
                  <input
                    list="stt-options-list"
                    value={sttModel}
                    onChange={(e) => setSttModel(e.target.value)}
                    placeholder="Nhập tên model hoặc chọn..."
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                  />
                  <datalist id="stt-options-list">
                    {sttOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* TTS Model Select (English) */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Mô hình Text-To-Speech Tiếng Anh (Phát âm Tiếng Anh)
                </label>
                <div className="relative">
                  <input
                    list="tts-options-list"
                    value={ttsModel}
                    onChange={(e) => setTtsModel(e.target.value)}
                    placeholder="Nhập tên model hoặc chọn..."
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                  />
                  <datalist id="tts-options-list">
                    {ttsOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* TTS Model Select (Vietnamese) */}
              <div className="space-y-1.5">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Mô hình Text-To-Speech Tiếng Việt (Phát âm Tiếng Việt)
                </label>
                <div className="relative">
                  <input
                    list="tts-vi-options-list"
                    value={ttsVietnameseModel}
                    onChange={(e) => setTtsVietnameseModel(e.target.value)}
                    placeholder="Nhập tên model hoặc chọn..."
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                  />
                  <datalist id="tts-vi-options-list">
                    {ttsOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* TTS Model Select (Code-mixing / bilingual examples) */}
              <div className="space-y-3">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                  Mô hình Text-To-Speech Code-mixing / Câu song ngữ
                </label>
                <select
                  value={ttsCodemixProvider}
                  onChange={(e) => setTtsCodemixProvider(e.target.value as "inherit" | "ninerouter" | "google-gemini")}
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                >
                  <option value="inherit">Theo nguồn TTS chung ({ttsProvider === "google-gemini" ? "Google Gemini" : "9Router"})</option>
                  <option value="ninerouter">9Router riêng cho code-mixing</option>
                  <option value="google-gemini">Google Gemini riêng cho code-mixing</option>
                </select>
                <div className="relative">
                  <input
                    list="tts-codemix-options-list"
                    value={ttsCodemixModel}
                    onChange={(e) => setTtsCodemixModel(e.target.value)}
                    placeholder="Nhập model riêng cho câu Việt pha English..."
                    disabled={ttsCodemixProvider === "google-gemini"}
                    className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                  <datalist id="tts-codemix-options-list">
                    {ttsOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
                <span className="text-[11px] text-[#5b5350] block">
                  Dùng khi Bulk Audio tạo audio “Cả hai / code-mixing model”. Nếu chọn Google Gemini, app sẽ dùng Google Gemini TTS model/voice ở phần bên dưới; ô model 9Router này sẽ được bỏ qua.
                </span>
              </div>

              {/* Google Gemini TTS model/voice */}
              <div className="space-y-3 border-t border-[#E3DACD]/40 pt-4 mt-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block">
                    Google Gemini TTS Model
                  </label>
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100">
                    Chỉ audio
                  </span>
                </div>
                <input
                  list="google-tts-model-options-list"
                  value={googleTtsModel}
                  onChange={(e) => setGoogleTtsModel(e.target.value)}
                  placeholder="gemini-2.5-flash-preview-tts"
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                />
                <datalist id="google-tts-model-options-list">
                  {defaultGoogleTTSModels.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide block pt-1">
                  Google Voice
                </label>
                <input
                  list="google-tts-voice-options-list"
                  value={googleTtsVoice}
                  onChange={(e) => setGoogleTtsVoice(e.target.value)}
                  placeholder="Kore"
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                />
                <datalist id="google-tts-voice-options-list">
                  {defaultGoogleTTSVoices.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
                <span className="text-[11px] text-[#5b5350] block">
                  Khi “Nguồn tạo TTS” là Google Gemini, toàn bộ nút phát và Bulk Audio sẽ dùng model/voice này. LLM tạo câu vẫn dùng 9Router.
                </span>
              </div>

              {/* Teacher-only synchronized playback speed */}
              <div className="space-y-2 border-t border-[#E3DACD]/40 pt-4 mt-3">
                <label className="font-sans font-medium text-xs text-[#5b5350] uppercase tracking-wide flex items-center justify-between">
                  <span>Tốc độ phát đồng bộ</span>
                  <span className="font-mono text-[#960005] bg-[#fff8f6] px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {playbackSpeed.toFixed(1)}x
                  </span>
                </label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-4 py-3 font-sans text-sm rounded-lg focus:ring-1 focus:ring-[#960005] focus:border-[#960005] transition-all"
                >
                  {playbackSpeedOptions.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed.toFixed(1)}x
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#5b5350] block">
                  Chỉ giáo viên chỉnh tại AI & 9Router. Toàn bộ nút phát ở giao diện học viên sẽ tự đồng bộ theo tốc độ này, không hiển thị nút đổi tốc độ riêng.
                </span>
              </div>

              {/* Use Custom STT Toggle */}
              <div className="flex items-center justify-between border-t border-[#E3DACD]/40 pt-4 mt-3">
                <div className="flex flex-col">
                  <label className="font-sans font-bold text-[#201a19] text-sm">
                    Sử dụng 9Router STT làm bộ dịch chính
                  </label>
                  <span className="text-xs text-[#5b5350]">
                    Kích hoạt để ghi đè trình ghi ngoại tuyến bằng Whisper/STT thông qua 9Router.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomSTT(!useCustomSTT)}
                  className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all ${
                    useCustomSTT ? "bg-[#960005]" : "bg-[#5b5350]/30"
                  }`}
                >
                  <span
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-all duration-200 ${
                      useCustomSTT ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Buttons Row */}
            <div className="border-t border-[#E3DACD]/50 pt-5 mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saveStatus !== "idle"}
                className={`px-6 py-3 font-semibold text-sm tracking-wide uppercase rounded-lg transition-all duration-300 w-full md:w-auto shadow-sm min-w-[200px] flex items-center justify-center gap-2 ${
                  saveStatus === "saving"
                    ? "bg-[#5b5350] text-[#FFFDFA] cursor-wait"
                    : saveStatus === "saved"
                    ? "bg-emerald-600 text-[#FFFDFA]"
                    : "bg-[#960005] text-[#FFFDFA] hover:bg-[#bf080b] active:scale-95 cursor-pointer"
                }`}
              >
                {saveStatus === "saving" && (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    ĐANG LƯU...
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    ĐÃ LƯU THÀNH CÔNG!
                  </>
                )}
                {saveStatus === "idle" && (
                  <>
                    <Check className="w-4 h-4" />
                    LƯU CẤU HÌNH AI
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Right Column (AI Lab & Information) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* AI Lab Testing Panel */}
          <section className="bg-[#FFFDFA] border border-[#E3DACD] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-[#E3DACD]/60 pb-4 mb-5">
              <Sliders className="w-5 h-5 text-[#960005]" />
              <h2 className="font-sans font-bold text-[#201a19] text-lg uppercase tracking-wide">
                Phòng thử nghiệm AI Lab
              </h2>
            </div>

            <div className="space-y-6">
              {/* Text-To-Speech Section */}
              <div className="space-y-4 border-b border-[#E3DACD]/30 pb-4">
                <h3 className="font-sans font-bold text-[#201a19] text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-[#E3DACD]/30 pb-1">
                  <Volume2 className="w-4 h-4 text-[#960005]" /> Thử nghiệm TTS Tiếng Anh
                </h3>
                
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-3 py-2 text-sm rounded-lg focus:ring-1 focus:ring-[#960005] h-16 resize-none font-sans"
                  placeholder="Nhập đoạn văn tiếng Anh muốn chuyển sang giọng nói..."
                ></textarea>

                {ttsTestError && (
                  <div className="text-red-750 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{ttsTestError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSynthesizing || !ttsModel}
                    onClick={handleTestTTS}
                    className="px-4 py-2 bg-[#960005] hover:bg-[#bf080b] disabled:opacity-50 text-[#FFFDFA] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {isSynthesizing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang tổng hợp...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Tạo giọng nói EN
                      </>
                    )}
                  </button>

                  {synthesizedAudio && (
                    <button
                      type="button"
                      onClick={handlePlayTestAudio}
                      className="px-4 py-2 bg-[#5b5350] hover:bg-[#201a19] text-[#FFFDFA] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isPlayingTestAudio ? (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          Dừng nghe
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Nghe phát âm EN
                        </>
                      )}
                    </button>
                  )}
                </div>

                {synthesizedAudio && (
                  <audio ref={audioRef} src={synthesizedAudio} className="hidden" />
                )}
              </div>

              {/* Text-To-Speech (Vietnamese) Section */}
              <div className="space-y-4">
                <h3 className="font-sans font-bold text-[#201a19] text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-[#E3DACD]/30 pb-1">
                  <Volume2 className="w-4 h-4 text-[#960005]" /> Thử nghiệm TTS Tiếng Việt
                </h3>
                
                <textarea
                  value={ttsVietnameseText}
                  onChange={(e) => setTtsVietnameseText(e.target.value)}
                  className="w-full bg-[#FFFDFA] border border-[#E3DACD] px-3 py-2 text-sm rounded-lg focus:ring-1 focus:ring-[#960005] h-16 resize-none font-sans"
                  placeholder="Nhập đoạn văn tiếng Việt muốn chuyển sang giọng nói..."
                ></textarea>

                {ttsTestErrorVi && (
                  <div className="text-red-750 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{ttsTestErrorVi}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSynthesizingVi || !ttsVietnameseModel}
                    onClick={handleTestTTSVi}
                    className="px-4 py-2 bg-[#960005] hover:bg-[#bf080b] disabled:opacity-50 text-[#FFFDFA] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {isSynthesizingVi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang tổng hợp...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Tạo giọng nói VI
                      </>
                    )}
                  </button>

                  {synthesizedAudioVi && (
                    <button
                      type="button"
                      onClick={handlePlayTestAudioVi}
                      className="px-4 py-2 bg-[#5b5350] hover:bg-[#201a19] text-[#FFFDFA] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isPlayingTestAudioVi ? (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          Dừng nghe
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Nghe phát âm VI
                        </>
                      )}
                    </button>
                  )}
                </div>

                {synthesizedAudioVi && (
                  <audio ref={audioViRef} src={synthesizedAudioVi} className="hidden" />
                )}
              </div>

              {/* Speech-To-Text Section */}
              <div className="space-y-3 pt-4 border-t border-[#E3DACD]/40">
                <h3 className="font-sans font-bold text-[#201a19] text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-[#E3DACD]/30 pb-1">
                  <Mic className="w-4 h-4 text-[#960005]" /> Thử nghiệm Speech-to-Text (STT)
                </h3>

                <div className="bg-[#FFFDFA] border border-[#E3DACD] rounded-xl p-4 flex flex-col items-center justify-center gap-3 relative min-h-[140px]">
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-2 animate-pulse">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-[#FFFDFA]">
                        <Mic className="w-6 h-6 animate-ping" />
                      </div>
                      <span className="text-xs text-red-600 font-bold">
                        Đang ghi âm chân thật... ({recordingDuration}s)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="text-xs text-[#5b5350]">
                        Sử dụng micro để ghi giọng nói của bạn trực tiếp
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="p-3 bg-[#960005] hover:bg-[#bf080b] text-[#FFFDFA] rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="Bắt đầu ghi âm"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        
                        <label className="p-3 bg-[#5b5350] hover:bg-[#201a19] text-[#FFFDFA] rounded-full shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center" title="Tải file âm thanh">
                          <Upload className="w-5 h-5" />
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleAudioFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="w-full border-t border-[#E3DACD]/30 pt-3 mt-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-emerald-800 font-medium">
                        ✓ Đã thu mẫu thử thành công ({audioBlob.type === "audio/webm" ? "Mic recording" : "Uploaded file"})
                      </span>
                      <button
                        type="button"
                        disabled={isTranscribing}
                        onClick={handleTestSTT}
                        className="px-4 py-1.5 bg-[#960005] text-[#FFFDFA] hover:bg-[#bf080b] disabled:opacity-50 text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        {isTranscribing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Đang dịch...
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3.5 h-3.5" />
                            Dịch sang Chữ viết (STT)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {sttTestError && (
                  <div className="text-red-750 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{sttTestError}</span>
                  </div>
                )}

                {transcriptionResult && (
                  <div className="bg-[#fff8f6] border border-[#e6bdb7] rounded-lg p-3.5 space-y-1">
                    <span className="text-[11px] font-sans font-bold text-[#bf080b] uppercase tracking-wider block">
                      Kết quả nhận dạng tiếng Anh:
                    </span>
                    <p className="text-sm font-sans font-semibold text-[#201a19] italic">
                      "{transcriptionResult}"
                    </p>
                  </div>
                )}
              </div>

              {/* LLM Testing Section */}
              <div className="space-y-3 pt-4 border-t border-[#E3DACD]/40">
                <h3 className="font-sans font-bold text-[#201a19] text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-[#E3DACD]/30 pb-1">
                  <Sparkles className="w-4 h-4 text-[#960005]" /> Thử nghiệm LLM (Text Generation)
                </h3>
                <div className="space-y-2">
                  <p className="text-xs text-[#5b5350]">
                    Thử tạo 3 câu ví dụ cho Chunk sau để kiểm tra mô hình:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="bg-[#FFFDFA] border border-[#E3DACD] px-2 py-1.5 text-xs rounded-lg focus:ring-1 focus:ring-[#960005]"
                      placeholder="Tiếng Anh (VD: flip-flops)"
                      value={llmTestInput.en}
                      onChange={(e) => setLlmTestInput(prev => ({ ...prev, en: e.target.value }))}
                    />
                    <input
                      type="text"
                      className="bg-[#FFFDFA] border border-[#E3DACD] px-2 py-1.5 text-xs rounded-lg focus:ring-1 focus:ring-[#960005]"
                      placeholder="Tiếng Việt (VD: dép lào)"
                      value={llmTestInput.vn}
                      onChange={(e) => setLlmTestInput(prev => ({ ...prev, vn: e.target.value }))}
                    />
                  </div>
                  
                  {llmTestError && (
                    <div className="text-red-750 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{llmTestError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isLlmTesting || !llmModel || !llmTestInput.en}
                    onClick={handleTestLLM}
                    className="mt-2 w-full px-4 py-2 bg-[#960005] hover:bg-[#bf080b] disabled:opacity-50 text-[#FFFDFA] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {isLlmTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang tạo sinh ví dụ...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Tạo câu ví dụ mẫu
                      </>
                    )}
                  </button>

                  {llmTestResult && Array.isArray(llmTestResult) && (
                    <div className="mt-3 bg-[#fff8f6] border border-[#e6bdb7] rounded-lg p-3 space-y-2 max-h-[250px] overflow-y-auto">
                      <span className="text-[11px] font-sans font-bold text-[#bf080b] uppercase tracking-wider block border-b border-[#e6bdb7]/50 pb-1">
                        Kết quả sinh (JSON Mẫu):
                      </span>
                      <div className="space-y-2">
                        {llmTestResult.map((ex, idx) => (
                          <div key={idx} className="bg-white p-2 border border-[#E3DACD]/50 rounded-md">
                            <p className="text-xs font-bold text-[#201a19] mb-1">{ex.text_en}</p>
                            <p className="text-[10px] text-[#5b5350] italic">{ex.text_vn}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Core App Intelligence Info */}
          <section className="bg-[#fff8f6] border border-[#e6bdb7] rounded-xl p-6 space-y-4">
            <h3 className="font-sans font-bold text-[#bf080b] text-base uppercase tracking-wider flex items-center gap-2">
              <Info className="w-5 h-5" /> Cơ chế đồng bộ trong ứng dụng
            </h3>
            
            <div className="space-y-3.5 text-xs text-[#5b5350] leading-relaxed">
              <p>
                <strong>1. Định cấu hình cục bộ:</strong> Toàn bộ API keys và endpoint được lưu trực tiếp tại trình duyệt (LocalStorage) của bạn, không bao giờ được gửi hay lưu trữ tĩnh trên máy chủ backend của ứng dụng.
              </p>
              <p>
                <strong>2. Xử lý qua Proxy:</strong> Máy chủ backend đóng vai trò là một cổng chuyển tiếp trung gian bảo mật để vượt qua các rào cản CORS từ phía nhà duyệt và thiết lập âm thanh thoại một cách thông suốt nhất.
              </p>
              <p>
                <strong>3. Hỗ trợ ChChunker & Code-Mixing:</strong> Khi có tùy hình 9Router LLM, Choker AI trên màn hình chính sẽ sử dụng trực tiếp mô hình bạn chọn để đem lại bản phân tích ngữ pháp phong phú nhất.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
