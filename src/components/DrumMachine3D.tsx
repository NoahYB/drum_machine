import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PSXPostProcessing } from './PSXPostProcessing';
import type { RecordedHit } from '../types';

// Import sounds
import HH1 from '../assets/sounds/HH_1_ERR3_SP1200R.wav';
import HH2 from '../assets/sounds/HH_FullDrumHit1_SP12.wav';
import HHO from '../assets/sounds/HHo_Vinyl_DLG1_SP12.wav';
import Ride from '../assets/sounds/Ride_RealTing1_45_SP1200.wav';
import Rim from '../assets/sounds/Rim_MysteryVin_SP1200.wav';
import SD1 from '../assets/sounds/SD_45VinylE1_SP1200R.wav';
import SD2 from '../assets/sounds/DillaStopSnare.wav';
import Tabla from '../assets/sounds/Tabla017_SP1200F.wav';
import Tom1 from '../assets/sounds/Tom_LiveLounge1_SP1200F.wav';
import Tom3 from '../assets/sounds/Tom_LiveLounge3_SP1200F.wav';
import Bass1 from '../assets/sounds/JAY_DEE_vol_01_kit_03_bass_B_2.wav';
import Bass2 from '../assets/sounds/JAY_DEE_vol_01_kit_08_bass_Fsharp.wav';
import Bass3 from '../assets/sounds/JAY_DEE_vol_01_kit_09_bass_Csharp.wav';
import Bass4 from '../assets/sounds/JAY_DEE_vol_02_kit_01_bass_01_G.wav';
import Bass5 from '../assets/sounds/JAY_DEE_vol_02_kit_01_bass_02_Dsharp.wav';
import Bass6 from '../assets/sounds/JAY_DEE_vol_02_kit_05_bass_C.wav';

const DEFAULT_SOUNDS = [
  { url: SD1, name: 'Snare', key: 'Q' },
  { url: SD2, name: 'Snare2', key: 'W' },
  { url: HH1, name: 'HH1', key: 'E' },
  { url: HH2, name: 'HH2', key: 'R' },
  { url: HHO, name: 'HHO', key: 'A' },
  { url: Tom1, name: 'Tom1', key: 'S' },
  { url: Tom3, name: 'Tom3', key: 'D' },
  { url: Ride, name: 'Ride', key: 'F' },
  { url: Rim, name: 'Rim', key: 'Z' },
  { url: Tabla, name: 'Tabla', key: 'X' },
  { url: Bass1, name: '808 B', key: 'C' },
  { url: Bass2, name: '808 F♯', key: 'V' },
  { url: Bass3, name: '808 C♯', key: 'T' },
  { url: Bass4, name: '808 G', key: 'G' },
  { url: Bass5, name: '808 D♯', key: 'Y' },
  { url: Bass6, name: '808 C', key: 'H' },
];

// Simple Phong Material (no custom shader)
function createPSXMaterial(color: string) {
  return new THREE.MeshPhongMaterial({
    color: color,
    shininess: 30,
    side: THREE.DoubleSide,
  });
}

// Individual Pad Component with key label
function DrumPad({ 
  position, 
  index, 
  color, 
  onHit, 
  isPlaying,
  keyLabel
}: { 
  position: [number, number, number]; 
  index: number; 
  color: string; 
  onHit: (index: number) => void;
  isPlaying: boolean;
  keyLabel: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial | null>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      materialRef.current = createPSXMaterial(color);
      meshRef.current.material = materialRef.current;
      meshRef.current.renderOrder = 1;
    }
  }, [color]);

  useFrame(() => {
    // Animate when playing
    if (meshRef.current && isPlaying) {
      meshRef.current.position.y = position[1] - 0.05;
      meshRef.current.scale.setScalar(0.95);
    } else if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        position[1],
        0.3
      );
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.3);
    }
  });

  // Create text texture for key label
  const textTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 128, 128);
      ctx.font = 'bold 80px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(keyLabel, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [keyLabel]);

  return (
    <group position={position}>
      {/* Pad button */}
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHit(index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[0.9, 0.15, 0.9]} />
      </mesh>
      
      {/* Key label on top */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial map={textTexture} transparent />
      </mesh>
    </group>
  );        
}

