#!/usr/bin/env python3
"""
Script to download and verify Kokoro TTS models.
Creates a local mirror of all necessary model files.
"""

import os
import json
import hashlib
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm

MODELS_DIR = Path(__file__).parent.parent / "models"
MANIFEST_PATH = MODELS_DIR / "MODEL_MANIFEST.json"
CHUNK_SIZE = 8192

def calculate_file_hash(filepath):
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def download_file(url, target_path, desc=None):
    """Download a file with progress bar."""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(target_path, 'wb') as file, tqdm(
        desc=desc,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as pbar:
        for data in response.iter_content(CHUNK_SIZE):
            size = file.write(data)
            pbar.update(size)

def download_voice_models(manifest):
    """Download all voice models."""
    voices_dir = MODELS_DIR / "voices"
    voices_dir.mkdir(parents=True, exist_ok=True)
    
    # Download base model
    base_model = manifest['base_model']
    base_model_path = MODELS_DIR / base_model['name']
    if not base_model_path.exists():
        print(f"\nDownloading base model: {base_model['name']}")
        download_file(base_model['url'], base_model_path, desc="Base Model")
        
        # Verify base model hash
        if calculate_file_hash(base_model_path) != manifest['model_hash']:
            raise ValueError("Base model hash verification failed!")
    
    # Download voice models
    for accent, accent_voices in manifest['voices'].items():
        print(f"\nDownloading {accent} voices...")
        for voice_id, voice_data in accent_voices.items():
            voice_path = voices_dir / voice_data['name']
            if not voice_path.exists():
                download_file(
                    voice_data['url'],
                    voice_path,
                    desc=f"{voice_data['description']}"
                )

def download_onnx_models(manifest):
    """Download ONNX model files."""
    onnx_dir = MODELS_DIR / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)
    
    print("\nDownloading ONNX models...")
    for file_id, file_data in manifest['onnx']['files'].items():
        file_path = onnx_dir / file_data['name']
        if not file_path.exists():
            download_file(
                file_data['url'],
                file_path,
                desc=f"ONNX {file_id}"
            )

def main():
    """Main entry point."""
    print("Starting Kokoro model download...")
    
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
    
    # Download voice models
    download_voice_models(manifest)
    
    # Download ONNX models
    download_onnx_models(manifest)
    
    print("\nAll models downloaded successfully!")

if __name__ == "__main__":
    main()
