import { AudioProcessor, AudioConfig, AudioSegment } from './AudioProcessor';
import { AudioSynthesizer, SynthConfig } from './AudioSynthesizer';
import { ModelManager } from '../models/ModelManager';
import type { SubtitleSegment, SubtitleWord, AudioRenderOptions, AudioSegmentMetadata } from '../subtitles/types';

export interface StreamingOptions {
  chunkSize?: number;  // Number of words per chunk
  maxBufferSize?: number;  // Maximum size of audio buffer in samples
  onProgress?: (progress: number) => void;
  onChunk?: (chunk: AudioSegment) => void;
}

export class AudioRenderer {
  private processor: AudioProcessor;
  private synthesizer: AudioSynthesizer;
  private modelManager: ModelManager;
  private readonly DEFAULT_CHUNK_SIZE = 50;  // words
  private readonly DEFAULT_BUFFER_SIZE = 480000;  // 10 seconds at 48kHz

  constructor(
    device: GPUDevice,
    audioConfig: AudioConfig,
    synthConfig: SynthConfig
  ) {
    this.processor = new AudioProcessor(device, audioConfig);
    this.synthesizer = new AudioSynthesizer(device, synthConfig);
    this.modelManager = ModelManager.getInstance();
  }

  /**
   * Stream render a subtitle segment to audio, supporting unlimited length
   */
  async *streamSegment(
    segment: SubtitleSegment,
    options: AudioRenderOptions,
    streamOpts: StreamingOptions = {}
  ): AsyncGenerator<AudioSegment> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      maxBufferSize = this.DEFAULT_BUFFER_SIZE,
      onProgress,
      onChunk
    } = streamOpts;

    const model = await this.modelManager.getModel(options.voice);
    let wordBuffer: SubtitleWord[] = [];
    let currentTime = segment.start;
    let totalWords = segment.words.length;
    let processedWords = 0;

    // Process words in chunks
    for (let i = 0; i < segment.words.length; i++) {
      const word = segment.words[i];
      wordBuffer.push(word);

      // Render chunk when buffer is full or it's the last word
      if (wordBuffer.length >= chunkSize || i === segment.words.length - 1) {
        const chunkText = wordBuffer.map(w => w.text).join(' ');
        const chunkDuration = wordBuffer[wordBuffer.length - 1].start + 
                            wordBuffer[wordBuffer.length - 1].duration - 
                            wordBuffer[0].start;

        // Get prosody context from surrounding words
        const contextBefore = segment.words
          .slice(Math.max(0, i - chunkSize - 2), Math.max(0, i - chunkSize))
          .map(w => w.text)
          .join(' ');
        
        const contextAfter = segment.words
          .slice(i + 1, i + 3)
          .map(w => w.text)
          .join(' ');

        // Synthesize chunk with context
        const audio = await this.synthesizer.synthesizeWithContext(
          chunkText,
          contextBefore,
          contextAfter,
          model,
          options.speed
        );

        // Adjust timing to match subtitle timing
        const adjustedAudio = this.processor.adjustTiming(
          audio,
          currentTime,
          chunkDuration
        );

        const chunk: AudioSegment = {
          data: adjustedAudio,
          timestamp: currentTime,
          duration: chunkDuration,
          metadata: {
            subtitleId: segment.id,
            wordStartIndex: processedWords,
            wordEndIndex: processedWords + wordBuffer.length - 1
          }
        };

        // Update progress
        processedWords += wordBuffer.length;
        if (onProgress) {
          onProgress(processedWords / totalWords);
        }
        if (onChunk) {
          onChunk(chunk);
        }

        yield chunk;

        // Update state for next chunk
        currentTime += chunkDuration;
        wordBuffer = [];

        // Wait if buffer is too full
        while (this.processor.getBufferSize() > maxBufferSize) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  /**
   * Re-render a specific word while preserving prosody
   */
  async reRenderWord(
    segment: SubtitleSegment,
    wordIndex: number,
    newText: string,
    options: AudioRenderOptions
  ): Promise<AudioSegment> {
    const word = segment.words[wordIndex];
    const model = await this.modelManager.getModel(options.voice);

    // Get prosody context from surrounding words
    const contextBefore = segment.words
      .slice(Math.max(0, wordIndex - 2), wordIndex)
      .map(w => w.text)
      .join(' ');
    
    const contextAfter = segment.words
      .slice(wordIndex + 1, wordIndex + 3)
      .map(w => w.text)
      .join(' ');

    // Synthesize with context
    const audio = await this.synthesizer.synthesizeWithContext(
      newText,
      contextBefore,
      contextAfter,
      model,
      options.speed
    );

    // Adjust timing to match original word duration
    const adjustedAudio = this.processor.adjustTiming(
      audio,
      word.start,
      word.duration
    );

    return {
      data: adjustedAudio,
      timestamp: word.start,
      duration: word.duration,
      metadata: {
        subtitleId: segment.id,
        wordIndex
      }
    };
  }

  /**
   * Stream concatenate multiple audio segments with proper timing
   */
  async *streamConcatenate(
    segments: AsyncIterable<AudioSegment>[],
    streamOpts: StreamingOptions = {}
  ): AsyncGenerator<Float32Array> {
    const { maxBufferSize = this.DEFAULT_BUFFER_SIZE } = streamOpts;
    const buffers: AudioSegment[] = [];
    let currentTime = 0;
    let outputBuffer = new Float32Array(maxBufferSize);
    let outputPosition = 0;

    // Process all segment streams in parallel
    const streams = segments.map(s => s[Symbol.asyncIterator]());
    let activeStreams = streams.length;

    while (activeStreams > 0) {
      // Get next chunk from each stream
      const results = await Promise.all(
        streams.map(async (stream) => {
          try {
            const result = await stream.next();
            return result.done ? null : result.value;
          } catch {
            return null;
          }
        })
      );

      // Process chunks
      for (const chunk of results) {
        if (chunk === null) {
          activeStreams--;
          continue;
        }

        buffers.push(chunk);
      }

      // Sort and mix buffers
      buffers.sort((a, b) => a.timestamp - b.timestamp);

      // Process buffers that are ready
      while (buffers.length > 0 && 
             buffers[0].timestamp <= currentTime + maxBufferSize / this.processor.sampleRate) {
        const chunk = buffers.shift()!;
        const startSample = Math.floor((chunk.timestamp - currentTime) * this.processor.sampleRate);
        
        // If chunk would overflow buffer, yield current buffer first
        if (startSample + chunk.data.length > maxBufferSize) {
          yield outputBuffer;
          outputBuffer = new Float32Array(maxBufferSize);
          outputPosition = 0;
          currentTime += maxBufferSize / this.processor.sampleRate;
          buffers.unshift(chunk);  // Put chunk back for next iteration
          continue;
        }

        this.processor.mixIntoBuffer(outputBuffer, chunk.data, startSample);
        outputPosition = Math.max(outputPosition, startSample + chunk.data.length);
      }

      // Yield buffer if it's full enough
      if (outputPosition >= maxBufferSize * 0.8) {
        yield outputBuffer;
        outputBuffer = new Float32Array(maxBufferSize);
        outputPosition = 0;
        currentTime += maxBufferSize / this.processor.sampleRate;
      }

      // Small delay to prevent busy-waiting
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Yield any remaining audio
    if (outputPosition > 0) {
      yield outputBuffer.slice(0, outputPosition);
    }
  }
}
