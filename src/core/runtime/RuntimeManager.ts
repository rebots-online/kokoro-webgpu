import { GPUDetector, GPUCapabilities } from './GPUDetector';

export type RuntimeMode = 'gpu' | 'cpu';

interface RuntimeMetrics {
  mode: RuntimeMode;
  capabilities: GPUCapabilities;
  performance: {
    inferenceTime: number;
    memoryUsage: number;
  };
}

export class RuntimeManager {
  private static instance: RuntimeManager;
  private currentMode: RuntimeMode = 'cpu';
  private gpuDetector: GPUDetector;
  private metrics: RuntimeMetrics | null = null;

  private constructor() {
    this.gpuDetector = GPUDetector.getInstance();
  }

  static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager();
    }
    return RuntimeManager.instance;
  }

  async initialize(): Promise<void> {
    const capabilities = await this.gpuDetector.checkCapabilities();
    
    if (capabilities.webgpu && capabilities.compute) {
      this.currentMode = 'gpu';
    } else {
      this.currentMode = 'cpu';
      this.notifyUserOfCPUFallback();
    }

    this.metrics = {
      mode: this.currentMode,
      capabilities,
      performance: {
        inferenceTime: 0,
        memoryUsage: 0
      }
    };
  }

  private notifyUserOfCPUFallback(): void {
    const notification = {
      title: 'WebGPU Not Available',
      message: `Running in CPU mode. For better performance, please use a WebGPU-enabled browser.
                Supported browsers include:
                - Chrome 113+
                - Edge 113+
                - Firefox Nightly
                - Safari Technology Preview`,
      type: 'warning',
      duration: 10000
    };

    // Dispatch notification event
    const event = new CustomEvent('kokoro-notification', { 
      detail: notification 
    });
    window.dispatchEvent(event);

    // Also log to console
    console.warn(
      `[Kokoro WebGPU] ${notification.message.replace(/\n\s+/g, ' ')}`
    );
  }

  getCurrentMode(): RuntimeMode {
    return this.currentMode;
  }

  getMetrics(): RuntimeMetrics | null {
    return this.metrics;
  }

  async measurePerformance(operation: () => Promise<void>): Promise<void> {
    if (!this.metrics) return;

    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    await operation();

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    this.metrics.performance = {
      inferenceTime: endTime - startTime,
      memoryUsage: endMemory - startMemory
    };
  }
}
