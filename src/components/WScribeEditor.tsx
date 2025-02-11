import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@world.robinsai/wscribe-editor';
import { RuntimeManager } from '../core/runtime/RuntimeManager';

interface WScribeEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onPlayRequest: (text: string, start: number, end: number) => void;
  isPlaying: boolean;
}

export const WScribeEditor: React.FC<WScribeEditorProps> = ({
  content,
  onContentChange,
  onPlayRequest,
  isPlaying
}) => {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const runtime = RuntimeManager.getInstance();

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const initEditor = async () => {
      const editor = new Editor({
        container: containerRef.current!,
        content,
        config: {
          theme: runtime.getCurrentMode() === 'gpu' ? 'glass' : 'light',
          features: {
            realTimePreview: true,
            autoSave: true,
            wordCount: true,
            timestamps: true
          }
        }
      });

      editor.on('ready', () => {
        setIsReady(true);
      });

      editor.on('change', (newContent: string) => {
        onContentChange(newContent);
      });

      editor.on('play', (selection: { text: string; start: number; end: number }) => {
        onPlayRequest(selection.text, selection.start, selection.end);
      });

      editorRef.current = editor;
    };

    initEditor();

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [content, onContentChange, onPlayRequest]);

  // Update editor state when playback status changes
  useEffect(() => {
    if (!editorRef.current || !isReady) return;
    
    editorRef.current.setPlaybackState(isPlaying);
  }, [isPlaying, isReady]);

  // Handle theme changes based on runtime mode
  useEffect(() => {
    const handleRuntimeChange = () => {
      if (!editorRef.current || !isReady) return;
      
      editorRef.current.setTheme(
        runtime.getCurrentMode() === 'gpu' ? 'glass' : 'light'
      );
    };

    window.addEventListener('runtime-change', handleRuntimeChange);
    return () => window.removeEventListener('runtime-change', handleRuntimeChange);
  }, [isReady]);

  return (
    <div 
      ref={containerRef} 
      className="wscribe-editor-container"
      data-ready={isReady}
    />
  );
};
