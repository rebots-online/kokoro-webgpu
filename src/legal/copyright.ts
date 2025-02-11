/**
 * @fileoverview Copyright and legal information for the Kokoro WebGPU project.
 * @copyright Copyright (C) 2025 Robin L. M. Cheung, MBA. All rights reserved.
 */

export const COPYRIGHT_NOTICE = `Copyright (C) 2025 Robin L. M. Cheung, MBA. All rights reserved.`;

export const LEGAL_METADATA = {
  organization: "Robin's AI World",
  author: "Robin L. M. Cheung, MBA",
  copyright: COPYRIGHT_NOTICE,
  namespace: "world.robinsai.kokoro-webgpu",
  repository: "https://github.com/rebots-online/kokoro-webgpu",
  license: "Proprietary"
};

/**
 * Adds copyright notice to generated files or outputs
 * @param content The content to add copyright to
 * @returns Content with copyright notice
 */
export function addCopyright(content: string): string {
  return `${COPYRIGHT_NOTICE}\n\n${content}`;
}

/**
 * Gets legal metadata for API responses
 * @returns Object containing legal metadata
 */
export function getLegalMetadata() {
  return { ...LEGAL_METADATA };
}
