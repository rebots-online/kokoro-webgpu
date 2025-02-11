import { OnnxRuntime, OnnxConfig } from '../OnnxRuntime';
import { Tensor } from 'onnxruntime-web';

// Mock ONNX runtime
jest.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: jest.fn()
  },
  Tensor: jest.fn(),
  env: {
    wasm: {
      numThreads: 4,
      simd: true
    },
    debug: false,
    logLevel: 'error'
  }
}));

describe('OnnxRuntime', () => {
  let runtime: OnnxRuntime;
  const config: OnnxConfig = {
    executionProviders: ['webgl', 'wasm'],
    optimizationLevel: 'basic',
    enableProfiling: false
  };

  const mockSession = {
    run: jest.fn(),
    release: jest.fn(),
    inputNames: ['input'],
    outputNames: ['output']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('onnxruntime-web').InferenceSession.create as jest.Mock)
      .mockResolvedValue(mockSession);
    runtime = new OnnxRuntime(config);
  });

  describe('loadModel', () => {
    it('should load model with correct configuration', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      expect(require('onnxruntime-web').InferenceSession.create)
        .toHaveBeenCalledWith(buffer, expect.objectContaining({
          executionProviders: config.executionProviders,
          enableProfiling: config.enableProfiling
        }));
    });

    it('should handle loading errors', async () => {
      const error = new Error('Loading failed');
      (require('onnxruntime-web').InferenceSession.create as jest.Mock)
        .mockRejectedValue(error);

      await expect(runtime.loadModel(new ArrayBuffer(1024)))
        .rejects.toThrow('Loading failed');
    });
  });

  describe('run', () => {
    it('should execute inference with correct inputs', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      const inputs = {
        input: new Tensor('float32', new Float32Array(128), [1, 128])
      };
      const expectedOutputs = {
        output: new Tensor('float32', new Float32Array(256), [1, 256])
      };
      mockSession.run.mockResolvedValue(expectedOutputs);

      const results = await runtime.run(inputs);
      expect(results).toEqual(expectedOutputs);
      expect(mockSession.run).toHaveBeenCalledWith(inputs, undefined);
    });

    it('should handle inference errors', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      mockSession.run.mockRejectedValue(new Error('Inference failed'));

      await expect(runtime.run({})).rejects.toThrow('Inference failed');
    });

    it('should throw if model not loaded', async () => {
      await expect(runtime.run({})).rejects.toThrow('Model not loaded');
    });
  });

  describe('warmup', () => {
    it('should perform warmup iterations', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      const inputs = {
        input: new Tensor('float32', new Float32Array(128), [1, 128])
      };

      await runtime.warmup(inputs, 3);
      expect(mockSession.run).toHaveBeenCalledTimes(3);
    });

    it('should continue on warmup errors', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      mockSession.run
        .mockRejectedValueOnce(new Error('Warmup failed'))
        .mockResolvedValue({});

      const inputs = {
        input: new Tensor('float32', new Float32Array(128), [1, 128])
      };

      await runtime.warmup(inputs, 2);
      expect(mockSession.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('should release session resources', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);
      await runtime.dispose();

      expect(mockSession.release).toHaveBeenCalled();
    });

    it('should handle dispose errors', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      mockSession.release.mockRejectedValue(new Error('Dispose failed'));
      await expect(runtime.dispose()).rejects.toThrow('Dispose failed');
    });
  });

  describe('profiling', () => {
    it('should return profiling data when enabled', async () => {
      const profilingRuntime = new OnnxRuntime({
        ...config,
        enableProfiling: true
      });
      const buffer = new ArrayBuffer(1024);
      await profilingRuntime.loadModel(buffer);

      mockSession.profiling = { data: 'test' };
      expect(profilingRuntime.getProfilingData()).toEqual({ data: 'test' });
    });

    it('should throw if profiling not enabled', async () => {
      const buffer = new ArrayBuffer(1024);
      await runtime.loadModel(buffer);

      expect(() => runtime.getProfilingData())
        .toThrow('Profiling not enabled');
    });
  });
});
