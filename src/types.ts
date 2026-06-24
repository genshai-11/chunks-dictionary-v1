export type ChunkColor = 'green' | 'blue' | 'red' | 'pink';

export interface ExampleItem {
  id: string;
  type: 'normal' | 'codemix';
  text_en: string; // For normal: English sentence. For codemix: English chunk mixed into Vietnamese.
  text_vn: string; // Vietnamese translation or context.
  audio_url?: string; // Cache url of TTS or recording
  playback_speed?: number; // Speed rate e.g. 0.8, 1.0, 1.2, 1.5
}

export interface RelatedTermItem {
  term_en: string;
  term_vn: string;
  example_en?: string;
  example_vn?: string;
}

export interface TeacherAudioItem {
  id: string;
  teacher_name: string;
  audio_url: string; // Stored audio base64 or storage url
  duration_sec: number;
  created_at: string;
  playback_speed?: number; // Speed rate e.g. 0.8, 1.0, 1.2, 1.5
  lang?: 'en' | 'vi';
}

export interface DictionaryEntry {
  id: string;
  color: ChunkColor;
  vn: string;          // Vietnamese phrase (headword)
  en: string;          // English translation
  pos: string;         // Part of speech (e.g. noun, phrase, idiom)
  ipa: string;         // Phonetic IPA
  definition: string;  // Detailed explanation in Vietnamese
  definition_en?: string; // English counterpart
  image_url?: string;  // Unsplash or vector URL
  examples: ExampleItem[];
  related_terms?: RelatedTermItem[];
  teacher_audios?: TeacherAudioItem[];
  note_text?: string;
  tags?: string[];
  level?: 'easy' | 'medium' | 'hard'; // Level of difficulty
  status: 'published' | 'draft';
  created_by?: string;
  isRecommended?: boolean;
  updated_at: string;
}

export interface AnnouncementItem {
  id: string;
  content: string;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  assignedChunks: string[];
  announcements: AnnouncementItem[];
}

export interface SegmentedChunk {
  text: string;
  color?: ChunkColor; // undefined if not matching a dictionary chunk
  translation?: string;
  explanation?: string;
  entry_id?: string;  // links to dictionary page if matched
}

export interface SegmentationResult {
  sentence: string;
  chunks: SegmentedChunk[];
}
