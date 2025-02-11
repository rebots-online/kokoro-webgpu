export interface PlaybackOptions {
  volume?: number;
  playbackRate?: number;
  preservePitch?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export class AudioPlayback {
  private context: AudioContext;
  private gainNode: GainNode;
  private currentSource: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  async play(
    buffer: AudioBuffer,
    startOffset: number = 0,
    options: PlaybackOptions = {}
  ): Promise<void> {
    if (this.isPlaying) {
      await this.stop();
    }

    // Ensure context is running
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Create and configure source
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    // Configure playback rate
    if (options.playbackRate !== undefined) {
      source.playbackRate.value = options.playbackRate;
      if (options.preservePitch) {
        source.preservePitch = true;
      }
    }

    // Configure volume
    this.gainNode.gain.value = options.volume ?? 1;

    // Apply fade in/out if specified
    if (options.fadeIn) {
      this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        options.volume ?? 1,
        this.context.currentTime + options.fadeIn
      );
    }

    if (options.fadeOut) {
      const duration = buffer.duration - startOffset;
      this.gainNode.gain.setValueAtTime(
        options.volume ?? 1,
        this.context.currentTime + duration - options.fadeOut
      );
      this.gainNode.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + duration
      );
    }

    // Connect nodes
    source.connect(this.gainNode);

    // Start playback
    source.start(0, startOffset);
    this.currentSource = source;
    this.startTime = this.context.currentTime - startOffset;
    this.isPlaying = true;

    // Handle playback completion
    source.onended = () => {
      this.isPlaying = false;
      this.currentSource = null;
      this.startTime = 0;
    };
  }

  async stop(): Promise<void> {
    if (this.currentSource && this.isPlaying) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.isPlaying = false;
      this.currentSource = null;
      this.startTime = 0;
    }
  }

  async pause(): Promise<number> {
    if (!this.isPlaying || !this.currentSource) {
      return 0;
    }

    const elapsed = this.context.currentTime - this.startTime;
    await this.stop();
    return elapsed;
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return 0;
    return this.context.currentTime - this.startTime;
  }

  setVolume(volume: number): void {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }

  setPlaybackRate(rate: number, preservePitch: boolean = true): void {
    if (this.currentSource) {
      this.currentSource.playbackRate.value = rate;
      this.currentSource.preservePitch = preservePitch;
    }
  }
}
