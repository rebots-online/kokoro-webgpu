export { KokoroApp } from './components/KokoroApp';
export { AudioProcessor } from './core/audio/AudioProcessor';
export { AudioPlayback } from './core/audio/AudioPlayback';
export { AudioSynthesizer } from './core/audio/AudioSynthesizer';
export { ModelManager } from './core/models/ModelManager';
export { OnnxRuntime } from './core/models/OnnxRuntime';
export { ModelOptimizer } from './core/models/ModelOptimizer';
export { RuntimeManager } from './core/runtime/RuntimeManager';
export { ComputePipeline } from './core/runtime/ComputePipeline';

// Re-export types
export type { AudioConfig } from './core/audio/AudioProcessor';
export type { PlaybackOptions } from './core/audio/AudioPlayback';
export type { SynthConfig, SynthSegment } from './core/audio/AudioSynthesizer';
export type { ModelMetadata } from './core/models/ModelManager';
export type { OnnxConfig } from './core/models/OnnxRuntime';
export type { OptimizationConfig } from './core/models/ModelOptimizer';
