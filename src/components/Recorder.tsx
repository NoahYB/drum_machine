import React, { useState, useEffect, useRef } from 'react';
import type { Recording, RecordedHit } from '../types';

interface RecorderProps {
  onPlay: (padId: number) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecordHit: (padId: number, timestamp: number) => void;
  recordedHits: RecordedHit[];
}

export const Recorder: React.FC<RecorderProps> = ({
  onPlay,
  isRecording,
  onRecordingChange,
  recordedHits,
}) => {
  const [bpm, setBpm] = useState<number>(120);
  const [bars, setBars] = useState<8 | 16>(8);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0); // 0 to 1
  const [recordingPosition, setRecordingPosition] = useState<number>(0); // 0 to 1
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [countInBars, setCountInBars] = useState<0 | 1 | 2>(0);
  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInBar, setCountInBar] = useState<number>(0);
  
  const recordingStartTimeRef = useRef<number>(0);
  const countInTimeoutRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const scheduledHitsRef = useRef<Set<number>>(new Set());
  const recordingIntervalRef = useRef<number | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context for metronome
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
  }, []);

  // Calculate duration for selected bars
  const calculateDuration = (selectedBars: number, selectedBpm: number): number => {
    // 4 beats per bar, duration in milliseconds
    const beats = selectedBars * 4;
    return (beats / selectedBpm) * 60 * 1000;
  };

  // Play metronome click
  const playMetronomeClick = (isDownbeat: boolean = false) => {
    if (!audioContextRef.current || !metronomeEnabled) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different frequencies for downbeat vs other beats
    oscillator.frequency.value = isDownbeat ? 1200 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  // Start metronome
  const startMetronome = () => {
    if (!metronomeEnabled) return;
    
    const beatDuration = (60 / bpm) * 1000; // milliseconds per beat
    let beatCount = 0;
    
    // Play first click immediately
    playMetronomeClick(true);
    
    metronomeIntervalRef.current = window.setInterval(() => {
      beatCount++;
      const isDownbeat = beatCount % 4 === 0;
      playMetronomeClick(isDownbeat);
    }, beatDuration);
  };

  // Stop metronome
  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
  };

  // Handle record button
  const handleRecord = () => {
    if (isRecording || isCountingIn) {
      // Stop recording or count-in
      if (isCountingIn) {
        setIsCountingIn(false);
        stopMetronome();
        if (countInTimeoutRef.current) {
          clearTimeout(countInTimeoutRef.current);
          countInTimeoutRef.current = null;
        }
      } else {
        onRecordingChange(false);
        stopMetronome();
        setRecordingPosition(0);
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        const duration = calculateDuration(bars, bpm);
        const newRecording: Recording = {
          hits: recordedHits,
          bars,
          bpm,
          duration,
        };
        
        setRecording(newRecording);
      }
    } else {
      // Start recording (with optional count-in)
      setRecording(null);
      setIsPlaying(false);
      setRecordingPosition(0);
      
      if (countInBars > 0) {
        // Start count-in
        setIsCountingIn(true);
        setCountInBar(1);
        
        // Start metronome for count-in
        if (metronomeEnabled) {
          startMetronome();
        }
        
        // Update count-in bar display
        const barDuration = (60 / bpm) * 4 * 1000; // 4 beats per bar
        let currentBar = 1;
        
        const barInterval = window.setInterval(() => {
          currentBar++;
          if (currentBar <= countInBars) {
            setCountInBar(currentBar);
          } else {
            clearInterval(barInterval);
          }
        }, barDuration);
        
        // Start actual recording after count-in
        const countInDuration = calculateDuration(countInBars, bpm);
        countInTimeoutRef.current = window.setTimeout(() => {
          clearInterval(barInterval);
          setIsCountingIn(false);
          startActualRecording();
        }, countInDuration);
      } else {
        // Start recording immediately (no count-in)
        startActualRecording();
      }
    }
  };

  const startActualRecording = () => {
    onRecordingChange(true);
    recordingStartTimeRef.current = Date.now();
    
    // Start metronome if enabled (and not already running from count-in)
    if (metronomeEnabled && !isCountingIn) {
      startMetronome();
    }
    
    // Update recording position
    const duration = calculateDuration(bars, bpm);
    recordingIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - recordingStartTimeRef.current;
      const position = Math.min(elapsed / duration, 1);
      setRecordingPosition(position);
    }, 16); // ~60fps
    
    // Auto-stop after duration
    setTimeout(() => {
      onRecordingChange(false);
      stopMetronome();
      setRecordingPosition(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }, duration);
  };

  // Handle play/stop
  const handlePlayStop = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    if (!recording || recording.hits.length === 0) return;
    
    setIsPlaying(true);
    playbackStartTimeRef.current = Date.now();
    scheduledHitsRef.current.clear();
    
    // Start metronome if enabled
    if (metronomeEnabled) {
      startMetronome();
    }
    
    // Schedule all hits
    recording.hits.forEach((hit) => {
      const timeoutId = window.setTimeout(() => {
        onPlay(hit.padId);
        scheduledHitsRef.current.delete(timeoutId);
      }, hit.timestamp);
      scheduledHitsRef.current.add(timeoutId);
    });
    
    // Update playback position
    playbackIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - playbackStartTimeRef.current;
      const position = Math.min(elapsed / recording.duration, 1);
      setPlaybackPosition(position);
      
      if (position >= 1) {
        // Loop playback
        stopPlayback();
        setTimeout(() => startPlayback(), 50);
      }
    }, 16); // ~60fps
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setPlaybackPosition(0);
    stopMetronome();
    
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    
    // Cancel any scheduled hits
    scheduledHitsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    scheduledHitsRef.current.clear();
  };

  const handleClear = () => {
    stopPlayback();
    stopMetronome();
    setRecording(null);
    setRecordingPosition(0);
    setIsCountingIn(false);
    if (countInTimeoutRef.current) {
      clearTimeout(countInTimeoutRef.current);
      countInTimeoutRef.current = null;
    }
    onRecordingChange(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (countInTimeoutRef.current) {
        clearTimeout(countInTimeoutRef.current);
      }
      scheduledHitsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      scheduledHitsRef.current.clear();
    };
  }, []);

  // Calculate current bar and beat
  const getCurrentBarAndBeat = (position: number) => {
    const totalBeats = bars * 4;
    const currentBeat = Math.floor(position * totalBeats);
    const bar = Math.floor(currentBeat / 4) + 1;
    const beat = (currentBeat % 4) + 1;
    return { bar, beat };
  };

  const currentPosition = isRecording ? recordingPosition : isPlaying ? playbackPosition : 0;
  const { bar: currentBar, beat: currentBeat } = (isRecording || isPlaying) 
    ? getCurrentBarAndBeat(currentPosition) 
    : { bar: 1, beat: 1 };

  return (
    <div className="recorder-container">
      <div className="recorder-header">
        <div className="recorder-title">LOOP RECORDER</div>
      </div>

      <div className="recorder-controls">
        <div className="recorder-settings">
          <div className="bpm-control">
            <label>BPM</label>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
              disabled={isRecording || isPlaying || isCountingIn}
            />
          </div>
          
          <div className="bars-control">
            <label>BARS</label>
            <div className="bars-selector">
              <button
                className={`bar-btn ${bars === 8 ? 'active' : ''}`}
                onClick={() => setBars(8)}
                disabled={isRecording || isPlaying || isCountingIn}
              >
                8
              </button>
              <button
                className={`bar-btn ${bars === 16 ? 'active' : ''}`}
                onClick={() => setBars(16)}
                disabled={isRecording || isPlaying || isCountingIn}
              >
                16
              </button>
            </div>
          </div>

          <div className="metronome-control">
            <label>
              <input
                type="checkbox"
                checked={metronomeEnabled}
                onChange={(e) => setMetronomeEnabled(e.target.checked)}
                disabled={isRecording || isPlaying || isCountingIn}
              />
              <span>METRONOME</span>
            </label>
          </div>

          <div className="countin-control">
            <label>COUNT-IN</label>
            <div className="countin-selector">
              <button
                className={`countin-btn ${countInBars === 0 ? 'active' : ''}`}
                onClick={() => setCountInBars(0)}
                disabled={isRecording || isPlaying || isCountingIn}
              >
                OFF
              </button>
              <button
                className={`countin-btn ${countInBars === 1 ? 'active' : ''}`}
                onClick={() => setCountInBars(1)}
                disabled={isRecording || isPlaying || isCountingIn}
              >
                1
              </button>
              <button
                className={`countin-btn ${countInBars === 2 ? 'active' : ''}`}
                onClick={() => setCountInBars(2)}
                disabled={isRecording || isPlaying || isCountingIn}
              >
                2
              </button>
            </div>
          </div>
        </div>

        <div className="recorder-transport">
          <button
            className={`record-btn ${isRecording || isCountingIn ? 'recording' : ''}`}
            onClick={(e) => {
              handleRecord();
              e.currentTarget.blur(); // Remove focus so keyboard works immediately
            }}
            disabled={isPlaying}
          >
            {isCountingIn ? '⬛ STOP' : isRecording ? '⬛ STOP REC' : '● REC'}
          </button>
          
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={(e) => {
              handlePlayStop();
              e.currentTarget.blur(); // Remove focus so keyboard works immediately
            }}
            disabled={isRecording || isCountingIn || !recording || recording.hits.length === 0}
          >
            {isPlaying ? '⬛ STOP' : '▶ PLAY'}
          </button>
          
          <button
            className="clear-btn"
            onClick={(e) => {
              handleClear();
              e.currentTarget.blur();
            }}
            disabled={isRecording || isPlaying || isCountingIn}
          >
            ✕ CLEAR
          </button>
        </div>
      </div>

      <div className="playback-display">
        <div className="playback-info">
          <div className="position-indicator">
            <span className="label">BAR</span>
            <span className="value">{currentBar}/{bars}</span>
          </div>
          <div className="position-indicator">
            <span className="label">BEAT</span>
            <span className="value">{currentBeat}/4</span>
          </div>
          <div className="position-indicator">
            <span className="label">HITS</span>
            <span className="value">{isRecording ? recordedHits.length : (recording?.hits.length || 0)}</span>
          </div>
        </div>
        
        <div className="playback-bar-container">
          <div className="playback-bar">
            <div 
              className={`playback-progress ${isRecording ? 'recording' : ''}`}
              style={{ width: `${currentPosition * 100}%` }}
            />
            {/* Bar markers */}
            {Array.from({ length: bars - 1 }, (_, i) => (
              <div 
                key={`bar-${i}`}
                className="bar-marker" 
                style={{ left: `${((i + 1) / bars) * 100}%` }}
              />
            ))}
            {/* Hit markers - show recorded hits */}
            {(recording || isRecording) && (recordedHits.length > 0 || recording?.hits) && (
              <>
                {(isRecording ? recordedHits : recording?.hits || []).map((hit, index) => {
                  const duration = calculateDuration(bars, bpm);
                  const position = (hit.timestamp / duration) * 100;
                  return (
                    <div 
                      key={`hit-${index}`}
                      className="hit-marker" 
                      style={{ left: `${Math.min(position, 100)}%` }}
                      title={`Hit at ${(hit.timestamp / 1000).toFixed(2)}s`}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {isCountingIn && (
        <div className="countin-status">
          <div className="countin-pulse">●</div>
          <span>COUNT-IN: BAR {countInBar}/{countInBars}</span>
        </div>
      )}

      {isRecording && !isCountingIn && (
        <div className="recording-status">
          <div className="recording-pulse">●</div>
          <span>RECORDING...</span>
        </div>
      )}
    </div>
  );
};

