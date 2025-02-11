import { ComputePipeline, ComputeConfig } from './ComputePipeline';
import textProcessingShader from './shaders/text_processing.wgsl';
import { RuntimeManager } from './RuntimeManager';

interface ProcessingParams {
  inputLength: number;
  outputLength: number;
  batchSize: number;
}

export class GPUTextProcessor {
  private device: GPUDevice;
  private pipeline: ComputePipeline;
  private runtime: RuntimeManager;

  constructor(device: GPUDevice) {
    this.device = device;
    this.runtime = RuntimeManager.getInstance();
    
    const config: ComputeConfig = {
      workgroupSize: [256, 1, 1],
      bindGroupLayout: {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'storage' }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform' }
          }
        ]
      },
      shaderCode: textProcessingShader
    };

    this.pipeline = new ComputePipeline(device, config);
  }

  async processText(text: string): Promise<string> {
    const inputArray = new Uint32Array(
      text.split('').map(char => char.charCodeAt(0))
    );
    
    // Create input buffer
    const inputBuffer = this.device.createBuffer({
      size: inputArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint32Array(inputBuffer.getMappedRange()).set(inputArray);
    inputBuffer.unmap();

    // Create output buffer
    const outputBuffer = this.device.createBuffer({
      size: inputArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: false
    });

    // Create params buffer
    const params: ProcessingParams = {
      inputLength: inputArray.length,
      outputLength: inputArray.length,
      batchSize: 256
    };

    const paramsBuffer = this.device.createBuffer({
      size: 12, // 3 * uint32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint32Array(paramsBuffer.getMappedRange()).set([
      params.inputLength,
      params.outputLength,
      params.batchSize
    ]);
    paramsBuffer.unmap();

    // Create staging buffer for reading results
    const stagingBuffer = this.device.createBuffer({
      size: outputBuffer.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false
    });

    // Create bind group
    const bindGroup = this.pipeline.createBindGroup([
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: paramsBuffer } }
    ]);

    // Execute pipeline
    const workgroupCount: [number, number, number] = [
      Math.ceil(inputArray.length / 256),
      1,
      1
    ];

    await this.runtime.measurePerformance(async () => {
      await this.pipeline.execute(bindGroup, workgroupCount);

      // Copy results to staging buffer
      const commandEncoder = this.device.createCommandEncoder();
      commandEncoder.copyBufferToBuffer(
        outputBuffer,
        0,
        stagingBuffer,
        0,
        stagingBuffer.size
      );
      this.device.queue.submit([commandEncoder.finish()]);
    });

    // Read results
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const results = new Uint32Array(stagingBuffer.getMappedRange());
    const processedText = String.fromCharCode(...results);
    stagingBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    paramsBuffer.destroy();
    stagingBuffer.destroy();

    return processedText;
  }
}
