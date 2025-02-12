---
title: Kokoro WebGPU
emoji: 🗣️⚡
colorFrom: yellow
colorTo: green
sdk: static
pinned: false
license: proprietary
short_description: WebGPU-accelerated Kokoro TTS system with WScribe editor integration
header: mini
models:
  - onnx-community/Kokoro-82M-ONNX
custom_headers:
  cross-origin-embedder-policy: require-corp
  cross-origin-opener-policy: same-origin
  cross-origin-resource-policy: cross-origin
---

# Kokoro WebGPU

A WebGPU-accelerated implementation of the Kokoro TTS system with WScribe editor integration.

Copyright (C) 2025 Robin L. M. Cheung, MBA. All rights reserved.

## Overview

Kokoro WebGPU brings high-performance text-to-speech capabilities directly to modern browsers by leveraging WebGPU acceleration. With seamless WScribe editor integration, it provides a powerful platform for real-time audio content creation and editing.

### Key Features

- ✅ WebGPU acceleration for optimal performance
  - Compute shader-based audio processing
  - Model optimization and quantization
  - Real-time performance metrics
- ✅ Automatic CPU fallback with user notification
  - Graceful degradation to WebAssembly
  - Performance comparison analytics
- ✅ Real-time streaming audio generation
  - Chunk-based processing
  - Adaptive buffer management
  - Low-latency playback
- ✅ WScribe editor integration
  - Real-time text segmentation
  - Audio-text synchronization
  - Multi-format support
- ✅ Multiple input format support
  - TXT with smart segmentation
  - SRT with timing preservation
  - VTT with styling support
- ✅ Voice selection and customization
  - Emotion control
  - Speed adjustment
  - Pitch modification
- ✅ Browser-based processing
  - WebGPU compute pipelines
  - WebAssembly acceleration
  - Web Audio API integration
- ✅ ONNX Runtime integration
  - WebGL/WASM execution providers
  - Model optimization
  - Dynamic provider selection

### Advanced Features

#### WebGPU Acceleration
- Custom WGSL shaders for audio processing
- Parallel compute workgroups
- Shared memory optimizations
- Automatic workgroup size tuning

#### Model Management
- LRU cache with size constraints
- Preloading and warmup
- INT8/FP16 quantization
- Pruning support

#### Audio Pipeline
- Streaming architecture
- Real-time effects
- Format conversion
- Buffer management

#### Performance Optimization
- Adaptive chunk sizing
- Memory pooling
- Pipeline parallelization
- Latency monitoring

## Getting Started

### Prerequisites

- WebGPU-enabled browser:
  - Chrome 113+
  - Edge 113+
  - Firefox Nightly
  - Safari Technology Preview

### Installation

```bash
npm install @world.robinsai/kokoro-webgpu
```

### Basic Usage

```typescript
import { KokoroTTS } from '@world.robinsai/kokoro-webgpu';

const tts = new KokoroTTS();
await tts.initialize();

// Stream audio from text
const stream = await tts.streamFromText('Hello, World!');
```

## Documentation

- [Implementation Audit](docs/IMPLEMENTATION_AUDIT.md)
- [Project Conventions](docs/CONVENTIONS.md)
- [Architecture Diagrams](docs/DIAGRAMS.md)
- [Development Roadmap](docs/TODO.md)
- [Project Ideology](docs/IDEOLOGIES.md)
- [Changelog](docs/CHANGELOG.md)

## License

This software is proprietary and confidential. Unauthorized reproduction, distribution, or modification is prohibited. See the [LICENSE](LICENSE) file for details.

## Organization

- **Organization**: Robin's AI World
- **Author**: Robin L. M. Cheung, MBA
- **Namespace**: world.robinsai.kokoro-webgpu
- **Repository**: https://github.com/rebots-online/kokoro-webgpu
