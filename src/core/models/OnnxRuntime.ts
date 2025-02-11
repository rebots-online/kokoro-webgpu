import { InferenceSession, Tensor, env } from 'onnxruntime-web';
import { RuntimeManager } from '../runtime/RuntimeManager';

export interface OnnxConfig {
  executionProviders: ('webgl' | 'wasm' | 'cpu')[];
  optimizationLevel?: 'basic' | 'extended' | 'all';
  enableProfiling?: boolean;
}

export class OnnxRuntime {
  private session: InferenceSession | null = null;
  private runtime: RuntimeManager;
  private config: OnnxConfig;

  constructor(config: OnnxConfig) {
    this.runtime = RuntimeManager.getInstance();
    this.config = config;

    // Configure ONNX runtime environment
    env.wasm.numThreads = navigator.hardwareConcurrency || 4;
    env.wasm.simd = true;
    
    if (config.enableProfiling) {
      env.debug = true;
      env.logLevel = 'verbose';
    }
  }

  async loadModel(buffer: ArrayBuffer): Promise<void> {
    try {
      // Create session options
      const options = {
        executionProviders: this.config.executionProviders,
        graphOptimizationLevel: this.getOptimizationLevel(),
        enableProfiling: this.config.enableProfiling,
        executionMode: 'parallel',
        enableMemPattern: true,
        enableCpuMemArena: true
      };

      // Create session
      this.session = await InferenceSession.create(buffer, options);
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw error;
    }
  }

  async run(
    inputs: { [key: string]: Tensor },
    outputNames?: string[]
  ): Promise<{ [key: string]: Tensor }> {
    if (!this.session) {
      throw new Error('Model not loaded');
    }

    try {
      return await this.runtime.measurePerformance(async () => {
        const results = await this.session!.run(inputs, outputNames);
        return results;
      });
    } catch (error) {
      console.error('Inference failed:', error);
      throw error;
    }
  }

  async warmup(
    sampleInputs: { [key: string]: Tensor },
    iterations: number = 3
  ): Promise<void> {
    if (!this.session) {
      throw new Error('Model not loaded');
    }

    console.log('Warming up ONNX model...');
    for (let i = 0; i < iterations; i++) {
      try {
        await this.run(sampleInputs);
      } catch (error) {
        console.warn(`Warmup iteration ${i} failed:`, error);
      }
    }
    console.log('Warmup complete');
  }

  getInputNames(): string[] {
    if (!this.session) {
      throw new Error('Model not loaded');
    }
    return this.session.inputNames;
  }

  getOutputNames(): string[] {
    if (!this.session) {
      throw new Error('Model not loaded');
    }
    return this.session.outputNames;
  }

  async dispose(): Promise<void> {
    if (this.session) {
      try {
        await this.session.release();
        this.session = null;
      } catch (error) {
        console.error('Failed to dispose session:', error);
        throw error;
      }
    }
  }

  private getOptimizationLevel(): number {
    switch (this.config.optimizationLevel) {
      case 'basic':
        return 1;
      case 'extended':
        return 2;
      case 'all':
        return 99;
      default:
        return 1;
    }
  }

  getProfilingData(): any {
    if (!this.session || !this.config.enableProfiling) {
      throw new Error('Profiling not enabled or session not loaded');
    }
    return this.session.profiling;
  }
}
