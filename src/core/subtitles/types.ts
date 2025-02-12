export interface SubtitleWord {
  text: string;
  start: number;
  duration: number;
}

export interface SubtitleSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: SubtitleWord[];
}

export interface AudioSegmentMetadata {
  subtitleId?: string;
  wordIndex?: number;
  speaker?: string;
  emotion?: string;
  [key: string]: any;
}

export interface AudioRenderOptions {
  voice: string;
  speed: number;
  preserveProsody: boolean;
  useWordTimings: boolean;
}
