interface TimedText {
  start: number;
  end: number;
  text: string;
}

export class FileParser {
  /**
   * Parse a file based on its type
   * @param file File to parse
   * @returns Promise with parsed content
   */
  static async parseFile(file: File): Promise<string | TimedText[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const content = await file.text();

    switch (extension) {
      case 'txt':
        return this.parseTextFile(content);
      case 'srt':
        return this.parseSRTFile(content);
      case 'vtt':
        return this.parseVTTFile(content);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Parse plain text file
   * @param content File content
   * @returns Parsed text
   */
  private static parseTextFile(content: string): string {
    return content.trim();
  }

  /**
   * Parse SRT subtitle file
   * @param content File content
   * @returns Array of timed text entries
   */
  private static parseSRTFile(content: string): TimedText[] {
    const blocks = content.trim().split(/\n\n+/);
    return blocks.map(block => {
      const [, timing, ...textLines] = block.split('\n');
      const [start, end] = timing.split(' --> ').map(this.timeToSeconds);
      return {
        start,
        end,
        text: textLines.join(' ').trim()
      };
    });
  }

  /**
   * Parse WebVTT subtitle file
   * @param content File content
   * @returns Array of timed text entries
   */
  private static parseVTTFile(content: string): TimedText[] {
    const lines = content.trim().split('\n');
    if (!lines[0].includes('WEBVTT')) {
      throw new Error('Invalid WebVTT file');
    }

    const entries: TimedText[] = [];
    let currentEntry: Partial<TimedText> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;

      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(t => 
          this.timeToSeconds(t.trim())
        );
        currentEntry = { start, end };
      } else if (currentEntry.start !== undefined) {
        currentEntry.text = (currentEntry.text || '') + ' ' + line;
        if (!lines[i + 1]?.trim()) {
          entries.push(currentEntry as TimedText);
          currentEntry = {};
        }
      }
    }

    return entries;
  }

  /**
   * Convert time string to seconds
   * @param time Time string (HH:MM:SS,mmm or HH:MM:SS.mmm)
   * @returns Time in seconds
   */
  private static timeToSeconds(time: string): number {
    const [hms, ms] = time.replace(',', '.').split('.');
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  }
}
