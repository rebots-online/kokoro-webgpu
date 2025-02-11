import { RuntimeManager } from '../runtime/RuntimeManager';
import { ComputePipeline } from '../runtime/ComputePipeline';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  format: 'f32' | 'i16';
}

export interface AudioSegment {
  data: Float32Array;
  timestamp: number;
  duration: number;
  metadata?: {
    speaker?: string;
    emotion?: string;
    [key: string]: any;
  };
}

export class AudioProcessor {
  private device: GPUDevice;
  private runtime: RuntimeManager;
  private pipeline: ComputePipeline;
  private config: AudioConfig;
  private context: AudioContext;

  constructor(device: GPUDevice, config: AudioConfig) {
    this.device = device;
    this.runtime = RuntimeManager.getInstance();
    this.config = config;
    this.context = new AudioContext({
      sampleRate: config.sampleRate,
      latencyHint: 'interactive'
    });

    // Initialize WebGPU pipeline for audio processing
    this.pipeline = new ComputePipeline(device, {
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
      shaderCode: this.getAudioShader()
    });
  }

  async processAudio(audioData: Float32Array): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];
    const SEGMENT_SIZE = 2048; // Process in 2048-sample chunks

    for (let offset = 0; offset < audioData.length; offset += SEGMENT_SIZE) {
      const chunk = audioData.slice(offset, offset + SEGMENT_SIZE);
      const processedChunk = await this.processChunk(chunk);
      
      segments.push({
        data: processedChunk,
        timestamp: offset / this.config.sampleRate,
        duration: chunk.length / this.config.sampleRate
      });
    }

    return segments;
  }

  private async processChunk(chunk: Float32Array): Promise<Float32Array> {
    // Create input buffer
    const inputBuffer = this.device.createBuffer({
      size: chunk.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(inputBuffer.getMappedRange()).set(chunk);
    inputBuffer.unmap();

    // Create output buffer
    const outputBuffer = this.device.createBuffer({
      size: chunk.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: false
    });

    // Create uniform buffer for audio parameters
    const uniformBuffer = this.device.createBuffer({
      size: 16, // 4 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(uniformBuffer.getMappedRange()).set([
      this.config.sampleRate,
      this.config.channels,
      chunk.length,
      0 // padding
    ]);
    uniformBuffer.unmap();

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
      { binding: 2, resource: { buffer: uniformBuffer } }
    ]);

    // Execute pipeline
    const workgroupCount: [number, number, number] = [
      Math.ceil(chunk.length / 256),
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
    const results = new Float32Array(stagingBuffer.getMappedRange().slice(0));
    stagingBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    uniformBuffer.destroy();
    stagingBuffer.destroy();

    return results;
  }

  async createAudioBuffer(segments: AudioSegment[]): Promise<AudioBuffer> {
    const totalSamples = segments.reduce(
      (sum, segment) => sum + segment.data.length,
      0
    );

    const buffer = this.context.createBuffer(
      this.config.channels,
      totalSamples,
      this.config.sampleRate
    );

    let offset = 0;
    for (const segment of segments) {
      buffer.copyToChannel(segment.data, 0, offset);
      offset += segment.data.length;
    }

    return buffer;
  }

  private getAudioShader(): string {
    return `
      struct AudioParams {
        sample_rate: f32,
        channels: f32,
        length: f32,
        padding: f32,
      }

      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;
      @group(0) @binding(2) var<uniform> params: AudioParams;

      const WORKGROUP_SIZE = 256u;

      @compute @workgroup_size(WORKGROUP_SIZE)
      fn main(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(workgroup_id) workgroup_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
      ) {
        let idx = global_id.x;
        if (idx >= u32(params.length)) {
          return;
        }

        // Basic audio processing:
        // 1. Apply soft clipping
        // 2. Normalize
        var sample = input[idx];
        
        // Soft clipping using tanh
        sample = tanh(sample);
        
        // Store processed sample
        output[idx] = sample;
      }

      // Hyperbolic tangent implementation
      fn tanh(x: f32) -> f32 {
        let exp2x = exp(2.0 * x);
        return (exp2x - 1.0) / (exp2x + 1.0);
      }
    `;
  }
}
