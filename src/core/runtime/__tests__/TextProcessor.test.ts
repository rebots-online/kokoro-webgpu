import { GPUTextProcessor } from '../TextProcessor';
import { RuntimeManager } from '../RuntimeManager';

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

describe('GPUTextProcessor', () => {
  let processor: GPUTextProcessor;

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
    processor = new GPUTextProcessor(mockDevice as any);
  });

  describe('processText', () => {
    it('should process text using GPU pipeline', async () => {
      const input = 'Hello World';
      await processor.processText(input);

      // Verify buffer creation
      expect(mockDevice.createBuffer).toHaveBeenCalledTimes(4);

      // Verify pipeline execution
      expect(mockDevice.createCommandEncoder).toHaveBeenCalled();
      expect(mockDevice.queue.submit).toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      const input = '';
      await processor.processText(input);

      // Verify minimal buffer size
      const bufferCalls = mockDevice.createBuffer.mock.calls;
      bufferCalls.forEach(call => {
        expect(call[0].size).toBeGreaterThan(0);
      });
    });

    it('should cleanup resources after processing', async () => {
      const input = 'Test';
      await processor.processText(input);

      // Verify buffer cleanup
      expect(mockBuffer.destroy).toHaveBeenCalledTimes(4);
    });

    it('should update runtime metrics', async () => {
      const runtime = RuntimeManager.getInstance();
      const measureSpy = jest.spyOn(runtime, 'measurePerformance');

      const input = 'Performance Test';
      await processor.processText(input);

      expect(measureSpy).toHaveBeenCalled();
    });
  });
});
