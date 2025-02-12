import '@testing-library/jest-dom';

// Mock WebGPU
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

// Mock navigator.gpu
Object.defineProperty(window.navigator, 'gpu', {
  value: {
    requestAdapter: jest.fn().mockResolvedValue({
      requestDevice: jest.fn().mockResolvedValue(mockDevice)
    })
  },
  configurable: true
});

// Mock Web Audio API
window.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 1 }
  }),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }),
  destination: {},
  currentTime: 0
}));
