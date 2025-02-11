import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
}

interface UploadState {
  files: File[];
  progress: { [key: string]: number };
  errors: { [key: string]: string };
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesAccepted,
  acceptedTypes = ['.txt', '.srt', '.vtt'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    files: [],
    progress: {},
    errors: {}
  });

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle accepted files
    setUploadState(prev => ({
      ...prev,
      files: [...prev.files, ...acceptedFiles],
      progress: {
        ...prev.progress,
        ...Object.fromEntries(acceptedFiles.map(f => [f.name, 0]))
      }
    }));

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const newErrors = Object.fromEntries(
        rejectedFiles.map(f => [
          f.file.name,
          f.errors.map((e: any) => e.message).join(', ')
        ])
      );
      setUploadState(prev => ({
        ...prev,
        errors: { ...prev.errors, ...newErrors }
      }));
    }

    // Notify parent component
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({
      ...acc,
      [type]: []
    }), {}),
    maxSize,
    multiple
  });

  const removeFile = (fileName: string) => {
    setUploadState(prev => ({
      files: prev.files.filter(f => f.name !== fileName),
      progress: Object.fromEntries(
        Object.entries(prev.progress).filter(([name]) => name !== fileName)
      ),
      errors: Object.fromEntries(
        Object.entries(prev.errors).filter(([name]) => name !== fileName)
      )
    }));
  };

  return (
    <div className="file-upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <p>Drag & drop files here, or click to select files</p>
          )}
          <p className="file-types">
            Accepted types: {acceptedTypes.join(', ')}
          </p>
          <p className="file-size">
            Max size: {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      {uploadState.files.length > 0 && (
        <div className="file-list">
          <h4>Uploaded Files:</h4>
          {uploadState.files.map(file => (
            <div key={file.name} className="file-item">
              <span className="file-name">{file.name}</span>
              <div className="file-progress">
                <div
                  className="progress-bar"
                  style={{ width: `${uploadState.progress[file.name]}%` }}
                />
              </div>
              <button
                onClick={() => removeFile(file.name)}
                className="remove-file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {Object.keys(uploadState.errors).length > 0 && (
        <div className="error-list">
          <h4>Errors:</h4>
          {Object.entries(uploadState.errors).map(([fileName, error]) => (
            <div key={fileName} className="error-item">
              <span className="file-name">{fileName}:</span>
              <span className="error-message">{error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
