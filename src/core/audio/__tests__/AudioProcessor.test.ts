import { AudioProcessor, AudioConfig } from '../AudioProcessor';

// Mock GPU objects
const mockDevice = {
  createBuffer: jest.fn(),
  createBindGroupLayout: jest.fn(),
  createPipelineLayout: jest.fn(),
  createShaderModule: jest.fn(),
  createComputePipeline: jest.fn(),
  createCommandEncoder: jest.fn(),
  queue: {
    submit: jest.fn()
  }
};

const mockBuffer = {
  getMappedRange: jest.fn(),
  unmap: jest.fn(),
  destroy: jest.fn(),
  mapAsync: jest.fn()
};

describe('AudioProcessor', () => {
  let processor: AudioProcessor;
  const config: AudioConfig = {
    sampleRate: 44100,
    channels: 1,
    format: 'f32'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup buffer mock
    mockBuffer.getMappedRange.mockReturnValue(new ArrayBuffer(1024));
    mockBuffer.mapAsync.mockResolvedValue(undefined);

    // Setup device mock
    mockDevice.createBuffer.mockReturnValue(mockBuffer);
    mockDevice.createCommandEncoder.mockReturnValue({
      beginComputePass: jest.fn().mockReturnValue({
        setPipeline: jest.fn(),
        setBindGroup: jest.fn(),
        dispatchWorkgroups: jest.fn(),
        end: jest.fn()
      }),
      copyBufferToBuffer: jest.fn(),
      finish: jest.fn()
    });

    // Create processor instance
    processor = new AudioProcessor(mockDevice as any, config);
  });

  describe('processAudio', () => {
    it('should process audio data in chunks', async () => {
      const input = new Float32Array(4096);
      const result = await processor.processAudio(input);

      expect(result.length).toBe(2); // 4096 / 2048 = 2 chunks
      expect(mockDevice.createBuffer).toHaveBeenCalled();
      expect(mockDevice.queue.submit).toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      const input = new Float32Array(0);
      const result = await processor.processAudio(input);

      expect(result).toHaveLength(0);
    });

    it('should set correct timestamps and durations', async () => {
      const input = new Float32Array(4096);
      const result = await processor.processAudio(input);

      expect(result[0].timestamp).toBe(0);
      expect(result[0].duration).toBe(2048 / config.sampleRate);
      expect(result[1].timestamp).toBe(2048 / config.sampleRate);
    });

    it('should cleanup resources after processing', async () => {
      const input = new Float32Array(2048);
      await processor.processAudio(input);

      expect(mockBuffer.destroy).toHaveBeenCalled();
    });
  });
});
