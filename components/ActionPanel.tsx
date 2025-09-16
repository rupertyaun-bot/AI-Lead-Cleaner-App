
import React from 'react';

interface ActionPanelProps {
  leadsForAICount: number;
  rejectedLeadsCount: number;
  onContinue: () => void;
  onDownload: () => void;
  disabled: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  leadsForAICount,
  rejectedLeadsCount,
  onContinue,
  onDownload,
  disabled
}) => {
  return (
    <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 mt-6">
      <div className="mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-800">Pre-processing Complete</h3>
      <p className="text-gray-600 mt-2">
        {leadsForAICount} {leadsForAICount === 1 ? 'lead' : 'leads'} passed validation and {rejectedLeadsCount > 0 ? `(${rejectedLeadsCount} rejected) ` : ''}are ready for the next step.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onDownload}
          disabled={disabled || leadsForAICount === 0}
          className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          Download Pre-processed File
        </button>
        <button
          onClick={onContinue}
          disabled={disabled || leadsForAICount === 0}
          className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
          Continue with AI Classification
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
