import React, { useState } from "react";
import TeacherDashboardBulkAudio from "./TeacherDashboardBulkAudio";
import TeacherDashboardBulkExample from "./TeacherDashboardBulkExample";
import { Sparkles, Volume2, MessageSquare } from "lucide-react";
import { DictionaryEntry } from "../types";

export default function TeacherDashboardAIGenerator({
  entries,
  onUpdateEntries
}: {
  entries: DictionaryEntry[];
  onUpdateEntries: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"audio" | "example">("audio");

  return (
    <div className="space-y-4">
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("audio")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
            activeTab === "audio"
              ? "border-b-2 border-red-600 text-red-600 bg-white shadow-sm"
              : "text-neutral-500 bg-neutral-50 hover:bg-neutral-100 border-b-2 border-transparent"
          }`}
        >
          <Volume2 className="w-4 h-4" /> TTS Audio Generation
        </button>
        <button
          onClick={() => setActiveTab("example")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
            activeTab === "example"
              ? "border-b-2 border-red-600 text-red-600 bg-white shadow-sm"
              : "text-neutral-500 bg-neutral-50 hover:bg-neutral-100 border-b-2 border-transparent"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Batch Example Generation
        </button>
      </div>

      <div className="bg-transparent">
        {activeTab === "audio" ? (
          <TeacherDashboardBulkAudio entries={entries} onUpdateEntries={onUpdateEntries} />
        ) : (
          <TeacherDashboardBulkExample entries={entries} onUpdateEntries={onUpdateEntries} />
        )}
      </div>
    </div>
  );
}
