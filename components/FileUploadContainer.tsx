
import React, { useState } from 'react';
import FileUpload from './FileUpload';

interface FileUploadContainerProps {
  onProcessFiles: (mainFile: File, sfAccountFile: File | null, sfLeadsFile: File | null) => void;
  disabled: boolean;
}

const FileUploadContainer: React.FC<FileUploadContainerProps> = ({ onProcessFiles, disabled }) => {
    const [mainFile, setMainFile] = useState<File | null>(null);
    const [sfAccountFile, setSfAccountFile] = useState<File | null>(null);
    const [sfLeadsFile, setSfLeadsFile] = useState<File | null>(null);

    const handleProcess = () => {
        if (mainFile) {
            onProcessFiles(mainFile, sfAccountFile, sfLeadsFile);
        }
    };
    
    return (
        <div className="space-y-8">
            <FileUpload 
                label="1. Main Leads File (Required)"
                description="Select the primary CSV file you want to clean and process."
                acceptedFileType=".csv"
                selectedFile={mainFile}
                onFileSelect={setMainFile}
                onClear={() => setMainFile(null)}
                disabled={disabled}
            />
             <FileUpload 
                label="2. SF Account Bible (Optional)"
                description="Upload your Salesforce Accounts export to deduplicate against existing accounts."
                acceptedFileType=".csv"
                selectedFile={sfAccountFile}
                onFileSelect={setSfAccountFile}
                onClear={() => setSfAccountFile(null)}
                disabled={disabled}
            />
             <FileUpload 
                label="3. SF Leads Bible (Optional)"
                description="Upload your Salesforce Leads export to deduplicate against existing leads."
                acceptedFileType=".csv"
                selectedFile={sfLeadsFile}
                onFileSelect={setSfLeadsFile}
                onClear={() => setSfLeadsFile(null)}
                disabled={disabled}
            />

            <div className="pt-6 border-t border-gray-200">
                 <button
                    onClick={handleProcess}
                    disabled={!mainFile || disabled}
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                    Process Files
                </button>
            </div>
        </div>
    );
};

export default FileUploadContainer;
