
import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled: boolean;
  label: string;
  description: string;
  acceptedFileType: string;
  selectedFile: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
    onFileSelect, 
    onClear,
    disabled, 
    label,
    description,
    acceptedFileType,
    selectedFile
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
     e.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    handleDragEvents(e);
    if (!disabled) setIsDragging(true);
  }, [handleDragEvents, disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  }, [handleDragEvents]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleDragEvents, onFileSelect, disabled]);

  const baseClasses = "flex justify-center items-center w-full px-6 py-8 border-2 border-dashed rounded-lg transition-colors duration-300 relative";
  const stateClasses = disabled
    ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
    : isDragging
    ? "bg-indigo-50 border-indigo-500"
    : "bg-gray-50 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer";

  if (selectedFile) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{label}</h3>
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm text-gray-700 truncate" title={selectedFile.name}>{selectedFile.name}</p>
                </div>
                <button onClick={onClear} disabled={disabled} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{label}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <label
            htmlFor={label.replace(/\s+/g, '-')}
            className={`${baseClasses} ${stateClasses}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
            </div>
            <input id={label.replace(/\s+/g, '-')} name={label.replace(/\s+/g, '-')} type="file" className="sr-only" onChange={handleFileChange} accept={acceptedFileType} disabled={disabled} />
        </label>
    </div>
  );
};

export default FileUpload;
