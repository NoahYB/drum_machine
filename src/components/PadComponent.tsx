import React, { useRef, useState } from 'react';
import type { Pad } from '../types';

// Helper function to adjust color brightness
const adjustBrightness = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

interface PadComponentProps {
  pad: Pad;
  onAudioUpload: (id: number, file: File) => void;
  onKeyAssign: (id: number, key: string) => void;
  onPlay: (id: number) => void;
  isPlaying: boolean;
}

export const PadComponent: React.FC<PadComponentProps> = ({
  pad,
  onAudioUpload,
  onKeyAssign,
  onPlay,
  isPlaying,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAssigningKey, setIsAssigningKey] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onAudioUpload(pad.id, file);
    }
  };

  const handleKeyAssignment = (e: React.KeyboardEvent) => {
    if (isAssigningKey) {
      e.preventDefault();
      onKeyAssign(pad.id, e.key.toUpperCase());
      setIsAssigningKey(false);
    }
  };

  const handlePadClick = () => {
    if (pad.audioBuffer) {
      onPlay(pad.id);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`pad ${isPlaying ? 'playing' : ''} ${!pad.audioBuffer ? 'empty' : ''}`}
      style={{ 
        '--pad-color': pad.audioBuffer ? pad.color : '#1a1f35',
        '--pad-color-dark': pad.audioBuffer ? adjustBrightness(pad.color, -30) : '#0f1322'
      } as React.CSSProperties}
      onClick={handlePadClick}
      onKeyDown={handleKeyAssignment}
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <div className="pad-content">
        {pad.audioBuffer ? (
          <>
            <div className="pad-key">{pad.key || '?'}</div>
            <div className="pad-name">{pad.audioFile?.name.substring(0, 15) || 'Sample'}</div>
          </>
        ) : (
          <div className="pad-upload">+</div>
        )}
      </div>

      {pad.audioBuffer && (
        <div className="pad-controls">
          <button
            className="key-assign-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsAssigningKey(true);
            }}
            onBlur={() => setIsAssigningKey(false)}
          >
            {isAssigningKey ? 'Press a key...' : 'Set Key'}
          </button>
          <button
            className="replace-btn"
            onClick={handleReplaceClick}
            title="Replace audio sample"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  );
};

