struct Params {
  input_length: u32,
  output_length: u32,
  batch_size: u32,
}

@group(0) @binding(0) var<storage, read> input_text: array<u32>;
@group(0) @binding(1) var<storage, read_write> output_text: array<u32>;
@group(0) @binding(2) var<uniform> params: Params;

const WORKGROUP_SIZE = 256;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
) {
  let idx = global_id.x;
  if (idx >= params.input_length) {
    return;
  }

  // Process text in parallel
  let batch_idx = idx / params.batch_size;
  let local_idx = idx % params.batch_size;
  
  // Read input character
  let char = input_text[idx];
  
  // Basic text processing rules
  var processed_char = char;
  
  // Convert to lowercase if uppercase
  if (char >= 65u && char <= 90u) {
    processed_char = char + 32u;
  }
  
  // Remove special characters
  if (processed_char < 32u || processed_char > 126u) {
    processed_char = 32u; // Replace with space
  }
  
  // Write to output
  let output_idx = batch_idx * params.output_length + local_idx;
  if (output_idx < arrayLength(&output_text)) {
    output_text[output_idx] = processed_char;
  }
}
