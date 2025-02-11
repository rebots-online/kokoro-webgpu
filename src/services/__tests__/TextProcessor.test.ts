import { TextProcessor, ProcessingOptions } from '../TextProcessor';

describe('TextProcessor', () => {
  describe('process', () => {
    it('should process plain text with default options', async () => {
      const input = 'Hello world. This is a test. How are you?';
      const result = await TextProcessor.process(input);
      
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Hello world');
      expect(result[1].text).toBe('This is a test');
      expect(result[2].text).toBe('How are you');
    });

    it('should preserve decimal numbers', async () => {
      const input = 'The value is 3.14. The end.';
      const result = await TextProcessor.process(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('The value is 3.14');
    });

    it('should handle abbreviations correctly', async () => {
      const input = 'Dr. Smith visited Mrs. Jones. The end.';
      const result = await TextProcessor.process(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Dr. Smith visited Mrs. Jones');
    });

    it('should split long segments', async () => {
      const longText = 'This is a very long sentence that should be split into multiple segments because it exceeds the maximum length limit set in the options.';
      const options: ProcessingOptions = {
        maxSegmentLength: 30,
        splitSentences: false
      };
      
      const result = await TextProcessor.process(longText, options);
      
      expect(result.length).toBeGreaterThan(1);
      result.forEach(segment => {
        expect(segment.text.length).toBeLessThanOrEqual(30);
      });
    });

    it('should detect speakers when enabled', async () => {
      const input = '[John] Hello there. Mary: How are you?';
      const options: ProcessingOptions = {
        detectSpeakers: true
      };
      
      const result = await TextProcessor.process(input, options);
      
      expect(result[0].metadata?.speaker).toBe('John');
      expect(result[1].metadata?.speaker).toBe('Mary');
    });

    it('should preserve formatting when enabled', async () => {
      const input = 'Line one.\n\nLine two.\nLine three.';
      const options: ProcessingOptions = {
        preserveFormatting: true,
        splitSentences: false
      };
      
      const result = await TextProcessor.process(input, options);
      
      expect(result[0].text).toBe('Line one.\n\nLine two.\nLine three.');
    });

    it('should strip formatting when disabled', async () => {
      const input = 'Line one.\n\nLine two.\nLine three.';
      const options: ProcessingOptions = {
        preserveFormatting: false,
        splitSentences: false
      };
      
      const result = await TextProcessor.process(input, options);
      
      expect(result[0].text).toBe('Line one. Line two. Line three.');
    });

    it('should handle empty input', async () => {
      const input = '';
      const result = await TextProcessor.process(input);
      
      expect(result).toHaveLength(0);
    });

    it('should handle input with only whitespace', async () => {
      const input = '   \n\t   \r\n   ';
      const result = await TextProcessor.process(input);
      
      expect(result).toHaveLength(0);
    });
  });
});
