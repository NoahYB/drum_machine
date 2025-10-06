# 🎛️ DR-16 Sampler - Retro Web Audio Sampler

A retro-styled, hardware-inspired web-based audio sampler built with React, TypeScript, and Vite. Features a classic 4x4 pad layout reminiscent of iconic samplers like Korg Electribe and Akai MPC. Upload audio samples, assign them to pads, map them to keyboard keys, and create music!

## Features

- ✨ **Audio Upload**: Click any pad to upload audio files (mp3, wav, ogg, etc.)
- 🎹 **Keyboard Mapping**: Assign keyboard keys to each pad for quick playback
- 🎨 **Retro Hardware Design**: Classic sampler aesthetic with LCD screen effect, rubber pads, and hardware details
- 🎛️ **4x4 Pad Grid**: 16 colorful pads inspired by classic drum machines
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- ⚡ **Fast Performance**: Built with Vite for lightning-fast development and builds

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## How to Use

1. **Upload Audio**: Click on an empty pad (marked with `+`) to upload an audio file
2. **Assign Keys**: Click the "Set Key" button on a pad and press any keyboard key to assign it
3. **Play Samples**: 
   - Click a pad to play the sample
   - Press the assigned keyboard key to trigger the sample

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Web Audio API** - Audio playback and processing

## Project Structure

```
src/
├── components/
│   ├── Sampler.tsx       # Main sampler component with state management
│   └── PadComponent.tsx  # Individual pad component
├── types.ts              # TypeScript type definitions
├── App.tsx              # Root component
├── App.css              # Main styles
└── index.css            # Global styles
```

## Features Breakdown

### Audio Upload
- Supports all common audio formats (mp3, wav, ogg, m4a, etc.)
- Audio is decoded using the Web Audio API for optimal playback

### Keyboard Control
- Assign any keyboard key to any pad
- Keys are unique - assigning a key to one pad removes it from others
- Visual indication of assigned keys on each pad

### Retro Design Elements
- LCD-style screen with green phosphor text effect
- Hardware screws and panel details
- Rubber pad texture with realistic depth
- Classic color palette inspired by iconic samplers
- Pulsing LED indicator
- Tactile button feedback

## Browser Support

Works in all modern browsers that support:
- Web Audio API
- ES6+
- CSS Grid

## License

MIT
