import React, { useState, useEffect } from "react";
import { buildTtsHeaders } from "../lib/ttsGateway";
import { Square, Volume2, Loader2 } from "lucide-react";

interface AudioPlayerButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "ghost" | "circle";
  color?: string; // Hex or CSS variable code
  audioUrl?: string;
  lang?: "en" | "vi" | "auto";
  playbackSpeed?: number;
}

export default function AudioPlayerButton({
  text,
  className = "",
  size = "md",
  variant = "ghost",
  color = "var(--color-chunks-crimson)",
  audioUrl,
  lang = "auto",
  playbackSpeed
}: AudioPlayerButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(() => {
    if (playbackSpeed) return playbackSpeed;
    const stored = Number(localStorage.getItem("ninerouter_playback_speed") || "1");
    return Number.isFinite(stored) && stored > 0 ? stored : 1.0;
  });

  // Sync speed from teacher-only AI & 9Router settings. The user-facing audio UI
  // intentionally does not expose speed controls.
  useEffect(() => {
    const syncSpeed = () => {
      const stored = Number(localStorage.getItem("ninerouter_playback_speed") || "1");
      const nextSpeed = playbackSpeed || (Number.isFinite(stored) && stored > 0 ? stored : 1.0);
      setCurrentSpeed(nextSpeed);
      if (audioInstance) {
        audioInstance.playbackRate = nextSpeed;
      }
    };

    syncSpeed();
    window.addEventListener("ninerouter_settings_updated", syncSpeed);
    return () => window.removeEventListener("ninerouter_settings_updated", syncSpeed);
  }, [playbackSpeed, audioInstance]);

  // Auto-detect language if specified as "auto"
  const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(text);
  const resolvedLang = lang === "auto" ? (isVietnamese ? "vi" : "en") : lang;

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isPlaying) {
      // Stop playback
      if (audioInstance) {
        audioInstance.pause();
        audioInstance.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.playbackRate = currentSpeed;
        setAudioInstance(audio);
        setIsLoading(false);
        setIsPlaying(true);
        
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          runSpeechSynthesisFallback();
        };

        audio.play().catch((playErr) => {
          console.warn("Audio play promise rejected, using fallback synthesis:", playErr);
          setIsPlaying(false);
          runSpeechSynthesisFallback();
        });
        return;
      } catch (err) {
        setIsLoading(false);
        runSpeechSynthesisFallback();
        return;
      }
    }

    try {
      // Read teacher-selected TTS gateway from localStorage.
      // Google Gemini is used only for TTS when selected; examples/LLM stay on 9Router.
      const nrModel = resolvedLang === "vi"
        ? (localStorage.getItem("ninerouter_tts_vietnamese_model") || "edge-tts/vi-VN-HoaiMyNeural")
        : (localStorage.getItem("ninerouter_tts_model") || "edge-tts/en-US-JennyNeural");
      const headers = buildTtsHeaders(nrModel);

      // 1. Try our high-quality Gemini / 9Router TTS endpoint
      const response = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error("Gemini TTS is not available");
      }

      const data = await response.json();
      if (data.audio) {
        const audioSrc = `data:audio/mp3;base64,${data.audio}`;
        const audio = new Audio(audioSrc);
        audio.playbackRate = currentSpeed;
        setAudioInstance(audio);
        setIsLoading(false);
        setIsPlaying(true);
        
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          runSpeechSynthesisFallback();
        };

        audio.play().catch((playErr) => {
          console.warn("Audio play promise rejected, using fallback synthesis:", playErr);
          setIsPlaying(false);
          runSpeechSynthesisFallback();
        });
      } else {
        throw new Error("No audio key was returned.");
      }
    } catch (err) {
      // 2. Fall back to standard browser speech synthesis
      setIsLoading(false);
      runSpeechSynthesisFallback();
    }
  };

  const runSpeechSynthesisFallback = () => {
    setIsPlaying(true);
    window.speechSynthesis.cancel(); // Stop other audio first

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = currentSpeed;
    if (resolvedLang === "vi") {
      utterance.lang = "vi-VN";
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.startsWith("vi-") && v.name.includes("Google")) 
                    || voices.find(v => v.lang.startsWith("vi-"));
      if (viVoice) {
        utterance.voice = viVoice;
      }
    } else {
      utterance.lang = "en-US";
      
      // Choose an English voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) 
                         || voices.find(v => v.lang.startsWith("en-"));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const buttonStyle = {
    color: isPlaying ? "white" : color,
    backgroundColor: isPlaying ? color : "transparent",
    borderColor: color
  };

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        id={`audio-player-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        onClick={handlePlay}
        disabled={isLoading}
        style={variant === "solid" ? buttonStyle : { color: isPlaying ? color : "currentColor" }}
        className={`relative inline-flex items-center gap-1 transition-all duration-300 rounded-lg cursor-pointer hover:bg-neutral-150 hover:text-neutral-900 border border-neutral-200/50 px-1.5 py-0.5 bg-neutral-50/30 focus:outline-none focus:ring-2 focus:ring-red-400 active:scale-95 disabled:opacity-50 ${className}`}
        title={`Phát âm ${resolvedLang.toUpperCase()}: "${text}"`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <Square className="w-3 h-3 fill-current animate-pulse text-red-600" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        <span className="text-[9px] font-sans font-extrabold leading-none uppercase text-neutral-550 select-none">
          {resolvedLang}
        </span>
      </button>

    </div>
  );
}
