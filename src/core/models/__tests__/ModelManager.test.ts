import { ModelManager, ModelMetadata } from '../ModelManager';

describe('ModelManager', () => {
  let manager: ModelManager;
  const sampleMetadata: ModelMetadata = {
    id: 'test-model',
    name: 'Test Model',
    version: '1.0.0',
    type: 'tts',
    format: 'onnx',
    inputShape: [1, 128],
    outputShape: [1, 256],
    sampleRate: 22050,
    size: 1024 * 1024, // 1MB
    checksum: 'test-checksum',
    url: 'https://example.com/model.onnx'
  };

  beforeEach(() => {
    manager = ModelManager.getInstance();
    // Reset cache
    manager.setMaxCacheSize(1024 * 1024 * 1024);
  });

  describe('loadModel', () => {
    it('should load and cache a model', async () => {
      const mockResponse = new Response(new ArrayBuffer(sampleMetadata.size));
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await manager.loadModel(sampleMetadata);
      const stats = manager.getCacheStats();
      
      expect(stats.count).toBe(1);
      expect(stats.used).toBe(sampleMetadata.size);
    });

    it('should handle failed downloads', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Download failed'));

      await expect(manager.loadModel(sampleMetadata))
        .rejects.toThrow('Download failed');
    });

    it('should verify checksum', async () => {
      const mockBuffer = new ArrayBuffer(sampleMetadata.size);
      const mockResponse = new Response(mockBuffer);
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(manager.loadModel(sampleMetadata))
        .rejects.toThrow('Model checksum verification failed');
    });
  });

  describe('unloadModel', () => {
    it('should remove model from cache', async () => {
      const mockResponse = new Response(new ArrayBuffer(sampleMetadata.size));
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await manager.loadModel(sampleMetadata);
      await manager.unloadModel(sampleMetadata.id);

      const stats = manager.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.used).toBe(0);
    });
  });

  describe('preloadModels', () => {
    it('should prioritize TTS models', async () => {
      const mockResponse = new Response(new ArrayBuffer(1024));
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const models: ModelMetadata[] = [
        { ...sampleMetadata, id: 'vad', type: 'vad' },
        { ...sampleMetadata, id: 'tts', type: 'tts' }
      ];

      await manager.preloadModels(models);
      
      // Check that TTS was loaded first
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('tts')
      );
    });

    it('should handle failed preloads', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(new Response(new ArrayBuffer(1024)));

      const models: ModelMetadata[] = [
        { ...sampleMetadata, id: 'model1' },
        { ...sampleMetadata, id: 'model2' }
      ];

      await manager.preloadModels(models);
      
      const stats = manager.getCacheStats();
      expect(stats.count).toBe(1);
    });
  });

  describe('cache management', () => {
    it('should evict least recently used models', async () => {
      const mockResponse = new Response(new ArrayBuffer(512 * 1024));
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Set small cache size
      manager.setMaxCacheSize(1024 * 1024); // 1MB

      const models: ModelMetadata[] = [
        { ...sampleMetadata, id: 'model1', size: 512 * 1024 },
        { ...sampleMetadata, id: 'model2', size: 512 * 1024 },
        { ...sampleMetadata, id: 'model3', size: 512 * 1024 }
      ];

      // Load models
      await manager.loadModel(models[0]);
      await manager.loadModel(models[1]);
      await manager.loadModel(models[2]);

      const stats = manager.getCacheStats();
      expect(stats.count).toBe(2);
      expect(stats.used).toBeLessThanOrEqual(stats.total);
    });
  });
});
