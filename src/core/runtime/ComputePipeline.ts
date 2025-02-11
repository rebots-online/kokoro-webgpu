export interface ComputeConfig {
  workgroupSize: [number, number, number];
  bindGroupLayout: GPUBindGroupLayoutDescriptor;
  shaderCode: string;
}

export class ComputePipeline {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(device: GPUDevice, config: ComputeConfig) {
    this.device = device;
    this.bindGroupLayout = device.createBindGroupLayout(config.bindGroupLayout);
    
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout]
    });

    const shaderModule = device.createShaderModule({
      code: config.shaderCode
    });

    this.pipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main',
        constants: {
          workgroupSizeX: config.workgroupSize[0],
          workgroupSizeY: config.workgroupSize[1],
          workgroupSizeZ: config.workgroupSize[2]
        }
      }
    });
  }

  createBindGroup(entries: GPUBindGroupEntry[]): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries
    });
  }

  async dispatch(
    commandEncoder: GPUCommandEncoder,
    bindGroup: GPUBindGroup,
    workgroupCount: [number, number, number]
  ): Promise<void> {
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
      workgroupCount[0],
      workgroupCount[1],
      workgroupCount[2]
    );
    passEncoder.end();
  }

  async execute(
    bindGroup: GPUBindGroup,
    workgroupCount: [number, number, number]
  ): Promise<void> {
    const commandEncoder = this.device.createCommandEncoder();
    await this.dispatch(commandEncoder, bindGroup, workgroupCount);
    const commands = commandEncoder.finish();
    this.device.queue.submit([commands]);
  }
}
