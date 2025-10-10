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
import SD2 from '../assets/sounds/SD_UheACE1_SP1200R.wav';
import Tabla from '../assets/sounds/Tabla017_SP1200F.wav';
import Tom1 from '../assets/sounds/Tom_LiveLounge1_SP1200F.wav';
import Tom3 from '../assets/sounds/Tom_LiveLounge3_SP1200F.wav';

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
  { url: null, name: '', key: 'C' },
  { url: null, name: '', key: 'V' },
  { url: null, name: '', key: 'T' },
  { url: null, name: '', key: 'G' },
  { url: null, name: '', key: 'Y' },
  { url: null, name: '', key: 'H' },
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
        onClick={() => onHit(index)}
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
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial map={textTexture} transparent />
      </mesh>
    </group>
  );        
}

// Main drum machine body - cream base with integrated screen module
function DrumMachineBody() {
  const baseMeshRef = useRef<THREE.Mesh>(null);
  const screenModuleRef = useRef<THREE.Mesh>(null);
  const screenDisplayRef = useRef<THREE.Mesh>(null);
  
  // Create text texture for screen
  const screenTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 512, 256);
      
      // Green text
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DrumMachine3D', 256, 128);
      
      // Add scanline effect
      for (let i = 0; i < 256; i += 4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, i, 512, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
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
  playingPads 
}: { 
  playSound: (index: number) => void;
  playingPads: Set<number>;
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
      
      <DrumMachineBody />
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
  const [recordedHits, setRecordedHits] = useState<RecordedHit[]>([]);
  const [recording, setRecording] = useState<{ hits: RecordedHit[], bars: 8 | 16, bpm: number, duration: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);
  const [bars, setBars] = useState<8 | 16>(8);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const recordingStartTimeRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);
  const scheduledHitsRef = useRef<Set<number>>(new Set());
  const playbackIntervalRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

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
      setRecordedHits(prev => [...prev, { padId: index, timestamp }]);
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

  // Recording handlers
  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      const duration = calculateDuration(bars, bpm);
      setRecording({
        hits: recordedHits,
        bars,
        bpm,
        duration,
      });
      setCurrentBar(1);
      setCurrentBeat(1);
    } else {
      // Start recording
      setRecording(null);
      setIsPlaying(false);
      setRecordedHits([]);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      
      // Update position display
      const duration = calculateDuration(bars, bpm);
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        const position = Math.min(elapsed / duration, 1);
        const totalBeats = bars * 4;
        const currentBeatNum = Math.floor(position * totalBeats);
        setCurrentBar(Math.floor(currentBeatNum / 4) + 1);
        setCurrentBeat((currentBeatNum % 4) + 1);
      }, 50);
      
      // Auto-stop after duration
      setTimeout(() => {
        setIsRecording(false);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setCurrentBar(1);
        setCurrentBeat(1);
      }, duration);
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
      const totalBeats = recording.bars * 4;
      const currentBeatNum = Math.floor(position * totalBeats);
      setCurrentBar(Math.floor(currentBeatNum / 4) + 1);
      setCurrentBeat((currentBeatNum % 4) + 1);
      
      if (position >= 1) {
        // Loop playback
        stopPlayback();
        setTimeout(() => startPlayback(), 50);
      }
    }, 50);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setCurrentBar(1);
    setCurrentBeat(1);
    
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
    setRecordedHits([]);
    setIsRecording(false);
    setCurrentBar(1);
    setCurrentBeat(1);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    const scheduledHits = scheduledHitsRef.current;
    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      scheduledHits.forEach(timeoutId => clearTimeout(timeoutId));
      scheduledHits.clear();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
        }}
        dpr={[1.5, 2]}
      >
        <color attach="background" args={['#3a3a5e']} />
        <Scene playSound={playSound} playingPads={playingPads} />
      </Canvas>
      
      {/* PSX-style Recorder overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '12px',
        textShadow: '2px 2px 0px #003300',
        pointerEvents: 'auto',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        border: '2px solid #00ff00',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
      }}>
        <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          ▶ LOOP RECORDER
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
          <div>
            <div style={{ marginBottom: '5px' }}>BPM</div>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
              disabled={isRecording || isPlaying}
              style={{
                background: '#000',
                color: '#00ff00',
                border: '1px solid #00ff00',
                padding: '4px 8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                width: '60px',
              }}
            />
          </div>
          
          <div>
            <div style={{ marginBottom: '5px' }}>BARS</div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => setBars(8)}
                disabled={isRecording || isPlaying}
                style={{
                  background: bars === 8 ? '#00ff00' : '#000',
                  color: bars === 8 ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                8
              </button>
              <button
                onClick={() => setBars(16)}
                disabled={isRecording || isPlaying}
                style={{
                  background: bars === 16 ? '#00ff00' : '#000',
                  color: bars === 16 ? '#000' : '#00ff00',
                  border: '1px solid #00ff00',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                16
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            onClick={handleRecord}
            disabled={isPlaying}
            style={{
              background: isRecording ? '#ff0000' : '#000',
              color: isRecording ? '#fff' : '#00ff00',
              border: `2px solid ${isRecording ? '#ff0000' : '#00ff00'}`,
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: isRecording ? '0 0 10px rgba(255, 0, 0, 0.5)' : 'none',
            }}
          >
            {isRecording ? '⬛ STOP' : '● REC'}
          </button>
          
          <button
            onClick={handlePlayStop}
            disabled={isRecording || !recording || recording.hits.length === 0}
            style={{
              background: isPlaying ? '#00ff00' : '#000',
              color: isPlaying ? '#000' : '#00ff00',
              border: '2px solid #00ff00',
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              opacity: (!recording || recording.hits.length === 0) && !isPlaying ? 0.5 : 1,
            }}
          >
            {isPlaying ? '⬛ STOP' : '▶ PLAY'}
          </button>
          
          <button
            onClick={handleClear}
            disabled={isRecording || isPlaying}
            style={{
              background: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            ✕ CLR
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          fontSize: '11px',
          borderTop: '1px solid #00ff00',
          paddingTop: '8px',
        }}>
          <div>BAR: {currentBar}/{bars}</div>
          <div>BEAT: {currentBeat}/4</div>
          <div>HITS: {isRecording ? recordedHits.length : (recording?.hits.length || 0)}</div>
        </div>
        
        {isRecording && (
          <div style={{ 
            marginTop: '8px', 
            color: '#ff0000',
            animation: 'pulse 1s infinite',
            textAlign: 'center',
          }}>
            ● RECORDING
          </div>
        )}
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

