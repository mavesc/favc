export type ExtractionStrategy = "keyframe-only" | "smart-copy" | "re-encode";

export type NonEmptyArray<T> = [T, ...T[]];

export interface TimeRange {
  start: string;
  end: string;
}

export interface ParsedTime {
  seconds: number;
  frames: number;
  original: string;
}

export interface ClipRequest {
  start: string;
  end: string;
  output: string;
  strategy?: ExtractionStrategy;
}

export interface VideoInfo {
  file: string;
  duration: number;
  framerate: number;
  width: number;
  height: number;
  codec: string;
  keyframeInterval?: number;
  keyframes?: NonEmptyArray<number>;
}

export interface ClipResult {
  requested_start: string;
  requested_end: string;
  actual_start: string;
  actual_end: string;
  strategy: ExtractionStrategy;
  frames_included: number;
  is_re_encoded: boolean;
  processing_time_ms: number;
  output: string;
}

export interface ExtractionReport {
  source: VideoInfo;
  clips: ClipResult[];
  total_processing_time_ms: number;
}

export interface StrategyContext {
  videoInfo: VideoInfo;
  startSeconds: number;
  endSeconds: number;
  outputPath: string;
  keyframes?: NonEmptyArray<number>;
}

export interface ExtractOptions {
  input: string;
  start?: string;
  end?: string;
  output?: string;
  clips?: string;
  strategy?: ExtractionStrategy;
  report?: string;
}

export interface ThumbnailOptions {
  input: string;
  time: string;
  output: string;
}
