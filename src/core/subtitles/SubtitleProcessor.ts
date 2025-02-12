import { parse, stringifySync } from 'subtitle';
import type { SubtitleSegment, SubtitleWord } from './types';

export class SubtitleProcessor {
  /**
   * Parse SRT content into structured subtitle segments with word-level timing
   */
  static parseSRT(content: string): SubtitleSegment[] {
    const nodes = parse(content);
    return nodes.map(node => {
      if ('type' in node && node.type === 'cue') {
        // Parse word-level timing if available in text
        // Format: <word start="1.234">Hello</word>
        const words: SubtitleWord[] = node.data.text
          .match(/<word[^>]*>([^<]*)<\/word>/g)
          ?.map(wordTag => {
            const start = parseFloat(wordTag.match(/start="([^"]*)"/)![1]);
            const text = wordTag.match(/>([^<]*)<\/word>/)?.[1] || '';
            return { text, start, duration: 0 };
          }) || [{ text: node.data.text, start: node.data.start, duration: 0 }];

        // Calculate word durations based on next word start time
        for (let i = 0; i < words.length - 1; i++) {
          words[i].duration = words[i + 1].start - words[i].start;
        }
        // Last word duration extends to end of segment
        if (words.length > 0) {
          words[words.length - 1].duration = 
            node.data.end - words[words.length - 1].start;
        }

        return {
          id: node.data.id || '',
          start: node.data.start,
          end: node.data.end,
          text: node.data.text,
          words
        };
      }
      return null;
    }).filter((seg): seg is SubtitleSegment => seg !== null);
  }

  /**
   * Export subtitle segments back to SRT format
   */
  static exportSRT(segments: SubtitleSegment[]): string {
    const nodes = segments.map(segment => ({
      type: 'cue',
      data: {
        start: segment.start,
        end: segment.end,
        text: segment.words
          .map(word => `<word start="${word.start}">${word.text}</word>`)
          .join(' ')
      }
    }));
    return stringifySync(nodes, { format: 'SRT' });
  }

  /**
   * Adjust timing of words to match target duration while preserving relative spacing
   */
  static adjustTiming(words: SubtitleWord[], targetStart: number, targetDuration: number): SubtitleWord[] {
    const totalDuration = words.reduce((sum, word) => sum + word.duration, 0);
    const scaleFactor = targetDuration / totalDuration;

    let currentTime = targetStart;
    return words.map(word => {
      const newDuration = word.duration * scaleFactor;
      const newWord = {
        text: word.text,
        start: currentTime,
        duration: newDuration
      };
      currentTime += newDuration;
      return newWord;
    });
  }

  /**
   * Split a segment into multiple segments at word boundaries
   */
  static splitSegment(segment: SubtitleSegment, splitPoints: number[]): SubtitleSegment[] {
    const results: SubtitleSegment[] = [];
    let currentWords: SubtitleWord[] = [];
    let currentStart = segment.start;
    let wordIndex = 0;

    for (const word of segment.words) {
      if (splitPoints.includes(wordIndex)) {
        if (currentWords.length > 0) {
          results.push({
            id: `${segment.id}_${results.length}`,
            start: currentStart,
            end: word.start,
            text: currentWords.map(w => w.text).join(' '),
            words: currentWords
          });
        }
        currentWords = [];
        currentStart = word.start;
      }
      currentWords.push(word);
      wordIndex++;
    }

    if (currentWords.length > 0) {
      results.push({
        id: `${segment.id}_${results.length}`,
        start: currentStart,
        end: segment.end,
        text: currentWords.map(w => w.text).join(' '),
        words: currentWords
      });
    }

    return results;
  }
}
