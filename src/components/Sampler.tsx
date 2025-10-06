import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Pad, RecordedHit } from '../types';
import { PadComponent } from './PadComponent';
import { Recorder } from './Recorder';

// Import default sounds
import HH1 from '../assets/sounds/HH_1_ERR3_SP1200R.wav';
import HH2 from '../assets/sounds/HH_FullDrumHit1_SP12.wav';
import HHO from '../assets/sounds/HHo_Vinyl_DLG1_SP12.wav';
import Ride from '../assets/sounds/Ride_RealTing1_45_SP1200.wav';
import Rim from '../assets/sounds/Rim_MysteryVin_SP1200.wav';
import SD1 from '../assets/sounds/SD_45VinylE1_SP1200R.wav';
import SD2 from '../assets/sounds/SD_UheACE1_SP1200R.wav';
import Tabla from '../assets/sounds/Tabla017_SP1200F.wav';
import Tom1 from '../assets/sounds/Tom_LiveLounge1_SP1200F.wav';
import Tom3 from '../assets/sounds/Tom_LiveLounge3_SP1200F.wav';

const GRID_SIZE = 16; // 4x4 grid
const PAD_COLORS = [
  '#ff6b35', '#f7931e', '#fdc500', '#c1d82f',
  '#00a651', '#00adef', '#0072bc', '#2e3192',
  '#662d91', '#ec008c', '#f26522', '#ed1c24',
  '#a7a9ac', '#414042', '#d1d3d4', '#939598',
];

const DEFAULT_SOUNDS = [
  { url: SD1, name: 'Snare 1', key: 'Q' },
  { url: SD2, name: 'Snare 2', key: 'W' },
  { url: HH1, name: 'Hi-Hat 1', key: 'E' },
  { url: HH2, name: 'Hi-Hat 2', key: 'R' },
  { url: HHO, name: 'Hi-Hat Open', key: 'A' },
  { url: Tom1, name: 'Tom 1', key: 'S' },
  { url: Tom3, name: 'Tom 3', key: 'D' },
  { url: Ride, name: 'Ride', key: 'F' },
  { url: Rim, name: 'Rim', key: 'Z' },
  { url: Tabla, name: 'Tabla', key: 'X' },
];

export const Sampler: React.FC = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [playingPads, setPlayingPads] = useState<Set<number>>(new Set());
  const audioBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const keyToPadMapRef = useRef<Map<string, number>>(new Map());
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedHits, setRecordedHits] = useState<RecordedHit[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // Initialize pads
  useEffect(() => {
    const initialPads: Pad[] = Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      audioBuffer: null,
      audioFile: null,
      key: '',
      color: PAD_COLORS[i % PAD_COLORS.length],
    }));
    setPads(initialPads);
  }, []);

  // Initialize Audio Context on first user interaction
  const initAudioContext = useCallback(() => {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  }, [audioContext]);

  // Load default sounds
  useEffect(() => {
    const loadDefaultSounds = async () => {
      // Initialize audio context if needed
      let ctx = audioContext;
      if (!ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AudioContextClass();
        setAudioContext(ctx);
      }
      
      for (let i = 0; i < DEFAULT_SOUNDS.length; i++) {
        const sound = DEFAULT_SOUNDS[i];
        try {
          const response = await fetch(sound.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          audioBuffersRef.current.set(i, audioBuffer);
          keyToPadMapRef.current.set(sound.key, i);
          
          // Create a mock File object for display
          const mockFile = new File([], sound.name, { type: 'audio/wav' });
          
          setPads((prevPads) =>
            prevPads.map((pad) =>
              pad.id === i
                ? { ...pad, audioBuffer, audioFile: mockFile, key: sound.key }
                : pad
            )
          );
        } catch (error) {
          console.error(`Failed to load ${sound.name}:`, error);
        }
      }
    };

    loadDefaultSounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle audio upload
  const handleAudioUpload = async (id: number, file: File) => {
    const ctx = initAudioContext();
    
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    audioBuffersRef.current.set(id, audioBuffer);
    
    setPads((prevPads) =>
      prevPads.map((pad) =>
        pad.id === id
          ? { ...pad, audioBuffer, audioFile: file }
          : pad
      )
    );
  };

  // Handle key assignment
  const handleKeyAssign = (id: number, key: string) => {
    // Remove old mapping if exists
    const oldKey = pads.find((p) => p.id === id)?.key;
    if (oldKey) {
      keyToPadMapRef.current.delete(oldKey);
    }

    // Remove key from other pads
    setPads((prevPads) =>
      prevPads.map((pad) =>
        pad.key === key ? { ...pad, key: '' } : pad
      )
    );

    // Add new mapping
    keyToPadMapRef.current.set(key, id);
    
    setPads((prevPads) =>
      prevPads.map((pad) =>
        pad.id === id ? { ...pad, key } : pad
      )
    );
  };

  // Play audio
  const playAudio = useCallback((id: number) => {
    if (!audioContext) return;

    const audioBuffer = audioBuffersRef.current.get(id);
    if (!audioBuffer) return;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);

    setPlayingPads((prev) => new Set(prev).add(id));
    
    // Record hit if recording
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTimeRef.current;
      setRecordedHits((prev) => [...prev, { padId: id, timestamp }]);
    }
    
    setTimeout(() => {
      setPlayingPads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 100);
  }, [audioContext, isRecording]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input or focused on button
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
        return;
      }

      const key = e.key.toUpperCase();
      const padId = keyToPadMapRef.current.get(key);
      
      if (padId !== undefined) {
        e.preventDefault();
        playAudio(padId);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playAudio]);

  // Recording handlers
  const handleRecordingChange = (recording: boolean) => {
    setIsRecording(recording);
    if (recording) {
      // Start recording
      setRecordedHits([]);
      recordingStartTimeRef.current = Date.now();
    }
  };

  const handleRecordHit = (padId: number, timestamp: number) => {
    setRecordedHits((prev) => [...prev, { padId, timestamp }]);
  };

  return (
    <div className="sampler-container">
      <Recorder
        onPlay={playAudio}
        isRecording={isRecording}
        onRecordingChange={handleRecordingChange}
        onRecordHit={handleRecordHit}
        recordedHits={recordedHits}
      />

      <div className="pads-grid">
        {pads.map((pad) => (
          <PadComponent
            key={pad.id}
            pad={pad}
            onAudioUpload={handleAudioUpload}
            onKeyAssign={handleKeyAssign}
            onPlay={playAudio}
            isPlaying={playingPads.has(pad.id)}
          />
        ))}
      </div>

      <div className="instructions">
        <h3>How to use:</h3>
        <ul>
          <li>Click an empty pad to upload an audio file</li>
          <li>Click "Set Key" to assign a keyboard key to the pad</li>
          <li>Click the ↻ button to replace an existing sample</li>
          <li>Click a pad or press its assigned key to play the sample</li>
          <li>Set BPM and bars, hit REC, then play your drums - they'll loop back!</li>
        </ul>
      </div>
    </div>
  );
};

