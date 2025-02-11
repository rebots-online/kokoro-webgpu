import { RuntimeManager } from '../runtime/RuntimeManager';

export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  type: 'tts' | 'vad' | 'encoder';
  format: 'onnx' | 'safetensors';
  inputShape: number[];
  outputShape: number[];
  sampleRate?: number;
  quantization?: 'int8' | 'float16' | 'float32';
  size: number;
  checksum: string;
  url: string;
}

export interface ModelCache {
  metadata: ModelMetadata;
  buffer: ArrayBuffer;
  lastAccessed: number;
}

export class ModelManager {
  private static instance: ModelManager;
  private runtime: RuntimeManager;
  private modelCache: Map<string, ModelCache>;
  private maxCacheSize: number;
  private currentCacheSize: number;

  private constructor() {
    this.runtime = RuntimeManager.getInstance();
    this.modelCache = new Map();
    this.maxCacheSize = 1024 * 1024 * 1024; // 1GB default
    this.currentCacheSize = 0;
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async loadModel(metadata: ModelMetadata): Promise<ArrayBuffer> {
    // Check cache first
    const cached = this.modelCache.get(metadata.id);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.buffer;
    }

    // Ensure enough cache space
    while (this.currentCacheSize + metadata.size > this.maxCacheSize) {
      await this.evictLeastRecentlyUsed();
    }

    // Fetch model
    const response = await fetch(metadata.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`);
    }

    // Verify size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) !== metadata.size) {
      throw new Error('Model size mismatch');
    }

    // Download and verify
    const buffer = await response.arrayBuffer();
    const verified = await this.verifyChecksum(buffer, metadata.checksum);
    if (!verified) {
      throw new Error('Model checksum verification failed');
    }

    // Cache model
    this.modelCache.set(metadata.id, {
      metadata,
      buffer,
      lastAccessed: Date.now()
    });
    this.currentCacheSize += metadata.size;

    return buffer;
  }

  async unloadModel(modelId: string): Promise<void> {
    const cached = this.modelCache.get(modelId);
    if (cached) {
      this.currentCacheSize -= cached.metadata.size;
      this.modelCache.delete(modelId);
    }
  }

  async preloadModels(metadataList: ModelMetadata[]): Promise<void> {
    const prioritizedList = this.prioritizeModels(metadataList);
    for (const metadata of prioritizedList) {
      try {
        await this.loadModel(metadata);
      } catch (error) {
        console.error(`Failed to preload model ${metadata.id}:`, error);
      }
    }
  }

  private prioritizeModels(metadataList: ModelMetadata[]): ModelMetadata[] {
    // Prioritize based on:
    // 1. Essential models first (TTS)
    // 2. Smaller models before larger ones
    // 3. Most frequently used models
    return [...metadataList].sort((a, b) => {
      // Essential models first
      if (a.type === 'tts' && b.type !== 'tts') return -1;
      if (b.type === 'tts' && a.type !== 'tts') return 1;

      // Then by size (smaller first)
      return a.size - b.size;
    });
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let lruModelId: string | null = null;
    let lruTimestamp = Infinity;

    for (const [id, cache] of this.modelCache) {
      if (cache.lastAccessed < lruTimestamp) {
        lruTimestamp = cache.lastAccessed;
        lruModelId = id;
      }
    }

    if (lruModelId) {
      await this.unloadModel(lruModelId);
    }
  }

  private async verifyChecksum(buffer: ArrayBuffer, expected: string): Promise<boolean> {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hashHex === expected;
    } catch (error) {
      console.error('Checksum verification failed:', error);
      return false;
    }
  }

  getModelInfo(modelId: string): ModelMetadata | undefined {
    return this.modelCache.get(modelId)?.metadata;
  }

  getCacheStats(): { used: number; total: number; count: number } {
    return {
      used: this.currentCacheSize,
      total: this.maxCacheSize,
      count: this.modelCache.size
    };
  }

  setMaxCacheSize(bytes: number): void {
    this.maxCacheSize = bytes;
    // Trigger eviction if necessary
    if (this.currentCacheSize > this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }
  }
}
