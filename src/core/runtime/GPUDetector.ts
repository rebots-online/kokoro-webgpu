export interface GPUCapabilities {
  webgpu: boolean;
  compute: boolean;
  storage: boolean;
  maxBufferSize: number;
  preferredFormat: GPUTextureFormat | null;
}

export class GPUDetector {
  private static instance: GPUDetector;
  private capabilities: GPUCapabilities | null = null;

  private constructor() {}

  static getInstance(): GPUDetector {
    if (!GPUDetector.instance) {
      GPUDetector.instance = new GPUDetector();
    }
    return GPUDetector.instance;
  }

  async checkCapabilities(): Promise<GPUCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const webgpuSupported = 'gpu' in navigator;
    
    if (!webgpuSupported) {
      this.capabilities = {
        webgpu: false,
        compute: false,
        storage: false,
        maxBufferSize: 0,
        preferredFormat: null
      };
      return this.capabilities;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No GPU adapter found');
      }

      const device = await adapter.requestDevice();
      const features = device.features;
      const limits = device.limits;

      this.capabilities = {
        webgpu: true,
        compute: features.has('shader-f16'),
        storage: features.has('timestamp-query'),
        maxBufferSize: limits.maxBufferSize,
        preferredFormat: navigator.gpu.getPreferredCanvasFormat()
      };

      return this.capabilities;
    } catch (error) {
      console.error('GPU initialization failed:', error);
      this.capabilities = {
        webgpu: false,
        compute: false,
        storage: false,
        maxBufferSize: 0,
        preferredFormat: null
      };
      return this.capabilities;
    }
  }
}
