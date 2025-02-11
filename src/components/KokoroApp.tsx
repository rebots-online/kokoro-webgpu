import React, { useEffect, useState } from 'react';
import { FileUpload } from './FileUpload';
import { WScribeEditor } from './WScribeEditor';
import { TextProcessor } from '../services/TextProcessor';
import { RuntimeManager } from '../core/runtime/RuntimeManager';
import { GPUTextProcessor } from '../core/runtime/TextProcessor';

interface AppState {
  content: string;
  isProcessing: boolean;
  isPlaying: boolean;
  currentSegment: {
    text: string;
    start: number;
    end: number;
  } | null;
}

export const KokoroApp: React.FC = () => {
  const [state, setState] = useState<AppState>({
    content: '',
    isProcessing: false,
    isPlaying: false,
    currentSegment: null
  });

  const [runtime, setRuntime] = useState<RuntimeManager | null>(null);
  const [gpuProcessor, setGpuProcessor] = useState<GPUTextProcessor | null>(null);

  // Initialize runtime
  useEffect(() => {
    const initRuntime = async () => {
      const runtimeManager = RuntimeManager.getInstance();
      await runtimeManager.initialize();
      setRuntime(runtimeManager);

      if (runtimeManager.getCurrentMode() === 'gpu') {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter?.requestDevice();
        if (device) {
          setGpuProcessor(new GPUTextProcessor(device));
        }
      }
    };

    initRuntime();
  }, []);

  const handleFilesAccepted = async (files: File[]) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Process each file
      for (const file of files) {
        const processor = new TextProcessor();
        const segments = await processor.process(file, {
          splitSentences: true,
          detectSpeakers: true,
          preserveFormatting: true
        });

        // Use GPU processing if available
        let processedContent = '';
        if (gpuProcessor && runtime?.getCurrentMode() === 'gpu') {
          const texts = segments.map(s => s.text);
          const processed = await Promise.all(
            texts.map(t => gpuProcessor.processText(t))
          );
          processedContent = processed.join('\n');
        } else {
          processedContent = segments
            .map(s => {
              const speaker = s.metadata?.speaker
                ? `[${s.metadata.speaker}] `
                : '';
              return `${speaker}${s.text}`;
            })
            .join('\n');
        }

        setState(prev => ({
          ...prev,
          content: prev.content
            ? `${prev.content}\n\n${processedContent}`
            : processedContent
        }));
      }
    } catch (error) {
      console.error('Error processing files:', error);
      // Dispatch error notification
      window.dispatchEvent(
        new CustomEvent('kokoro-notification', {
          detail: {
            type: 'error',
            message: 'Error processing files. Please try again.'
          }
        })
      );
    } finally {
      setState(prev => ({ ...prev, isProcessing: true }));
    }
  };

  const handleContentChange = (newContent: string) => {
    setState(prev => ({ ...prev, content: newContent }));
  };

  const handlePlayRequest = (text: string, start: number, end: number) => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
      currentSegment: { text, start, end }
    }));

    // Simulate playback completion after segment duration
    const duration = (end - start) * 1000; // Convert to milliseconds
    setTimeout(() => {
      setState(prev => ({ ...prev, isPlaying: false, currentSegment: null }));
    }, duration);
  };

  return (
    <div className="kokoro-app">
      <header className="app-header">
        <h1>Kokoro WebGPU</h1>
        <div className="runtime-info">
          Mode: {runtime?.getCurrentMode().toUpperCase()}
        </div>
      </header>

      <main className="app-content">
        <section className="upload-section">
          <FileUpload
            onFilesAccepted={handleFilesAccepted}
            acceptedTypes={['.txt', '.srt', '.vtt']}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </section>

        <section className="editor-section">
          <WScribeEditor
            content={state.content}
            onContentChange={handleContentChange}
            onPlayRequest={handlePlayRequest}
            isPlaying={state.isPlaying}
          />
        </section>

        {state.isProcessing && (
          <div className="processing-overlay">
            <div className="spinner" />
            <p>Processing files...</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        {runtime?.getMetrics() && (
          <div className="metrics">
            <span>
              Inference Time:{' '}
              {runtime.getMetrics()?.performance.inferenceTime.toFixed(2)}ms
            </span>
            <span>
              Memory Usage:{' '}
              {(runtime.getMetrics()?.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};
