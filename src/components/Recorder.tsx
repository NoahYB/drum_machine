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
  onRecordHit,
  recordedHits,
}) => {
  const [bpm, setBpm] = useState<number>(120);
  const [bars, setBars] = useState<8 | 16>(8);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0); // 0 to 1
  
  const recordingStartTimeRef = useRef<number>(0);
  const playbackIntervalRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const scheduledHitsRef = useRef<Set<number>>(new Set());

  // Calculate duration for selected bars
  const calculateDuration = (selectedBars: number, selectedBpm: number): number => {
    // 4 beats per bar, duration in milliseconds
    const beats = selectedBars * 4;
    return (beats / selectedBpm) * 60 * 1000;
  };

  // Handle record button
  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      onRecordingChange(false);
      
      const duration = calculateDuration(bars, bpm);
      const newRecording: Recording = {
        hits: recordedHits,
        bars,
        bpm,
        duration,
      };
      
      setRecording(newRecording);
    } else {
      // Start recording
      setRecording(null);
      setIsPlaying(false);
      onRecordingChange(true);
      recordingStartTimeRef.current = Date.now();
      
      // Auto-stop after duration
      const duration = calculateDuration(bars, bpm);
      setTimeout(() => {
        onRecordingChange(false);
      }, duration);
    }
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
    
    // Schedule all hits
    recording.hits.forEach((hit, index) => {
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
    setRecording(null);
    onRecordingChange(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Calculate current bar and beat
  const getCurrentBarAndBeat = () => {
    const totalBeats = bars * 4;
    const currentBeat = Math.floor(playbackPosition * totalBeats);
    const bar = Math.floor(currentBeat / 4) + 1;
    const beat = (currentBeat % 4) + 1;
    return { bar, beat };
  };

  const { bar: currentBar, beat: currentBeat } = isPlaying ? getCurrentBarAndBeat() : { bar: 1, beat: 1 };

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
              disabled={isRecording || isPlaying}
            />
          </div>
          
          <div className="bars-control">
            <label>BARS</label>
            <div className="bars-selector">
              <button
                className={`bar-btn ${bars === 8 ? 'active' : ''}`}
                onClick={() => setBars(8)}
                disabled={isRecording || isPlaying}
              >
                8
              </button>
              <button
                className={`bar-btn ${bars === 16 ? 'active' : ''}`}
                onClick={() => setBars(16)}
                disabled={isRecording || isPlaying}
              >
                16
              </button>
            </div>
          </div>
        </div>

        <div className="recorder-transport">
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleRecord}
            disabled={isPlaying}
          >
            {isRecording ? '⬛ STOP REC' : '● REC'}
          </button>
          
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayStop}
            disabled={isRecording || !recording || recording.hits.length === 0}
          >
            {isPlaying ? '⬛ STOP' : '▶ PLAY'}
          </button>
          
          <button
            className="clear-btn"
            onClick={handleClear}
            disabled={isRecording || isPlaying}
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
            <span className="value">{recording?.hits.length || 0}</span>
          </div>
        </div>
        
        <div className="playback-bar-container">
          <div className="playback-bar">
            <div 
              className="playback-progress" 
              style={{ width: `${(isPlaying ? playbackPosition : 0) * 100}%` }}
            />
            {/* Bar markers */}
            {Array.from({ length: bars - 1 }, (_, i) => (
              <div 
                key={i} 
                className="bar-marker" 
                style={{ left: `${((i + 1) / bars) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {isRecording && (
        <div className="recording-status">
          <div className="recording-pulse">●</div>
          <span>RECORDING...</span>
        </div>
      )}
    </div>
  );
};