// Main drum machine body - cream base with integrated screen module
function DrumMachineBody({
  playbackPosition,
  recordingPosition,
  isPlaying,
  isRecording,
  bpm
}: {
  playbackPosition: number;
  recordingPosition: number;
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
}) {
  const baseMeshRef = useRef<THREE.Mesh>(null);
  const screenModuleRef = useRef<THREE.Mesh>(null);
  const screenDisplayRef = useRef<THREE.Mesh>(null);
  const [, setForceUpdate] = useState(0);
  
  // Update screen every frame when playing/recording
  useFrame(() => {
    if (isPlaying || isRecording) {
      setForceUpdate(prev => prev + 1);
    }
  });
  
  // Create text texture for screen with playbar
  const screenTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 512, 256);
      
      // Green text - title
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('DrumMachine3D', 256, 20);
      
      // BPM display
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`BPM: ${bpm}`, 256, 70);
      
      // Playbar
      const barWidth = 480;
      const barHeight = 30;
      const barX = 16;
      const barY = 120;
      
      // Playbar background
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      // Playbar progress
      const currentPosition = isRecording ? recordingPosition : playbackPosition;
      if (isPlaying || isRecording) {
        ctx.fillStyle = isRecording ? '#ff0000' : '#00ff00';
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * currentPosition, barHeight - 4);
      }
      
      // Status text
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = isRecording ? '#ff0000' : '#00ff00';
      ctx.textAlign = 'center';
      if (isRecording) {
        ctx.fillText('● RECORDING', 256, 170);
      } else if (isPlaying) {
        ctx.fillText('▶ PLAYING', 256, 170);
      } else {
        ctx.fillText('READY', 256, 170);
      }
      
      // Add scanline effect
      for (let i = 0; i < 256; i += 4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, i, 512, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [playbackPosition, recordingPosition, isPlaying, isRecording, bpm]);
  
  useEffect(() => {
    const material = createPSXMaterial('#e8e4d9');
    
    if (baseMeshRef.current) baseMeshRef.current.material = material;
    if (screenModuleRef.current) screenModuleRef.current.material = material;
  }, []);

  return (
    <>
      {/* Main cream base platform - extended on Z axis */}
      <mesh ref={baseMeshRef} position={[0, -0.4, 0]}>
        <boxGeometry args={[5.65, 0.6, 6.5]} />
      </mesh>
      
      {/* Screen module housing - flush with base at the back */}
      <mesh ref={screenModuleRef} position={[0, -0.4, -3.8]}>
        <boxGeometry args={[5.65, 0.6, 1.4]} />
      </mesh>
      
      {/* Black screen display with green text - flat on top */}
      <mesh ref={screenDisplayRef} position={[0, -0.09, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.2, 1.8]} />
        <meshBasicMaterial map={screenTexture} />
      </mesh>
    </>
  );
}

// Scene component
function Scene({ 
  playSound, 
  playingPads,
  playbackPosition,
  recordingPosition,
  isPlaying,
  isRecording,
  bpm
}: { 
  playSound: (index: number) => void;
  playingPads: Set<number>;
  playbackPosition: number;
  recordingPosition: number;
  isPlaying: boolean;
  isRecording: boolean;
  recordedHits: RecordedHit[];
  bpm: number;
  bars: number;
}) {
  const { camera } = useThree();
  
  // Position camera for nice angled view
  useEffect(() => {
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Pad colors (PSX palette)
  const padColors = [
    '#ff6b35', '#f7931e', '#fdc500', '#c1d82f',
    '#00a651', '#00adef', '#0072bc', '#2e3192',
    '#662d91', '#ec008c', '#f26522', '#ed1c24',
    '#a7a9ac', '#414042', '#d1d3d4', '#939598',
  ];

  // Generate 4x4 grid of pads
  const pads = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      const x = (col - 1.5) * 1.1;
      const z = (row - 1.5) * 1.1;
      
      pads.push(
        <DrumPad
          key={index}
          position={[x, 0, z]}
          index={index}
          color={padColors[index]}
          onHit={playSound}
          isPlaying={playingPads.has(index)}
          keyLabel={DEFAULT_SOUNDS[index].key}
        />
      );
    }
  }

  return (
    <>
      <ambientLight intensity={2.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-5, 3, -5]} intensity={1.0} />
      <pointLight position={[0, 5, 0]} intensity={1.5} />
      
      <DrumMachineBody 
        playbackPosition={playbackPosition}
        recordingPosition={recordingPosition}
        isPlaying={isPlaying}
        isRecording={isRecording}
        bpm={bpm}
      />
      {pads}
      
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2}
      />
      
      <PSXPostProcessing />
    </>
  );
}

