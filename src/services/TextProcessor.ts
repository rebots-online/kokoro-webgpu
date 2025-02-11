import { FileParser } from './FileParser';

export interface TextSegment {
  text: string;
  start?: number;
  end?: number;
  metadata?: {
    speaker?: string;
    emotion?: string;
    language?: string;
    [key: string]: any;
  };
}

export interface ProcessingOptions {
  splitSentences?: boolean;
  detectLanguage?: boolean;
  detectSpeakers?: boolean;
  maxSegmentLength?: number;
  preserveFormatting?: boolean;
}

export class TextProcessor {
  private static readonly DEFAULT_OPTIONS: ProcessingOptions = {
    splitSentences: true,
    detectLanguage: false,
    detectSpeakers: false,
    maxSegmentLength: 200,
    preserveFormatting: true
  };

  /**
   * Process text content with various options
   */
  static async process(
    content: string | File,
    options: ProcessingOptions = {}
  ): Promise<TextSegment[]> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    let text: string | TextSegment[];

    // Handle file input
    if (content instanceof File) {
      text = await FileParser.parseFile(content);
    } else {
      text = content;
    }

    // Handle array input (from subtitle files)
    if (Array.isArray(text)) {
      return this.processTimedSegments(text, mergedOptions);
    }

    // Process plain text
    return this.processPlainText(text, mergedOptions);
  }

  /**
   * Process plain text into segments
   */
  private static processPlainText(
    text: string,
    options: ProcessingOptions
  ): TextSegment[] {
    const segments: TextSegment[] = [];
    let currentText = text;

    // Clean and normalize text
    if (options.preserveFormatting) {
      currentText = this.normalizeWhitespace(currentText);
    } else {
      currentText = this.stripFormatting(currentText);
    }

    // Split into initial segments
    let rawSegments = options.splitSentences
      ? this.splitIntoSentences(currentText)
      : [currentText];

    // Process each segment
    rawSegments.forEach((segment, index) => {
      // Split long segments if needed
      const subSegments = this.splitLongSegment(
        segment,
        options.maxSegmentLength || 200
      );

      subSegments.forEach(text => {
        segments.push({
          text,
          metadata: this.extractMetadata(text, options)
        });
      });
    });

    return segments;
  }

  /**
   * Process timed segments (from subtitle files)
   */
  private static processTimedSegments(
    segments: any[],
    options: ProcessingOptions
  ): TextSegment[] {
    return segments.map(segment => ({
      text: options.preserveFormatting
        ? this.normalizeWhitespace(segment.text)
        : this.stripFormatting(segment.text),
      start: segment.start,
      end: segment.end,
      metadata: this.extractMetadata(segment.text, options)
    }));
  }

  /**
   * Split text into sentences using smart rules
   */
  private static splitIntoSentences(text: string): string[] {
    // Basic sentence splitting with preservation of decimal numbers and abbreviations
    const sentenceRegex = /[.!?]+(?=\s+|$)(?<!Mr|Mrs|Ms|Dr|Prof|Sr|Jr|etc|vs|fig|eq|e\.g|i\.e)\s*/g;
    return text
      .split(sentenceRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Split long segments while preserving word boundaries
   */
  private static splitLongSegment(
    text: string,
    maxLength: number
  ): string[] {
    if (text.length <= maxLength) return [text];

    const segments: string[] = [];
    let currentSegment = '';
    const words = text.split(/\s+/);

    words.forEach(word => {
      if ((currentSegment + ' ' + word).length > maxLength && currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = word;
      } else {
        currentSegment += (currentSegment ? ' ' : '') + word;
      }
    });

    if (currentSegment) {
      segments.push(currentSegment.trim());
    }

    return segments;
  }

  /**
   * Extract metadata from text content
   */
  private static extractMetadata(
    text: string,
    options: ProcessingOptions
  ): TextSegment['metadata'] {
    const metadata: TextSegment['metadata'] = {};

    // Extract speaker if present (e.g., "John: Hello" or "[John] Hello")
    if (options.detectSpeakers) {
      const speakerMatch = text.match(/^(?:(?:\[([^\]]+)\])|(?:([^:]+):))\s*/);
      if (speakerMatch) {
        metadata.speaker = speakerMatch[1] || speakerMatch[2];
      }
    }

    // Extract emotion if present (e.g., "(happy) Hello" or "*happy* Hello")
    const emotionMatch = text.match(/^(?:\(([^)]+)\)|\*([^*]+)\*)\s*/);
    if (emotionMatch) {
      metadata.emotion = emotionMatch[1] || emotionMatch[2];
    }

    return metadata;
  }

  /**
   * Normalize whitespace while preserving intentional formatting
   */
  private static normalizeWhitespace(text: string): string {
    return text
      .replace(/[\t\v\f\r ]+/g, ' ')  // Convert all horizontal whitespace to single spaces
      .replace(/\n{3,}/g, '\n\n')     // Reduce multiple blank lines to double
      .trim();
  }

  /**
   * Strip all formatting for clean text
   */
  private static stripFormatting(text: string): string {
    return text
      .replace(/[\s\n\r]+/g, ' ')
      .trim();
  }
}
