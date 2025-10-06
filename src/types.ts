export interface Pad {
  id: number;
  audioBuffer: AudioBuffer | null;
  audioFile: File | null;
  key: string;
  color: string;
}

export interface AudioContextState {
  context: AudioContext | null;
  init: () => void;
}

export interface RecordedHit {
  padId: number;
  timestamp: number; // milliseconds from start
}

export interface Recording {
  hits: RecordedHit[];
  bars: 8 | 16;
  bpm: number;
  duration: number; // total duration in milliseconds
}