// Main component
export function DrumMachine3D() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffers, setAudioBuffers] = useState<Map<number, AudioBuffer>>(new Map());
  const [playingPads, setPlayingPads] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recording, setRecording] = useState<{ hits: RecordedHit[], bars: number, bpm: number, duration: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [recordingPosition, setRecordingPosition] = useState<number>(0);
  const [menuCollapsed, setMenuCollapsed] = useState<boolean>(false);
  const bars = 8; // Fixed to 8 bars
  const countInBars = 1; // Fixed to 4 beat count-in (1 bar)
  const recordedHitsRef = useRef<RecordedHit[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);
  const scheduledHitsRef = useRef<Set<number>>(new Set());
  const playbackIntervalRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load sounds
  useEffect(() => {
    const loadSounds = async () => {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      setAudioContext(ctx);
      
      const buffers = new Map<number, AudioBuffer>();
      
      for (let i = 0; i < DEFAULT_SOUNDS.length; i++) {
        const sound = DEFAULT_SOUNDS[i];
        if (sound.url) {
          try {
            const response = await fetch(sound.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            buffers.set(i, audioBuffer);
          } catch (error) {
            console.error(`Failed to load sound ${i}:`, error);
          }
        }
      }
      
      setAudioBuffers(buffers);
    };
    
    loadSounds();
  }, []);

  // Play sound
  const playSound = useCallback((index: number) => {
    if (!audioContext) return;
    
    const buffer = audioBuffers.get(index);
    if (!buffer) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    setPlayingPads(prev => new Set(prev).add(index));
    
    // Record hit if recording
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTimeRef.current;
      recordedHitsRef.current.push({ padId: index, timestamp });
    }
    
    setTimeout(() => {
      setPlayingPads(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 100);
  }, [audioContext, audioBuffers, isRecording]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
        return;
      }
      
      const key = e.key.toUpperCase();
      const index = DEFAULT_SOUNDS.findIndex(s => s.key === key);
      if (index !== -1) {
        playSound(index);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playSound]);

  // Calculate duration
  const calculateDuration = (selectedBars: number, selectedBpm: number): number => {
    const beats = selectedBars * 4;
    return (beats / selectedBpm) * 60 * 1000;
  };

  // Metronome functions
  const playMetronomeClick = useCallback((isDownbeat: boolean = false) => {
    if (!audioContextRef.current || !metronomeEnabled) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = isDownbeat ? 1200 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, [metronomeEnabled]);

  const startMetronome = useCallback(() => {
    if (!metronomeEnabled) return;
    
    const beatDuration = (60 / bpm) * 1000;
    let beatCount = 0;
    
    playMetronomeClick(true);
    
    metronomeIntervalRef.current = window.setInterval(() => {
      beatCount++;
      const isDownbeat = beatCount % 4 === 0;
      playMetronomeClick(isDownbeat);
    }, beatDuration);
  }, [bpm, metronomeEnabled, playMetronomeClick]);

  const stopMetronome = useCallback(() => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
  }, []);

  // Recording handlers
  const handleRecord = () => {
    if (isRecording) {
      // Stop recording manually
      setIsRecording(false);
      setRecordingPosition(0);
      stopMetronome();
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Save the recording with current hits
      const duration = calculateDuration(bars, bpm);
      setRecording({
        hits: [...recordedHitsRef.current],
        bars,
        bpm,
        duration,
      });
    } else {
      // Start count-in then recording
      setRecording(null);
      setIsPlaying(false);
      recordedHitsRef.current = [];
      setRecordingPosition(0);
      
      if (metronomeEnabled) {
        startMetronome();
      }
      
      // Count-in for 4 beats (1 bar)
      const countInDuration = calculateDuration(countInBars, bpm);
      
      setTimeout(() => {
        // Start actual recording after count-in
        setIsRecording(true);
        recordingStartTimeRef.current = Date.now();
        
        const duration = calculateDuration(bars, bpm);
        
        // Update recording position
        recordingIntervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - recordingStartTimeRef.current;
          const position = Math.min(elapsed / duration, 1);
          setRecordingPosition(position);
        }, 50);
        
        // Auto-stop after duration
        setTimeout(() => {
          setIsRecording(false);
          setRecordingPosition(0);
          stopMetronome();
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          
          // Save the recording with the current recorded hits
          const newRecording = {
            hits: [...recordedHitsRef.current],
            bars,
            bpm,
            duration,
          };
          setRecording(newRecording);
        }, duration);
      }, countInDuration);
    }
  };

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
    
    if (metronomeEnabled) {
      startMetronome();
    }
    
    // Schedule all hits
    recording.hits.forEach((hit) => {
      const timeoutId = window.setTimeout(() => {
        playSound(hit.padId);
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
    }, 50);
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
    recordedHitsRef.current = [];
    setIsRecording(false);
    setPlaybackPosition(0);
    setRecordingPosition(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Initialize audio context for metronome
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const scheduledHits = scheduledHitsRef.current;
    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
      scheduledHits.forEach(timeoutId => clearTimeout(timeoutId));
      scheduledHits.clear();
    };
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#000', 
      position: 'relative',
      touchAction: 'none' 
    }}>
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
        }}
        dpr={[1.5, 2]}
      >
        <color attach="background" args={['#3a3a5e']} />
        <Scene 
          playSound={playSound} 
          playingPads={playingPads}
          playbackPosition={playbackPosition}
          recordingPosition={recordingPosition}
          isPlaying={isPlaying}
          isRecording={isRecording}
          recordedHits={[]}
          bpm={bpm}
          bars={8}
        />
      </Canvas>
      
      {/* Simplified collapsible recorder UI */}
      <div style={{
        position: 'absolute',
        bottom: window.innerWidth < 768 ? '50%' : 20,
        left: '50%',
        transform: window.innerWidth < 768 ? 'translate(-50%, 50%)' : 'translateX(-50%)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '12px',
        textShadow: '2px 2px 0px #003300',
        pointerEvents: 'auto',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '12px',
        border: '2px solid #00ff00',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
        borderRadius: '4px',
        zIndex: 1000,
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Toggle button for mobile */}
          <button
            onClick={() => setMenuCollapsed(!menuCollapsed)}
            style={{
              background: 'transparent',
              border: '1px solid #00ff00',
              color: '#00ff00',
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '10px',
            }}
          >
            {menuCollapsed ? '▼' : '▲'}
          </button>
          
          {!menuCollapsed && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '10px' }}>BPM:</label>
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={bpm}
                  onChange={(e) => setBpm(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
                  onBlur={(e) => e.currentTarget.blur()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={isRecording || isPlaying}
                  style={{
                    background: '#000',
                    color: '#00ff00',
                    border: '1px solid #00ff00',
                    padding: '4px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    width: '50px',
                  }}
                />
              </div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={metronomeEnabled}
                  onChange={(e) => setMetronomeEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '10px' }}>METRO</span>
              </label>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={(e) => {
                    handleRecord();
                    e.currentTarget.blur();
                  }}
                  disabled={isPlaying}
                  style={{
                    background: isRecording ? '#ff0000' : '#000',
                    color: isRecording ? '#fff' : '#00ff00',
                    border: `2px solid ${isRecording ? '#ff0000' : '#00ff00'}`,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {isRecording ? 'STOP' : 'REC'}
                </button>
                
                <button
                  onClick={(e) => {
                    handlePlayStop();
                    e.currentTarget.blur();
                  }}
                  disabled={isRecording || !recording || recording.hits.length === 0}
                  style={{
                    background: isPlaying ? '#00ff00' : '#000',
                    color: isPlaying ? '#000' : '#00ff00',
                    border: '2px solid #00ff00',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    opacity: (!recording || recording.hits.length === 0) && !isPlaying ? 0.5 : 1,
                  }}
                >
                  {isPlaying ? 'STOP' : 'PLAY'}
                </button>
                
                <button
                  onClick={(e) => {
                    handleClear();
                    e.currentTarget.blur();
                  }}
                  disabled={isRecording || isPlaying}
                  style={{
                    background: '#000',
                    color: '#00ff00',
                    border: '1px solid #00ff00',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                >
                  CLR
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* PSX-style overlay info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '14px',
        textShadow: '2px 2px 0px #003300',
        pointerEvents: 'none',
      }}>
        <div>▶ DRUM MACHINE PSX</div>
        <div style={{ marginTop: 10 }}>CLICK PADS OR USE KEYS</div>
        <div>Q W E R / A S D F / Z X C V</div>
      </div>
    </div>
  );
}

