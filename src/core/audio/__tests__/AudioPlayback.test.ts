import { AudioPlayback, PlaybackOptions } from '../AudioPlayback';

// Mock Web Audio API
const mockAudioContext = {
  createGain: jest.fn(),
  createBufferSource: jest.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: jest.fn()
};

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn()
  }
};

const mockSourceNode = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  disconnect: jest.fn(),
  playbackRate: {
    value: 1
  },
  preservePitch: false,
  buffer: null,
  onended: null
};

describe('AudioPlayback', () => {
  let playback: AudioPlayback;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    mockAudioContext.createBufferSource.mockReturnValue(mockSourceNode);
    mockAudioContext.resume.mockResolvedValue(undefined);

    // Create playback instance with mock context
    (global as any).AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    playback = new AudioPlayback();
  });

  describe('play', () => {
    it('should start playback with default options', async () => {
      const buffer = {} as AudioBuffer;
      await playback.play(buffer);

      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockSourceNode.start).toHaveBeenCalledWith(0, 0);
    });

    it('should apply volume option', async () => {
      const buffer = {} as AudioBuffer;
      const options: PlaybackOptions = { volume: 0.5 };
      await playback.play(buffer, 0, options);

      expect(mockGainNode.gain.value).toBe(0.5);
    });

    it('should apply playback rate option', async () => {
      const buffer = {} as AudioBuffer;
      const options: PlaybackOptions = {
        playbackRate: 1.5,
        preservePitch: true
      };
      await playback.play(buffer, 0, options);

      expect(mockSourceNode.playbackRate.value).toBe(1.5);
      expect(mockSourceNode.preservePitch).toBe(true);
    });

    it('should apply fade in/out', async () => {
      const buffer = { duration: 10 } as AudioBuffer;
      const options: PlaybackOptions = {
        fadeIn: 0.5,
        fadeOut: 0.5
      };
      await playback.play(buffer, 0, options);

      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop playback and cleanup', async () => {
      const buffer = {} as AudioBuffer;
      await playback.play(buffer);
      await playback.stop();

      expect(mockSourceNode.stop).toHaveBeenCalled();
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should return current time and stop playback', async () => {
      const buffer = {} as AudioBuffer;
      await playback.play(buffer);
      mockAudioContext.currentTime = 5;

      const elapsed = await playback.pause();
      expect(elapsed).toBe(5);
      expect(mockSourceNode.stop).toHaveBeenCalled();
    });
  });

  describe('setVolume', () => {
    it('should clamp volume between 0 and 1', () => {
      playback.setVolume(1.5);
      expect(mockGainNode.gain.value).toBe(1);

      playback.setVolume(-0.5);
      expect(mockGainNode.gain.value).toBe(0);
    });
  });

  describe('setPlaybackRate', () => {
    it('should update playback rate and preserve pitch setting', async () => {
      const buffer = {} as AudioBuffer;
      await playback.play(buffer);
      playback.setPlaybackRate(2.0, true);

      expect(mockSourceNode.playbackRate.value).toBe(2.0);
      expect(mockSourceNode.preservePitch).toBe(true);
    });
  });
});
