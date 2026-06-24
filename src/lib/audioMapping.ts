import { TeacherAudioItem } from "../types";

type AudioOwner = {
  teacher_audios?: TeacherAudioItem[];
};

export function getVocabularyAudioItem(owner: AudioOwner | null | undefined, lang: "en" | "vi"): TeacherAudioItem | undefined {
  return owner?.teacher_audios?.find((audio) => audio.lang === lang && !!audio.audio_url);
}

export function getVocabularyAudioUrl(owner: AudioOwner | null | undefined, lang: "en" | "vi"): string | undefined {
  return getVocabularyAudioItem(owner, lang)?.audio_url;
}

export function getLectureAudioItem(owner: AudioOwner | null | undefined): TeacherAudioItem | undefined {
  return owner?.teacher_audios?.find((audio) => !audio.lang && !!audio.audio_url);
}

export function replaceLectureAudio(owner: AudioOwner, lectureAudio: TeacherAudioItem): TeacherAudioItem[] {
  return [lectureAudio, ...(owner.teacher_audios || []).filter((audio) => !!audio.lang)];
}

export function removeLectureAudio(owner: AudioOwner): TeacherAudioItem[] {
  return (owner.teacher_audios || []).filter((audio) => !!audio.lang);
}
